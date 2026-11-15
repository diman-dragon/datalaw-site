'use strict';
// Собирает статическую версию сайта в папку docs/ для GitHub Pages.
// Использование:
//   BASE_PATH=/имя-репозитория SITE_URL=https://user.github.io/имя-репозитория npm run build
// Для сайта на своём домене BASE_PATH оставьте пустым.
// Если форма должна работать на GitHub, задайте API_URL=https://ваш-сервер/api/lead
// (и ALLOWED_ORIGIN на сервере). Без API_URL форма откроет письмо в почтовой программе.
const fs = require('node:fs');
const path = require('node:path');
const { q } = require('../lib/db');
const pages = require('../lib/pages');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const base = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ctx = { base, settings: q.settings(), practicesNav: q.practices(), siteUrl: process.env.SITE_URL || '', staticMode: true, apiUrl: process.env.API_URL || '' };

fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };

const practices = q.practices(), news = q.news();
write('index.html', pages.home(ctx, { practices, news: q.news(3) }));
practices.forEach((p) => write(`${p.slug}/index.html`, pages.direction(ctx, { p, practices })));
write('news/index.html', pages.newsIndex(ctx, { news }));
news.forEach((a) => write(`news/${a.slug}/index.html`, pages.newsItem(ctx, { a })));
write('contacts/index.html', pages.contacts(ctx, { practices, preset: '', sent: false }));
write('privacy/index.html', pages.privacy(ctx));
write('404.html', pages.notFound(ctx));
write('.nojekyll', '');

// статика (без админских файлов)
const copy = (src, dst) => {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('admin.')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copy(s, d); } else fs.copyFileSync(s, d);
  }
};
copy(path.join(ROOT, 'public'), OUT);

const site = (process.env.SITE_URL || '').replace(/\/$/, '');
const urls = ['/', '/news/', '/contacts/', ...practices.map((p) => `/${p.slug}/`), ...news.map((a) => `/news/${a.slug}/`)];
if (site) {
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${site}${u}</loc></url>`).join('\n')}\n</urlset>`);
  write('robots.txt', `User-agent: *\nSitemap: ${site}/sitemap.xml\n`);
}
if (process.env.CNAME) write('CNAME', process.env.CNAME);
console.log(`Готово: ${urls.length + 1} страниц в docs/ (base="${base}")`);
