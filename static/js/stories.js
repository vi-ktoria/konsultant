window.storiesData = [];

function createStoryExcerpt(html) {
    const container = document.createElement('div');
    container.innerHTML = html || '';

    const paragraphs = Array.from(container.querySelectorAll('p'));

    const firstTextParagraph = paragraphs.find(function (paragraph) {
        const text = paragraph.textContent.trim();

        return (
            text &&
            text !== 'Истории из жизни' &&
            !text.startsWith('№') &&
            !text.startsWith('Источник:') &&
            !text.startsWith('(гиперссылка:')
        );
    });

    if (!firstTextParagraph) {
        return '';
    }

    const text = firstTextParagraph.textContent.trim();

    if (text.length <= 260) {
        return text;
    }

    return text.slice(0, 260).trim() + '...';
}

async function loadStoriesFromAPI() {
    try {
        if (typeof API_BASE === 'undefined') {
            throw new Error('API_BASE не определён. Проверьте config.js');
        }

        console.log('Загрузка историй из API:', `${API_BASE}/stories?limit=50`);

        const response = await fetch(`${API_BASE}/stories?limit=50`);

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();

        window.storiesData = (data || []).map(function (story) {
            return {
                id: story.id,
                slug: story.slug,
                title: story.title,
                excerpt: createStoryExcerpt(story.content),
                content: story.content
            };
        });

        console.log('Загружено историй:', window.storiesData.length);

        if (window.renderStoriesCallback) {
            window.renderStoriesCallback();
        }

    } catch (error) {
        console.error('Ошибка загрузки историй из API:', error);
        window.storiesData = [];
    }
}

// ===== Открытие модального окна =====
async function openStoryModal(storyId) {
    const modal = document.getElementById('storyModal');
    const modalContent = document.getElementById('modalContent');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    try {
        const story = window.storiesData.find(s => s.id === storyId);

        if (!story) {
            throw new Error('История не найдена');
        }

        modalBody.innerHTML = `
            <div class="modal-content-text">${story.content || ''}</div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (modalContent) {
            modalContent.scrollTop = 0;
        }

        window.scrollTo({ top: 1000, behavior: 'smooth' });

    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        modalBody.innerHTML = `
            <p style="color: #e74c3c;">Не удалось загрузить историю</p>
        `;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (modalContent) {
            modalContent.scrollTop = 0;
        }

        window.scrollTo({ top: 1000, behavior: 'smooth' });
    }
}

// ===== Закрытие модального окна =====
function closeStoryModal() {
    const modal = document.getElementById('storyModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Делаем функции доступными глобально
window.openStoryModal = openStoryModal;
window.closeStoryModal = closeStoryModal;

// Загружаем истории. Промис сохраняем, чтобы другие скрипты
// могли дождаться (await window.storiesLoaded) полной загрузки данных.
window.storiesLoaded = loadStoriesFromAPI();