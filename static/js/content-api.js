async function getPublishedContentItems() {
  const { data, error } = await supabaseClient
    .from('content_items')
    .select('id, type, slug, title, short_description, category, tags')
    .eq('is_published', true)
    .order('id', { ascending: true });

  if (error) {
    console.error('Ошибка загрузки материалов:', error);
    return [];
  }

  return data || [];
}

async function getContentItemBySlug(slug) {
  const { data, error } = await supabaseClient
    .from('content_items')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Ошибка загрузки материала:', error);
    return null;
  }

  return data;
}

async function searchContentItems(query) {
  const cleanQuery = query
    .trim()
    .replaceAll(',', ' ')
    .replaceAll('%', ' ');

  if (cleanQuery.length < 2) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('content_items')
    .select('id, type, slug, title, short_description, category, tags')
    .eq('is_published', true)
    .or(
      `title.ilike.%${cleanQuery}%,short_description.ilike.%${cleanQuery}%,tags.ilike.%${cleanQuery}%,search_text.ilike.%${cleanQuery}%`
    )
    .limit(20);

  if (error) {
    console.error('Ошибка поиска:', error);
    return [];
  }

  return data || [];
}
