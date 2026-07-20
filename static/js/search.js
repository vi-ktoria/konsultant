document.addEventListener('DOMContentLoaded', function () {
    const searchInputs = document.querySelectorAll('[data-search-input]');

    // Проверяем, находимся ли мы на главной странице
    function isHomePage() {
        const path = window.location.pathname;
        return path === '/' || path === '/index.html' || path === '';
    }

    searchInputs.forEach((input) => {
        const resultsSelector = input.dataset.results;
        const resultsBlock = document.querySelector(resultsSelector);

        if (!resultsBlock) return;

        let debounceTimer;

        resultsBlock.addEventListener('click', function(e) {
            const link = e.target.closest('a.search-result-card');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                const type = link.dataset.type;
                const slug = link.dataset.slug;

                if (type === 'story') {
                    if (isHomePage()) {
                        // На главной — открываем модальное окно
                        if (typeof window.openStoryModal === 'function') {
                            const story = window.storiesData?.find(s => s.slug === slug);
                            if (story) {
                                window.openStoryModal(story.id);
                            } else {
                                fetch(`${API_BASE}/stories/${slug}`)
                                    .then(r => r.json())
                                    .then(story => {
                                        if (window.openStoryModal) {
                                            window.openStoryModal(story.id);
                                        }
                                    })
                                    .catch(err => console.error('Ошибка загрузки истории:', err));
                            }
                        }
                    } else {
                        // Не на главной — переходим на главную с параметром в query string
                        window.location.href = `/index.html?story=${encodeURIComponent(slug)}`;
                    }
                } else if (type === 'faq') {
                    if (isHomePage()) {
                        // На главной — разворачиваем FAQ
                        const faqItems = document.querySelectorAll('.faq-item');
                        let targetFaq = null;

                        faqItems.forEach(item => {
                            if (item.dataset.slug === slug) {
                                targetFaq = item;
                            }
                        });

                        if (targetFaq) {
                            document.querySelectorAll('.faq-item.open').forEach(item => {
                                if (item !== targetFaq) {
                                    item.classList.remove('open');
                                    const q = item.querySelector('.faq-question');
                                    const a = item.querySelector('.faq-answer');
                                    if (q) q.setAttribute('aria-expanded', 'false');
                                    if (a) a.hidden = true;
                                }
                            });

                            targetFaq.classList.add('open');
                            const question = targetFaq.querySelector('.faq-question');
                            const answer = targetFaq.querySelector('.faq-answer');
                            if (question) question.setAttribute('aria-expanded', 'true');
                            if (answer) answer.hidden = false;

                            targetFaq.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        // Не на главной — переходим на главную с параметром в query string
                        window.location.href = `/index.html?faq=${encodeURIComponent(slug)}`;
                    }
                } else if (href && href !== '#' && href !== '') {
                    window.location.href = href;
                }
            }
        });

        input.addEventListener('input', () => {
            const query = input.value.trim();

            clearTimeout(debounceTimer);

            if (query.length < 2) {
                resultsBlock.innerHTML = '';
                resultsBlock.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    if (typeof API_BASE === 'undefined') {
                        throw new Error('API_BASE не определён. Проверьте config.js');
                    }

                    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);

                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }

                    const results = await response.json();

                    resultsBlock.style.display = 'block';

                    if (results.length === 0) {
                        resultsBlock.innerHTML = '<p class="search-empty">Ничего не найдено</p>';
                        return;
                    }

                    resultsBlock.innerHTML = results.map((item) => {
                        let link = '#';

                        switch (item.type) {
                            case 'article':
                                link = `/static/html/article.html?slug=${encodeURIComponent(item.slug)}`;
                                break;
                            case 'risk':
                                link = `/static/html/risk.html?slug=${encodeURIComponent(item.slug)}`;
                                break;
                            case 'story':
                                link = '#';
                                break;
                            case 'faq':
                                link = '#';
                                break;
                            case 'template':
                                link = `/static/html/template_viewer.html?slug=${encodeURIComponent(item.slug)}`;
                                break;
                            default:
                                link = '#';
                        }

                        return `
                            <a class="search-result-card" 
                               href="${link}" 
                               data-type="${item.type}" 
                               data-slug="${encodeURIComponent(item.slug)}">
                                <h4>${item.title}</h4>
                                ${item.short_description ? `<p>${item.short_description}</p>` : ''}
                                ${item.category ? `<span class="search-category">${item.category}</span>` : ''}
                            </a>
                        `;
                    }).join('');

                } catch (error) {
                    console.error('Ошибка поиска:', error);
                    resultsBlock.style.display = 'block';
                    resultsBlock.innerHTML = '<p class="search-error">Ошибка поиска. Попробуйте позже.</p>';
                }
            }, 300);
        });

        resultsBlock.addEventListener('mousedown', function(e) {
            const link = e.target.closest('a.search-result-card');
            if (link) {
                e.preventDefault();
            }
        });

        input.addEventListener('focus', function() {
            if (resultsBlock.innerHTML && resultsBlock.innerHTML !== '') {
                resultsBlock.style.display = 'block';
            }
        });
    });
});