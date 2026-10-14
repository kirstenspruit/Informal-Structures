// Note: channels/ {{channel-slug}} ?direction=...
fetch('https://api.are.na/v2/channels/building-context?direction=desc&per=100')
.then(r => r.json())
.then(channel => {

const main = document.getElementById('channel');
const description = channel.metadata?.description;

main.innerHTML = `
    <header class="channel__header">
        <h1 class="channel__title"></h1>
        ${description ? `<div class="channel__description"></div>` : ''}
    </header>
    <ul class="list-reset channel__blocks"></ul>
`;

main.querySelector('.channel__title').textContent = channel.title;
if (description) {
main.querySelector('.channel__description').textContent = description;
}

const list = main.querySelector('.channel__blocks');

function blockMeta(block) {
const creator = block.user?.full_name || block.user?.username;
const connector = block.connected_by_username;
const date = formatDate(block.connected_at);

const byline = (creator && connector && creator !== connector)
    ? `${connector} (added block by ${creator})`
    : (connector || creator || 'Unknown');

return `<p class="block__meta">${byline} · ${date}</p>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

(channel.contents || []).forEach(block => {
    const type = block.class.toLowerCase();
    const li = document.createElement('li');
    li.className = `block block--${type}`;

    if (block.class === 'Link') {
    li.innerHTML = `
        <article class="block__inner">
        <h2 class="block__title">
            <a class="block__link link-arrow" href="${block.source?.url || '#'}">${block.title || block.source?.url}</a>
        </h2>
        ${block.description ? `<p class="block__description">${block.description}</p>` : ''}
        <div class="block__meta POI">${blockMeta(block)}</div>
        </article>
    `;
    } else if (block.class === 'Image') {
    li.innerHTML = `
        <figure class="block__inner">
        <img class="block__image" src="${block.image?.display?.url}" alt="${block.title || ''}">
        ${block.title || block.content_html ? `
            <figcaption class="block__caption">
            ${block.title ? `<h2 class="block__title">${block.title}</h2>` : ''}
            </figcaption>` : ''}
        <div class="block__meta POI">${blockMeta(block)}</div>
        </figure>
    `;
    } else if (block.class === 'Text') {
    li.innerHTML = `
        <article class="block__inner">
        ${block.title ? `<h2 class="block__title">${block.title}</h2>` : ''}
        <div class="block__content">${block.content_html || ''}</div>
        <div class="block__meta POI">${blockMeta(block)}</div>
        </article>
    `;
    } else if (block.class === 'Media') {
    li.innerHTML = `
        <figure class="block__inner">
        ${block.title ? `<h2 class="block__title">${block.title}</h2>` : ''}
        <div class="block__embed">${block.embed?.html || ''}</div>
        ${block.content_html ? `<figcaption class="block__caption"><div class="block__content">${block.content_html}</div></figcaption>` : ''}
        <div class="block__meta POI">${blockMeta(block)}</div>
        </figure>
    `;
    } else if (block.class === 'Attachment') {
    const file = block.attachment || {};
    const fileUrl = file.url || '';
    const mime = file.content_type || '';
    const isAudio = mime.startsWith('audio/');
    const title = block.title || file.file_name || 'Untitled';

    li.innerHTML = `
        <figure class="block__inner">
        ${block.image?.display?.url ? `<img class="block__image" src="${block.image.display.url}" alt="${title}">` : ''}
        ${isAudio ? `
            <audio controls preload="none">
            <source src="${fileUrl}" type="${mime}">
            Your browser does not support the audio element.
            </audio>` : ''}
        <figcaption class="block__caption">
            <h2 class="block__title">
            <a class="block__link" href="${fileUrl || '#'}">${title}</a>
            </h2>
        </figcaption>
        <div class="block__meta POI">${blockMeta(block)}</div>
        </figure>
    `;
    } else if (block.class === 'Channel') {
    li.innerHTML = `
        <article class="block__inner">
        <h2 class="block__title">
            <a class="block__link" href="https://www.are.na/channel/${block.slug}">${block.title}</a>
        </h2>
        <div class="block__meta POI">${blockMeta(block)}</div>
        </article>
    `;
    }

    list.appendChild(li);
});
})
.catch(err => {
document.getElementById('channel').textContent = 'Failed to load channel.';
console.error(err);
});