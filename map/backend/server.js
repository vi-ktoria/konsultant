// server.js
// Backend для гео-виджета: принимает адрес, геокодирует его (Nominatim),
// запрашивает проблемные объекты вокруг точки (Overpass API) и отдаёт
// фронтенду единый JSON в формате { property, problemLayers }.
//
// Зачем нужен backend, а не прямые запросы с фронта:
//  - у Nominatim и Overpass жёсткие правила по User-Agent и нагрузке
//  - легко закэшировать повторные запросы по одному и тому же адресу
//  - не упираемся в CORS/лимиты браузера

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Максимальный радиус, на который грузим объекты за один запрос.
// Слайдер на фронте (до 5000 м) дальше просто фильтрует уже загруженные
// данные без повторных обращений к Overpass.
const MAX_RADIUS_M = 5000;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Nominatim и Overpass требуют указывать нормальный User-Agent
const HEADERS = {
    "User-Agent": "gis-risk-widget-mvp/1.0 (student project, contact: none)"
};

// Простой in-memory кэш, чтобы не долбить Overpass повторно по тому же адресу
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 минут

function getFromCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    cache.set(key, { data, time: Date.now() });
}

// ---------- ГЕОКОДИРОВАНИЕ ----------

async function geocodeAddress(address) {
    const url = `${NOMINATIM_URL}?format=json&countrycodes=ru&q=${encodeURIComponent(address)}`;

    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
        throw new Error(`Nominatim вернул статус ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
        throw new Error("Адрес не найден");
    }

    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// ---------- OVERPASS ----------

function buildOverpassQuery(lat, lon, radius) {
    // around:radius,lat,lon — геопоиск в радиусе (в метрах) от точки
    return `
        [out:json][timeout:25];
        (
          way["landuse"="industrial"](around:${radius},${lat},${lon});
          way["man_made"="works"](around:${radius},${lat},${lon});
          way["landuse"="landfill"](around:${radius},${lat},${lon});
          node["landuse"="landfill"](around:${radius},${lat},${lon});
          node["amenity"="waste_disposal"](around:${radius},${lat},${lon});
          way["railway"="rail"](around:${radius},${lat},${lon});
          way["highway"~"^(motorway|trunk)$"](around:${radius},${lat},${lon});
          way["landuse"~"^(farmland|farmyard)$"](around:${radius},${lat},${lon});
        );
        out geom;
    `;
}

async function fetchProblemObjects(lat, lon, radius) {
    const query = buildOverpassQuery(lat, lon, radius);

    const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
            ...HEADERS,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "data=" + encodeURIComponent(query)
    });

    if (!response.ok) {
        throw new Error(`Overpass вернул статус ${response.status}`);
    }

    const data = await response.json();
    return data.elements || [];
}

// ---------- КОНВЕРТЕР Overpass -> формат виджета ----------

const CATEGORY_LABELS = {
    industry_zone: "Промышленная зона",
    waste: "Полигон ТБО",
    railway: "Железная дорога",
    road: "Автомагистраль",
    agriculture: "Сельскохозяйственный объект"
};

function detectCategory(tags) {
    if (tags.landuse === "industrial" || tags.man_made === "works") return "industry_zone";
    if (tags.landuse === "landfill" || tags.amenity === "waste_disposal") return "waste";
    if (tags.railway) return "railway";
    if (tags.highway) return "road";
    if (tags.landuse === "farmland" || tags.landuse === "farmyard") return "agriculture";
    return "unknown";
}

// Линии (ж/д пути, трассы) — открытая геометрия.
// Всё остальное (промзоны, ТБО, с/х) — площадные объекты (полигоны).
function isLineCategory(category) {
    return category === "railway" || category === "road";
}

function convertElement(el) {
    const tags = el.tags || {};
    const category = detectCategory(tags);
    if (category === "unknown") return null;

    const name = tags.name || CATEGORY_LABELS[category] || "Объект";

    // node (точка) — geometry нет, есть lat/lon напрямую
    if (el.type === "node") {
        return {
            type: "point",
            name,
            category,
            coords: [el.lat, el.lon]
        };
    }

    // way (линия/полигон) — geometry это массив {lat, lon}
    if (el.type === "way" && Array.isArray(el.geometry)) {
        const coords = el.geometry.map(pt => [pt.lat, pt.lon]);
        if (coords.length < 2) return null;

        return {
            type: isLineCategory(category) ? "line" : "polygon",
            name,
            category,
            coords
        };
    }

    return null;
}

function convertOverpassElements(elements) {
    return elements
        .map(convertElement)
        .filter(Boolean);
}

// ---------- РОУТ ----------

app.get("/api/geo-data", async (req, res) => {
    const address = req.query.address;

    if (!address || !address.trim()) {
        return res.status(400).json({ error: "Не передан адрес" });
    }

    const cacheKey = address.trim().toLowerCase();
    const cached = getFromCache(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        const coords = await geocodeAddress(address);
        const [lat, lon] = coords;

        const rawElements = await fetchProblemObjects(lat, lon, MAX_RADIUS_M);
        const problemLayers = convertOverpassElements(rawElements);

        const result = {
            property: { coords },
            problemLayers
        };

        setCache(cacheKey, result);
        res.json(result);

    } catch (err) {
        console.error(err);

        if (err.message === "Адрес не найден") {
            return res.status(404).json({ error: err.message });
        }

        res.status(502).json({ error: "Ошибка при получении гео-данных: " + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`GIS backend запущен: http://localhost:${PORT}`);
});