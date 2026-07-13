const DOC_CONFIG = {
    'dogovor-kupli-prodaji': {
        title: 'Договор купли-продажи',
        file: '../images/Договор купли-продажи.docx'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const titleEl = document.getElementById('docTitle');
    const container = document.getElementById('docContainer');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!slug || !DOC_CONFIG[slug]) {
        titleEl.textContent = 'Документ не найден';
        container.innerHTML = '<p style="text-align:center;padding:40px;color:#e74c3c;">❌ Документ не найден</p>';
        if (downloadBtn) downloadBtn.style.display = 'none';
        return;
    }

    const config = DOC_CONFIG[slug];
    titleEl.textContent = config.title;

    async function loadDocument() {
        try {
            const response = await fetch(config.file);
            if (!response.ok) {
                throw new Error('Файл не найден');
            }
            const blob = await response.blob();
            
            container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'docx-wrapper';
            container.appendChild(wrapper);

            await docx.renderAsync(blob, wrapper);
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#e74c3c;">
                    <p>Не удалось загрузить документ</p>
                    <p style="font-size:14px;opacity:0.7;">${error.message}</p>
                </div>
            `;
        }
    }

    loadDocument();

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const link = document.createElement('a');
            link.href = config.file;
            link.download = config.title + '.docx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
});