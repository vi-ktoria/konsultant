document.addEventListener('DOMContentLoaded', loadDocumentTemplates);

async function loadDocumentTemplates() {
    const templatesGrid = document.getElementById('templatesGrid');

    if (!templatesGrid) {
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase-клиент не подключён');

        templatesGrid.innerHTML =
            '<p class="templates-status">Не удалось загрузить шаблоны.</p>';

        return;
    }

    try {
        const { data: templates, error } = await supabaseClient
            .from('document_templates')
            .select(`
                id,
                slug,
                title,
                short_description,
                preview_image_url,
                sort_order
            `)
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

        if (error) {
            throw error;
        }

        templatesGrid.innerHTML = '';

        if (!templates || templates.length === 0) {
            templatesGrid.innerHTML =
                '<p class="templates-status">Шаблоны пока не добавлены.</p>';

            return;
        }

        templates.forEach((template) => {
            const card = createTemplateCard(template);
            templatesGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);

        templatesGrid.innerHTML =
            '<p class="templates-status">Не удалось загрузить шаблоны.</p>';
    }
}

function createTemplateCard(template) {
    const card = document.createElement('div');

    card.className = 'template-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.setAttribute(
        'aria-label',
        `Открыть шаблон: ${template.title}`
    );

    const openTemplate = () => {
        const slug = encodeURIComponent(template.slug);

        window.location.href =
            `static/html/template_viewer.html?slug=${slug}`;
    };

    card.addEventListener('click', openTemplate);

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openTemplate();
        }
    });

    if (template.preview_image_url) {
        const image = document.createElement('img');

        image.src = template.preview_image_url;
        image.alt = template.title;
        image.className = 'template-image';
        image.loading = 'lazy';

        card.appendChild(image);
    } else {
        const preview = document.createElement('div');
        preview.className = 'template-preview';

        const placeholder = document.createElement('div');
        placeholder.className = 'template-image-placeholder';

        preview.appendChild(placeholder);
        card.appendChild(preview);
    }

    const overlay = document.createElement('div');
    overlay.className = 'template-overlay';

    const title = document.createElement('h3');
    title.className = 'template-title';
    title.textContent = template.title;

    const linkText = document.createElement('p');
    linkText.className = 'template-excerpt';
    linkText.textContent = 'Открыть шаблон →';

    overlay.appendChild(title);
    overlay.appendChild(linkText);
    card.appendChild(overlay);

    return card;
}