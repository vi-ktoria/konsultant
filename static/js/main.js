document.addEventListener('DOMContentLoaded', function() {
    // ===== Плавный скролл =====
    const navbarHeight = document.querySelector('.navbar').offsetHeight;

    function smoothScroll(targetId) {
        const target = document.querySelector(targetId);
        if (target) {
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    }

    const historyLink = document.querySelector('.nav-links a[href="#storiesSection"]');
    if (historyLink) {
        historyLink.addEventListener('click', function(e) {
            e.preventDefault();
            smoothScroll('#storiesSection');
        });
    }

    const faqLink = document.querySelector('.nav-links a[href="#faqSection"]');
    if (faqLink) {
        faqLink.addEventListener('click', function(e) {
            e.preventDefault();
            smoothScroll('#faqSection');
        });
    }

    const templatesLink = document.querySelector('.nav-links a[href="#templatesSection"]');
    if (templatesLink) {
        templatesLink.addEventListener('click', function(e) {
            e.preventDefault();
            smoothScroll('#templatesSection');
        });
    }

    // ===== Рендеринг историй =====
    function renderStories() {
        const grid = document.getElementById('storiesGrid');
        if (!grid) return;

        if (!window.storiesData || window.storiesData.length === 0) {
            grid.innerHTML = `
                <p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #1a3a4a; opacity: 0.6;">
                    Истории пока не добавлены
                </p>
            `;
            return;
        }

        grid.innerHTML = '';

        window.storiesData.forEach(story => {
            const card = document.createElement('div');
            card.className = 'story-card';
            card.dataset.storyId = story.id;

            card.innerHTML = `
                <div class="story-preview">
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-excerpt">${story.excerpt || ''}</p>
                </div>
            `;

            card.addEventListener('click', function() {
                if (window.openStoryModal) {
                    window.openStoryModal(story.id);
                }
            });

            grid.appendChild(card);
        });
    }

    // Регистрируем callback для рендеринга после загрузки данных
    window.renderStoriesCallback = renderStories;

    // ===== Закрытие модального окна по клику на фон или крестик =====
    const modal = document.getElementById('storyModal');
    const closeBtn = document.getElementById('closeModalBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (window.closeStoryModal) {
                window.closeStoryModal();
            }
        });
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                if (window.closeStoryModal) {
                    window.closeStoryModal();
                }
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                if (window.closeStoryModal) {
                    window.closeStoryModal();
                }
            }
        });
    }

    // ===== Карусель историй =====
    const wrapper = document.getElementById('storiesWrapper');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');

    if (wrapper && leftBtn && rightBtn) {
        const cardWidth = 320 + 24;

        function getVisibleCount() {
            const wrapperWidth = wrapper.clientWidth;
            return Math.max(1, Math.floor(wrapperWidth / cardWidth));
        }

        function getMaxScroll() {
            return Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        }

        function scrollLeft() {
            const step = cardWidth * getVisibleCount();
            wrapper.scrollTo({ left: Math.max(0, wrapper.scrollLeft - step), behavior: 'smooth' });
        }

        function scrollRight() {
            const step = cardWidth * getVisibleCount();
            wrapper.scrollTo({ left: Math.min(getMaxScroll(), wrapper.scrollLeft + step), behavior: 'smooth' });
        }

        function updateButtons() {
            const currentScroll = wrapper.scrollLeft;
            const maxScroll = getMaxScroll();
            leftBtn.style.opacity = currentScroll > 10 ? '1' : '0.3';
            rightBtn.style.opacity = currentScroll < maxScroll - 10 ? '1' : '0.3';
        }

        leftBtn.addEventListener('click', scrollLeft);
        rightBtn.addEventListener('click', scrollRight);
        wrapper.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);
        setTimeout(updateButtons, 100);
    }

    // ===== Карусель шаблонов =====
    const templatesWrapper = document.querySelector('.templates-wrapper');
    const templatesLeftBtn = document.querySelector('.templates-scroll-left');
    const templatesRightBtn = document.querySelector('.templates-scroll-right');

    if (templatesWrapper && templatesLeftBtn && templatesRightBtn) {
        const cardWidth = 320 + 24;

        function getTemplatesVisibleCount() {
            const wrapperWidth = templatesWrapper.clientWidth;
            return Math.max(1, Math.floor(wrapperWidth / cardWidth));
        }

        function getTemplatesMaxScroll() {
            return Math.max(0, templatesWrapper.scrollWidth - templatesWrapper.clientWidth);
        }

        function templatesScrollLeft() {
            const step = cardWidth * getTemplatesVisibleCount();
            templatesWrapper.scrollTo({ left: Math.max(0, templatesWrapper.scrollLeft - step), behavior: 'smooth' });
        }

        function templatesScrollRight() {
            const step = cardWidth * getTemplatesVisibleCount();
            templatesWrapper.scrollTo({ left: Math.min(getTemplatesMaxScroll(), templatesWrapper.scrollLeft + step), behavior: 'smooth' });
        }

        function updateTemplatesButtons() {
            const currentScroll = templatesWrapper.scrollLeft;
            const maxScroll = getTemplatesMaxScroll();
            templatesLeftBtn.style.opacity = currentScroll > 10 ? '1' : '0.3';
            templatesRightBtn.style.opacity = currentScroll < maxScroll - 10 ? '1' : '0.3';
        }

        templatesLeftBtn.addEventListener('click', templatesScrollLeft);
        templatesRightBtn.addEventListener('click', templatesScrollRight);
        templatesWrapper.addEventListener('scroll', updateTemplatesButtons);
        window.addEventListener('resize', updateTemplatesButtons);
        setTimeout(updateTemplatesButtons, 100);
    }

    // Если истории уже загружены, рендерим сразу
    if (window.storiesData && window.storiesData.length > 0) {
        renderStories();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const storySlug = params.get('story');
    const faqSlug = params.get('faq');

    if (storySlug && window.openStoryModal) {
        const story = window.storiesData?.find(s => s.slug === storySlug);
        if (story) {
            window.openStoryModal(story.id);
        } else {
            fetch(`${API_BASE}/stories/${storySlug}`)
                .then(r => r.json())
                .then(s => window.openStoryModal(s.id))
                .catch(err => console.error('Ошибка загрузки истории:', err));
        }
    }

    if (faqSlug) {
        const targetFaq = document.querySelector(`.faq-item[data-slug="${faqSlug}"]`);
        if (targetFaq) {
            targetFaq.classList.add('open');
            const q = targetFaq.querySelector('.faq-question');
            const a = targetFaq.querySelector('.faq-answer');
            if (q) q.setAttribute('aria-expanded', 'true');
            if (a) a.hidden = false;
            targetFaq.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});