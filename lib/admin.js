'use strict';
const { db, q } = require('./db');
const { esc, slugify } = require('./util');

const STATUSES = { new: 'Новая', work: 'В работе', done: 'Закрыта', spam: 'Спам' };

function shell(ctx, { title, body, section, csrf }) {
  const link = (href, label, key) => `<a href="${ctx.base}/admin/${href}"${section === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}, админка</title>
<link rel="icon" href="${ctx.base}/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,300;7..72,400&family=Onest:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${ctx.base}/css/site.css"><link rel="stylesheet" href="${ctx.base}/css/admin.css"><script src="${ctx.base}/js/admin.js" defer></script></head>
<body class="admin"><header class="admin-bar"><div class="wrap abar">
<a class="brand" href="${ctx.base}/admin/">DataLaw, админка</a>
<nav>${link('', 'Заявки', 'leads')}${link('practices', 'Практики', 'practices')}${link('insights', 'Публикации', 'insights')}${link('team', 'Команда', 'team')}${link('settings', 'Контакты', 'settings')}<a href="${ctx.base}/" target="_blank" rel="noopener">Открыть сайт</a></nav>
${csrf ? `<form method="post" action="${ctx.base}/admin/logout"><input type="hidden" name="_csrf" value="${csrf}"><button class="linklike">Выйти</button></form>` : ''}
</div></header><main class="wrap admin-main">${body}</main></body></html>`;
}

const loginPage = (ctx, err) => shell(ctx, { title: 'Вход', section: '', body: `
<div class="login"><h1>Вход</h1>${err ? `<p class="notice err" role="alert">${esc(err)}</p>` : ''}
<form method="post" action="${ctx.base}/admin/login" class="form one"><div class="field"><label for="pw">Пароль</label><input id="pw" name="password" type="password" required autofocus autocomplete="current-password"></div>
<div class="actions"><button class="btn" type="submit">Войти</button></div></form></div>` });

function leadsPage(ctx, { leads, status, csrf }) {
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) c FROM leads GROUP BY status').all().map((r) => [r.status, r.c]));
  const tabs = ['', ...Object.keys(STATUSES)].map((s) => `<a href="${ctx.base}/admin/${s ? '?status=' + s : ''}"${status === s ? ' aria-current="page"' : ''}>${s ? STATUSES[s] : 'Все'}${s && counts[s] ? ` (${counts[s]})` : ''}</a>`).join('');
  const rows = leads.map((l) => `<li><details${l.status === 'new' ? ' open' : ''}>
<summary><span class="l-name">${esc(l.name)}${l.urgent ? ' <b class="urgent-flag">срочно</b>' : ''}</span><span class="l-topic">${esc(l.topic || 'без направления')}</span><span class="l-date">${esc(l.created_at)}</span><span class="l-status s-${l.status}">${STATUSES[l.status] || l.status}</span></summary>
<div class="lead-body"><p class="l-contact"><a href="mailto:${esc(l.email)}">${esc(l.email)}</a>${l.org ? ' · ' + esc(l.org) : ''}</p>
<p class="l-msg">${esc(l.message).replace(/\n/g, '<br>')}</p>
<form method="post" action="${ctx.base}/admin/leads/${l.id}" class="inline"><input type="hidden" name="_csrf" value="${csrf}">
<select name="status" aria-label="Статус">${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}"${l.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
<input name="note" value="${esc(l.note)}" placeholder="Заметка" maxlength="500" aria-label="Заметка"><button class="btn small">Сохранить</button>
<button class="btn small ghost" formaction="${ctx.base}/admin/leads/${l.id}/delete" data-confirm="Удалить заявку навсегда?">Удалить</button></form></div></details></li>`).join('');
  return shell(ctx, { title: 'Заявки', section: 'leads', csrf, body: `
<div class="admin-head"><h1>Заявки</h1><a class="btn small ghost" href="${ctx.base}/admin/leads.csv">Скачать CSV</a></div>
<nav class="tabs" aria-label="Статус">${tabs}</nav>
${leads.length ? `<ul class="leads">${rows}</ul>` : '<p class="empty">Заявок нет. Когда клиент заполнит форму, она появится здесь.</p>'}` });
}

