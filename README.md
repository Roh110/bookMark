# 📚 Personal Book Library

> **Read. Reflect. Remember.**

A personal reading and knowledge-management application that helps readers build their own digital library, track their reading journey, write reviews and summaries, save memorable scenes, maintain personal notes, and collect new vocabulary with meanings.

Unlike a traditional book-tracking application, this project focuses on **helping users remember what they read and retrieve what they learned**.

---

## 🌟 Overview

Readers often finish a book but later struggle to remember:

* What they thought about the book
* Their favorite scenes or important moments
* The lessons and ideas they took from it
* Where they wrote a particular thought
* New words they learned while reading
* How their opinions changed over time

**Personal Book Library** provides a centralized space for storing and organizing this information.

Users can search for a book, add it to their personal library, track their reading progress, and create a personal knowledge record around every book they read.

---

## ✨ Core Features

### 📖 Personal Library

* Search books by title, author, or ISBN
* Add books to a personal library
* Organize books by reading status

  * 📌 Want to Read
  * 📖 Currently Reading
  * ✅ Completed
  * ⏸️ Abandoned
* Track reading progress
* Record reading start and completion dates

### ⭐ Reviews & Ratings

* Rate books using a 1–5 star system
* Write personal reviews
* Keep reviews private or optionally make them public
* Record overall thoughts and impressions

### 📝 Personal Notes

Create notes while reading, including:

* Chapter summaries
* Personal reflections
* Character observations
* Important ideas
* Questions
* Themes
* Lessons learned
* General notes

Notes can be connected to a specific chapter or page.

### 🎬 Favorite Scenes

Save memorable moments from a book and record:

* Scene description
* Chapter
* Page number
* Characters involved
* Why the scene was memorable
* Personal interpretation

### 🧠 Vocabulary Journal

Save unfamiliar or interesting words discovered while reading.

Each vocabulary entry can contain:

* Word
* Meaning
* Example sentence
* Book where it was discovered
* Personal notes
* Learning/review status

### 🔎 Personal Knowledge Search

Search through your own reading history and notes.

For example:

> "Find all my notes about courage."

The application can return relevant notes from multiple books.

This transforms the application from a simple book tracker into a **personal reading knowledge base**.

### 📊 Reading Analytics

Track personal reading activity such as:

* Books completed
* Books currently being read
* Reading progress
* Books by genre
* Vocabulary collected
* Notes created
* Reading activity over time

---

# 🎯 Project Vision

The long-term goal is to create a **Personal Reading Memory System**.

Instead of only answering:

> "What books have I read?"

the application should eventually help answer:

> "What did I learn from the books I read?"

and:

> "Where did I encounter this idea before?"

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │                     │
                         │  • Dashboard        │
                         │  • Book Search      │
                         │  • Library          │
                         │  • Notes            │
                         │  • Vocabulary       │
                         │  • Reviews          │
                         └──────────┬──────────┘
                                    │
                              REST API
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Django REST API     │
                         │                     │
                         │ • Authentication    │
                         │ • Books             │
                         │ • Library           │
                         │ • Notes             │
                         │ • Reviews           │
                         │ • Vocabulary        │
                         │ • Analytics         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    PostgreSQL       │
                         │                     │
                         │ • Users             │
                         │ • Books             │
                         │ • User Libraries    │
                         │ • Notes             │
                         │ • Reviews           │
                         │ • Vocabulary        │
                         └─────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ External Services   │
                         │                     │
                         │ Book Metadata API   │
                         │ Optional AI APIs    │
                         └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* **React.js**
* **Vite**
* **Tailwind CSS**
* JavaScript
* REST API integration

## Backend

* **Python**
* **Django**
* **Django REST Framework**

## Database

* **PostgreSQL**

## External Services

* Book metadata API
* Book cover API
* Optional AI/LLM service

## Development Tools

* Git
* GitHub
* VS Code
* Postman / API testing tools

---

# 📁 Project Structure

```text
personal-book-library/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── BookCard.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── RichTextEditor.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ExploreBooks.jsx
│   │   │   ├── MyLibrary.jsx
│   │   │   ├── BookDetails.jsx
│   │   │   ├── Notes.jsx
│   │   │   ├── Vocabulary.jsx
│   │   │   └── Profile.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── accounts/
│   ├── books/
│   ├── library/
│   ├── notes/
│   ├── reviews/
│   ├── vocabulary/
│   ├── analytics/
│   │
│   ├── manage.py
│   └── requirements.txt
│
├── tests/
│
├── .env.example
├── .gitignore
└── README.md
```

---

# 🗄️ Database Design

The application uses a relational database to separate shared book information from user-specific information.

### Main entities

```text
User
 │
 ├── Personal Library
 │       │
 │       └── Book
 │
 ├── Reviews
 │
 ├── Notes
 │       ├── Summaries
 │       ├── Favorite Scenes
 │       ├── Reflections
 │       └── Themes
 │
 └── Vocabulary
         └── Words & Definitions
```

A single book can belong to many users while each user maintains their own:

* Reading status
* Reading progress
* Notes
* Review
* Favorite scenes
* Vocabulary
* Personal interpretation

---

# 🔌 API Structure

Example REST API endpoints:

