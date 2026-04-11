<div align="center">

# ⚡ Advanced ATS Resume Builder

### *Where AI meets your career*

**A full-stack, AI-powered resume builder with hybrid NLP scoring, semantic keyword intelligence,  
real-time live preview, and 14 cinematic templates — built to beat any ATS system.**

<br/>

[![Status](https://img.shields.io/badge/Status-Operational-00d26a?style=for-the-badge&logo=checkmarx&logoColor=white)](.)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white)](.)
[![Flask](https://img.shields.io/badge/Flask-3.1.0-000000?style=for-the-badge&logo=flask&logoColor=white)](.)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](.)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](.)
[![PyTorch](https://img.shields.io/badge/PyTorch-Backend-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](.)

<br/>

> 📅 **Last Audit:** April 10, 2026 &nbsp;|&nbsp; 🔒 **Security:** Production-Grade &nbsp;|&nbsp; 🤖 **AI Models:** 6 Active

</div>

---

## 📖 Table of Contents

| # | Section |
|---|---------|
| 1 | [✨ Features at a Glance](#-features-at-a-glance) |
| 2 | [🏗️ Architecture Overview](#-architecture-overview) |
| 3 | [🤖 AI & ML Models — Full Breakdown](#-ai--ml-models--full-breakdown) |
| 4 | [🛠️ Full Tech Stack](#-full-tech-stack) |
| 5 | [📁 Project Structure](#-project-structure) |
| 6 | [🗃️ Database Schema](#-database-schema) |
| 7 | [🌐 API Reference](#-api-reference) |
| 8 | [🔒 Security Features](#-security-features) |
| 9 | [🎨 14 Resume Templates](#-14-resume-templates) |
| 10 | [🚀 Setup & Running](#-setup--running) |
| 11 | [📦 Environment Variables](#-environment-variables) |
| 12 | [🔄 Live Data Flow](#-live-data-flow) |

---

## ✨ Features at a Glance

<table>
<tr>
<td width="50%">

### 🧠 AI-Powered Core
- ✅ **Hybrid ATS Engine** — Gemini API + Local NLP in parallel
- ✅ **Semantic Keyword Matching** — Understands meaning, not just words
- ✅ **Zero-Shot Role Scoring** — "92% Backend Developer" with no training data
- ✅ **Auto Entity Extraction** — Pulls name, dates, orgs from raw CV text
- ✅ **AI Bullet Optimizer** — Google XYZ formula rewrites
- ✅ **AI Professional Summary** — Tailored to job description context

</td>
<td width="50%">

### 🎨 Builder Experience
- ✅ **Live Resume Preview** — Updates as you type, zero lag
- ✅ **14 Cinematic Templates** — Dark, light, classic, neon themes
- ✅ **One-Click PDF Export** — Client-side via html2pdf.js
- ✅ **Version History** — Snapshot any state, revert anytime
- ✅ **Public Share Links** — Tokenized, expirable sharing
- ✅ **Google OAuth** — One-click sign-in

</td>
</tr>
<tr>
<td width="50%">

### 🔒 Security
- ✅ Bcrypt password hashing
- ✅ Rate-limited AI endpoints (5 req/min)
- ✅ Audit logging with injection detection
- ✅ Prompt injection defense in ATS service
- ✅ HSTS + full security headers

</td>
<td width="50%">

### ⚙️ Infrastructure
- ✅ SQLite (dev) / PostgreSQL (prod)
- ✅ Redis caching + Celery async queue
- ✅ Graceful offline fallbacks for all AI features
- ✅ Gunicorn production-ready
- ✅ Flask app factory + Blueprint architecture

</td>
</tr>
</table>

---

## 🏗️ Architecture Overview

```
╔══════════════════════════════════════════════════════════════╗
║                      BROWSER  (Client)                       ║
║   ┌─────────────┐   ┌─────────────┐   ┌───────────────────┐ ║
║   │  Landing    │   │    Auth     │   │   Resume Editor   │ ║
║   │   Page      │   │   Pages     │   │  + Live Preview   │ ║
║   └─────────────┘   └─────────────┘   └───────────────────┘ ║
║                           │                                  ║
║                    REST API (JSON)                           ║
╠═══════════════════════════╪══════════════════════════════════╣
║                     FLASK SERVER                             ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  Auth Blueprint /api/v1/auth/*                      │    ║
║  │  Resume Blueprint /api/v1/resumes/*                 │    ║
║  │  API Blueprint /api/v1/ats-* /api/v1/ai/*           │    ║
║  ├─────────────────────────────────────────────────────┤    ║
║  │  Services Layer  (ATS · AI · Resume · Auth)         │    ║
║  ├─────────────────────────────────────────────────────┤    ║
║  │  SQLAlchemy ORM         │  Marshmallow Schemas      │    ║
║  └─────────────────────────────────────────────────────┘    ║
║           │                                                   ║
║   ┌───────┴────────┐     ┌──────────────────────────────┐   ║
║   │  SQLite / PG   │     │  Google Gemini API           │   ║
║   │  (Database)    │     │  + Local NLP Models          │   ║
║   └────────────────┘     └──────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🤖 AI & ML Models — Full Breakdown

> **This project uses a hybrid AI architecture** — combining cloud LLMs with lightweight local ML models for speed, accuracy, and full offline resilience.

---

### 📊 Model Overview Table

| # | Model | Type | Library | Primary Role |
|---|-------|------|---------|-------------|
| 1 | `gemini-1.5-flash` | ☁️ Cloud LLM (Primary) | `google-genai` | ATS analysis, bullet rewriting, summary generation |
| 2 | `gemini-1.5-pro` | ☁️ Cloud LLM (Fallback) | `google-genai` | High-accuracy API fallback |
| 3 | `all-MiniLM-L6-v2` | 🧬 Sentence Embedding | `sentence-transformers` | Semantic resume ↔ JD similarity |
| 4 | `facebook/bart-large-mnli` | 🎯 Zero-Shot Classifier | `transformers` | Role matching & confidence scoring |
| 5 | `en_core_web_md` | 🏷️ NER / NLP | `spacy` | Entity extraction from raw CV text |
| 6 | `KeyBERT` | 🔑 Keyword Intelligence | `keybert` | Contextual keyword weight detection |

---

### 🔬 Deep Dives

<details>
<summary><strong>☁️ Model 1 & 2 — Google Gemini 1.5 Flash / Pro</strong></summary>

<br/>

```
Provider : Google AI (Cloud API)
Models   : gemini-1.5-flash  (primary — speed-optimised)
           gemini-1.5-pro    (fallback — accuracy-optimised)
Library  : google-genai v1.14.0
Output   : Structured JSON
```

**What it does:**
- Runs all three generative AI features: ATS analysis, bullet point optimization, and professional summary generation.
- Returns **structured JSON** with ATS score, found/missing keyword arrays, and human-readable analysis text.
- Gemini Flash delivers near-instant responses for the interactive editor experience.
- Gemini Pro activates automatically as the fallback when Flash is unavailable.

**Graceful Degradation:**
All three features have deterministic local fallbacks — the app never breaks without an API key.

</details>

---

<details>
<summary><strong>🧬 Model 3 — all-MiniLM-L6-v2 (Semantic Matcher)</strong></summary>

<br/>

```
Type     : Dense Sentence Embedding Neural Network
Library  : sentence-transformers
Size     : ~80 MB
Speed    : Very fast (CPU-friendly)
Replaces : Heavy multilingual model (saved significant server RAM)
```

**What it does:**

Converts both the resume text and the job description into high-dimensional semantic vectors, then measures their cosine similarity.

**Why this matters — example:**

| Resume says | JD says | Exact match? | Semantic match? |
|---|---|---|---|
| "built REST APIs" | "developed backend services" | ❌ | ✅ |
| "led a team of 4" | "team leadership experience" | ❌ | ✅ |
| "Python, FastAPI" | "Python web frameworks" | ❌ | ✅ |

Traditional ATS systems fail all three. This model catches all of them.

</details>

---

<details>
<summary><strong>🎯 Model 4 — facebook/bart-large-mnli (Zero-Shot Role Classifier)</strong></summary>

<br/>

```
Type     : Natural Language Inference (NLI) — Sequence Classification
Library  : transformers (HuggingFace)
Task     : Zero-shot classification
Training : Pre-trained on MNLI — no resume-specific fine-tuning needed
```

**What it does:**

Takes the full resume content and scores it against a dynamic list of job roles — **with no labeled training data required**.

**Example output:**
```json
{
  "Backend Developer":     0.92,
  "Data Scientist":        0.74,
  "ML Engineer":           0.61,
  "Frontend Developer":    0.41,
  "DevOps Engineer":       0.33
}
```

This tells a user not just "you match this job" — but *how* their entire skillset maps across the job landscape.

</details>

---

<details>
<summary><strong>🏷️ Model 5 — en_core_web_md (spaCy NER)</strong></summary>

<br/>

```
Type     : Statistical NLP Model (Named Entity Recognition)
Library  : spacy
Model    : en_core_web_md  (medium English pipeline)
Install  : python -m spacy download en_core_web_md
```

**What it does:**

Automatically extracts structured facts from raw, unformatted CV text pasted by the user:

| Entity Type | Example Extraction |
|---|---|
| 📅 **DATE** | "2021 – 2023", "June 2020" |
| 🏢 **ORG** | "Google", "NSRIT", "Infosys" |
| 👤 **PERSON** | Auto-fills name field |
| 📍 **GPE** | "Visakhapatnam", "Bangalore" |

This eliminates manual form-filling — the builder auto-populates fields from pasted raw CV text.

</details>

---

<details>
<summary><strong>🔑 Model 6 — KeyBERT (Keyword Intelligence Engine)</strong></summary>

<br/>

```
Type     : BERT-based Keyword Extraction
Library  : keybert
Backbone : sentence-transformers (reuses all-MiniLM-L6-v2 embeddings)
```

**Why it's better than simple word counting:**

```
Raw text: "Designed scalable Machine Learning pipelines for real-time inference"

❌ TF-IDF finds:   "Designed", "scalable", "real-time"
✅ KeyBERT finds:  "Machine Learning pipelines", "real-time inference", "scalable"
```

KeyBERT understands **multi-word phrases as single concepts** and ranks them by relevance to the document's topic — giving the ATS engine far more precise keyword gap detection.

</details>

---

### 🔄 Hybrid ATS Engine — Full Pipeline

```
  User submits resume text + job description
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  ┌─────────────────┐    ┌──────────────────────────────┐
  │  ☁️ GEMINI API  │    │  🧠 LOCAL NLP PIPELINE       │
  │                 │    │                              │
  │  Structured     │    │  1. KeyBERT                  │
  │  JSON output:   │    │     → Extract weighted       │
  │  · ATS Score    │    │       keywords from both     │
  │  · Found KWs    │    │       resume + JD            │
  │  · Missing KWs  │    │                              │
  │  · Analysis     │    │  2. all-MiniLM-L6-v2         │
  │                 │    │     → Semantic similarity    │
  │  Rate: 5/min    │    │       score                  │
  │  Fallback: Pro  │    │                              │
  │                 │    │  3. BART-large-mnli          │
  └────────┬────────┘    │     → Role confidence %      │
           │             └──────────────┬───────────────┘
           └────────────┬───────────────┘
                        ▼
          ┌─────────────────────────────┐
          │  MERGE & SELECT BEST RESULT │
          │  · Higher score wins        │
          │  · Keywords from both       │
          │  · Role scores appended     │
          └──────────────┬──────────────┘
                         ▼
              Final ATS Report → UI
```

> 💡 **`auto` mode** (default) runs **both** pipelines simultaneously and returns the better result — ensuring accurate scoring whether the Gemini API key is present or not.

---

## 🛠️ Full Tech Stack

### 🐍 Backend

| Technology | Version | Purpose |
|---|---|---|
| **Flask** | 3.1.0 | Web framework — app factory + Blueprints |
| **Flask-SQLAlchemy** | 3.1.1 | ORM for all database models |
| **SQLAlchemy** | 2.0.36 | Core ORM engine |
| **Flask-Migrate** | 4.0.7 | Database migrations via Alembic |
| **Flask-Login** | 0.6.3 | Session-based authentication |
| **Flask-Bcrypt** | 1.0.1 | Cryptographically secure password hashing |
| **Flask-Limiter** | 3.5.0 | Rate limiting per endpoint |
| **Marshmallow** | 3.23.2 | Request/response schema validation |
| **PyJWT** | 2.10.1 | JWT refresh token generation |
| **Authlib** | 1.4.0 | OAuth2 — Google Sign-In |
| **Celery** | 5.4.0 | Async background task queue |
| **Redis** | 5.2.0 | Caching + Celery message broker |
| **google-genai** | 1.14.0 | Google Gemini API client |
| **Gunicorn** | 22.0.0 | Production WSGI server |
| **python-dotenv** | 1.0.1 | `.env` variable loading |

### 🧠 AI / NLP

| Library | Model Used | Purpose |
|---|---|---|
| `google-genai` | `gemini-1.5-flash` / `pro` | Generative AI — ATS, bullets, summary |
| `sentence-transformers` | `all-MiniLM-L6-v2` | Semantic embedding & similarity |
| `transformers` | `facebook/bart-large-mnli` | Zero-shot role classification |
| `spacy` | `en_core_web_md` | NER entity extraction |
| `keybert` | *(uses MiniLM backbone)* | Contextual keyword extraction |
| `scikit-learn` | TF-IDF pipeline | Local ATS fallback scoring |
| `torch` (PyTorch) | *(inference backend)* | Neural model runtime |

### 🎨 Frontend

| Technology | Purpose |
|---|---|
| **Vanilla JavaScript (ES6+)** | Reactive store, editor logic, data binding |
| **Tailwind CSS** | Utility-first styling across all pages |
| **GSAP** | Cinematic scroll-triggered animations |
| **html2pdf.js** | Client-side PDF generation and export |
| **Google Fonts** — Manrope, Fraunces | Typography |
| **Material Symbols** | Icon library |

### 🗄️ Database

| Technology | Environment | Notes |
|---|---|---|
| **SQLite** | Development | File-based, zero config |
| **PostgreSQL** | Production | Set via `DATABASE_URL` env var |

---

## 📁 Project Structure

```
resume_builder_project/
│
├── app/
│   ├── __init__.py              # 🏭 Flask app factory (create_app)
│   ├── config.py                # ⚙️  Dev / Prod / Test configurations
│   ├── extensions.py            # 🔌 Flask extension instances
│   │
│   ├── auth/                    # 🔐 Authentication module
│   │   ├── models.py            #    User, RefreshToken, SecurityAuditLog
│   │   ├── routes.py            #    /api/v1/auth/* endpoints
│   │   ├── schemas.py           #    Marshmallow validation schemas
│   │   └── services.py          #    Auth business logic
│   │
│   ├── resume/                  # 📄 Resume module (core feature)
│   │   ├── models.py            #    Resume, Education, Experience, Skill,
│   │   │                        #    Project, Certificate, Version, Template
│   │   ├── routes.py            #    /api/v1/resumes/* endpoints
│   │   ├── schemas.py           #    Resume serialization schemas
│   │   ├── services.py          #    CRUD, versioning, public sharing
│   │   └── ats_service.py       #    🤖 Hybrid ATS engine (Gemini + NLP)
│   │
│   ├── api/
│   │   └── routes.py            # 🌐 ATS, AI bullet, projects/certs CRUD
│   │
│   ├── services/
│   │   └── ai_service.py        # 🧠 Gemini API wrapper (all 3 AI features)
│   │
│   ├── common/
│   │   └── errors.py            # ⚠️  AppError class + error constants
│   │
│   ├── templates/               # 🖼️  Jinja2 HTML templates
│   │   ├── landing.html
│   │   ├── index.html           #    Resume editor (authenticated)
│   │   ├── dashboard.html
│   │   └── auth/
│   │       ├── login.html
│   │       └── register.html
│   │
│   └── static/
│       ├── css/
│       │   ├── cinematic.css
│       │   ├── cinematic-refactor.css
│       │   └── unified-cinematic.css
│       └── js/
│           ├── editor.js         # 🖊️  Core: store, preview, ATS, templates
│           ├── store.js          #    Reactive state (Store class)
│           ├── export.js         #    PDF export utilities
│           ├── gsap-animations.js
│           ├── immersive3d.js
│           └── cinematic*.js
│
├── migrations/                  # Alembic migration files
├── tests/                       # 🧪 Test suite
├── seed.py                      # 🌱 Database seeder (dev only)
├── requirements.txt
├── tailwind.config.js
├── .env
├── .gitignore
└── pytest.ini
```

---

## 🗃️ Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ RESUMES : owns
    USERS ||--o{ REFRESH_TOKENS : has
    USERS ||--o{ SECURITY_AUDIT_LOG : generates
    USERS ||--o{ CERTIFICATIONS_USER : has
    RESUMES ||--o{ EDUCATION : contains
    RESUMES ||--o{ EXPERIENCE : contains
    RESUMES ||--o{ SKILLS : contains
    RESUMES ||--o{ PROJECTS : contains
    RESUMES ||--o{ CERTIFICATES : contains
    RESUMES ||--o{ VERSIONS : snapshots
    RESUMES ||--o{ PUBLIC_LINKS : shares
    TEMPLATES ||--o{ RESUMES : styles
```

### Table Reference

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | id, name, email, password_hash, google_id | User accounts |
| `resumes` | id, user_id, template_id, personal_*, summary | Resume root entity |
| `education` | id, resume_id, school, degree, start_year, end_year | Education entries |
| `experience` | id, resume_id, company, role, start_date, end_date, description | Work experience |
| `skills` | id, resume_id, skill_name, level | Technical skills |
| `projects` | id, resume_id, title, description, tech_stack, github_link, demo_link | Projects |
| `certificates` | id, resume_id, name, issuer, year | Resume-level certificates |
| `certifications` | id, user_id, name, issuing_org, issue_date, credential_url | User-level certs |
| `versions` | id, resume_id, version_no, label, data (JSON) | Resume snapshots |
| `public_links` | id, resume_id, token, expires_at | Tokenized sharing |
| `templates` | id, name, html_path, css_path, ats_safe | 14 template definitions |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked | JWT refresh store |
| `security_audit_log` | id, user_id, event_type, ip_address, payload | Security events |

---

## 🌐 API Reference

### 🔐 Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login (email + password) |
| `POST` | `/api/v1/auth/logout` | Logout + invalidate session |
| `GET` | `/api/v1/auth/google` | Google OAuth2 Sign-In redirect |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT access token |

### 📄 Resume CRUD

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/resumes` | List all user resumes |
| `POST` | `/api/v1/resumes` | Create new resume |
| `GET` | `/api/v1/resumes/:id` | Get full resume by ID |
| `DELETE` | `/api/v1/resumes/:id` | Delete resume |
| `PUT` | `/api/v1/resumes/:id/personal-info` | Update personal info + summary |
| `PUT` | `/api/v1/resumes/:id/experience` | Update work experience |
| `PUT` | `/api/v1/resumes/:id/education` | Update education |
| `PUT` | `/api/v1/resumes/:id/skills` | Update skills |
| `PUT` | `/api/v1/resumes/:id/projects` | Update projects |
| `PUT` | `/api/v1/resumes/:id/certificates` | Update certificates |

### 🔄 Versioning & Sharing

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/resumes/:id/versions` | List version history |
| `GET` | `/resumes/:id/versions/:no` | Get specific version snapshot |
| `POST` | `/resumes/:id/versions/:no/revert` | Revert to a past version |
| `POST` | `/resumes/:id/share` | Generate tokenized public link |
| `DELETE` | `/resumes/:id/share` | Revoke public link |
| `GET` | `/public/:token` | View shared resume (no auth required) |

### 🤖 AI Endpoints

| Method | Endpoint | Rate Limit | Description |
|---|---|---|---|
| `POST` | `/resumes/:id/ats-analyze` | 5 / min | Hybrid ATS analysis (Gemini + local NLP) |
| `POST` | `/resumes/:id/summary-generate` | 5 / min | AI professional summary |
| `POST` | `/ai/optimize-bullet` | 5 / min | AI bullet point optimizer (XYZ formula) |

---

## 🔒 Security Features

| Feature | Implementation | Notes |
|---|---|---|
| **Password Hashing** | `Flask-Bcrypt` | Cryptographically secure, no plaintext stored |
| **Session Management** | `Flask-Login` | HttpOnly + SameSite=Lax secure cookies |
| **Rate Limiting** | `Flask-Limiter` | 60/min global · 5/min on all AI endpoints |
| **JWT Tokens** | `PyJWT` | Refresh token rotation with revocation |
| **CSRF Protection** | SameSite=Lax cookies | Cross-site request forgery mitigation |
| **Security Headers** | Custom middleware | HSTS · X-Frame-Options · X-Content-Type-Options |
| **Input Validation** | Marshmallow schemas | Every endpoint validated — no raw data reaches DB |
| **Audit Logging** | `SecurityAuditLog` table | Tracks logins, injection attempts, anomalies |
| **Prompt Injection Defense** | Keyword filtering | Applied in `ats_service.py` before Gemini calls |
| **OAuth2** | `Authlib` | Google Sign-In with full OAuth2 flow |

---

## 🎨 14 Resume Templates

> All templates render every section: **Summary · Experience · Projects · Education · Skills · Certifications**

| # | Template | Aesthetic | Theme |
|---|---|---|---|
| 1 | `modern` | Clean header, well-spaced sections | ⬜ Light |
| 2 | `classic` | Centered header, bordered section dividers | ⬜ Light |
| 3 | `compact` | Dense layout, skills shown first | ⬜ Light |
| 4 | `minimal` | Ultra-light typography, maximum whitespace | ⬜ Light |
| 5 | `executive` | Dark header card, premium corporate feel | 🌓 Partial dark |
| 6 | `noir` | Full dark slate-950 background | 🌑 Full dark |
| 7 | `aurora` | Cyan/emerald gradient header | ⬜ Light |
| 8 | `timeline` | Timeline-style experience entries | ⬜ Light |
| 9 | `split` | Two-column sidebar layout | ⬜ Light |
| 10 | `mono` | Monospace typewriter aesthetic | ⬜ Light |
| 11 | `skyline` | Blue gradient header, corporate | ⬜ Light |
| 12 | `matrix` | Green-on-black terminal hacker theme | 🌑 Full dark |
| 13 | `paperclip` | Skeuomorphic pinned-paper design | ⬜ Light |
| 14 | `zen` | Centered, spacious, meditative layout | ⬜ Light |
| 15 | `neon` | Fuchsia-on-dark glowing cyberpunk | 🌑 Full dark |

---

## 🚀 Setup & Running

### Prerequisites

```
Python 3.10+    Redis server    Node.js (optional, for Tailwind builds)
```

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/ats-resume-builder.git
cd ats-resume-builder

# 2. Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Download required NLP models
python -m spacy download en_core_web_md

# 5. Configure environment variables
cp .env.example .env
# → Edit .env with your SECRET_KEY, JWT_SECRET_KEY, GEMINI_API_KEY

# 6. Initialize database
flask db upgrade

# 7. (Optional) Seed demo data
python seed.py

# 8. Start development server
flask run --debug
```

> 🌐 App runs at `http://localhost:5000`

### Production Deployment

```bash
# Run with Gunicorn
gunicorn "app:create_app('production')" \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120

# Start Redis
redis-server

# Start Celery worker
celery -A app.celery worker --loglevel=info
```

---

## 📦 Environment Variables

```env
# ─── Core (Required) ─────────────────────────────────────────
SECRET_KEY=your-super-secret-flask-key
JWT_SECRET_KEY=your-jwt-signing-secret

# ─── Database ────────────────────────────────────────────────
DATABASE_URL=sqlite:///resume_builder.db
# DATABASE_URL=postgresql://user:pass@host/db   ← production

# ─── Redis & Celery ──────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# ─── Google Gemini AI (Optional — local fallback exists) ─────
GEMINI_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-1.5-flash
LLM_FALLBACK_MODEL=gemini-1.5-pro

# ─── App Config ──────────────────────────────────────────────
FLASK_ENV=development

# ─── Storage (Optional) ──────────────────────────────────────
S3_BUCKET_NAME=your-s3-bucket-name
```

---

## 🔄 Live Data Flow

```
User types in form input
        │
        ▼
[data-bind="projects.0.title"]
        │  input event
        ▼
store.update('projects.0.title', value)
        │
        ▼
store emits '*' event
        │
        ▼
renderPreview(state) ──→ Live preview updates instantly
        │
        ▼
Debounced (1 second)
        │
        ▼
saveSectionData('projects.0.title')
        │
        ▼
path.startsWith('projects') ──→ PUT /api/v1/resumes/:id/projects
        │
        ▼
update_resume_section() → Clear old rows → Insert new → DB commit ✅
```

---

## ✅ Section Integration Audit

| Section | Store Key | Form | Preview | Save | Load | Status |
|---|---|---|---|---|---|---|
| Personal Info | `personal.*` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Summary | `summary` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Education | `education[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Experience | `experience[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Skills | `skillsString` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Projects | `projects[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Certifications | `certifications[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |

---

<div align="center">

### Built with ❤️ by [Sai Kiran Putta V.V](https://linkedin.com/in/sai-kiran-putta-v-v-421497310)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/sai-kiran-putta-v-v-421497310)
[![GitHub](https://img.shields.io/badge/GitHub-rokeysai13--sys-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rokeysai13-sys)
[![Email](https://img.shields.io/badge/Email-rokeysai13@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:rokeysai13@gmail.com)

*Flask · Vanilla JS · Google Gemini · HuggingFace Transformers · spaCy · PyTorch*

</div>#