// ---- универсальный CRUD ----
const servicesToText = (json) => JSON.parse(json || '[]').map((s) => `${s.title}\n${s.tag || ''}\n${s.text}`).join('\n---\n');
const textToServices = (t) => JSON.stringify(String(t || '').replace(/\r/g, '').split(/\n---\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
  const [title, tag = '', ...rest] = b.split('\n'); return { title: title.trim(), tag: tag.trim(), text: rest.join(' ').trim() };
}));

const ENT = {
  practices: { table: 'practices', label: 'Практики', one: 'практику', list: ['title', 'slug', 'sort', 'published'],
    fields: [
      { n: 'title', l: 'Название', req: 1 }, { n: 'slug', l: 'Адрес страницы (латиницей)', help: 'Если оставить пустым, создастся из названия.' },
      { n: 'summary', l: 'Короткое описание для списка', t: 'textarea', rows: 3 }, { n: 'intro', l: 'Вступление на странице практики', t: 'textarea', rows: 5 },
      { n: 'services', l: 'Услуги', t: 'textarea', rows: 16, to: servicesToText, from: textToServices, help: 'Каждая услуга: первая строка название, вторая метка (можно пустую), дальше описание. Услуги разделяйте строкой из трёх дефисов (---).' },
      { n: 'sort', l: 'Порядок', t: 'number' }, { n: 'published', l: 'Показывать на сайте', t: 'check' }] },
  insights: { table: 'insights', label: 'Публикации', one: 'публикацию', list: ['title', 'category', 'published_at', 'published'],
    fields: [
      { n: 'title', l: 'Заголовок', req: 1 }, { n: 'slug', l: 'Адрес страницы (латиницей)', help: 'Если оставить пустым, создастся из заголовка.' },
      { n: 'category', l: 'Рубрика' }, { n: 'published_at', l: 'Дата', t: 'date' },
      { n: 'summary', l: 'Анонс', t: 'textarea', rows: 3 },
      { n: 'body', l: 'Текст', t: 'textarea', rows: 20, help: 'Абзацы разделяйте пустой строкой. «## Заголовок» — подзаголовок, «- » в начале строк — список, **жирный**.' },
      { n: 'published', l: 'Опубликовано', t: 'check' }] },
  team: { table: 'team', label: 'Команда', one: 'человека', list: ['name', 'role', 'sort'],
    fields: [{ n: 'name', l: 'Имя', req: 1 }, { n: 'role', l: 'Должность' }, { n: 'bio', l: 'О человеке', t: 'textarea', rows: 5 }, { n: 'sort', l: 'Порядок', t: 'number' }] },
};

