'use strict';
// Выгружает контент сайта (практики, публикации, команда, контакты) в content/site.json.
// Заявки, пароли и секреты НЕ выгружаются. Файл можно коммитить в GitHub:
// по нему сайт собирается в CI и разворачивается на новом сервере.
const fs = require('node:fs');
const path = require('node:path');
const { db, CONTENT } = require('../lib/db');

const out = {
  practices: db.prepare('SELECT slug,title,summary,intro,services,sort,published FROM practices ORDER BY sort,id').all().map((p) => ({ ...p, services: JSON.parse(p.services) })),
  insights: db.prepare('SELECT slug,title,category,summary,body,published_at,published FROM insights ORDER BY published_at DESC,id DESC').all(),
  team: db.prepare('SELECT name,role,bio,sort FROM team ORDER BY sort,id').all(),
  settings: Object.fromEntries(db.prepare("SELECT key,value FROM settings WHERE key NOT LIKE '\\_%' ESCAPE '\\'").all().map((r) => [r.key, r.value])),
};
fs.mkdirSync(path.dirname(CONTENT), { recursive: true });
fs.writeFileSync(CONTENT, JSON.stringify(out, null, 2) + '\n');
console.log(`Контент выгружен в content/site.json: практик ${out.practices.length}, публикаций ${out.insights.length}, людей ${out.team.length}`);
