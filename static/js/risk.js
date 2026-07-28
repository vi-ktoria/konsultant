const params = new URLSearchParams(window.location.search);
const ARTICLE_SLUG = params.get('slug');

function showActualDate() {
    const dateBlock = document.getElementById('actualDateBlock');
    const dateElement = document.getElementById('actualDate');

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

function addDisclaimer() {
    const titleElement = document.getElementById('articleTitle');
    const disclaimer = document.createElement('p');
    disclaimer.style.fontSize = '16px';
    disclaimer.textContent = 'Информация носит справочный характер и не заменяет консультацию юриста.';
    titleElement.after(disclaimer);
}

async function loadRiskFromAPI() {
    const titleElement = document.getElementById('articleTitle');
    const descriptionElement = document.getElementById('articleDescription');
    const introElement = document.getElementById('articleIntro');
    const contentElement = document.getElementById('articleContent');

    if (!titleElement || !descriptionElement || !introElement || !contentElement) {
        console.error('На странице нет нужных блоков для вывода статьи.');
        return;
    }

    if (!ARTICLE_SLUG) {
        titleElement.textContent = 'Риск не выбран';
        descriptionElement.textContent = '';
        introElement.innerHTML = '';
        contentElement.innerHTML = '<p>Вернитесь к списку рисков и выберите материал.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/content/${ARTICLE_SLUG}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Риск не найден');
            }
            throw new Error('Ошибка загрузки');
        }

        const data = await response.json();

        document.title = data.title || 'Риск';
        titleElement.textContent = data.title || 'Без названия';
        descriptionElement.textContent = data.short_description || '';
        showActualDate();
        addDisclaimer();

        const temporaryContainer = document.createElement('div');
        temporaryContainer.innerHTML = data.content || '<p>Текст риска пока не добавлен.</p>';

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
        console.error('Ошибка загрузки риска:', error);
        titleElement.textContent = 'Риск не найден';
        descriptionElement.textContent = '';
        introElement.innerHTML = '';
        contentElement.innerHTML = `
            <p style="color: #e74c3c;">❌ ${error.message}</p>
            <p><a href="risks.html">Вернуться к списку рисков</a></p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadRiskFromAPI);