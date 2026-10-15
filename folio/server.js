require('dotenv').config();

const express = require('express');
const path = require('path');
const db = require('./db');
const { router: authRouter, requireAuth } = require('./auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function cleanString(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function ownedBook(userId, bookId) {
  return db.prepare(
    'SELECT * FROM books WHERE id = ? AND user_id = ?'
  ).get(bookId, userId);
}

function bookProgress(book) {
  return book.total_pages > 0
    ? Math.min(100, Math.round(book.current_page / book.total_pages * 100))
    : 0;
}

function serializeBook(book) {
  return { ...book, progress: bookProgress(book) };
}

function addBookActivity(userId, bookId, pagesRead) {
  if (pagesRead > 0) {
    db.prepare(`
      INSERT INTO reading_activity (user_id, book_id, pages_read)
      VALUES (?, ?, ?)
    `).run(userId, bookId, pagesRead);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare(
      "SELECT datetime('now') AS time"
    ).get();

    res.json({
      status: 'ok',
      database: 'connected',
      time: row.time
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      database: 'not connected'
    });
  }
});

app.get('/api', (req, res) => {
  res.json({
    name: 'bookMARK API',
    version: '1.0.0',
    features: [
      'authentication',
      'library',
      'reading progress',
      'notes and reviews',
      'vocabulary',
      'reading statistics'
    ]
  });
});

// Dashboard statistics
app.get('/api/dashboard', requireAuth, (req, res) => {
  const userId = req.user.id;

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS totalBooks,
      SUM(CASE WHEN status = 'currently_reading' THEN 1 ELSE 0 END) AS reading,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'want_to_read' THEN 1 ELSE 0 END) AS wantToRead,
      COALESCE(SUM(current_page), 0) AS pagesRead
    FROM books
    WHERE user_id = ?
  `).get(userId);

  const notes = db.prepare(
    'SELECT COUNT(*) AS count FROM notes WHERE user_id = ?'
  ).get(userId);

  const vocabulary = db.prepare(
    'SELECT COUNT(*) AS count FROM vocabulary WHERE user_id = ?'
  ).get(userId);

  const activity = db.prepare(`
    SELECT COALESCE(SUM(pages_read), 0) AS pages
    FROM reading_activity
    WHERE user_id = ?
      AND reading_date >= date('now', '-6 days')
  `).get(userId);

  const recentBooks = db.prepare(`
    SELECT * FROM books
    WHERE user_id = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT 5
  `).all(userId).map(serializeBook);

  res.json({
    stats: {
      totalBooks: stats.totalBooks || 0,
      reading: stats.reading || 0,
      completed: stats.completed || 0,
      wantToRead: stats.wantToRead || 0,
      pagesRead: stats.pagesRead || 0,
      notes: notes.count,
      vocabulary: vocabulary.count,
      pagesLast7Days: activity.pages
    },
    recentBooks
  });
});

// List and search books
app.get('/api/books', requireAuth, (req, res) => {
  const search = cleanString(req.query.search, 200);
  const status = cleanString(req.query.status, 40);

  const allowedStatuses = [
    'want_to_read',
    'currently_reading',
    'completed'
  ];

  let sql = 'SELECT * FROM books WHERE user_id = ?';
  const params = [req.user.id];

  if (search) {
    sql += ' AND (title LIKE ? OR author LIKE ? OR genre LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (allowedStatuses.includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY updated_at DESC, id DESC';

  const books = db.prepare(sql).all(...params).map(serializeBook);
  res.json({ books });
});

// Add a book
app.post('/api/books', requireAuth, (req, res) => {
  const title = cleanString(req.body.title, 200);
  const author = cleanString(req.body.author, 200);
  const genre = cleanString(req.body.genre, 100);
  const description = cleanString(req.body.description, 3000);
  const coverUrl = cleanString(req.body.cover_url, 1000);
  const status = req.body.status || 'want_to_read';
  const currentPage = Number(req.body.current_page || 0);
  const totalPages = Number(req.body.total_pages || 0);

  const allowedStatuses = [
    'want_to_read',
    'currently_reading',
    'completed'
  ];

  if (!title) {
    return res.status(400).json({ error: 'Book title is required.' });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid reading status.' });
  }

  if (
    !Number.isInteger(currentPage) ||
    !Number.isInteger(totalPages) ||
    currentPage < 0 ||
    totalPages < 0 ||
    (totalPages > 0 && currentPage > totalPages)
  ) {
    return res.status(400).json({
      error: 'Enter valid page numbers. Pages read cannot exceed total pages.'
    });
  }

  if (status === 'completed' && totalPages > 0 && currentPage < totalPages) {
    return res.status(400).json({
      error: 'Set pages read to the total page count before marking this book completed.'
    });
  }

  const now = new Date().toISOString().slice(0, 10);
  const initialPage = currentPage;

  const result = db.prepare(`
    INSERT INTO books (
      user_id, title, author, genre, description, cover_url,
      status, current_page, total_pages, started_at, completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    title,
    author,
    genre,
    description,
    coverUrl,
    status,
    currentPage,
    totalPages,
    status === 'currently_reading' || status === 'completed' ? now : null,
    status === 'completed' ? now : null
  );

  const id = Number(result.lastInsertRowid);
  addBookActivity(req.user.id, id, initialPage);

  const book = ownedBook(req.user.id, id);
  res.status(201).json({ book: serializeBook(book) });
});

