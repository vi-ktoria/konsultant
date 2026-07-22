document.addEventListener('DOMContentLoaded', function() {
    const navbarContainer = document.getElementById('navbarContainer');
    if (!navbarContainer) return;

    // Проверяем, загружен ли уже навбар
    if (navbarContainer.dataset.loaded === 'true') return;

    fetch('/static/html/components/navbar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить навбар');
            }
            return response.text();
        })
        .then(html => {
            navbarContainer.innerHTML = html;
            navbarContainer.dataset.loaded = 'true';
            
            // Подсвечиваем активную ссылку
            const currentPath = window.location.pathname;
            const links = navbarContainer.querySelectorAll('.nav-links a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPath || 
                    (currentPath.includes('/static/html/') && href.includes('/static/html/') && href === currentPath) ||
                    (currentPath === '/' && href === '/index.html')) {
                    link.classList.add('active');
                }
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки навбара:', error);
        });
});