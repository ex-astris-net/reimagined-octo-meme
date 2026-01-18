export function createPinnedTooltip(selector) {
  const el = d3.select(selector);

  function show(d) {
    el.classed('hidden', false)
      .html(`
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${d.title}</strong>
          <button class="close-btn">✕</button>
        </div>
        <div style="margin-top:6px;">
          <div><strong>Date:</strong> ${d.date.toDateString()}</div>
          <div><strong>Category:</strong> ${d.lane}</div>
          <div>${stripHTML(d.first_post.raw).substring(0,500)}...</div>
          ${
            d.url
              ? `<div><a href="${d.url}" target="_blank">${d.url}</a></div>`
              : ''
          }
        </div>
      `);

    el.select('.close-btn')
      .on('click', () => hide());
  }

  function hide() {
    el.classed('hidden', true);
  }

  return { show, hide };
}

function stripHTML(html) {
  return html
    // remove BBCode blocks and tags
    .replace(/\[[^\]]*?\]/g, '')
    // remove script/style blocks
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    // remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // preserve spacing for common block tags
    .replace(/<(br|\/p|\/div|\/li)>/gi, ' ')
    // remove all remaining HTML tags
    .replace(/<\/?[^>]+>/g, '')
    // normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}


