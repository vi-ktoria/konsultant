document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('risksContainer');
    if (!container) {
        console.error('Контейнер #risksContainer не найден');
        return;
    }

    try {
        if (typeof API_BASE === 'undefined') {
            throw new Error('API_BASE не определён. Проверьте подключение config.js');
        }

        console.log('Загрузка рисков из:', `${API_BASE}/content?type=risk&limit=50`);

        const response = await fetch(`${API_BASE}/content?type=risk&limit=50`);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const risks = await response.json();

        // Сортируем по id (или created_at) — от меньшего к большему
        risks.sort((a, b) => (a.id || 0) - (b.id || 0));

        console.log('Получено рисков:', risks.length);

        if (risks.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; padding: 40px; color: #1a3a4a; opacity: 0.6;">
                    Риски пока не добавлены
                </p>
            `;
            return;
        }

        // Очищаем контейнер
        container.innerHTML = '';

        // Рендерим риски из API
        risks.forEach(risk => {
            const details = document.createElement('details');
            details.className = 'risks-card';

            const summary = document.createElement('summary');
            summary.className = 'risks-card-title';
            summary.innerHTML = `
                <span>${risk.title}</span>
                <span class="risks-arrow">↓</span>
            `;

            const content = document.createElement('div');
            content.className = 'risks-card-content';
            content.innerHTML = `
                <p>${risk.short_description || ''}</p>
                <a href="risk.html?slug=${risk.slug}">Подробнее →</a>
            `;

            details.appendChild(summary);
            details.appendChild(content);
            container.appendChild(details);
        });

        // Аккордеон — только один открытый
        const riskCards = document.querySelectorAll('.risks-card');
        riskCards.forEach((card) => {
            card.addEventListener('toggle', () => {
                if (card.open) {
                    riskCards.forEach((otherCard) => {
                        if (otherCard !== card) {
                            otherCard.removeAttribute('open');
                        }
                    });
                }
            });
        });

    } catch (error) {
        console.error('Ошибка загрузки рисков:', error);
        container.innerHTML = `
            <p style="text-align: center; padding: 40px; color: #e74c3c;">
                ❌ Не удалось загрузить риски: ${error.message}
            </p>
        `;
    }
});