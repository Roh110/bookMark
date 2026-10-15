
const $ = (selector) => document.querySelector(selector);

let currentUser = null;
let books = [];
let notes = [];
let vocabulary = [];
let authMode = "login";

const stateLabels = {
  want_to_read: "Want to read",
  currently_reading: "Currently reading",
  completed: "Completed",
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      showAuth();
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function showNotice(message, type = "success") {
  const notice = $("#globalNotice");
  if (!notice) {
    console.log(message);
    return;
  }

  notice.textContent = message;
  notice.className = `notice show ${type}`;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    notice.classList.remove("show");
  }, 4000);
}

function showAuth() {
  $("#authScreen")?.classList.remove("hidden");
  $("#appShell")?.classList.add("hidden");
}

function showApp() {
  $("#authScreen")?.classList.add("hidden");
  $("#appShell")?.classList.remove("hidden");

  const name = currentUser?.displayName || currentUser?.username || "Reader";
  const nameTarget = $("#userName");
  if (nameTarget) nameTarget.textContent = name;

  const avatar = $("#userAvatar");
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  const heading = $("#authTitle");
  const subtitle = $("#authSubtitle");
  const submit = $("#authSubmit");
  const switchButton = $("#authSwitch");
  const nameField = $("#authName");

  if (heading) heading.textContent = isSignup ? "Create your account" : "Welcome back";
  if (subtitle) subtitle.textContent = isSignup
    ? "Start building your personal reading library."
    : "Sign in to continue your reading journey.";
  if (submit) submit.textContent = isSignup ? "Create account" : "Sign in";
  if (switchButton) switchButton.textContent = isSignup
    ? "Already have an account? Sign in"
    : "New to bookMARK? Create an account";
  if (nameField) nameField.closest(".form-field")?.classList.toggle("hidden", !isSignup);

  const usernameField = $("#authUsername");
  if (usernameField) usernameField.closest(".form-field")?.classList.toggle("hidden", !isSignup);
}

async function loadBooks() {
  const data = await api("/api/books");
  books = data.books || [];
  renderBooks();
  populateBookSelects();
}

async function loadNotes() {
  const data = await api("/api/notes");
  notes = data.notes || [];
  renderNotes();
}

