const SUPABASE_URL = 'https://znnrxmmbfgsabaacxggb.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_3GJlFjIDSmF3QzZwrWeYrw_DB4rQn6y';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadContentItems() {
  const statusBlock = document.getElementById('dbStatus');

  const { data, error } = await supabaseClient
    .from('content_items')
    .select('id, type, slug, title, short_description, category, tags')
    .eq('is_published', true)
    .limit(10);

  if (error) {
    console.error('Ошибка подключения к Supabase:', error);

    if (statusBlock) {
      statusBlock.textContent = 'Не удалось подключиться к базе данных.';
    }

    return;
  }

  console.log('Данные из Supabase:', data);

  if (statusBlock) {
    if (data.length === 0) {
      statusBlock.textContent = 'База подключена, но материалы пока не добавлены.';
    } else {
      statusBlock.textContent = `База подключена. Найдено материалов: ${data.length}`;
    }
  }
}

loadContentItems();
