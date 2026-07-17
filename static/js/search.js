document.addEventListener('DOMContentLoaded', function () {
    const searchInputs = document.querySelectorAll('[data-search-input]');

    searchInputs.forEach((input) => {
        const resultsSelector = input.dataset.results;
        const resultsBlock = document.querySelector(resultsSelector);

        if (!resultsBlock) return;

        let debounceTimer;

        input.addEventListener('input', () => {
            const query = input.value.trim();

            clearTimeout(debounceTimer);

            if (query.length < 2) {
                resultsBlock.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    if (typeof API_BASE === 'undefined') {
                        throw new Error('API_BASE не определён. Проверьте config.js');
                    }

                    console.log('Поиск запроса:', `${API_BASE}/search?q=${encodeURIComponent(query)}`);

                    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);

                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }

                    const results = await response.json();

                    if (results.length === 0) {
                        resultsBlock.innerHTML = '<p class="search-empty">Ничего не найдено</p>';
                        return;
                    }

                    resultsBlock.innerHTML = results.map((item) => {
                        let link = '#';

                        switch (item.type) {
                            case 'article':
                                link = `article.html?slug=${item.slug}`;
                                break;
                            case 'risk':
                                link = `risk.html?slug=${item.slug}`;
                                break;
                            case 'story':
                                link = `../index.html#storiesSection`;
                                break;
                            case 'faq':
                                link = `../index.html#faqSection`;
                                break;
                            case 'template':
                                link = `template_viewer.html?slug=${item.slug}`;
                                break;
                            default:
                                link = '#';
                        }

                        return `
                            <a class="search-result-card" href="${link}">
                                <h4>${item.title}</h4>
                                ${item.short_description ? `<p>${item.short_description}</p>` : ''}
                                ${item.category ? `<span class="search-category">${item.category}</span>` : ''}
                            </a>
                        `;
                    }).join('');

                } catch (error) {
                    console.error('Ошибка поиска:', error);
                    resultsBlock.innerHTML = '<p class="search-error">Ошибка поиска. Попробуйте позже.</p>';
                }
            }, 300);
        });
    });
});   