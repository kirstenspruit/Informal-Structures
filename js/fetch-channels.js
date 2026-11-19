const API = 'https://api.are.na/v3';
// const TOKEN = '...'; // only needed for private channels
const headers = {}; // TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}

async function getJSON(url) {
    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

async function fetchChannel(slug, per = 100) {
    const contentsUrl = (page) => `${API}/channels/${slug}/contents?per=${per}&page=${page}`;

    // Channel info and first page of contents in parallel
    const [channel, first] = await Promise.all([
        getJSON(`${API}/channels/${slug}`),
        getJSON(contentsUrl(1)),
    ]);

    // Remaining pages in parallel, using meta.total_pages
    const rest = await Promise.all(
        Array.from({length: Math.max(0, first.meta.total_pages - 1)}, (_, i) =>
            getJSON(contentsUrl(i + 2))
        )
    );

    channel.contents = [first.data, ...rest.map(p => p.data)].flat();
    return channel;
}

// Helpers
const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function blockMeta(block) {
    const date = formatDate(block.connection?.connected_at || block.created_at);
    const parts = [block.title, date, block.description?.plain].filter(Boolean);
    return `<p>${parts.map(esc).join(' · ')}</p>`;
}

// Builds one <li>. Returns { li, key } so the caller decides where it goes.
function renderBlock(block) {
    const type = block.type.toLowerCase();
    const li = document.createElement('li');
    li.className = `block block--${type}`;
    let key = block.type;

    if (block.type === 'Link') {
        const url = block.source?.url || '#';
        li.innerHTML = `
<article class="block__inner">
<h2 class="block__title">
    <a class="block__link link-arrow" href="${esc(url)}">${esc(block.title || block.source?.url)}</a>
</h2>
${block.description?.html ? `<div class="block__description">${block.description.html}</div>` : ''}
<div class="block__meta POI">${blockMeta(block)}</div>
</article>`;

    } else if (block.type === 'Image') {
        li.innerHTML = `
<figure class="block__inner">
<img class="block__image" loading="lazy" decoding="async" src="${esc(block.image?.medium?.src || block.image?.src)}" alt="${esc(block.image?.alt_text || block.title || '')}">
${block.title ? `<figcaption class="block__caption"><h2 class="block__title">${esc(block.title)}</h2></figcaption>` : ''}
<div class="block__meta POI">${blockMeta(block)}</div>
</figure>`;

    } else if (block.type === 'Text') {
        li.innerHTML = `
<article class="block__inner">
${block.title ? `<h2 class="block__title">${esc(block.title)}</h2>` : ''}
<div class="block__content">${block.content?.html || ''}</div>
<div class="block__meta POI">${blockMeta(block)}</div>
</article>`;

    } else if (block.type === 'Embed') {
        li.innerHTML = `
<figure class="block__inner">
${block.title ? `<h2 class="block__title">${esc(block.title)}</h2>` : ''}
<div class="block__embed">${block.embed?.html || ''}</div>
<div class="block__meta POI">${blockMeta(block)}</div>
</figure>`;

    } else if (block.type === 'Attachment') {
        const file = block.attachment || {};
        const fileUrl = file.url || '';
        const mime = file.content_type || '';
        const isAudio = mime.startsWith('audio/');
        const isVideo = mime.startsWith('video/');
        const thumb = block.image?.medium?.src;
        const title = block.title || file.filename || 'Untitled';
        key = isVideo ? 'Video' : isAudio ? 'Audio' : 'Attachment';

        // Videos get no src here: the URL lives in data-src and is
        // assigned by lazyVideos() when the video scrolls near the viewport.
        li.innerHTML = `
<figure class="block__inner">
${isVideo ? `<video muted loop playsinline webkit-playsinline disablepictureinpicture disableremoteplayback preload="none" data-src="${esc(fileUrl)}" ${thumb ? `poster="${esc(thumb)}"` : ''} class="block__video"></video>` : ''}
${isAudio ? `<audio controls preload="none"><source src="${esc(fileUrl)}" type="${esc(mime)}"></audio>` : ''}
${!isVideo && thumb ? `<img class="block__image" loading="lazy" decoding="async" src="${esc(thumb)}" alt="${esc(title)}">` : ''}
<figcaption class="block__caption">
    <h2 class="block__title"><a class="block__link" href="${esc(fileUrl || '#')}">${esc(title)}</a></h2>
</figcaption>
<div class="block__meta POI">${blockMeta(block)}</div>
</figure>`;

    } else if (block.type === 'Channel') {
        li.innerHTML = `
<article class="block__inner">
<h2 class="block__title"><a class="block__link" href="https://www.are.na/channel/${esc(block.slug)}">${esc(block.title)}</a></h2>
<div class="block__meta POI">${blockMeta(block)}</div>
</article>`;

    } else {
        // PendingBlock or anything unexpected: skip it
        return null;
    }

    return {li, key};
}

// Autoplay rules: a video may autoplay without a user gesture only if it is
// muted and (on iOS) plays inline. Set these as PROPERTIES as well as
// attributes: the `muted` attribute alone is unreliable on elements created
// through innerHTML, and iOS Safari then refuses to autoplay.
function prepareVideo(v) {
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.removeAttribute('controls');
    v.disablePictureInPicture = true;
}

const visibleVideos = new Set();

function playVideo(v) {
    // Must be muted before every play() call
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});   // blocked: retried on first user gesture
}

// Some setups block autoplay entirely (iOS Low Power Mode, Safari's "Never
// Auto-Play", data saver). The first tap/click/key then starts every video
// that is currently on screen.
['touchend', 'click', 'keydown'].forEach(evt =>
    window.addEventListener(evt, () => visibleVideos.forEach(playVideo), {once: true, passive: true})
);

// Loads a video's source only when it comes near the viewport, plays it
// while visible and pauses it when it leaves. `scroller` is the horizontally
// scrolling container (#videos), used as the observer root.
function lazyVideos(scroller) {
    if (!scroller) return;
    const videos = scroller.querySelectorAll('video[data-src]');
    if (!videos.length) return;

    videos.forEach(prepareVideo);

    const io = new IntersectionObserver(entries => {
        entries.forEach(({target: v, isIntersecting}) => {
            if (isIntersecting) {
                visibleVideos.add(v);
                if (!v.src) v.src = v.dataset.src;   // first load only
                playVideo(v);
            } else {
                visibleVideos.delete(v);
                v.pause();
            }
        });
    }, {
        root: scroller,
        rootMargin: '0px 100% 0px 100%'              // start loading one screen ahead
    });

    videos.forEach(v => io.observe(v));
}

// Loads one channel. With `containers`, blocks are sorted by type; otherwise one plain list.
// Options: maxVideos = how many (randomly chosen) videos to show.
async function loadChannel(slug, mainEl, containers = null, {maxVideos = Infinity} = {}) {
    try {
        const channel = await fetchChannel(slug);
        const description = channel.description?.plain;

        mainEl.innerHTML = `
<header class="channel__header">
<h2 class="channel__title"></h2>
${description ? `<div class="channel__description"></div>` : ''}
</header>
<ul class="list-reset channel__blocks"></ul>`;

        mainEl.querySelector('.channel__title').textContent = channel.title;
        if (description) mainEl.querySelector('.channel__description').textContent = description;

        const list = mainEl.querySelector('.channel__blocks');

        // Render everything, then keep only `maxVideos` random videos
        const rendered = channel.contents.map(renderBlock).filter(Boolean);
        const videos = shuffle(rendered.filter(r => r.key === 'Video')).slice(0, maxVideos);
        const items = rendered.filter(r => r.key !== 'Video').concat(videos);

        items.forEach(({li, key}) => (containers?.[key] || list).appendChild(li));

        lazyVideos(containers?.Video);
    } catch (err) {
        mainEl.textContent = 'Failed to load channel.';
        console.error(err);
    }
}

// Channel 1: sorted by type, three random videos
loadChannel('express-he8jz5c1ljw', document.getElementById('express'), {
    Image: document.getElementById('express-images'),
    Text: document.getElementById('express-texts'),
    Link: document.getElementById('express-links'),
    Embed: document.getElementById('express-media'),
    Attachment: document.getElementById('express-files'),
    Audio: document.getElementById('express-audio'),
    Video: document.getElementById('express-videos'),
    Channel: document.getElementById('express-channels'),
}, {maxVideos: 4});

// Channels 2 and 3: one plain list each (no videos are sorted out here,
// but any that appear still lazy-load only if you pass a Video container)
loadChannel('physical-library-yihx42lv2nw', document.getElementById('library'));
loadChannel('bulletin-mqhhgdsiy_0', document.getElementById('bulletin'));