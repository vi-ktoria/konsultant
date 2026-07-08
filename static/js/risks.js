const riskCards = document.querySelectorAll('.risks-card');

riskCards.forEach((card) => {
  card.addEventListener('toggle', () => {
    if (card.open) {
      riskCards.forEach((otherCard) => {
        if (otherCard !== card) {
          otherCard.removeAttribute('open');
        }
      });
    }
  });
});
