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