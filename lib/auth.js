'use strict';
const crypto = require('node:crypto');
const { q } = require('./db');

const SESSION_TTL = 1000 * 60 * 60 * 8; // 8 часов

function secret() {
  let s = q.settings()._secret;
  if (!s) { s = crypto.randomBytes(32).toString('hex'); q.setSetting('_secret', s); }
  return s;
}
const hmac = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Пароль: из ADMIN_PASSWORD, иначе хеш в БД; при первом запуске генерируется и печатается в консоль
function initPassword() {
  if (process.env.ADMIN_PASSWORD) return;
  if (q.settings()._admin_hash) return;
  const pwd = crypto.randomBytes(9).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  q.setSetting('_admin_hash', `${salt}:${crypto.scryptSync(pwd, salt, 64).toString('hex')}`);
  console.log(`\n  Пароль администратора (показывается один раз): ${pwd}\n  Задайте свой через ADMIN_PASSWORD в .env\n`);
}

function checkPassword(input) {
  if (process.env.ADMIN_PASSWORD) return safeEq(input, process.env.ADMIN_PASSWORD);
  const h = q.settings()._admin_hash;
  if (!h) return false;
  const [salt, hash] = h.split(':');
  return safeEq(crypto.scryptSync(String(input), salt, 64).toString('hex'), hash);
}

function newSession() { const exp = Date.now() + SESSION_TTL; return `${exp}.${hmac('s' + exp)}`; }
function validSession(tok) {
  if (!tok) return false;
  const [exp, sig] = String(tok).split('.');
  return Number(exp) > Date.now() && !!sig && safeEq(sig, hmac('s' + exp));
}
const csrfFor = (tok) => hmac('csrf' + tok);

function parseCookies(h) {
  return Object.fromEntries(String(h || '').split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
}

// простой лимитер: key → [timestamps]
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr); return false;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

module.exports = { initPassword, checkPassword, newSession, validSession, csrfFor, parseCookies, limited, SESSION_TTL };
