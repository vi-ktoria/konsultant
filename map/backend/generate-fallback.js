// Разовый скрипт: прогоняет список демо-адресов через Overpass
// с увеличенным таймаутом и сохраняет результат в fallback-cache.json.
// Запускать ЛОКАЛЬНО (node generate-fallback.js), не на Render.

const fs = require("fs");
const path = require("path");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",  
];
const HEADERS = { "User-Agent": "gis-risk-widget-mvp/1.0 (student project, contact: none)" };
const MAX_RADIUS_M = 2500;

// ⚠ впиши сюда реальные адреса, которые будешь показывать на защите
const DEMO_ADDRESSES = [
    "Мурманск, Победы, 21"
];

async function geocodeAddress(address) {
    const url = `${NOMINATIM_URL}?format=json&addressdetails=1&countrycodes=ru&q=${encodeURIComponent(address)}`;
    const r = await fetch(url, { headers: HEADERS });
    const data = await r.json();
    return {
        coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
        displayName: data[0].display_name,
        isoRegion: data[0].address?.["ISO3166-2-lvl4"] || null,
        county: data[0].address?.county || null,
        city: data[0].address?.city || data[0].address?.town || null
    };
}

function buildQuery(lat, lon, radius) {
     // around:radius,lat,lon — геопоиск в радиусе (в метрах) от точки
    return `
            [out:json][timeout:100];
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

async function tryOverpass(url, query, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(query),
            signal: controller.signal
        });
        const data = await r.json();
        return data.elements || [];
    } finally {
        clearTimeout(timer);
    }
}

async function fetchWithLongTimeout(lat, lon, radius) {
    const query = buildQuery(lat, lon, radius);
    for (const url of OVERPASS_URLS) {
        try {
            console.log(`Пробую ${url} (таймаут 100с)...`);
            const elements = await tryOverpass(url, query, 100000);
            console.log(`${url}: найдено ${elements.length} элементов`);
            if (elements.length > 0) {
                return elements;
            }
            console.warn(`${url}: вернул 0 объектов`);
            //return await tryOverpass(url, query, 100000); // увеличенный таймаут — только для локальной генерации
        } catch (err) {
            console.warn(`${url} не ответил: ${err.message}`);
        }
    }
    throw new Error("Ни одно зеркало не ответило за 100 секунд");
}

// === скопируй сюда convertOverpassElements, convertElement, detectCategory,
//     CATEGORY_LABELS, isLineCategory из server.js без изменений ===
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

async function main() {
    //const result = {};
    const cachePath = path.join(__dirname, "fallback-cache.json");

    let result = {};

    if (fs.existsSync(cachePath)) {
        try {
            result = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            console.log(`Загружено ${Object.keys(result).length} записей из существующего кэша.`);
        } catch (e) {
            console.warn("Не удалось прочитать существующий кэш, будет создан новый.");
            result = {};
        }
    }

    for (const address of DEMO_ADDRESSES) {
        console.log(`\n=== ${address} ===`);

        const key = address.trim().toLowerCase();
        if (result[key]) {
            console.log(`Пропускаю "${address}" — уже есть в кэше.`);
            continue;
        }
        
        try {
            const geo = await geocodeAddress(address);
            const [lat, lon] = geo.coords;
            const raw = await fetchWithLongTimeout(lat, lon, MAX_RADIUS_M);
            const problemLayers = convertOverpassElements(raw);

            result[address.trim().toLowerCase()] = {
                property: { coords: geo.coords, address: geo.displayName },
                problemLayers
            };
            console.log(`Успех для "${address}", объектов: ${problemLayers.length}`);
        } catch (err) {
            console.error(`Не удалось получить данные для "${address}": ${err.message}`);
        }
    }
    fs.writeFileSync(
        cachePath,
        JSON.stringify(result, null, 2),
        "utf8"
    );

    console.log(`\nГотово. Всего адресов в кэше: ${Object.keys(result).length}`);
}

main();