| Method  | Endpoint                   | Description             |
| ------- | -------------------------- | ----------------------- |
| `POST`  | `/api/auth/register/`      | Register user           |
| `POST`  | `/api/auth/login/`         | Login                   |
| `GET`   | `/api/books/search/`       | Search books            |
| `POST`  | `/api/library/`            | Add book to library     |
| `GET`   | `/api/library/`            | Get personal library    |
| `PATCH` | `/api/library/{id}/`       | Update reading progress |
| `GET`   | `/api/library/{id}/notes/` | Get book notes          |
| `POST`  | `/api/notes/`              | Create note             |
| `PATCH` | `/api/notes/{id}/`         | Update note             |
| `GET`   | `/api/notes/search/`       | Search personal notes   |
| `POST`  | `/api/reviews/`            | Create review           |
| `GET`   | `/api/vocabulary/`         | Get saved vocabulary    |
| `POST`  | `/api/vocabulary/`         | Save vocabulary         |
| `GET`   | `/api/analytics/`          | Get reading analytics   |

---

# 🚀 Future AI Features

AI will be introduced only after the core reading-management system is stable.

### 🤖 AI Reading Assistant

Users could ask questions about their own saved notes.

Example:

> "What did I learn about courage from the books I read?"

The system could retrieve relevant notes and provide a summarized response.

### 🔍 Semantic Search

Instead of only searching exact words:

```text
courage
```

the system could understand related concepts such as:

```text
bravery
fear
taking risks
standing up for others
overcoming uncertainty
```

and retrieve relevant personal notes.

### 🧠 Automatic Note Organization

AI could help categorize notes into:

* Character
* Theme
* Lesson
* Plot
* Reflection
* Question
* Favorite Scene

### 📚 Cross-Book Connections

The application could identify relationships between ideas from different books.

For example:

```text
Book A
   │
   └── Courage
          │
          ├── Book B → Leadership
          │
          └── Book C → Fear
```

This would make the application significantly different from a conventional reading tracker.

---

# 🔐 Privacy

Personal reading notes should be **private by default**.

The application should ensure:

* Users can access only their own private notes
* User-specific API endpoints enforce ownership
* Passwords are securely hashed
* Sensitive configuration is stored using environment variables
* Public sharing is explicitly controlled by the user

---

# 📈 Development Roadmap

## Phase 1 — MVP

* [ ] Project setup
* [ ] Database design
* [ ] User authentication
* [ ] Book search
* [ ] Personal library
* [ ] Reading status
* [ ] Reading progress
* [ ] Notes
* [ ] Summaries
* [ ] Favorite scenes
* [ ] Reviews
* [ ] Vocabulary

## Phase 2 — Productivity

* [ ] Advanced search
* [ ] Tags
* [ ] Reading statistics
* [ ] Reading goals
* [ ] Vocabulary flashcards
* [ ] Chapter/page references
* [ ] Export personal notes
* [ ] Responsive mobile UI

## Phase 3 — Intelligence

* [ ] AI-assisted summaries
* [ ] Semantic search
* [ ] Personal reading assistant
* [ ] Cross-book concept discovery
* [ ] AI-generated vocabulary explanations
* [ ] Personalized reading insights

---

# 🧪 Testing

The project will include tests for:

* User authentication
* Book creation and retrieval
* Library ownership
* Reading progress
* Notes CRUD operations
* Review creation
* Vocabulary management
* API permissions
* Search functionality

Special attention will be given to **authorization**, ensuring one user cannot access another user's private reading data.

---

# ⚙️ Local Development

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/personal-book-library.git

cd personal-book-library
```

### 2. Create Python virtual environment

```bash
python -m venv .venv
```

### 3. Activate the environment

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

### 4. Install backend dependencies

```bash
cd backend

pip install -r requirements.txt
```

### 5. Configure environment variables

Create a `.env` file:

```env
DEBUG=True

SECRET_KEY=your-secret-key

DATABASE_NAME=book_library
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_HOST=localhost
DATABASE_PORT=5432

BOOK_API_KEY=your-api-key
```

Never commit the `.env` file to GitHub.

### 6. Run migrations

```bash
python manage.py migrate
```

### 7. Create an admin user

```bash
python manage.py createsuperuser
```

### 8. Start Django

```bash
python manage.py runserver
```

### 9. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

---

# 🌱 Environment Variables

The following configuration should be stored in `.env`:

```text
SECRET_KEY
DATABASE_NAME
DATABASE_USER
DATABASE_PASSWORD
DATABASE_HOST
DATABASE_PORT
BOOK_API_KEY
AI_API_KEY
```

A `.env.example` file should be included in the repository so developers know which variables are required.

---

# 📌 Why This Project?

This project explores how a traditional digital library can evolve into a **personal knowledge-management system for readers**.

Instead of simply tracking:

> 📚 "I read this book."

the goal is to capture:

> 📝 "This is what I thought about it."

> 💡 "This is what I learned."

> 🎬 "This is the scene I want to remember."

> 🧠 "This is a concept I discovered."

> 🔎 "This is where I can find that idea again."

---

# 🎯 Project Goal

The ultimate goal is to build a personal digital space where a reader's **books, thoughts, memories, vocabulary, and knowledge** remain connected.

**Read → Record → Organize → Remember → Rediscover**

---

# 👨‍💻 Author

**Your Name**

Built as a full-stack software project exploring:

* Full-stack web development
* REST API architecture
* Database design
* Authentication & authorization
* Search systems
* Personal knowledge management
* AI-assisted information retrieval

---

# ⭐ Future Vision

> **Your books are not just a collection.
> They're a record of what you've learned.**

