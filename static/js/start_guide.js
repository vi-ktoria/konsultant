document.addEventListener('DOMContentLoaded', function () {
    const ARTICLE_SLUG = 'poshagovaya-instruktsiya-po-priobreteniyu-nedvizhimosti';

    const titleElement = document.getElementById('articleTitle');
    const descriptionElement = document.getElementById('articleDescription');
    const contentElement = document.getElementById('articleContent');
    const contentsBlock = document.getElementById('articleContentsBlock');
    const contentsContainer = document.getElementById('articleContents');
    const dateBlock = document.getElementById('actualDateBlock');
    const dateElement = document.getElementById('actualDate');

    function showActualDate() {
        if (!dateBlock || !dateElement) {
            return;
        }

        const currentDate = new Date();

        dateElement.textContent = currentDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        dateElement.setAttribute(
            'datetime',
            currentDate.toISOString().slice(0, 10)
        );

        dateBlock.hidden = false;
    }

    function addDisclaimer() {
        const disclaimer = document.createElement('p');
        disclaimer.style.cssText = 'margin-top: 15px;';
        disclaimer.textContent = 'Информация носит справочный характер и не заменяет консультацию юриста.';
        descriptionElement.after(disclaimer);
    }

    if (!titleElement || !descriptionElement || !contentElement) {
        console.error('На странице нет нужных блоков для вывода статьи.');
        return;
    }

    async function loadGuide() {
        try {
            if (typeof API_BASE === 'undefined') {
                throw new Error('API_BASE не определён. Проверьте config.js');
            }

            console.log('Загрузка инструкции из:', `${API_BASE}/content/${ARTICLE_SLUG}`);

            const response = await fetch(`${API_BASE}/content/${ARTICLE_SLUG}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Инструкция не найдена');
                }
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const data = await response.json();

            document.title = data.title || 'С чего начать покупку';
            titleElement.textContent = data.title || 'С чего начать покупку';
            descriptionElement.textContent = data.short_description || '';
            showActualDate();
            addDisclaimer();

            contentElement.innerHTML = data.content || '<p>Текст инструкции пока не добавлен.</p>';

            renderArticleContents(data.contents);

        } catch (error) {
            console.error('Ошибка загрузки инструкции:', error);
            titleElement.textContent = 'Инструкция не найдена';
            descriptionElement.textContent = '';
            contentElement.innerHTML = `
                <p style="color: #e74c3c;">❌ ${error.message}</p>
                <p><a href="../../index.html">Вернуться на главную</a></p>
            `;
        }
    }

    function renderArticleContents(contents) {
        if (!contentsBlock || !contentsContainer) {
            return;
        }

        let parsedContents = contents;

        if (typeof parsedContents === 'string') {
            try {
                parsedContents = JSON.parse(parsedContents);
            } catch (error) {
                console.error('Ошибка чтения contents:', error);
                parsedContents = [];
            }
        }

        if (!Array.isArray(parsedContents) || parsedContents.length === 0) {
            contentsBlock.style.display = 'none';
            return;
        }

        contentsContainer.innerHTML = parsedContents.map(function (item) {
            return `
                <a class="article-contents-link" href="${item.href}">
                    ${item.title}
                </a>
            `;
        }).join('');

        contentsBlock.style.display = 'block';
    }

    loadGuide();
});