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

// Адрес backend. Если разворачиваете backend на другом хосте/порту - поменяйте здесь.
const BACKEND_URL = "https://konsultant-map-backend.onrender.com";

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

    const panel = document.getElementById("analysis-content");
    if (panel) {
        panel.innerHTML = `<div>⏳ Ищем объекты поблизости... это может занять несколько минут.</div>`;
    }

    // ДАННЫЕ (грузим ДО создания карты — если backend недоступен,
    // не хотим создавать Leaflet-объект, который потом придётся ломать)
    let geoData;
    try {
        geoData = await loadGeoData(address);
    } catch (err) {
        console.error(err);
        showFatalError(err.message);
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
        airport: "✈ Аэропорт",
        station: "🚉 Вокзал / ж-д станция",
        cemetery: "⚰ Кладбище",
        depot: "🚉 Депо / электродепо",
        metro: "🚇 Станция метро",
        metro_line: "🚇 Линия метро",
        mfc: "📄 МФЦ (Мои документы)",
        unknown: "❔ Прочий объект"
    };

    const CATEGORY_RISK = {
        industry_zone: "high",
        waste: "high",
        chemical: "high",
        railway: "medium",
        road: "medium",
        airport: "medium",
        depot: "medium",
        metro_line: 'medium',
        agriculture: "low",
        cemetery: "low",
        station: "low",
        metro: 'low',
        unknown: "low"
    };

    const SEVERITY_COLORS = {
        red: "#d32f2f",
        yellow: "#f9a825",
        green: "#2e7d32",
        neutral: "#1565c0"
    };

    const SEVERITY_LABELS = {
        red: "🔴 Может быть опасно",
        yellow: "🟡 Обратите внимание",
        green: "🟢 Всё хорошо, но имейте в виду",
        neutral: "Полезный объект поблизости"
    };

    function getSeverity(category, distance, radius) {
        const risk = CATEGORY_RISK[category] || "low";
        const ratio = distance / radius; // 0 = вплотную к объекту, 1 = на границе радиуса

        if (category === "mfc") return "neutral";
        if (risk === "high") {
            if (ratio <= 0.5) return "red";
            if (ratio <= 1.2) return "yellow";
            return "green";
        }

        if (risk === "medium") {
            if (ratio <= 0.3) return "red";
            if (ratio <= 1) return "yellow";
            return "green";
        }

        // low risk — красным никогда не подсвечиваем
        return ratio <= 0.2 ? "yellow" : "green";
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const houseIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25694.png",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -35]
    });

    const property = {
        coords: geoData.property.coords,
        address: geoData.property.address,
        radius: 500
    };
    console.log("geoData.property:", geoData.property);

    // вывод адреса
    document.getElementById("property-address-display").textContent = `📍 ${property.address}`;

    // рег особенности
    if (geoData.regionalWarningUrl) {
        document.getElementById("regional-warning-container").innerHTML = `
            <div class="regional-warning">
                ⚠ В данном регионе процесс покупки недвижимости имеет особенности.
                <a href="${geoData.regionalWarningUrl}" target="_blank">Подробнее</a>
            </div>
        `;
    }
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
            }

            // ПОЛИГОНЫ
            if (layer.type === "polygon") {
                const invertedCoords = layer.coords.map(coord => [coord[1], coord[0]]);
                const fixedCoords = closePolygon(invertedCoords);

                try {
                    let poly = turf.polygon([fixedCoords]);
                    poly = turf.rewind(poly, { mutate: true });

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
                }
            }

            // ЛИНИИ (ж/д пути, трассы) — открытая геометрия, без замыкания
            // и без проверки "точка внутри", в отличие от полигонов
            if (layer.type === "line") {
                const invertedCoords = layer.coords.map(coord => [coord[1], coord[0]]);

                try {
                    const line = turf.lineString(invertedCoords);

                    const snapped = turf.nearestPointOnLine(
                        line,
                        turf.point(propertyLngLat),
                        { units: "meters" }
                    );

                    distance = Math.round(snapped.properties.dist);

                } catch (e) {
                    console.error(`Ошибка валидации линии для "${layer.name}":`, e);
                }
            }

            return {
                ...layer,
                severity: distance === null ? "green" : getSeverity(layer.category, distance, property.radius),
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
                    color: SEVERITY_COLORS[layer.severity],
                    fillColor: SEVERITY_COLORS[layer.severity],
                    fillOpacity: 0.4
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${SEVERITY_LABELS[layer.severity]}<br>
                    Расстояние: ${layer.distance} м
                `);
            }

            // ПОЛИГОНЫ
            if (layer.type === "polygon") {
                L.polygon(layer.coords, {
                    color: SEVERITY_COLORS[layer.severity],
                    weight: 2,
                    fillOpacity: 0.4
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${SEVERITY_LABELS[layer.severity]}<br>
                    Расстояние: ${layer.distance} м
                `);
            }

            // ЛИНИИ
            if (layer.type === "line") {
                L.polyline(layer.coords, {
                    color: SEVERITY_COLORS[layer.severity],
                    weight: 2
                })
                .addTo(resultLayer)
                .bindPopup(`
                    <strong>${layer.name}</strong><br>
                    ${SEVERITY_LABELS[layer.severity]}<br>
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

    function renderObjectsList(items) {
        return items.map(layer => `
            <div>
                <strong>${layer.name}</strong><br>
                Тип: ${formatCategories(layer.category)}<br>
                Расстояние: ${layer.distance} м
            </div>
            <hr>
        `).join("");
    }

    // сколько объектов показываем в каждой категории до кнопки "показать ещё"
    const PANEL_PAGE_SIZE = 30;
    const panelPageState = { red: PANEL_PAGE_SIZE, yellow: PANEL_PAGE_SIZE, green: PANEL_PAGE_SIZE };
    const panelOpenState = { red: true, yellow: false, green: false };

    function renderGroupItems(key, items) {
        const visibleCount = panelPageState[key];
        const visible = items.slice(0, visibleCount);
        const hasMore = items.length > visibleCount;

        const itemsHtml = visible.map(layer => `
            <div class="panel-item">
                <strong>${layer.name}</strong><br>
                Тип: ${formatCategories(layer.category)}<br>
                Расстояние: ${layer.distance} м
            </div>
        `).join("");

        const moreButton = hasMore
            ? `<button class="show-more-btn" onclick="window.__showMorePanel('${key}')">
                Показать ещё (${items.length - visibleCount})
            </button>`
            : "";

        return itemsHtml + moreButton;
    }

    function renderSeverityGroup(key, items, label, color) {
        if (items.length === 0) return "";

        const openAttr = panelOpenState[key] ? "open" : "";

        return `
            <details id="group-${key}" class="severity-group" ${openAttr} ontoggle="window.__onPanelToggle('${key}', this.open)">
                <summary style="color:${color}">${label} (${items.length})</summary>
                <div id="list-${key}" class="severity-list">${renderGroupItems(key, items)}</div>
            </details>
        `;
    }

    function getPluralForm(n) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod100 >= 11 && mod100 <= 14) return 2;
        if (mod10 === 1) return 0;
        if (mod10 >= 2 && mod10 <= 4) return 1;
        return 2;
    }

    const RED_FORMS = [
        "потенциально опасный объект",
        "потенциально опасных объекта",
        "потенциально опасных объектов"
    ];

    const YELLOW_FORMS = [
        "объект, на который стоит обратить внимание",
        "объекта, на которые стоит обратить внимание",
        "объектов, на которые стоит обратить внимание"
    ];

    const GREEN_FORMS = [
        "объект, который может быть полезен и опасности не представляет",
        "объекта, которые могут быть полезны и опасности не представляют",
        "объектов, которые могут быть полезны и опасности не представляют"
    ];

    function renderSummaryText(counts) {
        const redPhrase = RED_FORMS[getPluralForm(counts.red)];
        const yellowPhrase = YELLOW_FORMS[getPluralForm(counts.yellow)];
        const greenPhrase = GREEN_FORMS[getPluralForm(counts.green)];

        return `
            <div class="analysis-summary">
                В выбранном радиусе обнаружено:<br>
                <b style="color:${SEVERITY_COLORS.red}">${counts.red} ${redPhrase}</b>,<br>
                <b style="color:${SEVERITY_COLORS.yellow}">${counts.yellow} ${yellowPhrase}</b>,<br>
                <b style="color:${SEVERITY_COLORS.green}">${counts.green} ${greenPhrase}</b>.
            </div>
        `;
    }

    function renderAnalysisPanel(layers) {
        const panel = document.getElementById("analysis-content");

        const inRadius = layers.filter(l => l.distance <= property.radius);

        const bySeverity = {
            red: inRadius.filter(l => l.severity === "red"),
            yellow: inRadius.filter(l => l.severity === "yellow"),
            green: inRadius.filter(l => l.severity === "green")
        };

        // сохраняем ссылку на текущий набор, чтобы "показать ещё" знал, что рисовать
        window.__currentPanelData = bySeverity;

        if (inRadius.length === 0) {
            panel.innerHTML = `<div class="safe">✔ В выбранном радиусе объектов не найдено.</div>`;
            return;
        }

        panel.innerHTML =
            renderSummaryText({
                red: bySeverity.red.length,
                yellow: bySeverity.yellow.length,
                green: bySeverity.green.length
            }) +
            renderSeverityGroup("red", bySeverity.red, "🔴 Опасно", SEVERITY_COLORS.red) +
            renderSeverityGroup("yellow", bySeverity.yellow, "🟡 Обратите внимание", SEVERITY_COLORS.yellow) +
            renderSeverityGroup("green", bySeverity.green, "🟢 Имейте в виду", SEVERITY_COLORS.green);
    }

    window.__onPanelToggle = function(key, isOpen) {
        panelOpenState[key] = isOpen;
    };

    // ЗАПУСК
    drawBaseLayers(problemLayers);

    const analyzed = analyze(property, problemLayers);
    console.log("RESULT:", analyzed);

    renderResults(analyzed);

    window.__showMorePanel = function(key) {
        panelPageState[key] += PANEL_PAGE_SIZE;
        panelOpenState[key] = true;

        const items = window.__currentPanelData[key];
        const listEl = document.getElementById(`list-${key}`);

        if (listEl) {
            listEl.innerHTML = renderGroupItems(key, items);
        }
    };

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
        panelPageState.red = panelPageState.yellow = panelPageState.green = PANEL_PAGE_SIZE;
        renderAnalysisPanel(analyzed);
    });

}

// старт
window.addEventListener('load', initGeoWidget);