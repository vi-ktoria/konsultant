/**
 * Превращает short_description из базы в отдельные абзацы.
 */
function renderRiskDescription(container, description) {
  if (!container || !description || !description.trim()) {
    return;
  }

  const paragraphs = description
    .trim()
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim());

  container.replaceChildren();

  paragraphs.forEach((paragraphText) => {
    const paragraph = document.createElement('p');

    paragraph.textContent = paragraphText
      .trim()
      .replace(/\s*\n\s*/g, ' ');

    container.appendChild(paragraph);
  });
}

/**
 * Загружает названия и краткие описания рисков из Supabase.
 */
async function loadRiskCards() {
  const cards = document.querySelectorAll(
    '.risks-card[data-risk-slug]'
  );

  if (cards.length === 0) {
    return;
  }

  try {
    const contentItems = await getPublishedContentItems();

    const risksBySlug = new Map(
      contentItems
        .filter((item) => item.type === 'risk')
        .map((risk) => [risk.slug, risk])
    );

    cards.forEach((card) => {
      const slug = card.dataset.riskSlug;
      const risk = risksBySlug.get(slug);

      if (!risk) {
        console.warn(`Риск со slug "${slug}" не найден в базе`);
        return;
      }

      const titleElement = card.querySelector(
        '[data-risk-title]'
      );

      const descriptionElement = card.querySelector(
        '[data-risk-description]'
      );

      if (titleElement && risk.title) {
        titleElement.textContent = risk.title;
      }

      renderRiskDescription(
        descriptionElement,
        risk.short_description
      );
    });
  } catch (error) {
    console.error(
      'Не удалось загрузить карточки рисков:',
      error
    );
  }
}

/**
 * Оставляет открытой только одну карточку риска.
 */
function enableRiskAccordions() {
  const riskCards = document.querySelectorAll('.risks-card');

  riskCards.forEach((card) => {
    card.addEventListener('toggle', () => {
      if (!card.open) {
        return;
      }

      riskCards.forEach((otherCard) => {
        if (otherCard !== card) {
          otherCard.removeAttribute('open');
        }
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadRiskCards();
  enableRiskAccordions();
});