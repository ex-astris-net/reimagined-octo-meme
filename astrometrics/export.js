const exportButton = document.getElementById('discourse-export');
exportButton.addEventListener('click', showExportWindow);

function showExportWindow() {
    const modal = document.getElementById('export-modal');
    const textbox = document.getElementById('export-textbox');

    const exportHTML = Object.entries(system.bodies).map(([id, body]) => {
        const node = makeContactNode(body);
        return cleanHTML(node.outerHTML);
    }).join('');

    textbox.value = exportHTML;

  modal.classList.remove('hidden');
}

function cleanHTML(html) {
  return html.replace(/>\s+</g, '><').trim();
}

function makeContactNode(body) {
    const cls = body.class;
    const def = CLASSES[cls];

    const entry = document.createElement('div');
    entry.className = 'contact-entry';
    entry.innerHTML = `
        <div class="contact-meta">
        <span class="contact-class" style="color:${def.color}">${cls}</span>
        <div class="contact-basic">
            <h2 class="contact-name">${body.name}</h2>
            <span class="contact-type" style="background-color:${def.color}80">${def.label}</span>
        </div>
        <span class="contact-metric">
            ${body.mass ? `<span class="metric-label">Mass</span>
            <span>${body.mass} ${(body.class === 'S' || body.class === 'T') ? 'Mo' : 'Me'}</span>` : ''}
        </span>
        <span class="contact-metric">
            ${body.orbit ? `<span class="metric-label">Orbit</span>
            <span>${body.orbit} AU</span>` : ''}
        </span>
        </div>

        ${body.notes ? `<div class="contact-notes contact-expanded">
        <span class="metric-label">NOTES</span> <span>${body.notes || ''}</span>
        </div>` : ''}

        ${ifExtrasExist(body.extras) ? `<div class="contact-extras contact-expanded">
        ${body.extras ? Object.entries(body.extras)
            .filter(([k, v]) => v != null && v !== '')
            .map(([k, v]) => `<span class="contact-metric"><span class="metric-label">${k}</span><span>${v}</span></span>`)
            .join('') : ''}
        </div>` : ''}
    `;

    return entry;
}

document.getElementById('close-modal').onclick = () => {
  document.getElementById('export-modal').classList.add('hidden');
};

document.getElementById('export-modal').onclick = (e) => {
  if (e.target.id === 'export-modal') {
    e.currentTarget.classList.add('hidden');
  }
};