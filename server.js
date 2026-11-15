'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// .env без внешних пакетов
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env необязателен */ }

const { q, db } = require('./lib/db');
const auth = require('./lib/auth');
const pages = require('./lib/pages');
const admin = require('./lib/admin');

const PORT = Number(process.env.PORT) || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

auth.initPassword();

const ctx = () => ({ base: '', settings: q.settings(), practicesNav: q.practices(), siteUrl: SITE_URL, staticMode: false });
const clientIp = (req) => (process.env.TRUST_PROXY === 'true' && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || '';

const SEC = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
};

function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SEC, ...extra });
  res.end(body);
}
const redirect = (res, to, extra = {}) => { res.writeHead(303, { Location: to, ...SEC, ...extra }); res.end(); };

function readBody(req, limit = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        if ((req.headers['content-type'] || '').includes('json')) resolve(JSON.parse(raw || '{}'));
        else resolve(Object.fromEntries(new URLSearchParams(raw)));
      } catch { reject(new Error('bad body')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const cache = pathname.startsWith('/img/') || pathname.startsWith('/fonts/') ? 'public, max-age=604800' : 'no-cache';
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream', { 'Cache-Control': cache });
  return true;
}

// ---- заявки ----
async function notifyTelegram(l) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: c } = process.env;
  if (!t || !c) return;
  const text = `${l.urgent ? 'СРОЧНО. ' : ''}Новая заявка с сайта\n${l.name}${l.email ? ', ' + l.email : ''}${l.phone ? ', ' + l.phone : ''}\nНаправление: ${l.topic || 'не указано'}\n\n${l.message.slice(0, 900)}`;
  try { await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: c, text }) }); }
  catch (e) { console.error('Telegram:', e.message); }
}

function cors(req) {
  const o = process.env.ALLOWED_ORIGIN;
  return o && req.headers.origin === o ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
}

async function handleLead(req, res) {
  const wantsJson = (req.headers.accept || '').includes('json') || (req.headers['content-type'] || '').includes('json');
  const reply = (status, obj, back) => wantsJson ? send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', cors(req)) : redirect(res, back || '/contacts/');
  if (auth.limited('lead:' + clientIp(req), 5, 3600e3)) return reply(429, { error: 'Слишком много запросов. Попробуйте через час или напишите на почту.' });
  let d; try { d = await readBody(req); } catch { return reply(400, { error: 'Не удалось прочитать форму.' }); }
  if (d.website) return reply(200, { ok: true }, '/contacts/?sent=1'); // honeypot: молча «принимаем»
  const lead = { name: String(d.name || '').trim().slice(0, 120), email: String(d.email || '').trim().slice(0, 160), phone: String(d.phone || '').trim().slice(0, 60), topic: String(d.topic || '').trim().slice(0, 120), message: String(d.message || '').trim().slice(0, 4000), urgent: d.urgent === 1 || d.urgent === '1' || d.urgent === true };
  if (!lead.name) return reply(422, { error: 'Укажите имя.' }, '/contacts/');
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email);
  if (lead.email && !emailOk) return reply(422, { error: 'Проверьте адрес почты.' });
  if (!emailOk && lead.phone.replace(/\D/g, '').length < 6) return reply(422, { error: 'Укажите телефон или почту, чтобы мы могли ответить.' });
  if (lead.message.length < 10) return reply(422, { error: 'Опишите ситуацию хотя бы в двух словах.' });
  q.addLead(lead);
  notifyTelegram(lead);
  return reply(200, { ok: true }, '/contacts/?sent=1');
}

