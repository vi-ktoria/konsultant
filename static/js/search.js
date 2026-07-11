const searchInputs = document.querySelectorAll('[data-search-input]');

searchInputs.forEach((input) => {
  const resultsSelector = input.dataset.results;
  const resultsBlock = document.querySelector(resultsSelector);

  if (!resultsBlock) return;

  input.addEventListener('input', async () => {
    const query = input.value.trim();

    if (query.length < 2) {
      resultsBlock.innerHTML = '';
      return;
    }

    const results = await searchContentItems(query);

    if (results.length === 0) {
      resultsBlock.innerHTML = '<p class="search-empty">Ничего не найдено</p>';
      return;
    }

    resultsBlock.innerHTML = results.map((item) => {
      const link = item.type === 'article'
        ? `article.html?slug=${item.slug}`
        : '#';

      return `
        <a class="search-result-card" href="${link}">
          <h4>${item.title}</h4>
          <p>${item.short_description || ''}</p>
        </a>
      `;
    }).join('');
  });
});
