'use strict';
const { esc } = require('./util');

const MARK = `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path class="mark-stem" d="M3 2C25 0 55 3 70 13C58 8 46 6 36 7C46 16 49 34 48 50C48 66 46 82 36 93C46 92 60 89 70 85C52 97 25 99 0 98C24 95 31 82 32 66L32 36C31 18 22 6 3 2Z"/><path class="mark-moon" d="M64 2C92 22 104 74 61 100C84 74 88 30 64 2Z"/></svg>`;

const NAV = [
  ['/practices/', 'Практики'],
  ['/practices/eu-bridge/', 'EU Bridge'],
  ['/about/', 'О фирме'],
  ['/team/', 'Команда'],
  ['/insights/', 'Публикации'],
  ['/contact/', 'Контакты'],
];

// ctx: { base, settings, staticMode, apiUrl, siteUrl }
function layout(ctx, { title, desc, path, body, bodyClass = '', noindex = false }) {
  const u = (p) => ctx.base + p;
  const full = title ? `${title} — DataLaw Solutions` : 'DataLaw Solutions — международный правовой советник';
  const description = desc || 'Российское право, международный арбитраж, защита от Интерпола и экстрадиции. Конфиденциально, на четырёх языках.';
  const canonical = ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') + ctx.base + path : '';
  const nav = NAV.map(([href, label]) => {
    const cur = path === href || (href !== '/' && path.startsWith(href) && !(href === '/practices/' && path.startsWith('/practices/eu-bridge')));
    return `<a href="${u(href)}"${cur ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#E7EAED">
<link rel="icon" href="${u('/img/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,300;7..72,400;7..72,500&family=Onest:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${u('/css/site.css')}">
</head>
<body class="${bodyClass}" data-base="${esc(ctx.base)}"${ctx.staticMode ? ` data-static="1" data-api="${esc(ctx.apiUrl || '')}"` : ''}>
<a class="skip" href="#main">К содержанию</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="${u('/')}" aria-label="DataLaw Solutions, на главную">${MARK}<span>DataLaw Solutions</span></a>
    <nav class="nav" id="nav" aria-label="Основная навигация">${nav}<a class="nav-cta" href="${u('/contact/')}">Консультация</a></nav>
    <button class="burger" type="button" aria-expanded="false" aria-controls="nav"><span class="sr">Меню</span><i></i><i></i></button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">${MARK}<p>DataLaw Solutions оказывает международные юридические консультационные услуги. Материалы сайта не являются юридической консультацией и не устанавливают отношений адвокат и клиент.</p></div>
      <div class="foot-col"><h2>Практики</h2>${(ctx.practicesNav || []).map((p) => `<a href="${u('/practices/' + p.slug + '/')}">${esc(p.title)}</a>`).join('')}</div>
      <div class="foot-col"><h2>Фирма</h2><a href="${u('/about/')}">О фирме</a><a href="${u('/team/')}">Команда</a><a href="${u('/insights/')}">Публикации</a><a href="${u('/contact/')}">Контакты</a><a href="${u('/privacy/')}">Конфиденциальность</a></div>
      <div class="foot-col"><h2>Связь</h2><a href="mailto:${esc(ctx.settings.email)}">${esc(ctx.settings.email)}</a>${ctx.settings.phone_1 ? `<a href="tel:${esc(ctx.settings.phone_1.replace(/[^+\d]/g, ''))}">${esc(ctx.settings.phone_1)}</a>` : ''}${ctx.settings.telegram ? `<a href="https://t.me/${esc(ctx.settings.telegram.replace('@', ''))}" rel="noopener">Telegram</a>` : ''}</div>
    </div>
    <p class="foot-legal">© ${new Date().getFullYear()} DataLaw Solutions. Все права защищены.</p>
  </div>
</footer>
<script src="${u('/js/site.js')}" defer></script>
</body>
</html>`;
}

module.exports = { layout, MARK };
