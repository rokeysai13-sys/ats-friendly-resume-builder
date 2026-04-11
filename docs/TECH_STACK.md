# Project Tech Stack & Dependencies

This document provides a top-to-bottom overview of the technologies, frameworks, libraries, and AI models utilized to construct the Advanced ATS Resume Builder.

---

## 🏗️ 1. Core Architecture & Backend
The backbone of the application runs on Python, utilizing a robust MVC architecture designed for production.

*   **Python Framework:** [Flask 3.1.0](https://flask.palletsprojects.com/) - The core WSGI web application framework.
*   **Web Server:** [Gunicorn](https://gunicorn.org/) - Handles incoming HTTP requests for production deployment.
*   **Asynchronous Task Queue:** [Celery](https://docs.celeryq.dev/) - Manages heavy background processes (like NLP analysis and PDF generation) so the UI doesn't freeze.
*   **Message Broker & Cache:** [Redis](https://redis.io/) - Backing store for Celery and caching.
*   **Rate Limiting:** `Flask-Limiter` - Prevents API spam and protects login endpoints.

---

## 🔒 2. Security & Authentication
User data protection and streamlined access.

*   **Login Management:** `Flask-Login` - Session-based user tracking.
*   **Password Hashing:** `bcrypt` & `flask-bcrypt` - Cryptographically secure password hashing.
*   **Token Encoding:** `PyJWT` - Cross-platform JSON Web Tokens.
*   **Third-Party OAuth:** `Authlib` - Integration for standard OAuth workflows (Google, LinkedIn login).

---

## 🗄️ 3. Database Layer
The data schema layout heavily relies on standard relational blueprints.

*   **ORM (Object-Relational Mapping):** `SQLAlchemy` (v2.0+) & `Flask-SQLAlchemy` - Pythonic interaction with database tables without raw SQL.
*   **Migrations:** `Flask-Migrate` - (Alembic wrapper) Handles structural upgrades to the database schema.
*   **Serialization:** `marshmallow` & `marshmallow-sqlalchemy` - Safely converts complex DB objects into JSON schemas for the API.

---

## 🧠 4. Advanced AI & NLP Engine (Hybrid ATS)
The "Magic" inside the application. This hybrid architecture merges massive language models with specialized local mathematical models for optimal resume scanning.

### A. Core LLM Processing
*   **Generative AI:** `google-genai` (Gemini API) - Used for writing contextual professional summaries, analyzing tone, and human-like assessments.

### B. NLP & Semantic Analysis (Local Machine Learning)
*   **Data Science Core:** `torch` (PyTorch) & `scikit-learn` - Core machine learning mathematical backends.
*   **Semantic Router:** `sentence-transformers` - Generates high-dimension vector embeddings to compare concepts contextually.
*   **Efficient Embedder Model:** `all-MiniLM-L6-v2` - Deep neural network model. Extremely fast and lightweight semantic string comparison. (Replaced the heavy multi-lingual model to save server RAM).
*   **Keyword Intelligence:** `KeyBERT` - Advanced keyword extraction. Not just looking for words, but understanding their weight against the surrounding text (e.g., finding "Machine Learning" natively).

### C. Zero-Shot & Entity Parsing
*   **Entity Extraction (NER):** `spacy` - Industrial-strength Natural Language Processing.
    *   *Model:* `en_core_web_md` - Extracts standard facts (dates, organizations, personal names) directly from uploaded raw CV text without needing manual user inputs.
*   **Zero-Shot Role Matcher:** `transformers` pipeline.
    *   *Model:* `facebook/bart-large-mnli` - A vast algorithm taking the context of a resume and evaluating "how much" it matches a dynamic list of Roles (e.g., scoring someone as 92% Backend Developer).

---

## 🎨 5. Frontend & Rendering
How the user interacts with the system.

*   **Templating Engine:** `Jinja2` - Delivered natively through Flask for HTML page rendering.
*   *(Additional HTML/CSS standards mapping to `app/templates`)*

---

*Generated to map out the application's underlying ecosystem. All specified packages are securely defined inside `requirements.txt`.*