async function loadVocabulary() {
  const data = await api("/api/vocabulary");
  vocabulary = data.vocabulary || [];
  renderVocabulary();
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  const stats = data.stats || {};

  setText("statTotal", stats.totalBooks ?? stats.total_books ?? books.length);
  setText("statReading", stats.currentlyReading ?? stats.currently_reading ?? 0);
  setText("statCompleted", stats.completedBooks ?? stats.completed_books ?? 0);
  setText("statPages", stats.pagesRead ?? stats.pages_read ?? 0);
  setText("statNotes", stats.totalNotes ?? stats.total_notes ?? notes.length);
  setText("statVocabulary", stats.vocabularyCount ?? stats.vocabulary_count ?? vocabulary.length);
  setText("statWant", stats.wantToRead ?? stats.want_to_read ?? 0);
  setText("statWeekly", stats.weeklyPages ?? stats.weekly_pages ?? 0);

  const recent = $("#recentBooks");
  const recentBooks = data.recentBooks || data.recent_books || [];

  if (recent) {
    recent.innerHTML = recentBooks.length
      ? recentBooks.map(bookCard).join("")
      : emptyState("Your reading journey starts here.", "Add your first book from the Library.");
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function bookCard(book) {
  const title = escapeHtml(book.title || "Untitled");
  const author = escapeHtml(book.author || "Unknown author");
  const genre = escapeHtml(book.genre || "Uncategorised");
  const status = escapeHtml(stateLabels[book.status] || book.status || "Want to read");
  const id = Number(book.id);
  const currentPage = Number(book.current_page || 0);
  const totalPages = Number(book.total_pages || 0);
  const progress = totalPages > 0
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : 0;
  const cover = safeUrl(book.cover_url || "");
  const coverMarkup = cover
    ? `<img class="book-cover" src="${escapeHtml(cover)}" alt="Cover of ${title}" loading="lazy">`
    : `<div class="book-cover cover-placeholder"><span>bookMARK</span></div>`;

  return `
    <article class="book-card">
      ${coverMarkup}
      <div class="book-card-body">
        <span class="status-pill">${status}</span>
        <h3>${title}</h3>
        <p class="book-author">${author}</p>
        <p class="book-genre">${genre}</p>
        <div class="progress-label">
          <span>${currentPage} / ${totalPages || "—"} pages</span>
          <span>${progress}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="book-actions">
          <button type="button" class="button button-secondary" data-edit-book="${id}">Edit</button>
          <button type="button" class="button button-danger" data-delete-book="${id}">Delete</button>
        </div>
      </div>
    </article>`;
}

function emptyState(title, description) {
  return `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>`;
}

function renderBooks() {
  const container = $("#libraryBooks");
  if (!container) return;

  const search = ($("#bookSearch")?.value || "").trim().toLowerCase();
  const filter = $("#bookFilter")?.value || "all";

  const filtered = books.filter((book) => {
    const matchesSearch = [book.title, book.author, book.genre]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesFilter = filter === "all" || book.status === filter;
    return matchesSearch && matchesFilter;
  });

  container.innerHTML = filtered.length
    ? filtered.map(bookCard).join("")
    : emptyState("No books found", "Try another search or add a book to your library.");
}

function populateBookSelects() {
  ["noteBook", "wordBook"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const previous = select.value;
    select.innerHTML = `<option value="">No linked book</option>` +
      books.map((book) =>
        `<option value="${Number(book.id)}">${escapeHtml(book.title)}</option>`
      ).join("");

    if ([...select.options].some((option) => option.value === previous)) {
      select.value = previous;
    }
  });
}

function renderNotes() {
  const container = $("#journalEntries");
  if (!container) return;

  container.innerHTML = notes.length
    ? notes.map((note) => `
      <article class="record-card">
        <div class="record-meta">
          <span class="status-pill">${escapeHtml(note.type || "note")}</span>
          <span>${escapeHtml(note.book_title || "General entry")}</span>
        </div>
        <h3>${escapeHtml(note.title || "Untitled entry")}</h3>
        <p class="record-content">${escapeHtml(note.content || "")}</p>
        ${note.page_number ? `<p class="muted">Page ${Number(note.page_number)}</p>` : ""}
        <button class="button button-danger" type="button" data-delete-note="${Number(note.id)}">Delete</button>
      </article>`).join("")
    : emptyState("Your journal is waiting", "Save a thought, quote, summary, or review.");
}

function renderVocabulary() {
  const container = $("#vocabularyEntries");
  if (!container) return;

  const query = ($("#wordSearch")?.value || "").trim().toLowerCase();
  const filtered = vocabulary.filter((entry) =>
    [entry.word, entry.meaning, entry.example_sentence]
      .some((value) => String(value || "").toLowerCase().includes(query))
  );

  container.innerHTML = filtered.length
    ? filtered.map((entry) => `
      <article class="record-card">
        <h3>${escapeHtml(entry.word)}</h3>
        <p>${escapeHtml(entry.meaning)}</p>
        ${entry.example_sentence
          ? `<blockquote>${escapeHtml(entry.example_sentence)}</blockquote>`
          : ""}
        <p class="muted">${escapeHtml(entry.book_title || "Personal vocabulary")}</p>
        <button class="button button-danger" type="button" data-delete-word="${Number(entry.id)}">Delete</button>
      </article>`).join("")
    : emptyState("No vocabulary found", "Save useful words while you read.");
}

async function refreshApp() {
  await Promise.all([loadBooks(), loadNotes(), loadVocabulary()]);
  await loadDashboard();
}

function navigate(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  const heading = $("#pageTitle");
  if (heading) {
    const titles = {
      dashboard: "Your reading space",
      library: "My library",
      journal: "Reading journal",
      vocabulary: "Vocabulary journal",
    };
    heading.textContent = titles[viewName] || "bookMARK";
  }

  $("#appShell")?.classList.remove("sidebar-open");
}

function openPanel(panelId, shouldOpen = true) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.toggle("hidden", !shouldOpen);
}

function resetBookForm() {
  $("#bookForm")?.reset();
  setValue("bookId", "");
  setValue("bookStatus", "want_to_read");
  setText("bookFormHeading", "Add a new book");
  setText("saveBookButton", "Save book");
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function editBook(id) {
  const book = books.find((item) => Number(item.id) === Number(id));
  if (!book) return;

  setValue("bookId", book.id);
  setValue("bookTitle", book.title);
  setValue("bookAuthor", book.author);
  setValue("bookGenre", book.genre);
  setValue("bookCover", book.cover_url);
  setValue("bookStatus", book.status);
  setValue("bookRating", book.rating ?? "");
  setValue("bookCurrentPage", book.current_page ?? 0);
  setValue("bookTotalPages", book.total_pages ?? "");
  setValue("bookDescription", book.description);
  setText("bookFormHeading", "Edit book");
  setText("saveBookButton", "Update book");
  openPanel("bookFormPanel");
  navigate("library");
}

$("#authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = $("#authSubmit");
  if (submit) submit.disabled = true;

  try {
    const email = $("#authEmail")?.value.trim() || "";
    const password = $("#authPassword")?.value || "";
    const payload = { email, password };

    if (authMode === "signup") {
      const usernameInput = $("#authUsername");
      const nameInput = $("#authName");
      const displayName = nameInput?.value.trim() || "";
      const username = usernameInput?.value.trim() ||
        email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30);

      payload.username = username;
      payload.displayName = displayName;
    }

    const result = await api(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    currentUser = result.user;
    showApp();
    await refreshApp();
    navigate("dashboard");
    showNotice(authMode === "signup" ? "Welcome to bookMARK!" : "Welcome back!");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    if (submit) submit.disabled = false;
  }
});

