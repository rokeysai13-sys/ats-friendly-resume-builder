<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&color=0:000000,30:0f0500,60:1f0a00,100:000000&height=300&section=header&text=ATS%20Resume%20Builder&fontSize=60&fontColor=ffffff&fontAlignY=45&desc=Resume%20Atelier%20%E2%80%94%20Digital%20Obsidian&descSize=18&descAlignY=63&descColor=f97316&animation=fadeIn&stroke=f97316&strokeWidth=2" width="100%"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=14&duration=3000&pause=900&color=F97316&center=true&vCenter=true&width=750&height=28&lines=Full-Stack+AI+%C2%B7+Hybrid+NLP+Scoring+%C2%B7+12+Cinematic+Templates;Semantic+Keyword+Intelligence+%C2%B7+Real-Time+Live+Preview;Built+to+beat+any+ATS+system+%E2%80%94+intelligently."/>

<br/><br/>

[![Status](https://img.shields.io/badge/Status-Operational-00d26a?style=for-the-badge&logo=checkmarx&logoColor=white&labelColor=111111)](.)&nbsp;
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white&labelColor=111111)](.)&nbsp;
[![Flask](https://img.shields.io/badge/Flask-3.1.0-ffffff?style=for-the-badge&logo=flask&logoColor=black&labelColor=111111)](.)&nbsp;
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white&labelColor=111111)](.)&nbsp;
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black&labelColor=111111)](.)&nbsp;
[![PyTorch](https://img.shields.io/badge/PyTorch-Backend-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white&labelColor=111111)](.)

<br/>

> 📅 **Last Updated:** April 22, 2026 &nbsp;&nbsp;|&nbsp;&nbsp; 🔒 **Security:** Production-Grade &nbsp;&nbsp;|&nbsp;&nbsp; 🤖 **AI Models:** 6 Active

<br/>

**A full-stack, AI-powered resume builder with hybrid NLP scoring, semantic keyword intelligence,<br/>real-time live preview, and 12 cinematic templates — built to beat any ATS system.**

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%"/>

</div>

<br/>

## 📖 Table of Contents

| # | Section |
|---|---------|
| 1 | [✨ Features at a Glance](#-features-at-a-glance) |
| 2 | [🏗️ Architecture Overview](#-architecture-overview) |
| 3 | [🤖 AI & ML Models](#-ai--ml-models) |
| 4 | [🛠️ Tech Stack](#-tech-stack) |
| 5 | [📁 Project Structure](#-project-structure) |
| 6 | [🗃️ Database Schema](#-database-schema) |
| 7 | [🌐 API Reference](#-api-reference) |
| 8 | [🔒 Security Features](#-security-features) |
| 9 | [🎨 Resume Templates](#-resume-templates) |
| 10 | [🚀 Setup & Running](#-setup--running) |
| 11 | [📦 Environment Variables](#-environment-variables) |
| 12 | [🔄 Live Data Flow](#-live-data-flow) |

<br/>

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
- ✅ **12 Cinematic Templates** — Dark, light, classic, neon themes
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

<br/>

---

## 🏗️ Architecture Overview

```
╔═════════════════════════════════════════════════════════════╗
║                      BROWSER  (Client)                      ║
║   ┌─────────────┐   ┌─────────────┐   ┌───────────────────┐ ║
║   │  Landing    │   │    Auth     │   │   Resume Editor   │ ║
║   │   Page      │   │   Pages     │   │  + Live Preview   │ ║
║   └─────────────┘   └─────────────┘   └───────────────────┘ ║
║                           │                                 ║
║                    REST API (JSON)                          ║
╠═══════════════════════════╪═════════════════════════════════╣
║                     FLASK SERVER                            ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  Auth Blueprint /api/v1/auth/*                      │    ║
║  │  Resume Blueprint /api/v1/resumes/*                 │    ║
║  │  API Blueprint /api/v1/ats-* /api/v1/ai/*           │    ║
║  ├─────────────────────────────────────────────────────┤    ║
║  │  Services Layer  (ATS · AI · Resume · Auth)         │    ║
║  ├─────────────────────────────────────────────────────┤    ║
║  │  SQLAlchemy ORM         │  Marshmallow Schemas      │    ║
║  └─────────────────────────────────────────────────────┘    ║
║           │                                                 ║
║   ┌───────┴────────┐     ┌──────────────────────────────┐   ║
║   │  SQLite / PG   │     │  Google Gemini API           │   ║
║   │  (Database)    │     │  + Local NLP Models          │   ║
║   └────────────────┘     └──────────────────────────────┘   ║
╚═════════════════════════════════════════════════════════════╝
```

<br/>

---

## 🤖 AI & ML Models

> **Hybrid AI architecture** — cloud LLMs + lightweight local ML for speed, accuracy, and offline resilience.

### Model Overview

| # | Model | Type | Library | Role |
|---|-------|------|---------|------|
| 1 | `gemini-1.5-flash` | ☁️ Cloud LLM (Primary) | `google-genai` | ATS analysis, bullet rewriting, summary generation |
| 2 | `gemini-1.5-pro` | ☁️ Cloud LLM (Fallback) | `google-genai` | High-accuracy API fallback |
| 3 | `all-MiniLM-L6-v2` | 🧬 Sentence Embedding | `sentence-transformers` | Semantic resume ↔ JD similarity |
| 4 | `facebook/bart-large-mnli` | 🎯 Zero-Shot Classifier | `transformers` | Role matching & confidence scoring |
| 5 | `en_core_web_md` | 🏷️ NER / NLP | `spacy` | Entity extraction from raw CV text |
| 6 | `KeyBERT` | 🔑 Keyword Intelligence | `keybert` | Contextual keyword weight detection |

### Hybrid ATS Pipeline

```
  User submits resume text + job description
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  ┌─────────────────┐    ┌──────────────────────────────┐
  │  ☁️ GEMINI API  │    │  🧠 LOCAL NLP PIPELINE       │
  │  · ATS Score    │    │  1. KeyBERT keyword extract  │
  │  · Found KWs    │    │  2. MiniLM semantic score    │
  │  · Missing KWs  │    │  3. BART role confidence %   │
  │  · Analysis     │    │                              │
  └────────┬────────┘    └──────────────┬───────────────┘
           └────────────┬───────────────┘
                        ▼
          ┌─────────────────────────────┐
          │  MERGE & SELECT BEST RESULT │
          │  · Higher score wins        │
          │  · Keywords from both       │
          └──────────────┬──────────────┘
                         ▼
              Final ATS Report → UI
```

> 💡 **`auto` mode** runs **both** pipelines simultaneously — works with or without a Gemini API key.

<br/>

---

## 🛠️ Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=python,flask,redis,postgresql,sqlite,pytorch,js,tailwind,html,css&theme=dark&perline=10" />

</div>

<br/>

### 🐍 Backend

| Technology | Version | Purpose |
|---|---|---|
| **Flask** | 3.1.0 | Web framework — app factory + Blueprints |
| **Flask-SQLAlchemy** | 3.1.1 | ORM for all database models |
| **Flask-Migrate** | 4.0.7 | Database migrations via Alembic |
| **Flask-Login** | 0.6.3 | Session-based authentication |
| **Flask-Bcrypt** | 1.0.1 | Password hashing |
| **Flask-Limiter** | 3.5.0 | Rate limiting per endpoint |
| **Marshmallow** | 3.23.2 | Request/response schema validation |
| **PyJWT** | 2.10.1 | JWT refresh token generation |
| **Authlib** | 1.4.0 | OAuth2 — Google Sign-In |
| **Celery** | 5.4.0 | Async background task queue |
| **Redis** | 5.2.0 | Caching + Celery message broker |
| **google-genai** | 1.14.0 | Google Gemini API client |
| **Gunicorn** | 22.0.0 | Production WSGI server |

### 🧠 AI / NLP

| Library | Model | Purpose |
|---|---|---|
| `google-genai` | `gemini-1.5-flash` / `pro` | Generative AI — ATS, bullets, summary |
| `sentence-transformers` | `all-MiniLM-L6-v2` | Semantic embedding & similarity |
| `transformers` | `facebook/bart-large-mnli` | Zero-shot role classification |
| `spacy` | `en_core_web_md` | NER entity extraction |
| `keybert` | *(MiniLM backbone)* | Contextual keyword extraction |
| `scikit-learn` | TF-IDF pipeline | Local ATS fallback scoring |
| `torch` | *(inference backend)* | Neural model runtime |

### 🎨 Frontend

| Technology | Purpose |
|---|---|
| **Vanilla JavaScript (ES6+)** | Reactive store, editor logic, data binding |
| **Tailwind CSS** | Utility-first styling |
| **GSAP** | Cinematic scroll-triggered animations |
| **html2pdf.js** | Client-side PDF export |
| **Google Fonts** — Manrope, Fraunces | Typography |
| **Material Symbols** | Icon library |

<br/>

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
│       │   └── unified-cinematic.css
│       └── js/
│           ├── editor.js         # 🖊️  Core: store, preview, ATS, templates
│           ├── store.js          #    Reactive state (Store class)
│           ├── export.js         #    PDF export utilities
│           └── gsap-animations.js
│
├── migrations/                  # Alembic migration files
├── tests/                       # 🧪 Test suite
├── seed.py                      # 🌱 Database seeder (dev only)
├── requirements.txt
├── tailwind.config.js
├── .env
└── pytest.ini
```

<br/>

---

## 🗃️ Database Schema

```mermaid
erDiagram
    USERS ||--o{ RESUMES : owns
    USERS ||--o{ REFRESH_TOKENS : has
    USERS ||--o{ SECURITY_AUDIT_LOG : generates
    RESUMES ||--o{ EDUCATION : contains
    RESUMES ||--o{ EXPERIENCE : contains
    RESUMES ||--o{ SKILLS : contains
    RESUMES ||--o{ PROJECTS : contains
    RESUMES ||--o{ CERTIFICATES : contains
    RESUMES ||--o{ VERSIONS : snapshots
    RESUMES ||--o{ PUBLIC_LINKS : shares
    TEMPLATES ||--o{ RESUMES : styles
```

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | id, name, email, password_hash, google_id | User accounts |
| `resumes` | id, user_id, template_id, personal_*, summary | Resume root entity |
| `education` | id, resume_id, school, degree, start_year, end_year | Education entries |
| `experience` | id, resume_id, company, role, start_date, end_date, description | Work experience |
| `skills` | id, resume_id, skill_name, level | Technical skills |
| `projects` | id, resume_id, title, description, tech_stack, github_link, demo_link | Projects |
| `certificates` | id, resume_id, name, issuer, year | Resume-level certificates |
| `versions` | id, resume_id, version_no, label, data (JSON) | Resume snapshots |
| `public_links` | id, resume_id, token, expires_at | Tokenized sharing |
| `templates` | id, name, html_path, css_path, ats_safe | Template definitions |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked | JWT refresh store |
| `security_audit_log` | id, user_id, event_type, ip_address, payload | Security events |

<br/>

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
| `POST` | `/resumes/:id/versions/:no/revert` | Revert to a past version |
| `POST` | `/resumes/:id/share` | Generate tokenized public link |
| `DELETE` | `/resumes/:id/share` | Revoke public link |
| `GET` | `/public/:token` | View shared resume (no auth) |

### 🤖 AI Endpoints

| Method | Endpoint | Rate Limit | Description |
|---|---|---|---|
| `POST` | `/resumes/:id/ats-analyze` | 5 / min | Hybrid ATS analysis (Gemini + local NLP) |
| `POST` | `/resumes/:id/summary-generate` | 5 / min | AI professional summary |
| `POST` | `/ai/optimize-bullet` | 5 / min | AI bullet point optimizer (XYZ formula) |

<br/>

---

## 🔒 Security Features

| Feature | Implementation | Notes |
|---|---|---|
| **Password Hashing** | `Flask-Bcrypt` | Cryptographically secure, no plaintext stored |
| **Session Management** | `Flask-Login` | HttpOnly + SameSite=Lax secure cookies |
| **Rate Limiting** | `Flask-Limiter` | 60/min global · 5/min on all AI endpoints |
| **JWT Tokens** | `PyJWT` | Refresh token rotation with revocation |
| **Security Headers** | Custom middleware | HSTS · X-Frame-Options · X-Content-Type-Options |
| **Input Validation** | Marshmallow schemas | Every endpoint validated before DB |
| **Audit Logging** | `SecurityAuditLog` table | Tracks logins, injection attempts, anomalies |
| **Prompt Injection Defense** | Keyword filtering | Applied in `ats_service.py` before Gemini calls |
| **OAuth2** | `Authlib` | Google Sign-In with full OAuth2 flow |

<br/>

---

## 🎨 Resume Templates

> All templates render: **Summary · Experience · Projects · Education · Skills · Certifications**

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

<br/>

---

## 🚀 Setup & Running

### Prerequisites

```
Python 3.10+    Redis server    Node.js (optional, for Tailwind builds)
```

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/rokeysai13-sys/ats-resume-builder.git
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

<br/>

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
```

<br/>

---

## 🔄 Live Data Flow

```
User types in form input
        │
        ▼
[data-bind="personal.phone"]
        │  input event
        ▼
store.update('personal.phone', value)
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
saveSectionData('personal.phone')
        │
        ▼
PUT /api/v1/resumes/:id/personal-info
        │
        ▼
update_personal_info() → DB commit ✅
```

<br/>

---

## ✅ Section Integration Audit

| Section | Store Key | Form | Preview | Save | Load | Status |
|---|---|---|---|---|---|---|
| Personal Info | `personal.*` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Phone Number | `personal.phone` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Summary | `summary` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Education | `education[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Experience | `experience[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Skills | `skillsString` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Projects | `projects[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |
| Certifications | `certifications[]` | ✅ | ✅ | ✅ | ✅ | ✅ **PASS** |

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%"/>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:000000,40:1a0800,100:000000&height=160&section=footer&text=Built%20with%20%E2%9D%A4%EF%B8%8F%20by%20Sai%20Kiran%20Putta%20V.V&fontSize=22&fontColor=f97316&fontAlignY=65&animation=fadeIn" width="100%"/>

<br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white&labelColor=111111)](https://linkedin.com/in/sai-kiran-putta-v-v-421497310)&nbsp;
[![GitHub](https://img.shields.io/badge/GitHub-rokeysai13--sys-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=111111)](https://github.com/rokeysai13-sys)&nbsp;
[![Email](https://img.shields.io/badge/Email-rokeysai13@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white&labelColor=111111)](mailto:rokeysai13@gmail.com)

<br/>

*Flask · Vanilla JS · Google Gemini · HuggingFace Transformers · spaCy · PyTorch*

</div>
