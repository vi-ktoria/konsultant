// Отправляет введённый на главной странице адрес на страницу с картой рисков
// + хранит последние 10 адресов в localStorage
document.addEventListener('DOMContentLoaded', function () {
    const searchWrapper = document.querySelector('.search-wrapper.has-btn');
    if (!searchWrapper) return;

    const input = searchWrapper.querySelector('.search-input');
    const button = searchWrapper.querySelector('.search-btn');

    const HISTORY_KEY = 'riskMapAddressHistory';
    const MAX_HISTORY = 10;

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveToHistory(address) {
        let history = getHistory().filter(a => a !== address);
        history.unshift(address);
        history = history.slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function goToRiskMap(address) {
        if (!address) return;
        saveToHistory(address);
        window.location.href = 'static/html/risk-map.html?address=' + encodeURIComponent(address);
    }

    button.addEventListener('click', () => goToRiskMap(input.value.trim()));

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            goToRiskMap(input.value.trim());
        }
    });

    // ===== История поиска =====
    const historyList = document.createElement('div');
    historyList.className = 'address-history';
    searchWrapper.appendChild(historyList);

    function renderHistory() {
        const history = getHistory();
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.style.display = 'none';
            return;
        }

        historyList.style.display = 'block';
        history.forEach(address => {
            const item = document.createElement('div');
            item.className = 'address-history-item';
            item.textContent = address;
            item.addEventListener('click', () => goToRiskMap(address));
            historyList.appendChild(item);
        });
    }

    input.addEventListener('focus', renderHistory);

    document.addEventListener('click', function (e) {
        if (!searchWrapper.contains(e.target)) {
            historyList.style.display = 'none';
        }
    });

    renderHistory();
});