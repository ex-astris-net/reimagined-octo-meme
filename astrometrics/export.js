const exportButton = document.getElementById('discourse-export');
exportButton.addEventListener('click', showExportWindow);

function showExportWindow() {
    const modal = document.getElementById('export-modal');
    const textbox = document.getElementById('export-textbox');

    const exportHTML = system.bodies.map(body => {
      const node = makeContactNode(body);
      return cleanHTML(node);
    }).join('\n\n');

    textbox.value = exportHTML;

  modal.classList.remove('hidden');
}

const INLINE_TAGS = new Set(['span', 'a', 'strong', 'em', 'b', 'i', 'br', 'h2']);

function cleanHTML(node, indent = 0) {
  const pad = '  '.repeat(indent);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    return text ? text : '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName.toLowerCase();
  const attrs = Array.from(node.attributes)
    .map(a => `${a.name}="${a.value}"`)
    .join(' ');
  const opening = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;

  if (tag === 'br') return `${pad}${opening}`;

  const isInline = INLINE_TAGS.has(tag);

  const children = Array.from(node.childNodes)
    .map(c => cleanHTML(c, isInline ? 0 : indent + 1))
    .filter(Boolean);

  if (children.length === 0) return `${pad}${opening}</${tag}>`;

  if (isInline) {
    return `${pad}${opening}${children.join('')}</${tag}>`;
  }

  return `${pad}${opening}\n${children.join('\n')}\n${pad}</${tag}>`;
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

        ${body.notes ? `<div class="contact-notes">
        <span class="metric-label">NOTES</span> <span>${body.notes || ''}</span>
        </div>` : ''}

        ${ifExtrasExist(body.extras) ? `<div class="contact-extras">
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