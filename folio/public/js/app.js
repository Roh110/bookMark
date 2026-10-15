// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATUS_LABEL = {
  want_to_read: 'Want to read',
  currently_reading: 'Reading',
  completed: 'Completed'
};

const PALETTES = [
  ['#8b5cf6', '#312e81'], ['#2563eb', '#1e1b4b'], ['#6366f1', '#3b0764'],
  ['#0ea5e9', '#1e3a8a'], ['#a855f7', '#1e1b4b'], ['#3b82f6', '#4c1d95']
];

const hashText = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const state = {
  user: null,
  filter: { search: '', status: '' }
};

const bookIndex = new Map();
function rememberBooks(list) {
  list.forEach(b => bookIndex.set(b.id, b));
}

function toast(message, isError = false) {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no JSON body */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

function go(path) {
  if (location.hash === path) route();
  else location.hash = path;
}

function setView(html) {
  $('#app').innerHTML = html;
}

function showChrome() {
  $('#topbar').hidden = !state.user;
  $('#userName').textContent = state.user ? (state.user.displayName || state.user.username) : '';
}

function coverStyle(book) {
  if (book.cover_url && /^https?:\/\//i.test(book.cover_url)) {
    const safe = book.cover_url.replace(/[^\w\-.~:\/?#@!$&*+,;=%]/g, '');
    return `background-image:url(${safe})`;
  }
  const [a, b] = PALETTES[hashText(book.title) % PALETTES.length];
  return `background:linear-gradient(160deg,${a},${b})`;
}

function bookCard(b) {
  return `
    <button class="book-card" data-id="${b.id}" type="button" aria-label="Open ${esc(b.title)}">
      <div class="cover" style="${coverStyle(b)}">${b.cover_url ? '' : `<span>${esc(b.title)}</span>`}</div>
      <div class="book-meta">
        <strong>${esc(b.title)}</strong>
        <small>${esc(b.author || 'Unknown author')}</small>
        <div class="progress"><div style="width:${b.progress}%"></div></div>
        <small>${STATUS_LABEL[b.status]} · ${b.progress}%</small>
      </div>
    </button>`;
}

function emptyState(title, text, withAdd = false) {
  return `
    <div class="empty" style="grid-column:1 / -1">
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${withAdd ? '<button class="btn" type="button" data-add>+ Add book</button>' : ''}
    </div>`;
}

function statCard(value, label) {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

// ---------- Auth pages ----------
function authLayout(inner) {
  setView(`
    <section class="auth">
      <div class="auth-hero">
        <p class="eyebrow">Your reading life, organised</p>
        <h1>Track every book you read.</h1>
        <p class="lead">Log pages, rate what you finish, and keep your notes and new words in one place.</p>
      </div>
      <div class="auth-card">${inner}</div>
    </section>`);
}

function bindAuthForm(path) {
  const form = $('#authForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const { user } = await api(path, { method: 'POST', body });
      state.user = user;
      showChrome();
      toast(`Welcome, ${user.displayName || user.username}`);
      go('#/dashboard');
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
  });
}

function renderLogin() {
  authLayout(`
    <h2>Log in</h2>
    <form id="authForm" class="stack">
      <label>Email
        <input name="email" type="email" required autocomplete="email">
      </label>
      <label>Password
        <input name="password" type="password" required autocomplete="current-password">
      </label>
      <button class="btn wide" type="submit">Log in</button>
    </form>
    <p class="switch">New to bookMARK? <a href="#/signup">Create an account</a></p>`);
  bindAuthForm('/auth/login');
}

function renderSignup() {
  authLayout(`
    <h2>Create your account</h2>
    <form id="authForm" class="stack">
      <label>Username
        <input name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" autocomplete="username">
      </label>
      <label>Email
        <input name="email" type="email" required autocomplete="email">
      </label>
      <label>Password (at least 8 characters)
        <input name="password" type="password" required minlength="8" autocomplete="new-password">
      </label>
      <button class="btn wide" type="submit">Create account</button>
    </form>
    <p class="switch">Already have an account? <a href="#/login">Log in</a></p>`);
  bindAuthForm('/auth/signup');
}

// ---------- Dashboard ----------
async function renderDashboard() {
  setView('<p class="loading">Loading your shelf…</p>');
  const { stats, recentBooks } = await api('/dashboard');
  rememberBooks(recentBooks);

  const name = state.user.displayName || state.user.username;
  setView(`
    <section class="page-head">
      <div>
        <p class="eyebrow">Welcome back</p>
        <h1>Hi, ${esc(name)}</h1>
      </div>
      <button class="btn" type="button" data-add>+ Add book</button>
    </section>

    <section class="stats">
      ${statCard(stats.totalBooks, 'Books on your shelf')}
      ${statCard(stats.reading, 'Currently reading')}
      ${statCard(stats.completed, 'Completed')}
      ${statCard(stats.pagesRead.toLocaleString(), 'Pages read')}
      ${statCard(stats.pagesLast7Days, 'Pages this week')}
      ${statCard(stats.notes, 'Notes')}
      ${statCard(stats.vocabulary, 'Words saved')}
    </section>

    <section>
      <h2 class="section-title">Recently updated</h2>
      ${recentBooks.length
        ? `<div class="book-grid">${recentBooks.map(bookCard).join('')}</div>`
        : `<div class="book-grid">${emptyState('Your shelf is empty', 'Add your first book to start tracking your reading.', true)}</div>`}
    </section>`);
}

// ---------- Library ----------
async function renderLibrary() {
  setView(`
    <section class="page-head">
      <div>
        <p class="eyebrow">Your library</p>
        <h1>Books</h1>
      </div>
      <button class="btn" type="button" data-add>+ Add book</button>
    </section>
    <section class="toolbar">
      <input type="search" id="bookSearch" placeholder="Search by title, author or genre"
             value="${esc(state.filter.search)}" aria-label="Search books">
      <div class="chips" id="statusChips">
        ${['', 'want_to_read', 'currently_reading', 'completed'].map(s => `
          <button class="chip" type="button" data-status="${s}"
                  aria-pressed="${state.filter.status === s}">${s ? STATUS_LABEL[s] : 'All'}</button>`).join('')}
      </div>
    </section>
    <section class="book-grid" id="bookList"></section>`);

  bindLibrary();
  await loadBooks();
}

function bindLibrary() {
  $('#bookSearch').addEventListener('input', (e) => {
    clearTimeout(bindLibrary.timer);
    bindLibrary.timer = setTimeout(() => {
      state.filter.search = e.target.value.trim();
      loadBooks();
    }, 250);
  });

  $('#statusChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filter.status = chip.dataset.status;
    document.querySelectorAll('#statusChips .chip').forEach(c =>
      c.setAttribute('aria-pressed', String(c === chip)));
    loadBooks();
  });
}

async function loadBooks() {
  const params = new URLSearchParams();
  if (state.filter.search) params.set('search', state.filter.search);
  if (state.filter.status) params.set('status', state.filter.status);

  try {
    const { books } = await api(`/books?${params}`);
    rememberBooks(books);
    const filtered = state.filter.search || state.filter.status;
    $('#bookList').innerHTML = books.length
      ? books.map(bookCard).join('')
      : filtered
        ? emptyState('No books match', 'Try a different search or shelf.')
        : emptyState('No books yet', 'Add your first book to your library.', true);
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Add / edit dialog ----------
let bookDialog;

function openBookDialog(book = null) {
  if (!bookDialog) {
    bookDialog = document.createElement('dialog');
    bookDialog.className = 'book-dialog';
    document.body.appendChild(bookDialog);
  }
  const dlg = bookDialog;
  const b = book || {
    title: '', author: '', genre: '', cover_url: '', description: '',
    status: 'want_to_read', current_page: 0, total_pages: 0
  };
  const isEdit = Boolean(book);

  dlg.innerHTML = `
    <form class="book-form" id="bookForm">
      <div class="dialog-head">
        <h2>${isEdit ? 'Edit book' : 'Add a book'}</h2>
        <button class="icon-btn" type="button" data-close aria-label="Close">×</button>
      </div>

      <label>Title
        <input name="title" required maxlength="200" value="${esc(b.title)}">
      </label>

      <div class="row">
        <label>Author
          <input name="author" maxlength="200" value="${esc(b.author)}">
        </label>
        <label>Genre
          <input name="genre" maxlength="100" value="${esc(b.genre)}">
        </label>
      </div>

      <label>Cover image URL (optional)
        <input name="cover_url" type="url" maxlength="1000" placeholder="https://…" value="${esc(b.cover_url)}">
      </label>

      <div class="row3">
        <label>Status
          <select name="status">
            ${Object.entries(STATUS_LABEL).map(([v, l]) =>
              `<option value="${v}" ${v === b.status ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label>Pages read
          <input name="current_page" type="number" min="0" value="${b.current_page}">
        </label>
        <label>Total pages
          <input name="total_pages" type="number" min="0" value="${b.total_pages}">
        </label>
      </div>

      <label>Description
        <textarea name="description" rows="3" maxlength="3000">${esc(b.description)}</textarea>
      </label>

      <div class="dialog-actions">
        ${isEdit ? '<button class="btn danger" type="button" data-delete>Delete</button>' : '<span></span>'}
        <div>
          <button class="btn ghost" type="button" data-close>Cancel</button>
          <button class="btn" type="submit">${isEdit ? 'Save changes' : 'Add book'}</button>
        </div>
      </div>
    </form>`;

  const form = $('#bookForm', dlg);

  // Choosing "Completed" fills pages read with the total
  form.elements.status.addEventListener('change', () => {
    if (form.elements.status.value === 'completed' && Number(form.elements.total_pages.value) > 0) {
      form.elements.current_page.value = form.elements.total_pages.value;
    }
  });

  dlg.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => dlg.close()));

  dlg.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${book.title}"? Its notes will be deleted too.`)) return;
    try {
      await api(`/books/${book.id}`, { method: 'DELETE' });
      dlg.close();
      toast('Book deleted');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      title: fd.get('title').trim(),
      author: fd.get('author').trim(),
      genre: fd.get('genre').trim(),
      cover_url: fd.get('cover_url').trim(),
      description: fd.get('description').trim(),
      status: fd.get('status'),
      current_page: Number(fd.get('current_page') || 0),
      total_pages: Number(fd.get('total_pages') || 0)
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (isEdit) await api(`/books/${book.id}`, { method: 'PATCH', body });
      else await api('/books', { method: 'POST', body });
      dlg.close();
      toast(isEdit ? 'Book updated' : 'Book added');
      route();
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
  });

  dlg.showModal();
  form.elements.title.focus();
}

// Open a book or the add dialog from any button or card
document.addEventListener('click', (e) => {
  const card = e.target.closest('.book-card');
  if (card) {
    openBookDialog(bookIndex.get(Number(card.dataset.id)));
    return;
  }
  if (e.target.closest('[data-add]')) openBookDialog();
});

// ---------- Router ----------
const ROUTES = {
  '#/login': renderLogin,
  '#/signup': renderSignup,
  '#/dashboard': renderDashboard,
  '#/library': renderLibrary
};
const PUBLIC_ROUTES = ['#/login', '#/signup'];
let sessionChecked = false;

async function route() {
  if (!sessionChecked) {
    sessionChecked = true;
    try {
      state.user = (await api('/auth/me')).user;
    } catch (err) {
      state.user = null;
    }
    showChrome();
  }

  const current = location.hash || '#/dashboard';
  if (!ROUTES[current]) return go('#/dashboard');

  const isPublic = PUBLIC_ROUTES.includes(current);
  if (!state.user && !isPublic) return go('#/login');
  if (state.user && isPublic) return go('#/dashboard');

  document.querySelectorAll('[data-nav]').forEach(a =>
    a.classList.toggle('active', `#/${a.dataset.nav}` === current));

  try {
    await ROUTES[current]();
  } catch (err) {
    if (err.status === 401) {
      state.user = null;
      showChrome();
      return go('#/login');
    }
    setView(emptyState('Something went wrong', err.message));
  }
}

$('#logoutBtn').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch (err) { /* ignore */ }
  state.user = null;
  showChrome();
  go('#/login');
});

