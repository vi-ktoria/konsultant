document.addEventListener('DOMContentLoaded', loadTemplate);

async function loadTemplate() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    const titleEl = document.getElementById('docTitle');
    const container = document.getElementById('docContainer');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!slug) {
        showError('Документ не найден');
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase-клиент не подключён');
        showError('Не удалось подключиться к базе данных');
        return;
    }

    downloadBtn.disabled = true;

    try {
        const { data: template, error } = await supabaseClient
            .from('document_templates')
            .select(`
                slug,
                title,
                download_file_url,
                download_filename
            `)
            .eq('slug', slug)
            .eq('is_published', true)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!template) {
            showError('Документ не найден');
            return;
        }

        if (!template.download_file_url) {
            showError('Файл документа не добавлен');
            return;
        }

        titleEl.textContent = template.title;
        document.title = `${template.title} — Недвижимость без риска`;

        await renderDocument(template.download_file_url);

        downloadBtn.disabled = false;

        downloadBtn.addEventListener('click', async function () {
            await downloadDocument(
                template.download_file_url,
                template.download_filename || `${template.title}.docx`
            );
        });
    } catch (error) {
        console.error('Ошибка загрузки документа:', error);
        showError('Не удалось загрузить документ');
    }

    async function renderDocument(fileUrl) {
    const separator = fileUrl.includes('?') ? '&' : '?';
    const freshFileUrl = `${fileUrl}${separator}v=${Date.now()}`;

    const response = await fetch(freshFileUrl, {
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `Файл не загрузился. Код ответа: ${response.status}`
        );
    }

    const blob = await response.blob();

    console.log('Тип файла:', blob.type);
    console.log('Размер файла:', blob.size);
    console.log('Адрес файла:', freshFileUrl);

    if (blob.size === 0) {
        throw new Error('Получен пустой файл');
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'docx-wrapper';

    container.appendChild(wrapper);

    try {
        await docx.renderAsync(blob, wrapper);
    } catch (renderError) {
        console.error('Ошибка docx-preview:', renderError);

        throw new Error(
            `Не удалось разобрать DOCX: ${
                renderError.message || String(renderError)
            }`
        );
    }
}

    async function downloadDocument(fileUrl, filename) {
        const originalText = downloadBtn.textContent;

        try {
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Загрузка...';

            const response = await fetch(fileUrl);

            if (!response.ok) {
                throw new Error('Не удалось скачать файл');
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = objectUrl;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Ошибка скачивания:', error);
            alert('Не удалось скачать документ');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
        }
    }

    function showError(message) {
        titleEl.textContent = 'Документ не найден';

        container.innerHTML = `
            <div class="loading">
                ❌ ${message}
            </div>
        `;

        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    }
}