function listPage(ctx, key, { rows, csrf }) {
  const e = ENT[key];
  const head = e.list.map((c) => `<th>${esc(e.fields.find((f) => f.n === c).l)}</th>`).join('');
  const body = rows.map((r) => `<tr>${e.list.map((c, i) => {
    const v = c === 'published' ? (r[c] ? 'да' : 'черновик') : r[c];
    return `<td>${i === 0 ? `<a href="${ctx.base}/admin/${key}/${r.id}">${esc(v)}</a>` : esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  return shell(ctx, { title: e.label, section: key, csrf, body: `
<div class="admin-head"><h1>${e.label}</h1><a class="btn small" href="${ctx.base}/admin/${key}/new">Добавить ${e.one}</a></div>
${rows.length ? `<div class="tablewrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : '<p class="empty">Пока пусто.</p>'}` });
}

function editPage(ctx, key, { row, csrf, error }) {
  const e = ENT[key], isNew = !row.id;
  const fields = e.fields.map((f) => {
    let v = row[f.n] ?? (f.t === 'check' ? 1 : f.t === 'date' ? new Date().toISOString().slice(0, 10) : '');
    if (f.to && row.id) v = f.to(v);
    const help = f.help ? `<small>${esc(f.help)}</small>` : '';
    if (f.t === 'check') return `<div class="field check wide"><label><input type="checkbox" name="${f.n}" value="1"${v ? ' checked' : ''}> ${esc(f.l)}</label></div>`;
    if (f.t === 'textarea') return `<div class="field wide"><label for="f-${f.n}">${esc(f.l)}</label><textarea id="f-${f.n}" name="${f.n}" rows="${f.rows || 4}">${esc(v)}</textarea>${help}</div>`;
    return `<div class="field${f.n === 'title' || f.n === 'name' ? ' wide' : ''}"><label for="f-${f.n}">${esc(f.l)}</label><input id="f-${f.n}" name="${f.n}" type="${f.t || 'text'}" value="${esc(v)}"${f.req ? ' required' : ''}>${help}</div>`;
  }).join('');
  return shell(ctx, { title: e.label, section: key, csrf, body: `
<p class="crumb"><a href="${ctx.base}/admin/${key}">${e.label}</a></p><h1>${isNew ? 'Новая запись' : 'Редактирование'}</h1>
${error ? `<p class="notice err" role="alert">${esc(error)}</p>` : ''}
<form method="post" action="${ctx.base}/admin/${key}/${isNew ? 'new' : row.id}" class="form">
<input type="hidden" name="_csrf" value="${csrf}">${fields}
<div class="actions wide"><button class="btn" type="submit">Сохранить</button>
${isNew ? '' : `<button class="btn ghost" formaction="${ctx.base}/admin/${key}/${row.id}/delete" data-confirm="Удалить запись?">Удалить</button>`}</div></form>` });
}

function saveEntity(key, id, data) {
  const e = ENT[key], vals = {};
  for (const f of e.fields) {
    let v = data[f.n];
    if (f.t === 'check') v = v ? 1 : 0;
    else if (f.t === 'number') v = parseInt(v, 10) || 0;
    else v = String(v ?? '').trim();
    if (f.from) v = f.from(v);
    vals[f.n] = v;
  }
  const main = e.fields[0].n;
  if (!vals[main]) throw new Error('Заполните обязательное поле');
  if ('slug' in vals) {
    vals.slug = slugify(vals.slug || vals[main]) || 'page-' + Date.now();
    const clash = db.prepare(`SELECT id FROM ${e.table} WHERE slug=? AND id<>?`).get(vals.slug, id || 0);
    if (clash) throw new Error('Такой адрес уже занят, измените его');
  }
  const cols = Object.keys(vals);
  if (id) db.prepare(`UPDATE ${e.table} SET ${cols.map((c) => c + '=?').join(',')} WHERE id=?`).run(...cols.map((c) => vals[c]), id);
  else db.prepare(`INSERT INTO ${e.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => vals[c]));
}

const SETTING_FIELDS = [['email', 'Общая почта'], ['email_eubridge', 'Почта программы EU Bridge'], ['phone_1', 'Срочная линия 1'], ['phone_2', 'Срочная линия 2'], ['telegram', 'Telegram (@имя)'], ['offices', 'Офисы'], ['languages', 'Языки работы']];
function settingsPage(ctx, { csrf, saved }) {
  const s = q.settings();
  return shell(ctx, { title: 'Контакты', section: 'settings', csrf, body: `<h1>Контакты</h1>${saved ? '<p class="notice" role="status">Сохранено.</p>' : ''}
<form method="post" action="${ctx.base}/admin/settings" class="form"><input type="hidden" name="_csrf" value="${csrf}">
${SETTING_FIELDS.map(([k, l]) => `<div class="field"><label for="s-${k}">${l}</label><input id="s-${k}" name="${k}" value="${esc(s[k])}"></div>`).join('')}
<div class="actions wide"><button class="btn" type="submit">Сохранить</button></div></form>` });
}

function leadsCsv() {
  const rows = db.prepare('SELECT id,created_at,name,email,org,topic,urgent,status,message,note FROM leads ORDER BY id DESC').all();
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\ufeff' + ['id,дата,имя,почта,организация,направление,срочно,статус,сообщение,заметка', ...rows.map((r) => Object.values(r).map(cell).join(','))].join('\r\n');
}

module.exports = { ENT, loginPage, leadsPage, listPage, editPage, saveEntity, settingsPage, SETTING_FIELDS, leadsCsv, STATUSES };
