'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const seed = require('./seed-data');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'datalaw.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS practices (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '', intro TEXT NOT NULL DEFAULT '',
  services TEXT NOT NULL DEFAULT '[]', sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT (date('now')), published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL, email TEXT NOT NULL, org TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL, urgent INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
`);

// ---- seed (только если таблицы пусты) ----
// Источник: content/site.json (экспорт из админки), иначе lib/seed-data.js
const CONTENT = path.join(__dirname, '..', 'content', 'site.json');
function seedSource() {
  if (fs.existsSync(CONTENT)) return JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
  return {
    practices: seed.practices.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, intro: p.intro, services: p.services.map(([title, tag, text]) => ({ title, tag, text })) })),
    insights: seed.insights,
    team: seed.team.map(([name, role, bio]) => ({ name, role, bio })),
    settings: seed.settings,
  };
}
function seedIfEmpty() {
  const src = seedSource();
  const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  if (!count('practices')) {
    const st = db.prepare('INSERT INTO practices (slug,title,summary,intro,services,sort,published) VALUES (?,?,?,?,?,?,?)');
    src.practices.forEach((p, i) => st.run(p.slug, p.title, p.summary, p.intro, JSON.stringify(p.services), p.sort ?? i + 1, p.published ?? 1));
  }
  if (!count('insights')) {
    const st = db.prepare('INSERT INTO insights (slug,title,category,summary,body,published_at,published) VALUES (?,?,?,?,?,?,?)');
    src.insights.forEach((a) => st.run(a.slug, a.title, a.category, a.summary, a.body, a.published_at, a.published ?? 1));
  }
  if (!count('team')) {
    const st = db.prepare('INSERT INTO team (name,role,bio,sort) VALUES (?,?,?,?)');
    src.team.forEach((m, i) => st.run(m.name, m.role, m.bio, m.sort ?? i + 1));
  }
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(src.settings)) if (!k.startsWith('_')) ins.run(k, v);
}
seedIfEmpty();

const parseServices = (row) => ({ ...row, services: JSON.parse(row.services || '[]') });

const q = {
  practices: () => db.prepare('SELECT * FROM practices WHERE published=1 ORDER BY sort, id').all().map(parseServices),
  practice: (slug) => { const r = db.prepare('SELECT * FROM practices WHERE slug=? AND published=1').get(slug); return r && parseServices(r); },
  insights: (limit = 100) => db.prepare('SELECT * FROM insights WHERE published=1 ORDER BY published_at DESC, id DESC LIMIT ?').all(limit),
  insight: (slug) => db.prepare('SELECT * FROM insights WHERE slug=? AND published=1').get(slug),
  team: () => db.prepare('SELECT * FROM team ORDER BY sort, id').all(),
  settings: () => Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((r) => [r.key, r.value])),
  setSetting: (k, v) => db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v),
  addLead: (l) => db.prepare('INSERT INTO leads (name,email,org,topic,message,urgent) VALUES (?,?,?,?,?,?)')
    .run(l.name, l.email, l.org, l.topic, l.message, l.urgent ? 1 : 0),
};

module.exports = { db, q, DB_PATH, CONTENT };