// ---- админка ----
async function handleAdmin(req, res, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/admin';
  const c = { base: '' };
  const tok = auth.parseCookies(req.headers.cookie).dl_session;
  const ok = auth.validSession(tok);
  const secure = SITE_URL.startsWith('https') ? '; Secure' : '';

  if (p === '/admin/login') {
    if (req.method === 'POST') {
      if (auth.limited('login:' + clientIp(req), 6, 600e3)) return send(res, 429, admin.loginPage(c, 'Слишком много попыток. Подождите 10 минут.'));
      const d = await readBody(req).catch(() => ({}));
      if (auth.checkPassword(d.password || '')) {
        return redirect(res, '/admin/', { 'Set-Cookie': `dl_session=${auth.newSession()}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${auth.SESSION_TTL / 1000}${secure}` });
      }
      return send(res, 401, admin.loginPage(c, 'Неверный пароль.'));
    }
    return send(res, 200, admin.loginPage(c));
  }
  if (!ok) return redirect(res, '/admin/login');
  const csrf = auth.csrfFor(tok);

  let body = {};
  if (req.method === 'POST') {
    body = await readBody(req, 262144).catch(() => ({}));
    if (body._csrf !== csrf) return send(res, 403, 'Недействительный токен формы. Обновите страницу.', 'text/plain; charset=utf-8');
  }

  if (p === '/admin/logout' && req.method === 'POST') return redirect(res, '/admin/login', { 'Set-Cookie': 'dl_session=; HttpOnly; Path=/admin; Max-Age=0' });

  if (p === '/admin') {
    const status = url.searchParams.get('status') || '';
    const leads = status ? db.prepare('SELECT * FROM leads WHERE status=? ORDER BY id DESC').all(status) : db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all();
    return send(res, 200, admin.leadsPage(c, { leads, status, csrf }));
  }
  if (p === '/admin/leads.csv') return send(res, 200, admin.leadsCsv(), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="leads.csv"' });

  let m = p.match(/^\/admin\/leads\/(\d+)(\/delete)?$/);
  if (m && req.method === 'POST') {
    if (m[2]) db.prepare('DELETE FROM leads WHERE id=?').run(m[1]);
    else if (admin.STATUSES[body.status]) db.prepare('UPDATE leads SET status=?, note=? WHERE id=?').run(body.status, String(body.note || '').slice(0, 500), m[1]);
    return redirect(res, '/admin/');
  }

  if (p === '/admin/settings') {
    if (req.method === 'POST') { for (const [k] of admin.SETTING_FIELDS) q.setSetting(k, String(body[k] ?? '').trim().slice(0, 300)); return redirect(res, '/admin/settings?saved=1'); }
    return send(res, 200, admin.settingsPage(c, { csrf, saved: url.searchParams.has('saved') }));
  }

  m = p.match(/^\/admin\/(practices|news)(?:\/(new|\d+)(\/delete)?)?$/);
  if (m) {
    const [, key, id, del] = m; const e = admin.ENT[key];
    if (!id) return send(res, 200, admin.listPage(c, key, { csrf, rows: db.prepare(`SELECT * FROM ${e.table} ORDER BY ${key === 'news' ? 'published_at DESC' : 'sort, id'}`).all() }));
    if (req.method === 'POST') {
      if (del) { db.prepare(`DELETE FROM ${e.table} WHERE id=?`).run(id); return redirect(res, `/admin/${key}`); }
      try { admin.saveEntity(key, id === 'new' ? 0 : Number(id), body); return redirect(res, `/admin/${key}`); }
      catch (err) { return send(res, 422, admin.editPage(c, key, { csrf, error: err.message, row: { ...body, id: id === 'new' ? 0 : Number(id), services: JSON.stringify([]) } })); }
    }
    const row = id === 'new' ? {} : db.prepare(`SELECT * FROM ${e.table} WHERE id=?`).get(id);
    if (!row) return send(res, 404, 'Не найдено', 'text/plain; charset=utf-8');
    return send(res, 200, admin.editPage(c, key, { csrf, row }));
  }
  return send(res, 404, 'Не найдено', 'text/plain; charset=utf-8');
}

// ---- публичные страницы ----
function sitemap() {
  const urls = ['/', '/news/', '/contacts/', ...q.practices().map((p) => `/${p.slug}/`), ...q.news().map((a) => `/news/${a.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE_URL.replace(/\/$/, '')}${u}</loc></url>`).join('\n')}\n</urlset>`;
}

function route(req, res, url) {
  const p = url.pathname, C = ctx();
  if (p === '/robots.txt') return send(res, 200, `User-agent: *\nDisallow: /admin\nSitemap: ${SITE_URL.replace(/\/$/, '')}/sitemap.xml\n`, 'text/plain; charset=utf-8');
  if (p === '/sitemap.xml') return send(res, 200, sitemap(), 'application/xml; charset=utf-8');
  if (!p.endsWith('/') && !path.extname(p)) { res.writeHead(301, { Location: p + '/' + url.search, ...SEC }); return res.end(); }
  if (p === '/contact/') { res.writeHead(301, { Location: '/contacts/' + url.search, ...SEC }); return res.end(); }

  if (p === '/') return send(res, 200, pages.home(C, { practices: q.practices(), news: q.news(3) }));
  if (p === '/news/') return send(res, 200, pages.newsIndex(C, { news: q.news() }));
  let m = p.match(/^\/news\/([a-z0-9-]+)\/$/);
  if (m) { const a = q.newsItem(m[1]); if (a) return send(res, 200, pages.newsItem(C, { a })); }
  if (p === '/contacts/') return send(res, 200, pages.contacts(C, { practices: q.practices(), preset: url.searchParams.get('topic') || '', sent: url.searchParams.has('sent') }));
  if (p === '/privacy/') return send(res, 200, pages.privacy(C));
  m = p.match(/^\/([a-z0-9-]+)\/$/);
  if (m) { const pr = q.practice(m[1]); if (pr) return send(res, 200, pages.direction(C, { p: pr, practices: q.practices() })); }
  return send(res, 404, pages.notFound(C));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS' && url.pathname === '/api/lead') { res.writeHead(204, { ...cors(req), ...SEC }); return res.end(); }
    if (req.method === 'POST' && url.pathname === '/api/lead') return await handleLead(req, res);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await handleAdmin(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
    if (serveStatic(res, decodeURIComponent(url.pathname))) return;
    return route(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'Ошибка сервера', 'text/plain; charset=utf-8');
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`DataLaw: ${SITE_URL}  (админка: ${SITE_URL}/admin/)`));
}
module.exports = { server };
