// Отправляет введённый на главной странице адрес на страницу с картой рисков
document.addEventListener('DOMContentLoaded', function () {
    const searchWrapper = document.querySelector('.search-wrapper.has-btn');
    if (!searchWrapper) return;

    const input = searchWrapper.querySelector('.search-input');
    const button = searchWrapper.querySelector('.search-btn');

    function goToRiskMap() {
        const address = input.value.trim();
        if (!address) return;

        window.location.href = 'static/html/risk-map.html?address=' + encodeURIComponent(address);
    }

    button.addEventListener('click', goToRiskMap);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            goToRiskMap();
        }
    });
});