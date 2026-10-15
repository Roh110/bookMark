const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');
const CATALOG = require('./catalog-data');

const router = express.Router();

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

// Load catalogue books into the database on every start.
// Books already in the table are skipped, so you can keep adding to catalog-data.js.
function seedCatalog() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO catalog_books (title, author, year, pages, genre, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  try {
    for (const b of CATALOG) {
      insert.run(b.title, b.author, b.year, b.pages, b.genre, b.description);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM catalog_books').get();
  console.log(`Catalogue ready: ${count} books`);
}
seedCatalog();

function searchLocal(q) {
  const term = `%${q}%`;
  return db.prepare(`
    SELECT * FROM catalog_books
    WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?
    ORDER BY CASE WHEN title LIKE ? THEN 0 ELSE 1 END, title
    LIMIT 10
  `).all(term, term, term, `${q}%`).map(b => ({
    title: b.title,
    author: b.author,
    year: b.year,
    pages: b.pages,
    genre: b.genre || '',
    coverUrl: '',
    source: 'catalog'
  }));
}

async function searchOpenLibrary(q) {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '8');
  url.searchParams.set('fields', 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,subject');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'bookMARK/1.0 (learning project)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Open Library returned ${response.status}`);

  const data = await response.json();
  return (data.docs || [])
    .map(doc => ({
      title: clean(doc.title, 200),
      author: clean((doc.author_name || [])[0], 200),
      year: doc.first_publish_year || null,
      pages: Number(doc.number_of_pages_median) || 0,
      genre: clean((doc.subject || [])[0], 100),
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${Number(doc.cover_i)}-M.jpg`
        : '',
      source: 'openlibrary'
    }))
    .filter(r => r.title);
}

const keyOf = b => `${b.title}|${b.author}`.toLowerCase();

// Search: catalogue first, then Open Library if the catalogue has few matches
router.get('/search', requireAuth, async (req, res) => {
  const q = clean(req.query.q, 200);
  if (q.length < 2) return res.json({ results: [] });

  const local = searchLocal(q);

  let remote = [];
  if (local.length < 8) {
    try {
      remote = await searchOpenLibrary(q);
    } catch (err) {
      console.error('Open Library search error:', err.message);
    }
  }

  const seen = new Set(local.map(keyOf));
  const extra = remote.filter(b => !seen.has(keyOf(b)));

  res.json({ results: [...local, ...extra].slice(0, 12) });
});

// Add a book from search results to the user's shelf
router.post('/add', requireAuth, (req, res) => {
  const title = clean(req.body.title, 200);
  const author = clean(req.body.author, 200);
  const genre = clean(req.body.genre, 100);
  const rawCover = clean(req.body.coverUrl, 1000);
  const coverUrl = /^https:\/\/covers\.openlibrary\.org\//.test(rawCover) ? rawCover : '';
  const pages = Number.isInteger(req.body.pages) && req.body.pages > 0 ? req.body.pages : 0;
  const status = ['want_to_read', 'currently_reading'].includes(req.body.status)
    ? req.body.status
    : 'want_to_read';

  if (!title) {
    return res.status(400).json({ error: 'Book title is required.' });
  }

  const duplicate = db.prepare(`
    SELECT id FROM books
    WHERE user_id = ? AND title = ? COLLATE NOCASE AND author = ? COLLATE NOCASE
  `).get(req.user.id, title, author);

  if (duplicate) {
    return res.status(409).json({ error: 'This book is already on your shelf.', bookId: duplicate.id });
  }

  const today = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    INSERT INTO books
      (user_id, title, author, genre, cover_url, status, current_page, total_pages, started_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    req.user.id, title, author, genre, coverUrl, status, pages,
    status === 'currently_reading' ? today : null
  );

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ book: { ...book, progress: 0 } });
});

module.exports = { router };