// Update book information or progress
app.patch('/api/books/:id', requireAuth, (req, res) => {
  const id = positiveId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid book ID.' });
  }

  const existing = ownedBook(req.user.id, id);

  if (!existing) {
    return res.status(404).json({ error: 'Book not found.' });
  }

  const body = req.body;
  const title = body.title === undefined
    ? existing.title : cleanString(body.title, 200);
  const author = body.author === undefined
    ? existing.author : cleanString(body.author, 200);
  const genre = body.genre === undefined
    ? existing.genre : cleanString(body.genre, 100);
  const description = body.description === undefined
    ? existing.description : cleanString(body.description, 3000);
  const coverUrl = body.cover_url === undefined
    ? existing.cover_url : cleanString(body.cover_url, 1000);
  const status = body.status === undefined ? existing.status : body.status;
  const currentPage = body.current_page === undefined
    ? existing.current_page : Number(body.current_page);
  const totalPages = body.total_pages === undefined
    ? existing.total_pages : Number(body.total_pages);

  const allowedStatuses = [
    'want_to_read',
    'currently_reading',
    'completed'
  ];

  if (!title) {
    return res.status(400).json({ error: 'Book title is required.' });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid reading status.' });
  }

  if (
    !Number.isInteger(currentPage) ||
    !Number.isInteger(totalPages) ||
    currentPage < 0 ||
    totalPages < 0 ||
    (totalPages > 0 && currentPage > totalPages)
  ) {
    return res.status(400).json({ error: 'Invalid page numbers.' });
  }

  if (status === 'completed' && totalPages > 0 && currentPage < totalPages) {
    return res.status(400).json({
      error: 'Read all pages before marking this book completed.'
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const startedAt = existing.started_at ||
    (status !== 'want_to_read' ? today : null);
  const completedAt = status === 'completed'
    ? (existing.completed_at || today)
    : null;

  db.prepare(`
    UPDATE books
    SET title = ?, author = ?, genre = ?, description = ?,
        cover_url = ?, status = ?, current_page = ?, total_pages = ?,
        started_at = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    title, author, genre, description, coverUrl, status,
    currentPage, totalPages, startedAt, completedAt,
    id, req.user.id
  );

  const delta = currentPage - existing.current_page;
  if (delta > 0) addBookActivity(req.user.id, id, delta);

  res.json({
    book: serializeBook(ownedBook(req.user.id, id))
  });
});

// Delete a book
app.delete('/api/books/:id', requireAuth, (req, res) => {
  const id = positiveId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid book ID.' });
  }

  const result = db.prepare(
    'DELETE FROM books WHERE id = ? AND user_id = ?'
  ).run(id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({ error: 'Book not found.' });
  }

  res.json({ message: 'Book deleted.' });
});

// List notes, optionally filter by book
app.get('/api/notes', requireAuth, (req, res) => {
  try {
    const bookId = req.query.book_id
      ? positiveId(req.query.book_id)
      : null;

    let sql = `
      SELECT notes.*, books.title AS book_title
      FROM notes
      JOIN books ON books.id = notes.book_id
      WHERE notes.user_id = ?
    `;

    const params = [req.user.id];

    if (bookId) {
      sql += ' AND notes.book_id = ?';
      params.push(bookId);
    }

    sql += ' ORDER BY notes.updated_at DESC';

    const notes = db.prepare(sql).all(...params);
    res.json({ notes });
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: 'Could not load notes.' });
  }
});

// Create a note
app.post('/api/notes', requireAuth, (req, res) => {
  try {
    const bookId = positiveId(req.body.book_id);
    const content = cleanString(req.body.content, 10000);
    const title = cleanString(req.body.title, 200);
    const type = cleanString(req.body.type || 'note', 30);
    const pageNumber = req.body.page_number
      ? positiveId(req.body.page_number)
      : null;

    const allowedTypes = [
      'note',
      'summary',
      'review',
      'quote',
      'scene',
      'reflection'
    ];

    if (!bookId || !content) {
      return res.status(400).json({
        error: 'A book and note content are required.'
      });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid note type.' });
    }

    const book = ownedBook(req.user.id, bookId);

    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const result = db.prepare(`
      INSERT INTO notes
        (user_id, book_id, type, title, content, page_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      bookId,
      type,
      title,
      content,
      pageNumber
    );

    const note = db.prepare(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?'
    ).get(Number(result.lastInsertRowid), req.user.id);

    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Could not create note.' });
  }
});

// Delete a note
app.delete('/api/notes/:id', requireAuth, (req, res) => {
  try {
    const id = positiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }

    const result = db.prepare(
      'DELETE FROM notes WHERE id = ? AND user_id = ?'
    ).run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    res.json({ message: 'Note deleted.' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Could not delete note.' });
  }
});

// List vocabulary
app.get('/api/vocabulary', requireAuth, (req, res) => {
  try {
    const vocabulary = db.prepare(`
      SELECT vocabulary.*, books.title AS book_title
      FROM vocabulary
      LEFT JOIN books ON books.id = vocabulary.book_id
      WHERE vocabulary.user_id = ?
      ORDER BY vocabulary.created_at DESC
    `).all(req.user.id);

    res.json({ vocabulary });
  } catch (error) {
    console.error('List vocabulary error:', error);
    res.status(500).json({ error: 'Could not load vocabulary.' });
  }
});

// Add vocabulary
app.post('/api/vocabulary', requireAuth, (req, res) => {
  try {
    const word = cleanString(req.body.word, 200);
    const meaning = cleanString(req.body.meaning, 2000);
    const example = cleanString(req.body.example_sentence, 2000);
    const bookId = req.body.book_id
      ? positiveId(req.body.book_id)
      : null;

    if (!word || !meaning) {
      return res.status(400).json({
        error: 'Word and meaning are required.'
      });
    }

    if (req.body.book_id && !bookId) {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }

    if (bookId && !ownedBook(req.user.id, bookId)) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const result = db.prepare(`
      INSERT INTO vocabulary
        (user_id, book_id, word, meaning, example_sentence)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, bookId, word, meaning, example);

    const entry = db.prepare(
      'SELECT * FROM vocabulary WHERE id = ? AND user_id = ?'
    ).get(Number(result.lastInsertRowid), req.user.id);

    res.status(201).json({ entry });
  } catch (error) {
    console.error('Add vocabulary error:', error);
    res.status(500).json({ error: 'Could not add vocabulary.' });
  }
});

// Delete vocabulary
app.delete('/api/vocabulary/:id', requireAuth, (req, res) => {
  try {
    const id = positiveId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid entry ID.' });
    }

    const result = db.prepare(
      'DELETE FROM vocabulary WHERE id = ? AND user_id = ?'
    ).run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    res.json({ message: 'Vocabulary entry deleted.' });
  } catch (error) {
    console.error('Delete vocabulary error:', error);
    res.status(500).json({ error: 'Could not delete vocabulary.' });
  }
});
app.use('/api/catalog', require('./catalog').router);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error.' });
});


app.listen(PORT, () => {
  console.log(`bookMARK server running at http://localhost:${PORT}`);
});