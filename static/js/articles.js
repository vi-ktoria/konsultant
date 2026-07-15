const API_BASE = "https://k-6a3f.onrender.com";

async function loadArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE}/articles?type=article&limit=50`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки статей');
        }

        const articles = await response.json();

        if (articles.length === 0) {
            grid.innerHTML = `
                <p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #1a3a4a; opacity: 0.6;">
                    Статьи пока не добавлены
                </p>
            `;
            return;
        }

        grid.innerHTML = articles.map(article => `
            <a href="article.html?slug=${article.slug}" class="article-card">
                <div class="article-card-content">
                    <h3 class="article-title">${article.title}</h3>
                    ${article.category ? `<span class="article-category">${article.category}</span>` : ''}
                    ${article.short_description ? `<p class="article-excerpt">${article.short_description}</p>` : ''}
                    <div class="article-meta">
                        ${article.created_at ? `<span class="article-date">${new Date(article.created_at).toLocaleDateString('ru-RU')}</span>` : ''}
                        <span class="article-read">Читать →</span>
                    </div>
                </div>
            </a>
        `).join('');

    } catch (error) {
        console.error('Ошибка загрузки статей:', error);
        grid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #e74c3c;">
                Не удалось загрузить статьи
            </p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadArticles);