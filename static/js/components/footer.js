document.addEventListener('DOMContentLoaded', function() {
    const footerContainer = document.getElementById('footerContainer');
    if (!footerContainer) return;

    if (footerContainer.dataset.loaded === 'true') return;

    fetch('/static/html/components/footer.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить футер');
            }
            return response.text();
        })
        .then(html => {
            footerContainer.innerHTML = html;
            footerContainer.dataset.loaded = 'true';
        })
        .catch(error => {
            console.error('Ошибка загрузки футера:', error);
        });
});