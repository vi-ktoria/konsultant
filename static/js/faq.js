document.addEventListener('DOMContentLoaded', function () {
    const faqGrid = document.getElementById('faqGrid');

    if (!faqGrid) {
        console.error('Не найден блок с id="faqGrid".');
        return;
    }

    async function loadFaq() {
        const { data, error } = await supabaseClient
            .from('content_items')
            .select('id, title, content')
            .eq('type', 'faq')
            .eq('is_published', true)
            .order('id', { ascending: true });

        if (error) {
            console.error('Ошибка загрузки вопросов из Supabase:', error);

            faqGrid.innerHTML =
                '<p class="faq-status">Не удалось загрузить вопросы.</p>';

            return;
        }

        faqGrid.innerHTML = '';

        if (!data || data.length === 0) {
            faqGrid.innerHTML =
                '<p class="faq-status">Вопросы пока не добавлены.</p>';

            return;
        }

        data.forEach(function (faq) {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item';

            const faqQuestion = document.createElement('button');
            faqQuestion.className = 'faq-question';
            faqQuestion.type = 'button';
            faqQuestion.textContent = faq.title;
            faqQuestion.setAttribute('aria-expanded', 'false');

            const faqAnswer = document.createElement('div');
            faqAnswer.className = 'faq-answer';
            faqAnswer.innerHTML =
                faq.content || '<p>Ответ пока не добавлен.</p>';
            faqAnswer.hidden = true;

            faqQuestion.addEventListener('click', function () {
                const isOpen = faqItem.classList.contains('open');

                document
                    .querySelectorAll('#faqGrid .faq-item.open')
                    .forEach(function (openedItem) {
                        openedItem.classList.remove('open');

                        const openedQuestion =
                            openedItem.querySelector('.faq-question');

                        const openedAnswer =
                            openedItem.querySelector('.faq-answer');

                        openedQuestion.setAttribute(
                            'aria-expanded',
                            'false'
                        );

                        openedAnswer.hidden = true;
                    });

                if (!isOpen) {
                    faqItem.classList.add('open');
                    faqQuestion.setAttribute('aria-expanded', 'true');
                    faqAnswer.hidden = false;
                }
            });

            faqItem.appendChild(faqQuestion);
            faqItem.appendChild(faqAnswer);
            faqGrid.appendChild(faqItem);
        });
    }

    loadFaq();
});
function getTermPopupOverlay() {
    let overlay = document.querySelector('.term-popup-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'term-popup-overlay';
        overlay.hidden = true;

        document.body.appendChild(overlay);
    }

    return overlay;
}

function closeTermPopup() {
    document
        .querySelectorAll('.term-popup:not([hidden])')
        .forEach(function (popup) {
            popup.hidden = true;
        });

    document
        .querySelectorAll('.term-explanation[aria-expanded="true"]')
        .forEach(function (button) {
            button.setAttribute('aria-expanded', 'false');
        });

    const overlay = document.querySelector('.term-popup-overlay');

    if (overlay) {
        overlay.hidden = true;
    }

    document.body.classList.remove('term-popup-open');
}

document.addEventListener('click', function (event) {
    const termButton = event.target.closest('.term-explanation');

    if (termButton) {
        const popupId = termButton.dataset.popup;
        const popup = document.getElementById(popupId);

        if (!popup) {
            console.error(`Не найден блок с id="${popupId}".`);
            return;
        }

        closeTermPopup();

        /*
         * Переносим карточку в body, чтобы она не обрезалась
         * границами блока FAQ.
         */
        document.body.appendChild(popup);

        const overlay = getTermPopupOverlay();

        popup.hidden = false;
        overlay.hidden = false;

        termButton.setAttribute('aria-expanded', 'true');
        document.body.classList.add('term-popup-open');

        return;
    }

    const closeButton = event.target.closest('.term-popup-close');
    const overlay = event.target.closest('.term-popup-overlay');

    if (closeButton || overlay) {
        closeTermPopup();
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeTermPopup();
    }
});