// widget.js
//
// Изменения по сравнению с MVP на статичном problems.json:
//   1. Точки/полигоны/линии больше не лежат в problems.json — они приходят
//      с backend'а (см. /backend/server.js), который сам дергает Nominatim
//      + Overpass API и отдаёт уже готовый набор объектов вокруг адреса.
//   2. Backend грузит объекты сразу в радиусе 5 км (MAX_RADIUS_M на сервере).
//      Слайдер радиуса на фронте дальше просто пересчитывает analyze() по
//      уже загруженным данным — новых запросов к серверу при движении
//      слайдера не идёт.
//   3. Добавлен новый тип геометрии "line" (ж/д пути, трассы), которого не
//      было в исходной версии — там они были искусственно "замкнуты" в
//      полигон в problems.json.

// Адрес backend'а. Если разворачиваете backend на другом хосте/порту —
// поменяйте здесь.
const BACKEND_URL = "http://localhost:3000";

// вспомогательные функции

function getAddressFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("address");
}

async function loadGeoData(address) {
    const url = `${BACKEND_URL}/api/geo-data?address=${encodeURIComponent(address)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Не удалось получить гео-данные");
    }

    return data; // { property: { coords }, problemLayers: [...] }
}

function showFatalError(message) {
    const mapDiv = document.getElementById("map");
    mapDiv.innerHTML = `<div class="warning" style="padding:20px;">⚠ ${message}</div>`;

    const panel = document.getElementById("analysis-content");
    if (panel) {
        panel.innerHTML = `<div class="warning">Анализ недоступен</div>`;
    }
}

// main функция
async function initGeoWidget() {

    const address = getAddressFromUrl();

    if (!address) {
        showFatalError("Адрес не указан. Вернитесь на главную страницу и введите адрес.");
        return;
    }

    // КАРТА
    const map = L.map('map').setView([55.7558, 37.6176], 11);
    map.attributionControl.setPrefix(false);

    const categoryNames = {
        industry: "🏭 Промышленное предприятие",
        industry_zone: "🏭 Промышленная зона",
        waste: "🗑 Полигон ТБО",
        railway: "🚆 Железная дорога",
        road: "🛣 Автомагистраль",
        chemical: "☣ Химическое предприятие",
        agriculture: "🌾 Сельскохозяйственный объект",
        unknown: "❔ Прочий объект"
    };

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const houseIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25694.png",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -35]
    });

    // ОБЪЕКТ НЕДВИЖИМОСТИ + ПРОБЛЕМНЫЕ ОБЪЕКТЫ (одним запросом к backend)
    let geoData;
    try {
        geoData = await loadGeoData(address);
    } catch (err) {
        console.error(err);
        showFatalError(err.message);
        return;
    }

    const property = {
        coords: geoData.property.coords,
        radius: 500
    };

    const problemLayers = geoData.problemLayers;

    map.setView(property.coords, 14);

    L.marker(property.coords, { icon: houseIcon })
        .addTo(map)
        .bindPopup("🏠 Объект недвижимости");

    const radiusCircle = L.circle(property.coords, {
        radius: property.radius,
        color: "#2a6fdb",
        fillColor: "#2a6fdb",
        fillOpacity: 0.15
    }).addTo(map);

    const resultLayer = L.layerGroup().addTo(map);

    // ЗАМЫКАНИЕ ПОЛИГОНА
    function closePolygon(coords) {
        const first = coords[0];
        const last = coords[coords.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            coords = [...coords, first];
        }

        return coords;
    }

    // ЕДИНИЦЫ ИЗМЕРЕНИЯ РАДИУСА
    function formatRadius(radius) {
        return radius >= 1000
            ? (radius / 1000).toFixed(1) + " км"
            : radius + " м";
    }

    // АНАЛИЗ РИСКОВ
    function analyze(property, layers) {
        // Переводим центр недвижимости в формат Turf: [Lng, Lat]
        const propertyLngLat = [property.coords[1], property.coords[0]];

        // Создаем буферную зону (круг) вокруг недвижимости через Turf
        const circle = turf.circle(propertyLngLat, property.radius / 1000, {
            units: "kilometers"
        });

        return layers.map(layer => {
            let isDanger = false;
            let distance = null;

            // ТОЧКИ
            if (layer.type === "point") {
                const pointLngLat = [layer.coords[1], layer.coords[0]];

                const dist = turf.distance(
                    turf.point(pointLngLat),
                    turf.point(propertyLngLat),
                    { units: "meters" }
                );

                distance = Math.round(dist);
                isDanger = dist <= property.radius;
            }

            // ПОЛИГОНЫ
            if (layer.type === "polygon") {
                const invertedCoords = layer.coords.map(coord => [coord[1], coord[0]]);
                const fixedCoords = closePolygon(invertedCoords);

                try {
                    let poly = turf.polygon([fixedCoords]);
                    poly = turf.rewind(poly, { mutate: true });

                    isDanger = turf.booleanIntersects(poly, circle);

                    if (turf.booleanPointInPolygon(turf.point(propertyLngLat), poly)) {
                        distance = 0;
                    } else {
                        const line = turf.polygonToLine(poly);

                        const snapped = turf.nearestPointOnLine(
                            line,
                            turf.point(propertyLngLat),
                            { units: "meters" }
                        );

                        distance = Math.round(snapped.properties.dist);
                    }

                } catch (e) {
                    console.error(`Ошибка валидации полигона для "${layer.name}":`, e);
                    isDanger = false;
                }
            }

            // ЛИНИИ (ж/д пути, трассы) — открытая геометрия, без замыкания
            // и без проверки "точка внутри", в отличие от полигонов
            if (layer.type === "line") {
                const invertedCoords = layer.coords.map(coord => [coord[1], coord[0]]);

                try {
                    const line = turf.lineString(invertedCoords);

                    isDanger = turf.booleanIntersects(line, circle);

                    const snapped = turf.nearestPointOnLine(
                        line,
                        turf.point(propertyLngLat),
                        { units: "meters" }
                    );

                    distance = Math.round(snapped.properties.dist);

                } catch (e) {
                    console.error(`Ошибка валидации линии для "${layer.name}":`, e);
                    isDanger = false;
                }
            }

            return {
                ...layer,
                isDanger,
                distance
            };
        });
    }

    // ОТРИСОВКА СЛОЁВ
    function drawBaseLayers(layers) {

        layers.forEach(layer => {

            if (layer.type === "point") {
                L.marker(layer.coords)
                    .addTo(map)
                    .bindPopup(layer.name);
            }

            if (layer.type === "polygon") {
                L.polygon(layer.coords, {
                    color: "black",
                    fillOpacity: 0
                })
                .addTo(map)
                .bindPopup(layer.name);
            }

            if (layer.type === "line") {
                L.polyline(layer.coords, {
                    color: "black",
                    weight: 2
                })
                .addTo(map)
                .bindPopup(layer.name);
            }
        });
    }

    // ОТРИСОВКА РЕЗУЛЬТАТОВ
    function renderResults(layers) {

        resultLayer.clearLayers();

        layers.forEach(layer => {

            // ТОЧКИ
            if (layer.type === "point") {
                L.circleMarker(layer.coords, {
                    radius: 9,
                    color: layer.isDanger ? "red" : "black",
                    fillColor: layer.isDanger ? "red" : "black",
                    fillOpacity: 0.4
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${layer.isDanger ? "⚠ ОПАСНО" : "OK"}<br>
                    Расстояние: ${layer.distance} м
                `);
            }

            // ПОЛИГОНЫ
            if (layer.type === "polygon") {
                L.polygon(layer.coords, {
                    color: layer.isDanger ? "red" : "black",
                    weight: 2,
                    fillOpacity: layer.isDanger ? 0.4 : 0.15
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${layer.isDanger ? "⚠ ОПАСНО" : "OK"}<br>
                    Расстояние: ${layer.distance} м
                `);
            }

            // ЛИНИИ
            if (layer.type === "line") {
                L.polyline(layer.coords, {
                    color: layer.isDanger ? "red" : "black",
                    weight: layer.isDanger ? 4 : 2
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${layer.isDanger ? "⚠ ОПАСНО" : "OK"}<br>
                    Расстояние: ${layer.distance} м
                `);
            }
        });
    }

    function formatCategories(categories) {
        if (!Array.isArray(categories)) {
            categories = [categories];
        }

        return categories
            .map(cat => categoryNames[cat] || cat)
            .join(", ");
    }

    function renderAnalysisPanel(layers) {

        const panel = document.getElementById("analysis-content");

        const dangerObjects = layers.filter(layer => layer.isDanger);

        if (dangerObjects.length === 0) {
            panel.innerHTML = `
                <div class="safe">
                    ✔ В выбранном радиусе опасных объектов не найдено.
                </div>
            `;
            return;
        }

        let html = `
            <div class="warning">
                ⚠ Найдено потенциально проблемных объектов: ${dangerObjects.length}
            </div>
        `;

        dangerObjects.forEach(layer => {
            html += `
                <div>
                    <strong>${layer.name}</strong><br>
                    Тип: ${formatCategories(layer.category)}<br>
                    Расстояние: ${layer.distance} м
                </div>
                <hr>
            `;
        });

        panel.innerHTML = html;
    }

    // ЗАПУСК
    drawBaseLayers(problemLayers);

    const analyzed = analyze(property, problemLayers);
    console.log("RESULT:", analyzed);

    renderResults(analyzed);
    renderAnalysisPanel(analyzed);

    // ИЗМЕНЕНИЕ РАДИУСА
    const slider = document.getElementById("radius-slider");
    const radiusValue = document.getElementById("radius-value");

    slider.value = property.radius;
    radiusValue.textContent = formatRadius(property.radius);

    slider.addEventListener("input", () => {

        property.radius = Number(slider.value);

        radiusValue.textContent = formatRadius(property.radius);

        // изменяем круг
        radiusCircle.setRadius(property.radius);

        // пересчитываем результаты по уже загруженным данным,
        // без нового запроса к backend
        const analyzed = analyze(property, problemLayers);

        renderResults(analyzed);
        renderAnalysisPanel(analyzed);
    });
}

// старт
window.addEventListener('load', initGeoWidget);