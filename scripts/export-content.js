'use strict';
// Выгружает контент сайта (направления, новости, контакты) в content/site.json.
// Заявки, пароли и секреты НЕ выгружаются. Файл можно коммитить в GitHub:
// по нему сайт собирается в CI и разворачивается на новом сервере.
const fs = require('node:fs');
const path = require('node:path');
const { db, CONTENT, SCHEMA } = require('../lib/db');

const out = {
  schema: SCHEMA,
  practices: db.prepare('SELECT slug,title,summary,intro,services,sort,published FROM practices ORDER BY sort,id').all().map((p) => ({ ...p, services: JSON.parse(p.services) })),
  news: db.prepare('SELECT slug,title,category,summary,body,published_at,published FROM news ORDER BY published_at DESC,id DESC').all(),
  settings: Object.fromEntries(db.prepare("SELECT key,value FROM settings WHERE substr(key,1,1) <> '_'").all().map((r) => [r.key, r.value])),
};
fs.mkdirSync(path.dirname(CONTENT), { recursive: true });
fs.writeFileSync(CONTENT, JSON.stringify(out, null, 2) + '\n');
console.log(`Контент выгружен в content/site.json: направлений ${out.practices.length}, новостей ${out.news.length}`);
