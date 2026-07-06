const API_BASE = "https://k-6a3f.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    const historyLink = document.querySelector('.nav-links a[href="#storiesSection"]');
    if (historyLink) {
        historyLink.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    }

    const faqLink = document.querySelector('.nav-links a[href="#faqSection"]');
    if (faqLink) {
        faqLink.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    }

    const wrapper = document.getElementById('storiesWrapper');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');

    if (!wrapper || !leftBtn || !rightBtn) return;

    const cardWidth = 280 + 24;

    function getVisibleCount() {
        const wrapperWidth = wrapper.clientWidth;
        const visible = Math.floor(wrapperWidth / cardWidth);
        return visible > 0 ? visible : 1;
    }

    function getMaxScroll() {
        const totalWidth = wrapper.scrollWidth;
        const visibleWidth = wrapper.clientWidth;
        return Math.max(0, totalWidth - visibleWidth);
    }

    function scrollLeft() {
        const currentScroll = wrapper.scrollLeft;
        const visibleCount = getVisibleCount();
        const step = cardWidth * visibleCount;
        const target = Math.max(0, currentScroll - step);
        wrapper.scrollTo({ left: target, behavior: 'smooth' });
    }

    function scrollRight() {
        const currentScroll = wrapper.scrollLeft;
        const visibleCount = getVisibleCount();
        const step = cardWidth * visibleCount;
        const maxScroll = getMaxScroll();
        const target = Math.min(maxScroll, currentScroll + step);
        wrapper.scrollTo({ left: target, behavior: 'smooth' });
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

    window.addEventListener('resize', () => {
        updateButtons();
    });

    setTimeout(updateButtons, 100);
});