document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const storySlug = params.get('story');
    const faqSlug = params.get('faq');

    if (storySlug) {
        await handleStoryParam(storySlug);
    }

    if (faqSlug) {
        await handleFaqParam(faqSlug);
    }
});

async function handleStoryParam(storySlug) {
    // Ждём, пока stories.js закончит загрузку данных с бэкенда
    if (window.storiesLoaded) {
        await window.storiesLoaded;
    }

    const story = window.storiesData?.find(s => s.slug === storySlug);

    if (story && typeof window.openStoryModal === 'function') {
        window.openStoryModal(story.id);
    } else {
        console.warn('История со slug "' + storySlug + '" не найдена в загруженных данных');
    }
}

async function handleFaqParam(faqSlug) {
    // Ждём, пока faq.js закончит загрузку и отрисовку вопросов
    if (window.faqLoaded) {
        await window.faqLoaded;
    }

    const targetFaq = document.querySelector('.faq-item[data-slug="' + faqSlug + '"]');

    if (!targetFaq) {
        console.warn('FAQ со slug "' + faqSlug + '" не найден');
        return;
    }

    document.querySelectorAll('.faq-item.open').forEach(function (item) {
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
document.addEventListener('DOMContentLoaded', function() {
    // ===== Обработка кликов по ссылкам на истории =====
    document.querySelectorAll('.story-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const href = this.getAttribute('href');
            // Извлекаем slug из ссылки
            const match = href.match(/[?&]story=([^&]+)/);
            if (match) {
                const slug = decodeURIComponent(match[1]);
                openStoryBySlug(slug);
            }
        });
    });
});

// Функция для открытия истории по slug
function openStoryBySlug(slug) {
    if (typeof window.openStoryModal === 'function') {
        // Ищем историю в загруженных данных
        const story = window.storiesData?.find(s => s.slug === slug);
        if (story) {
            window.openStoryModal(story.id);
        } else {
            // Если нет в данных — загружаем по slug через API
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
}