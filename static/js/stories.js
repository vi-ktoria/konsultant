window.storiesData = [];

function createStoryExcerpt(html) {
    const container = document.createElement('div');
    container.innerHTML = html || '';

    const paragraphs = Array.from(container.querySelectorAll('p'));

    const firstTextParagraph = paragraphs.find(function (paragraph) {
        const text = paragraph.textContent.trim();

        return (
            text &&
            text !== 'Истории из жизни' &&
            !text.startsWith('№') &&
            !text.startsWith('Источник:') &&
            !text.startsWith('(гиперссылка:')
        );
    });

    if (!firstTextParagraph) {
        return '';
    }

    const text = firstTextParagraph.textContent.trim();

    if (text.length <= 260) {
        return text;
    }

    return text.slice(0, 260).trim() + '...';
}

async function loadStoriesFromDatabase() {
    const { data, error } = await supabaseClient
        .from('content_items')
        .select('id, title, content')
        .eq('type', 'story')
        .eq('is_published', true)
        .order('id', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки историй из Supabase:', error);
        window.storiesData = [];
        return;
    }

    window.storiesData = (data || []).map(function (story) {
        return {
            id: story.id,
            title: story.title,
            excerpt: createStoryExcerpt(story.content),
            content: story.content
        };
    });
}

window.storiesLoaded = loadStoriesFromDatabase();