window.addEventListener('hashchange', route);
route();// ---------- Book search bar ----------
const catalog = { timer: null, controller: null, results: [], active: 0, query: '' };
const searchInput = $('#catalogSearch');
const searchResults = $('#searchResults');

const isOpen = () => !searchResults.hidden;

function openSearch() {
  searchResults.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
}

function closeSearch() {
  searchResults.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
}

// Wraps each typed word in <mark> so it stands out, like the browser's address bar
function highlight(text, q) {
  const words = q.split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return esc(text);
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return String(text).split(re)
    .map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)))
    .join('');
}

function initials(title) {
  return title.split(/\s+/).filter(w => /\w/.test(w)).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
}

function resultRow(r, i, q) {
  const [a, b] = PALETTES[hashText(r.title) % PALETTES.length];
  const iconStyle = r.coverUrl
    ? `background-image:url(${r.coverUrl})`
    : `background:linear-gradient(160deg,${a},${b})`;
  const iconText = r.coverUrl ? '' : esc(initials(r.title));
  const meta = [r.author || 'Unknown author', r.year, r.pages ? `${r.pages} pages` : null]
    .filter(Boolean).join(' · ');
  const source = r.source === 'catalog' ? 'bookMARK catalogue' : 'Open Library';

  return `
    <div class="sr-row" role="option" id="sr-${i}" data-index="${i}"
         aria-selected="${i === catalog.active}">
      <div class="sr-icon" style="${iconStyle}">${iconText}</div>
      <div class="sr-text">
        <div class="sr-title">${highlight(r.title, q)}</div>
        <div class="sr-sub">${esc(meta)} <span class="src">· ${source}</span></div>
      </div>
      <button class="sr-btn" type="button" tabindex="-1">+ Add</button>
    </div>`;
}

