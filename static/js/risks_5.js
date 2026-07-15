const ARTICLE_SLUG = 'riski-pri-pokupke-kvartiry-poluchennoy-v-nasledstvo-skrytye-nasledniki-osparivanie-sdelok-i-zashchita-pokupatelya';

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
const introElement = document.getElementById('articleIntro');
const contentElement = document.getElementById('articleContent');

  if (!titleElement || !descriptionElement || !introElement || !contentElement) {
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

const temporaryContainer = document.createElement('div');

temporaryContainer.innerHTML =
    data.content || '<p>Текст статьи пока не добавлен.</p>';

const firstArticleHeading = temporaryContainer.querySelector('h2');

introElement.innerHTML = '';
contentElement.innerHTML = '';

if (firstArticleHeading) {
    let currentNode = temporaryContainer.firstChild;

    /*
     * Всё, что находится до первого h2,
     * считается кратким содержанием статьи.
     */
    while (currentNode && currentNode !== firstArticleHeading) {
        const nextNode = currentNode.nextSibling;
        introElement.appendChild(currentNode);
        currentNode = nextNode;
    }

    /*
     * Первый h2 и весь оставшийся текст
     * отправляются в основной блок статьи.
     */
    while (temporaryContainer.firstChild) {
        contentElement.appendChild(temporaryContainer.firstChild);
    }
} else {
    /*
     * Если h2 в статье нет, показываем весь текст
     * как вводную часть.
     */
    while (temporaryContainer.firstChild) {
        introElement.appendChild(temporaryContainer.firstChild);
    }
}

introElement.style.display =
    introElement.textContent.trim() ? 'block' : 'none';

contentElement.style.display =
    contentElement.textContent.trim() ? 'block' : 'none';

renderArticleContents(data.contents);
}

loadRiskArticleFromDatabase();