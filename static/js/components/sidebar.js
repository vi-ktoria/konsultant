document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (!sidebarContainer) return;

    if (sidebarContainer.dataset.loaded === 'true') return;

    fetch('/static/html/components/sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить боковую панель');
            }
            return response.text();
        })
        .then(html => {
            sidebarContainer.innerHTML = html;
            sidebarContainer.dataset.loaded = 'true';

            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop() || 'index.html';

            if ((currentPage === 'start-guide.html') || (currentPage === 'index.html')) {
                const startCard = sidebarContainer.querySelector('.article-start-card');
                if (startCard) startCard.style.display = 'none';
            }

            if (currentPage === 'risks.html') {
                const risksLink = sidebarContainer.querySelector('.nav-list a[href="risks.html"]');
                if (risksLink) {
                    const li = risksLink.closest('li');
                    if (li) li.style.display = 'none';
                }
            }

            if (currentPage === 'regions.html') {
                const regionsLink = sidebarContainer.querySelector('.nav-list a[href="regions.html"]');
                if (regionsLink) {
                    const li = regionsLink.closest('li');
                    if (li) li.style.display = 'none';
                }
            }

            if (currentPage === 'rieltor.html') {
                const rieltorLink = sidebarContainer.querySelector('.nav-list a[href="rieltor.html"]');
                if (rieltorLink) {
                    const li = rieltorLink.closest('li');
                    if (li) li.style.display = 'none';
                }
            }

            if (typeof initSearch === 'function') {
                initSearch();
            }
            
        })
        .catch(error => {
            console.error('Ошибка загрузки боковой панели:', error);
        });

    if (typeof initSearch === 'function') {
        initSearch();
    }
});