$("#authSwitch")?.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

$("#logoutButton")?.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  showAuth();
  setAuthMode("login");
  showNotice("You have signed out.");
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.view));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("#mobileMenu")?.addEventListener("click", () => {
  $("#appShell")?.classList.toggle("sidebar-open");
});

$("#showAddBook")?.addEventListener("click", () => {
  resetBookForm();
  openPanel("bookFormPanel");
});

$("#cancelBook")?.addEventListener("click", () => {
  openPanel("bookFormPanel", false);
  resetBookForm();
});

$("#bookForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("#bookId")?.value;
  const payload = {
    title: $("#bookTitle")?.value.trim(),
    author: $("#bookAuthor")?.value.trim(),
    genre: $("#bookGenre")?.value.trim(),
    cover_url: $("#bookCover")?.value.trim(),
    status: $("#bookStatus")?.value,
    current_page: Number($("#bookCurrentPage")?.value || 0),
    total_pages: Number($("#bookTotalPages")?.value || 0),
    description: $("#bookDescription")?.value.trim(),
  };

  try {
    await api(id ? `/api/books/${id}` : "/api/books", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });

    openPanel("bookFormPanel", false);
    resetBookForm();
    await refreshApp();
    showNotice(id ? "Book updated." : "Book added to your library.");
  } catch (error) {
    showNotice(error.message, "error");
  }
});

$("#bookSearch")?.addEventListener("input", renderBooks);
$("#bookFilter")?.addEventListener("change", renderBooks);

$("#showNoteForm")?.addEventListener("click", () => openPanel("noteFormPanel"));
$("#cancelNote")?.addEventListener("click", () => openPanel("noteFormPanel", false));

$("#noteForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    book_id: $("#noteBook")?.value || null,
    type: $("#noteType")?.value,
    title: $("#noteTitle")?.value.trim(),
    content: $("#noteContent")?.value.trim(),
    page_number: $("#notePage")?.value ? Number($("#notePage").value) : null,
  };

  try {
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    $("#noteForm").reset();
    openPanel("noteFormPanel", false);
    await refreshApp();
    showNotice("Journal entry saved.");
  } catch (error) {
    showNotice(error.message, "error");
  }
});

$("#showWordForm")?.addEventListener("click", () => openPanel("wordFormPanel"));
$("#cancelWord")?.addEventListener("click", () => openPanel("wordFormPanel", false));
$("#wordSearch")?.addEventListener("input", renderVocabulary);

$("#wordForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    word: $("#wordText")?.value.trim(),
    book_id: $("#wordBook")?.value || null,
    meaning: $("#wordMeaning")?.value.trim(),
    example_sentence: $("#wordExample")?.value.trim(),
  };

  try {
    await api("/api/vocabulary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    $("#wordForm").reset();
    openPanel("wordFormPanel", false);
    await refreshApp();
    showNotice("Vocabulary word saved.");
  } catch (error) {
    showNotice(error.message, "error");
  }
});

document.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-book]");
  const deleteBookButton = event.target.closest("[data-delete-book]");
  const deleteNoteButton = event.target.closest("[data-delete-note]");
  const deleteWordButton = event.target.closest("[data-delete-word]");

  if (editButton) {
    editBook(editButton.dataset.editBook);
    return;
  }

  if (deleteBookButton) {
    if (!confirm("Delete this book? Related notes may also be removed.")) return;
    try {
      await api(`/api/books/${deleteBookButton.dataset.deleteBook}`, { method: "DELETE" });
      await refreshApp();
      showNotice("Book deleted.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  if (deleteNoteButton) {
    if (!confirm("Delete this journal entry?")) return;
    try {
      await api(`/api/notes/${deleteNoteButton.dataset.deleteNote}`, { method: "DELETE" });
      await refreshApp();
      showNotice("Journal entry deleted.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  if (deleteWordButton) {
    if (!confirm("Delete this vocabulary entry?")) return;
    try {
      await api(`/api/vocabulary/${deleteWordButton.dataset.deleteWord}`, { method: "DELETE" });
      await refreshApp();
      showNotice("Vocabulary entry deleted.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }
});

async function init() {
  setAuthMode("login");

  try {
    const result = await api("/api/auth/me");
    currentUser = result.user;
    showApp();
    await refreshApp();
    navigate("dashboard");
  } catch (error) {
    showAuth();
  }
}

init();
