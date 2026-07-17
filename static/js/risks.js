document.addEventListener('DOMContentLoaded', async function() {
    const container = document.querySelector('.risks-left');
    if (!container) {
        console.error('Контейнер .risks-left не найден');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/content?type=risk&limit=50`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки рисков');
        }

        const risks = await response.json();

        if (risks.length === 0) {
            container.innerHTML += `
                <p style="text-align: center; padding: 40px; color: #1a3a4a; opacity: 0.6;">
                    Риски пока не добавлены
                </p>
            `;
            return;
        }

        // Сохраняем hero секцию
        const heroSection = container.querySelector('.risks-hero');
        container.innerHTML = '';
        if (heroSection) {
            container.appendChild(heroSection);
        }

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
                ${risk.short_description ? `<p>${risk.short_description}</p>` : ''}
                <a href="article.html?slug=${risk.slug}">Подробнее →</a>
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
        container.innerHTML += `
            <p style="text-align: center; padding: 40px; color: #e74c3c;">
                Не удалось загрузить риски
            </p>
        `;
    }
}); 