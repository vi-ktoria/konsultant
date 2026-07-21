
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
    // const url = `${NOMINATIM_URL}?format=json&countrycodes=ru&q=${encodeURIComponent(address)}`;
    const url = `${NOMINATIM_URL}?format=json&addressdetails=1&countrycodes=ru&q=${encodeURIComponent(address)}`;

    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
        throw new Error(`Ошибка! Nominatim вернул статус ${response.status}. Повторите попытку через несколько минут`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
        throw new Error("Адрес не найден. Введите корректный адрес объекта и попробуйте снова");
    }

    return {
        coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
        displayName: data[0].display_name,
        isoRegion: data[0].address?.["ISO3166-2-lvl4"] || null,
        county: data[0].address?.county || null,
        city: data[0].address?.city || data[0].address?.town || null
    };
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

// МФЦ
// way["government"="multifunctional_centre"](around:${radius},${lat},${lon});
// node["government"="multifunctional_centre"](around:${radius},${lat},${lon});
// way["office"="government"](around:${radius},${lat},${lon});
// node["office"="government"](around:${radius},${lat},${lon});

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

        if (data.remark) {
            console.warn("Overpass remark (вероятная ошибка в запросе):", data.remark);
        }
        console.log(`Overpass вернул элементов: ${(data.elements || []).length}`);

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

    throw new Error(`Сервис перегружен (последняя ошибка: ${lastError.message}). Попробуйте обновить страницу`);
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
    mfc: "МФЦ",
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
    if (tags.government === "multifunctional_centre") return "mfc";
    if (tags.office === "government" && /мфц|мои документы/i.test(tags.name || "")) return "mfc";
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

// Проверка попадания текста (county/city) на список ключевых слов —
// без учёта регистра, по вхождению подстроки (учитывает формы вроде
// "городской округ Норильск", "Приморский муниципальный округ" и т.д.)
function textContainsAny(text, keywords) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

function matchesKeywords(geo, keywords) {
    return textContainsAny(geo.county, keywords) || textContainsAny(geo.city, keywords);
}

const SPECIAL_REGIONS_URL = "/static/html/regions.html";

// Правила проверяются по порядку, срабатывает первое совпадение
const REGIONAL_WARNING_RULES = [
    // Полностью входящие регионы
    {
        match: (geo) => ["RU-MUR", "RU-NEN", "RU-YAN", "RU-CHU", "RU-SA"].includes(geo.isoRegion),
        articleUrl: SPECIAL_REGIONS_URL
    },
    // Архангельская область — частично
    {
        match: (geo) => geo.isoRegion === "RU-ARK" &&
            matchesKeywords(geo, ["архангельск", "северодвинск", "новодвинск", "приморск", "лешукон", "пинеж", "онеж", "новая земля"]),
        articleUrl: SPECIAL_REGIONS_URL
    },
    // Карелия — частично
    {
        match: (geo) => geo.isoRegion === "RU-KR" &&
            matchesKeywords(geo, ["беломорск", "калевальск", "кемск", "лоухск", "сегежск", "костомукш"]),
        articleUrl: SPECIAL_REGIONS_URL
    },
    // Красноярский край — частично
    {
        match: (geo) => geo.isoRegion === "RU-KYA" &&
            matchesKeywords(geo, ["норильск", "таймыр", "туруханск", "эвенкийск"]),
        articleUrl: SPECIAL_REGIONS_URL
    },
    // Коми — частично
    {
        match: (geo) => geo.isoRegion === "RU-KO" &&
            matchesKeywords(geo, ["воркута", "инта", "усинск", "усть-цилемск"]),
        articleUrl: SPECIAL_REGIONS_URL
    },
    // Ханты-Мансийский АО — частично (Березовский и Белоярский районы)
    {
        match: (geo) => geo.isoRegion === "RU-KHM" &&
            matchesKeywords(geo, ["берёзовск", "березовск", "белоярск"]),
        articleUrl: SPECIAL_REGIONS_URL
    }
];

function getRegionalWarningUrl(geo) {
    const rule = REGIONAL_WARNING_RULES.find(r => r.match(geo));
    return rule ? rule.articleUrl : null;
}

app.get("/api/geo-data", async (req, res) => {
    const address = req.query.address;

    if (!address || !address.trim()) {
        return res.status(400).json({ error: "Ошибка! Адрес не был передан" });
    }

    const cacheKey = address.trim().toLowerCase();
    const cached = getFromCache(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        const geo = await geocodeAddress(address);
        const [lat, lon] = geo.coords;

        const rawElements = await fetchProblemObjects(lat, lon, MAX_RADIUS_M);
        const problemLayers = convertOverpassElements(rawElements);

        const result = {
            property: { coords: geo.coords, address: geo.displayName, addressDebug: geo.addressDebug },
            problemLayers,
            regionalWarningUrl: getRegionalWarningUrl(geo)
        };

        setCache(cacheKey, result);
        res.json(result);

    } catch (err) {
        console.error(err);

        if (err.message === "Адрес не найден. Введите корректный адрес объекта и попробуйте снова") {
            return res.status(404).json({ error: err.message });
        }

        res.status(502).json({ error: "Ошибка при получении гео-данных: " + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`GIS backend запущен: http://localhost:${PORT}`);
});