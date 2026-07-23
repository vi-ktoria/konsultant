document.addEventListener('DOMContentLoaded', function() {
    const termsContainer = document.getElementById('termsContent');
    const TERMS_SLUG = 'polzovatelskoe-soglashenie';

    async function loadTerms() {
        try {
            if (typeof API_BASE === 'undefined') {
                throw new Error('API_BASE не определён. Проверьте config.js');
            }

            console.log('Загрузка пользовательского соглашения из:', `${API_BASE}/content/${TERMS_SLUG}`);

            const response = await fetch(`${API_BASE}/content/${TERMS_SLUG}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Соглашение не найдено');
                }
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Обновляем заголовок страницы
            document.title = data.title || 'Пользовательское соглашение';

            // Рендерим содержимое
            termsContainer.innerHTML = data.content || '<p>Текст соглашения пока не добавлен.</p>';

        } catch (error) {
            console.error('Ошибка загрузки соглашения:', error);
            termsContainer.innerHTML = `
                <div class="terms-error">
                    <p>❌ Не удалось загрузить пользовательское соглашение</p>
                    <p style="font-size: 14px; opacity: 0.7;">${error.message}</p>
                    <a href="/index.html" class="terms-back-link">← Вернуться на главную</a>
                </div>
            `;
        }
    }

    loadTerms();
});