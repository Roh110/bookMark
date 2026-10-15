const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const db = require('./db');

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'folio_session';
const SESSION_DAYS = 30;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Password hashing ----------
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hashHex] = stored.split(':');
  const key = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(key, Buffer.from(hashHex, 'hex'));
}

// ---------- Sessions ----------
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expires);
  return token;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
    bio: u.bio,
  };
}

function getUserFromRequest(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;

  const hashed = hashToken(token);
  const row = db.prepare(`
    SELECT u.*, s.expires_at FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(hashed);
  if (!row) return null;

  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashed);
    return null;
  }
  return row;
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Please log in to continue' });
  req.user = user;
  next();
}

// Lets async route handlers pass errors to Express
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Routes ----------
const router = express.Router();

router.post('/signup', wrap(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!USERNAME_RE.test(username))
    return res.status(400).json({ error: 'Username must be 3-30 characters: letters, numbers or underscores' });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const taken = db.prepare('SELECT email, username FROM users WHERE email = ? OR username = ?')
    .get(email, username);
  if (taken) {
    return res.status(409).json({
      error: taken.email === email ? 'An account with this email already exists' : 'That username is taken',
    });
  }

  const passwordHash = await hashPassword(password);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
  ).run(username, email, passwordHash, username);

  const userId = Number(result.lastInsertRowid);
  setSessionCookie(res, createSession(userId));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const valid = user && user.password_hash && await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  setSessionCookie(res, createSession(user.id));
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: publicUser(user) });
});

module.exports = { router, requireAuth, getUserFromRequest, publicUser };