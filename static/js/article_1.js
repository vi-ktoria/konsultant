const ARTICLE_SLUG = 'zavereniya-ob-obstoyatelstvah-st-431-2-gk-rf-chto-eto-takoe-i-v-chem-ih-polza-pri-pokupke-nedvizhimosti-i-ne-tolko';

function renderArticleContents(contents) {
  const contentsBlock = document.getElementById('articleContentsBlock');
  const contentsContainer = document.getElementById('articleContents');

  if (!contentsBlock || !contentsContainer) {
    return;
  }

  let parsedContents = contents;

  if (typeof parsedContents === 'string') {
    try {
      parsedContents = JSON.parse(parsedContents);
    } catch (error) {
      console.error('Ошибка чтения contents:', error);
      parsedContents = [];
    }
  }

  if (!Array.isArray(parsedContents) || parsedContents.length === 0) {
    contentsBlock.style.display = 'none';
    return;
  }

  contentsContainer.innerHTML = parsedContents.map((item) => {
    return `
      <a class="article-contents-link" href="${item.href}">
        ${item.title}
      </a>
    `;
  }).join('');

  contentsBlock.style.display = 'block';
}

async function loadRiskArticleFromDatabase() {
  const titleElement = document.getElementById('articleTitle');
  const descriptionElement = document.getElementById('articleDescription');
  const contentElement = document.getElementById('articleContent');

  if (!titleElement || !descriptionElement || !contentElement) {
    console.error('На странице нет нужных блоков для вывода статьи.');
    return;
  }

  const { data, error } = await supabaseClient
    .from('content_items')
    .select('*')
    .eq('slug', ARTICLE_SLUG)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Ошибка загрузки статьи из Supabase:', error);
    titleElement.textContent = 'Статья не найдена';
    descriptionElement.textContent = '';
    contentElement.innerHTML = '<p>Проверьте slug статьи и поле is_published в базе данных.</p>';
    return;
  }

  document.title = data.title || 'Статья';

  titleElement.textContent = data.title || 'Без названия';
  descriptionElement.textContent = data.short_description || '';
  contentElement.innerHTML = data.content || '<p>Текст статьи пока не добавлен.</p>';

  renderArticleContents(data.contents);
}

loadRiskArticleFromDatabase();