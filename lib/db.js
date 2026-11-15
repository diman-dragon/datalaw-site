'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const seed = require('./seed-data');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'datalaw.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Версия схемы: при смене структуры контент пересоздаётся, заявки и настройки сохраняются
const SCHEMA = 3;
const migrate = db.prepare('PRAGMA user_version').get().user_version < SCHEMA;
if (migrate) db.exec('DROP TABLE IF EXISTS practices; DROP TABLE IF EXISTS insights; DROP TABLE IF EXISTS team; DROP TABLE IF EXISTS news;');
db.exec(`
CREATE TABLE IF NOT EXISTS practices (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '', intro TEXT NOT NULL DEFAULT '',
  services TEXT NOT NULL DEFAULT '[]', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT (date('now')), published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', org TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL, urgent INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
PRAGMA user_version = ${SCHEMA};
`);
if (!db.prepare('PRAGMA table_info(leads)').all().some((c) => c.name === 'phone')) db.exec("ALTER TABLE leads ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
if (migrate) db.exec("DELETE FROM settings WHERE substr(key,1,1) <> '_'");

// ---- seed (только если таблицы пусты) ----
// Источник: content/site.json (экспорт из админки), иначе lib/seed-data.js
const CONTENT = path.join(__dirname, '..', 'content', 'site.json');
function seedSource() {
  if (fs.existsSync(CONTENT)) {
    const c = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
    if (c.schema === SCHEMA) return c;
  }
  return { practices: seed.practices, news: seed.news, settings: seed.settings };
}
function seedIfEmpty() {
  const src = seedSource();
  const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  if (!count('practices')) {
    const st = db.prepare('INSERT INTO practices (slug,title,summary,intro,services,sort,published) VALUES (?,?,?,?,?,?,?)');
    src.practices.forEach((p, i) => st.run(p.slug, p.title, p.summary, p.intro, JSON.stringify(p.services), p.sort ?? i + 1, p.published ?? 1));
  }
  if (!count('news')) {
    const st = db.prepare('INSERT INTO news (slug,title,category,summary,body,published_at,published) VALUES (?,?,?,?,?,?,?)');
    src.news.forEach((a) => st.run(a.slug, a.title, a.category, a.summary, a.body, a.published_at, a.published ?? 1));
  }
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(src.settings)) if (!k.startsWith('_')) ins.run(k, v);
}
seedIfEmpty();

const parseServices = (row) => ({ ...row, services: JSON.parse(row.services || '[]') });

const q = {
  practices: () => db.prepare('SELECT * FROM practices WHERE published=1 ORDER BY sort, id').all().map(parseServices),
  practice: (slug) => { const r = db.prepare('SELECT * FROM practices WHERE slug=? AND published=1').get(slug); return r && parseServices(r); },
  news: (limit = 100) => db.prepare('SELECT * FROM news WHERE published=1 ORDER BY published_at DESC, id DESC LIMIT ?').all(limit),
  newsItem: (slug) => db.prepare('SELECT * FROM news WHERE slug=? AND published=1').get(slug),
  settings: () => Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((r) => [r.key, r.value])),
  setSetting: (k, v) => db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v),
  addLead: (l) => db.prepare('INSERT INTO leads (name,email,phone,topic,message,urgent) VALUES (?,?,?,?,?,?)')
    .run(l.name, l.email, l.phone, l.topic, l.message, l.urgent ? 1 : 0),
};

module.exports = { db, q, DB_PATH, CONTENT, SCHEMA };