function renderResults() {
  if (!catalog.results.length) {
    searchResults.innerHTML =
      `<div class="sr-msg">No books found for “${esc(catalog.query)}”. Check the spelling or try another title.</div>`;
    return;
  }
  searchResults.innerHTML =
    catalog.results.map((r, i) => resultRow(r, i, catalog.query)).join('') +
    `<div class="sr-footer">
       <span><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to add</span>
       <span><kbd>Esc</kbd> to close</span>
     </div>`;
}

function setActive(i) {
  const rows = searchResults.querySelectorAll('.sr-row');
  if (!rows.length) return;
  catalog.active = (i + rows.length) % rows.length;
  rows.forEach((row, idx) => row.setAttribute('aria-selected', String(idx === catalog.active)));
  rows[catalog.active].scrollIntoView({ block: 'nearest' });
  searchInput.setAttribute('aria-activedescendant', `sr-${catalog.active}`);
}

async function runCatalogSearch(q) {
  catalog.query = q;
  if (catalog.controller) catalog.controller.abort();
  catalog.controller = new AbortController();

  searchResults.innerHTML = '<div class="sr-msg">Searching…</div>';
  openSearch();

  try {
    const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`, {
      signal: catalog.controller.signal,
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed.');

    catalog.results = data.results;
    catalog.active = 0;
    renderResults();
  } catch (err) {
    if (err.name === 'AbortError') return;
    searchResults.innerHTML = `<div class="sr-msg">${esc(err.message)}</div>`;
  }
}

async function addResult(i) {
  const r = catalog.results[i];
  if (!r) return;
  const row = searchResults.querySelector(`[data-index="${i}"]`);
  const btn = row ? row.querySelector('.sr-btn') : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

  try {
    await api('/catalog/add', {
      method: 'POST',
      body: {
        title: r.title,
        author: r.author,
        genre: r.genre,
        coverUrl: r.coverUrl,
        pages: r.pages,
        status: 'want_to_read'
      }
    });
    if (btn) btn.textContent = 'Added ✓';
    toast(`Added “${r.title}” to your shelf`);
    route();
  } catch (err) {
    if (btn) {
      if (err.status === 409) btn.textContent = 'On shelf';
      else { btn.disabled = false; btn.textContent = '+ Add'; }
    }
    toast(err.message, true);
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(catalog.timer);
  const q = searchInput.value.trim();
  if (q.length < 2) {
    searchResults.innerHTML = '';
    closeSearch();
    return;
  }
  catalog.timer = setTimeout(() => runCatalogSearch(q), 300);
});

searchInput.addEventListener('focus', () => {
  if (searchResults.innerHTML) openSearch();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!isOpen()) openSearch();
    setActive(catalog.active + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(catalog.active - 1);
  } else if (e.key === 'Enter' && isOpen() && catalog.results.length) {
    e.preventDefault();
    addResult(catalog.active);
  } else if (e.key === 'Escape') {
    closeSearch();
    searchInput.blur();
  }
});

searchResults.addEventListener('mouseover', (e) => {
  const row = e.target.closest('.sr-row');
  if (row) setActive(Number(row.dataset.index));
});

searchResults.addEventListener('click', (e) => {
  const row = e.target.closest('.sr-row');
  if (row) addResult(Number(row.dataset.index));
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#searchWrap')) closeSearch();
});