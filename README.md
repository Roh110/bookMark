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

| Method | Endpoint              | Description   |
| ------ | --------------------- | ------------- |
| `POST` | `/api/auth/register/` | Register user |
| `      |                       |               |
