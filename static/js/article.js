const params = new URLSearchParams(window.location.search);
const ARTICLE_SLUG = params.get('slug');

function renderArticleContents(contents) {
    const contentsBlock = document.getElementById('articleContentsBlock');
    const contentsContainer = document.getElementById('articleContents');

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

    contentsContainer.innerHTML = parsedContents.map((item) => {
        return `
            <a class="article-contents-link" href="${item.href}">
                ${item.title}
            </a>
        `;
    }).join('');

    contentsBlock.style.display = 'block';
}

async function loadArticleFromAPI() {
    const titleElement = document.getElementById('articleTitle');
    const descriptionElement = document.getElementById('articleDescription');
    const introElement = document.getElementById('articleIntro');
    const contentElement = document.getElementById('articleContent');

    if (!titleElement || !descriptionElement || !introElement || !contentElement) {
        console.error('На странице нет нужных блоков для вывода статьи.');
        return;
    }

    if (!ARTICLE_SLUG) {
        titleElement.textContent = 'Статья не выбрана';
        descriptionElement.textContent = '';
        introElement.innerHTML = '';
        contentElement.innerHTML = '<p>Вернитесь к списку статей и выберите материал.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/content/${ARTICLE_SLUG}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Статья не найдена');
            }
            throw new Error('Ошибка загрузки статьи');
        }

        const data = await response.json();

        document.title = data.title || 'Статья';
        titleElement.textContent = data.title || 'Без названия';
        descriptionElement.textContent = data.short_description || '';

        const temporaryContainer = document.createElement('div');
        temporaryContainer.innerHTML = data.content || '<p>Текст статьи пока не добавлен.</p>';

        const firstArticleHeading = temporaryContainer.querySelector('h2');

        introElement.innerHTML = '';
        contentElement.innerHTML = '';

        if (firstArticleHeading) {
            let currentNode = temporaryContainer.firstChild;

            while (currentNode && currentNode !== firstArticleHeading) {
                const nextNode = currentNode.nextSibling;
                introElement.appendChild(currentNode);
                currentNode = nextNode;
            }

            while (temporaryContainer.firstChild) {
                contentElement.appendChild(temporaryContainer.firstChild);
            }
        } else {
            while (temporaryContainer.firstChild) {
                introElement.appendChild(temporaryContainer.firstChild);
            }
        }

        introElement.style.display = introElement.textContent.trim() ? 'block' : 'none';
        contentElement.style.display = contentElement.textContent.trim() ? 'block' : 'none';

        renderArticleContents(data.contents);

    } catch (error) {
        console.error('Ошибка загрузки статьи:', error);
        titleElement.textContent = 'Статья не найдена';
        descriptionElement.textContent = '';
        introElement.innerHTML = '';
        contentElement.innerHTML = `
            <p style="color: #e74c3c;">❌ ${error.message}</p>
            <p><a href="articles.html">Вернуться к списку статей</a></p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadArticleFromAPI);