'use strict';
const { esc } = require('./util');

const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const tel = (s) => String(s || '').replace(/[^+\d]/g, '');
const links = (s) => ({
  tg: s.telegram ? `https://t.me/${encodeURIComponent(s.telegram.replace('@', ''))}` : '',
  wa: digits(s.whatsapp) ? `https://wa.me/${digits(s.whatsapp)}` : '',
});

// Главное меню в заданном порядке: ... Международное право, CRM, Контакты
const NAV = [
  ['/#about', 'О фирме', 'about'],
  ['/news/', 'Новости', '/news/'],
  ['/arbitrazh/', 'Арбитраж РФ', '/arbitrazh/'],
  ['/grazhdanskoe/', 'Гражданское право', '/grazhdanskoe/'],
  ['/mezhdunarodnoe/', 'Международное право', '/mezhdunarodnoe/'],
  ['/crm/', 'CRM «Лайла»', '/crm/'],
];

// ctx: { base, settings, practicesNav, staticMode, apiUrl, siteUrl }
function layout(ctx, { title, desc, path, body, bodyClass = '', noindex = false }) {
  const u = (p) => ctx.base + p;
  const s = ctx.settings, L = links(s);
  const full = title ? `${title} — DataLaw International` : 'DataLaw International — юридическая фирма: арбитраж РФ, гражданское и международное право';
  const description = desc || 'Арбитражные споры в России, гражданское право, международная защита и собственная CRM для юристов с ИИ, работающим без интернета.';
  const canonical = ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') + ctx.base + path : '';
  const isCur = (key) => key !== 'about' && path.startsWith(key);
  const nav = NAV.map(([href, label, key]) => `<a href="${u(href)}"${isCur(key) ? ' aria-current="page"' : ''}>${label}</a>`).join('')
    + `<a class="nav-cta" href="${u('/contacts/')}"${path.startsWith('/contacts') ? ' aria-current="page"' : ''}>Контакты</a>`;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ''}<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc((ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') : '') + ctx.base)}/img/logo-full.webp">
<meta name="theme-color" content="#12203F">
<link rel="icon" href="${u('/img/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600;700&family=Golos+Text:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${u('/css/site.css')}">
</head>
<body class="${bodyClass}" data-base="${esc(ctx.base)}"${ctx.staticMode ? ` data-static="1" data-api="${esc(ctx.apiUrl || '')}"` : ''}>
<a class="skip" href="#main">К содержанию</a>
<div class="topbar">
  <div class="wrap topbar-in">
    <p class="tb-info">${esc(s.address)}<span class="sep"></span>${esc(s.hours)}</p>
    <p class="tb-links">
      ${s.phone ? `<a href="tel:${esc(tel(s.phone))}">${esc(s.phone)}</a>` : ''}
      ${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}
      ${L.tg ? `<a href="${L.tg}" rel="noopener">Telegram</a>` : ''}
      ${L.wa ? `<a href="${L.wa}" rel="noopener">WhatsApp</a>` : ''}
    </p>
  </div>
</div>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="${u('/')}" aria-label="DataLaw International, на главную">
      <img src="${u('/img/logo-symbol.webp')}" width="64" height="56" alt="">
      <span class="brand-text"><b>DataLaw</b><i>International</i></span>
    </a>
    <nav class="nav" id="nav" aria-label="Основная навигация">${nav}</nav>
    <button class="burger" type="button" aria-expanded="false" aria-controls="nav"><span class="sr">Меню</span><i></i><i></i></button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <a class="seal" href="${u('/')}" aria-label="На главную"><img src="${u('/img/logo-symbol.webp')}" width="64" height="56" alt=""></a>
        <p class="foot-name">DataLaw International</p>
        <p class="foot-tag">From Data to Justice</p>
      </div>
      <div class="foot-col"><h2>Направления</h2>${(ctx.practicesNav || []).map((p) => `<a href="${u('/' + p.slug + '/')}">${esc(p.title)}</a>`).join('')}</div>
      <div class="foot-col"><h2>Фирма</h2><a href="${u('/#about')}">О фирме</a><a href="${u('/news/')}">Новости</a><a href="${u('/contacts/')}">Контакты</a><a href="${u('/privacy/')}">Конфиденциальность</a></div>
      <div class="foot-col"><h2>Связь</h2>
        ${s.phone ? `<a href="tel:${esc(tel(s.phone))}">${esc(s.phone)}</a>` : ''}
        ${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}
        ${L.tg ? `<a href="${L.tg}" rel="noopener">Telegram</a>` : ''}
        ${L.wa ? `<a href="${L.wa}" rel="noopener">WhatsApp</a>` : ''}
        ${s.address ? `<span>${esc(s.address)}</span>` : ''}
      </div>
    </div>
    <div class="foot-bottom">
      <p>© ${new Date().getFullYear()} DataLaw International. Все права защищены.</p>
      <p>Материалы сайта носят информационный характер и не являются юридической консультацией.</p>
    </div>
  </div>
</footer>
<script src="${u('/js/site.js')}" defer></script>
</body>
</html>`;
}

module.exports = { layout, links, tel };
