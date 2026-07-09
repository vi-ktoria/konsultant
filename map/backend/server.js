
// Принимает адрес, геокодирует его (Nominatim),
// запрашивает проблемные объекты вокруг точки (Overpass API) и отдаёт
// фронтенду единый JSON в формате { property, problemLayers }.


const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Максимальный радиус, на который грузим объекты за один запрос
const MAX_RADIUS_M = 2500;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Публичный overpass-api.de часто перегружен и отдаёт 504
// Пробуем несколько зеркал по очереди, пока одно не ответит
const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
];

// Nominatim и Overpass требуют указывать нормальный User-Agent
const HEADERS = {
    "User-Agent": "gis-risk-widget-mvp/1.0 (student project, contact: none)"
};

// Простой in-memory кэш
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

// ГЕОКОДИРОВАНИЕ
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

// OVERPASS
function buildOverpassQuery(lat, lon, radius) {
    // around:radius,lat,lon — геопоиск в радиусе (в метрах) от точки
    return `
            [out:json][timeout:25];
            (
            way["landuse"~"^(industrial|landfill|farmland|farmyard|railway|cemetery)$"](around:${radius},${lat},${lon});
            node["landuse"="landfill"](around:${radius},${lat},${lon});
            way["man_made"="works"](around:${radius},${lat},${lon});
            way["railway"~"^(rail|station|depot)$"](around:${radius},${lat},${lon});
            node["railway"~"^(station|depot)$"](around:${radius},${lat},${lon});
            way["highway"~"^(motorway|trunk)$"](around:${radius},${lat},${lon});
            way["aeroway"="aerodrome"](around:${radius},${lat},${lon});
            node["aeroway"="aerodrome"](around:${radius},${lat},${lon});
            way["amenity"="grave_yard"](around:${radius},${lat},${lon});
            node["amenity"="grave_yard"](around:${radius},${lat},${lon});
            );
            out geom;
        `;
}

async function tryOverpassUrl(url, query, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "data=" + encodeURIComponent(query),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`статус ${response.status}`);
        }

        const data = await response.json();
        return data.elements || [];

    } finally {
        clearTimeout(timer);
    }
}

async function fetchProblemObjects(lat, lon, radius) {
    const query = buildOverpassQuery(lat, lon, radius);

    let lastError;

    for (const url of OVERPASS_URLS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                return await tryOverpassUrl(url, query, 35000);
            } catch (err) {
                console.warn(`Overpass ${url} попытка ${attempt} не удалась: ${err.message}`);
                lastError = err;
            }
        }
    }

    throw new Error(`все зеркала Overpass недоступны (последняя ошибка: ${lastError.message})`);
}

// Overpass -> формат виджета

const CATEGORY_LABELS = {
    industry_zone: "Промышленная зона",
    waste: "Полигон ТБО",
    railway: "Железная дорога",
    road: "Автомагистраль",
    agriculture: "Сельскохозяйственный объект",
    airport: "Аэропорт",
    station: "Вокзал / ж-д станция",
    cemetery: "Кладбище",
    depot: "Депо / ж-д парк",
    metro: "Станция метро",
    metro_line: "Линия метро",
};

function detectCategory(tags) {
    if (tags.landuse === "industrial" || tags.man_made === "works") return "industry_zone";
    if (tags.landuse === "landfill") return "waste";
    if (tags.aeroway === "aerodrome") return "airport";
    // важно проверить railway=station ДО общей проверки на railway,
    // иначе вокзалы попадут в категорию "железная дорога"
    if (tags.railway === "depot" || tags.landuse === "railway") return "depot";
    if (tags.railway === "station" && tags.station === "subway") return "metro";
    if (tags.railway === "station") return "station";
    if (tags.railway) return "railway";
    if (tags.highway) return "road";
    if (tags.landuse === "farmland" || tags.landuse === "farmyard") return "agriculture";
    if (tags.landuse === "cemetery" || tags.amenity === "grave_yard") return "cemetery";
    return "unknown";
}

// Линии (ж/д пути, трассы) — открытая геометрия.
// Всё остальное (промзоны, ТБО, с/х, аэропорты, вокзалы, кладбища) —
// площадные объекты (полигоны) либо точки, если так в OSM.
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