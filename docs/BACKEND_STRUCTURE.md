# BACKEND_STRUCTURE.md
## AI-Powered Resume Builder — Backend Structure

> Modular Monolith · Flask · PostgreSQL 15 · Celery · Redis
> Derived from PRD v4.0

---

## Table of Contents

1. [Project Layout](#1-project-layout)
2. [Module Boundaries](#2-module-boundaries)
3. [Database Schema](#3-database-schema)
4. [Full API Reference](#4-full-api-reference)
5. [Authentication Flow](#5-authentication-flow)
6. [Celery Task Inventory](#6-celery-task-inventory)
7. [Error Code Registry](#7-error-code-registry)
8. [Redis Key Conventions](#8-redis-key-conventions)
9. [Environment Variables](#9-environment-variables)
10. [Request Lifecycle](#10-request-lifecycle)

---

## 1. Project Layout

```
resume_builder/
├── app/
│   ├── __init__.py               # create_app() factory; registers blueprints
│   ├── extensions.py             # db, celery, redis, bcrypt — initialised once
│   ├── config.py                 # Config, DevelopmentConfig, ProductionConfig
│   │
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── routes.py             # /api/v1/auth/*
│   │   ├── models.py             # User, RefreshToken
│   │   ├── schemas.py            # marshmallow request/response schemas
│   │   ├── services.py           # register, login, refresh, reset logic
│   │   └── decorators.py        # @jwt_required, @rate_limit
│   │
│   ├── resume/
│   │   ├── __init__.py
│   │   ├── routes.py             # /api/v1/resumes/*
│   │   ├── models.py             # Resume, Education, Experience, Skills,
│   │   │                         #   Projects, Certificates, Template,
│   │   │                         #   Version, PublicLink
│   │   ├── schemas.py
│   │   └── services.py           # CRUD, snapshot, revert, share-link logic
│   │
│   ├── ats/
│   │   ├── __init__.py
│   │   ├── routes.py             # /api/v1/analyze, /api/v1/rewrite,
│   │   │                         #   /api/v1/batch/analyze
│   │   ├── models.py             # JobDescription, ResumeAnalysis
│   │   ├── schemas.py
│   │   ├── pipeline.py           # Stages 1–7 orchestration
│   │   ├── keyword_extractor.py  # TF-IDF, RAKE, spaCy NER, ESCO lexicon
│   │   ├── semantic.py           # sentence-BERT embeddings, cosine scoring
│   │   ├── scorer.py             # final score formula (§5)
│   │   ├── sanitizer.py          # sanitize_for_llm()
│   │   └── tasks.py              # Celery: run_analysis, run_batch_analysis
│   │
│   ├── cover_letter/
│   │   ├── __init__.py
│   │   ├── routes.py             # /api/v1/cover-letter
│   │   ├── models.py             # CoverLetter
│   │   ├── schemas.py
│   │   ├── generator.py          # LLM prompt build + word-count enforcement
│   │   └── tasks.py              # Celery: generate_cover_letter
│   │
│   ├── pdf/
│   │   ├── __init__.py
│   │   ├── routes.py             # /api/v1/resumes/:id/export-pdf
│   │   ├── renderer.py           # WeasyPrint primary, ReportLab fallback
│   │   ├── storage.py            # S3 / MinIO upload helpers
│   │   └── tasks.py              # Celery: render_pdf
│   │
│   └── common/
│       ├── errors.py             # AppError base class, all error codes
│       ├── rate_limiter.py       # Redis-backed sliding window limiter
│       ├── pagination.py         # cursor-based pagination helpers
│       └── validators.py        # shared marshmallow validators
│
├── config/
│   └── injection_patterns.yaml   # prompt injection regex list
│
├── migrations/                   # Flask-Migrate / Alembic
│   └── versions/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── prompt_injection/         # 20 adversarial inputs
│
├── scripts/
│   └── evaluate_model.py         # ML evaluation gate (CI)
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── gunicorn.conf.py
└── celeryconfig.py
```

---

## 2. Module Boundaries

Each internal module owns its models, routes, schemas, and services. Cross-module access happens only through service calls — never by importing another module's models directly.

| Module | Owns | Calls Into |
|---|---|---|
| `auth` | `users`, `refresh_tokens`, `security_audit_log` | — |
| `resume` | `resumes`, `education`, `experience`, `skills`, `projects`, `certificates`, `templates`, `versions`, `public_links` | `auth` (ownership check) |
| `ats` | `job_descriptions`, `resume_analysis` | `resume` (text extraction), `auth` |
| `cover_letter` | `cover_letters` | `resume`, `ats` (top matched skills), `auth` |
| `pdf` | S3 storage only | `resume` (data), `auth` |

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
users
 ├── resumes  (1:many)
 │    ├── education        (1:many)
 │    ├── experience       (1:many)
 │    ├── skills           (1:many)
 │    ├── projects         (1:many)
 │    ├── certificates     (1:many)
 │    ├── versions         (1:many)
 │    ├── public_links     (1:many)
 │    ├── job_descriptions (1:many)  ──┐
 │    │    └── resume_analysis (1:1)  │
 │    └── cover_letters    (1:many) ──┘
 ├── refresh_tokens  (1:many)
 └── security_audit_log (1:many)

templates  (referenced by resumes.template_id)
```

---

### 3.2 Full DDL — All Tables

```sql
-- ─────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),                      -- NULL for OAuth-only accounts
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  google_id       VARCHAR(255),                      -- NULL if not Google-linked
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_users_email    ON users(email);
CREATE UNIQUE INDEX idx_users_google   ON users(google_id) WHERE google_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- REFRESH TOKENS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,                 -- bcrypt hash; never store plaintext
  expires_at  TIMESTAMP    NOT NULL,
  revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ─────────────────────────────────────────────────────────────────
-- SECURITY AUDIT LOG
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE security_audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(80)  NOT NULL,                 -- e.g. 'LOGIN', 'INJECTION_DETECTED'
  ip_address  INET,
  payload     JSONB,                                 -- stripped prompt diff, login metadata
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user      ON security_audit_log(user_id);
CREATE INDEX idx_audit_created   ON security_audit_log(created_at);
-- Retention: rows older than 90 days pruned by scheduled job

-- ─────────────────────────────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE templates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,                 -- 'Classic', 'Modern', 'Creative'
  html_path   VARCHAR(500) NOT NULL,                 -- path to Jinja2 template file
  css_path    VARCHAR(500) NOT NULL,
  thumbnail   VARCHAR(500),                          -- S3 URL for picker preview
  ats_safe    BOOLEAN      NOT NULL DEFAULT FALSE,   -- only TRUE after CI validation passes
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- RESUMES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE resumes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL DEFAULT 'Untitled Resume',
  template_id INTEGER      NOT NULL REFERENCES templates(id),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_resumes_user ON resumes(user_id);

-- ─────────────────────────────────────────────────────────────────
-- RESUME SECTIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE education (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  school      VARCHAR(255) NOT NULL,
  degree      VARCHAR(255),
  field       VARCHAR(255),
  start_year  SMALLINT,
  end_year    SMALLINT,                              -- NULL = present
  position    SMALLINT     NOT NULL DEFAULT 0        -- display order
);
CREATE INDEX idx_education_resume ON education(resume_id);

CREATE TABLE experience (
  id           SERIAL PRIMARY KEY,
  resume_id    INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  company      VARCHAR(255) NOT NULL,
  role         VARCHAR(255) NOT NULL,
  start_date   DATE,
  end_date     DATE,                                 -- NULL = present
  description  TEXT,
  position     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_experience_resume ON experience(resume_id);

CREATE TABLE skills (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  skill_name  VARCHAR(255) NOT NULL,
  level       VARCHAR(50),                           -- 'Beginner'|'Intermediate'|'Expert'
  position    SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX idx_skills_unique ON skills(resume_id, skill_name);
CREATE        INDEX idx_skills_resume ON skills(resume_id);

CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  url         VARCHAR(2048),
  position    SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_projects_resume ON projects(resume_id);

CREATE TABLE certificates (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  issuer      VARCHAR(255),
  year        SMALLINT,
  position    SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_certificates_resume ON certificates(resume_id);

-- Personal info is stored directly on the resume row (1:1)
ALTER TABLE resumes ADD COLUMN personal_name      VARCHAR(255);
ALTER TABLE resumes ADD COLUMN personal_email     VARCHAR(255);
ALTER TABLE resumes ADD COLUMN personal_phone     VARCHAR(50);
ALTER TABLE resumes ADD COLUMN personal_location  VARCHAR(255);
ALTER TABLE resumes ADD COLUMN personal_linkedin  VARCHAR(2048);
ALTER TABLE resumes ADD COLUMN personal_portfolio VARCHAR(2048);
ALTER TABLE resumes ADD COLUMN summary            TEXT;

-- ─────────────────────────────────────────────────────────────────
-- VERSIONS  (snapshot history)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE versions (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  version_no  INTEGER      NOT NULL,
  label       VARCHAR(255),                          -- auto-generated: 'Saved 12 Apr 2025, 14:32'
  data        JSONB        NOT NULL,                 -- full resume snapshot at save time
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_versions_unique ON versions(resume_id, version_no);
CREATE        INDEX idx_versions_resume ON versions(resume_id);

-- ─────────────────────────────────────────────────────────────────
-- PUBLIC LINKS  (shareable read-only URLs)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public_links (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  token       VARCHAR(12)  NOT NULL,                 -- 6-char base62; ~56 billion combinations
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP                              -- NULL = no expiry
);
CREATE UNIQUE INDEX idx_public_links_token  ON public_links(token);
CREATE        INDEX idx_public_links_resume ON public_links(resume_id);

-- ─────────────────────────────────────────────────────────────────
-- JOB DESCRIPTIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE job_descriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  raw_text    TEXT         NOT NULL,
  source_url  VARCHAR(2048),                         -- NULL if pasted directly
  keywords    TEXT[]       NOT NULL DEFAULT '{}',    -- extracted by Stage 3
  language    VARCHAR(10)  NOT NULL DEFAULT 'en',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_jd_user   ON job_descriptions(user_id);
CREATE INDEX idx_jd_resume ON job_descriptions(resume_id);

-- ─────────────────────────────────────────────────────────────────
-- RESUME ANALYSIS  (ATS results)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE resume_analysis (
  id              SERIAL PRIMARY KEY,
  resume_id       INTEGER  NOT NULL REFERENCES resumes(id)        ON DELETE CASCADE,
  jobdesc_id      INTEGER  NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  match_score     REAL     NOT NULL,                 -- 0.0 – 100.0
  keywords_found  TEXT[]   NOT NULL DEFAULT '{}',
  keywords_missing TEXT[]  NOT NULL DEFAULT '{}',
  suggestions     JSONB    NOT NULL DEFAULT '[]',    -- [{keyword, text, section, confidence}]
  section_feedback JSONB   NOT NULL DEFAULT '{}',    -- {has_summary, has_skills, ats_penalty_reason}
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analysis_resume ON resume_analysis(resume_id);
CREATE INDEX idx_analysis_jd     ON resume_analysis(jobdesc_id);

-- ─────────────────────────────────────────────────────────────────
-- COVER LETTERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE cover_letters (
  id          SERIAL PRIMARY KEY,
  resume_id   INTEGER      NOT NULL REFERENCES resumes(id)         ON DELETE CASCADE,
  jobdesc_id  INTEGER               REFERENCES job_descriptions(id) ON DELETE SET NULL,
  content     TEXT         NOT NULL,
  word_count  INTEGER      NOT NULL,
  tone        VARCHAR(20)  NOT NULL DEFAULT 'professional',        -- professional|conversational|concise
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cover_letters_resume ON cover_letters(resume_id);
```

---

### 3.3 JSONB Schemas

These are the agreed shapes for JSONB columns. Violating these shapes breaks application code.

**`versions.data`**
```json
{
  "personal_name":      "Jane Smith",
  "personal_email":     "jane@example.com",
  "personal_phone":     "+44 7700 000000",
  "personal_location":  "London, UK",
  "personal_linkedin":  "https://linkedin.com/in/janesmith",
  "personal_portfolio": "https://janesmith.dev",
  "summary":            "Senior backend engineer with 8 years...",
  "template_id":        2,
  "education":    [{ "school": "...", "degree": "...", "field": "...", "start_year": 2014, "end_year": 2018 }],
  "experience":   [{ "company": "...", "role": "...", "start_date": "2018-06-01", "end_date": null, "description": "..." }],
  "skills":       [{ "skill_name": "Python", "level": "Expert" }],
  "projects":     [{ "title": "...", "description": "...", "url": "..." }],
  "certificates": [{ "name": "...", "issuer": "...", "year": 2022 }]
}
```

**`resume_analysis.suggestions`**
```json
[
  {
    "keyword":    "docker",
    "text":       "Deployed microservices using Docker and docker-compose.",
    "section":    "experience",
    "confidence": 0.91,
    "is_fallback": false
  }
]
```

**`resume_analysis.section_feedback`**
```json
{
  "has_summary":        true,
  "has_skills":         true,
  "ats_penalty_reason": null
}
```

**`security_audit_log.payload`**
```json
{
  "event":          "INJECTION_DETECTED",
  "stripped_count": 2,
  "patterns_hit":   ["ignore previous instructions"],
  "field":          "job_description",
  "truncated_input": "...first 200 chars..."
}
```

---

## 4. Full API Reference

### Conventions

- **Base path:** `/api/v1/`
- **Auth:** `Authorization: Bearer <jwt_access_token>` on all endpoints except those marked `[PUBLIC]`
- **Rate-limit headers on every response:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Error envelope:** `{ "error": "Human-readable message", "code": "ERROR_CODE" }`
- **Success envelope (lists):** `{ "data": [...], "meta": { "total": N, "page": N, "per_page": N } }`

---

### 4.1 Auth Endpoints `/api/v1/auth`

---

#### `POST /api/v1/auth/register`
**[PUBLIC]** Create a new user account.

**Request body**
```json
{
  "name":             "Jane Smith",
  "email":            "jane@example.com",
  "password":         "SecurePass123!",
  "confirm_password": "SecurePass123!"
}
```

**Response 201**
```json
{ "message": "Registration successful. Please verify your email." }
```

| Code | HTTP | Condition |
|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `PASSWORD_TOO_WEAK` | 400 | Password fails complexity rules |
| `VALIDATION_ERROR` | 400 | Missing or invalid fields |

---

#### `POST /api/v1/auth/verify-email`
**[PUBLIC]** Verify email address via token from verification email.

**Request body**
```json
{ "token": "eyJ..." }
```

**Response 200**
```json
{ "message": "Email verified. You may now log in." }
```

| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 400 | Token not found or malformed |
| `TOKEN_EXPIRED` | 400 | Verification token older than 24 hours |

---

#### `POST /api/v1/auth/login`
**[PUBLIC]** Authenticate and receive tokens.

**Request body**
```json
{
  "email":    "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response 200**
```json
{
  "access_token":  "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in":    3600,
  "user": {
    "id":    1,
    "name":  "Jane Smith",
    "email": "jane@example.com"
  }
}
```

| Code | HTTP | Condition |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EMAIL_NOT_VERIFIED` | 403 | Account exists but email unverified |
| `RATE_LIMIT_EXCEEDED` | 429 | 10 failed attempts / IP / hour |

---

#### `POST /api/v1/auth/refresh`
**[PUBLIC]** Exchange a refresh token for a new access token.

**Request body**
```json
{ "refresh_token": "eyJ..." }
```

**Response 200**
```json
{
  "access_token": "eyJ...",
  "expires_in":   3600
}
```

| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 401 | Token not found or hash mismatch |
| `TOKEN_EXPIRED` | 401 | Refresh token older than 30 days |
| `TOKEN_REVOKED` | 401 | `revoked = true` in DB |

---

#### `POST /api/v1/auth/logout`
Revoke the current refresh token.

**Request body**
```json
{ "refresh_token": "eyJ..." }
```

**Response 200**
```json
{ "message": "Logged out." }
```

---

#### `POST /api/v1/auth/forgot-password`
**[PUBLIC]** Trigger password reset email.

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response 200** *(always — prevents email enumeration)*
```json
{ "message": "If an account exists for that email, a reset link has been sent." }
```

---

#### `POST /api/v1/auth/reset-password`
**[PUBLIC]** Set new password using reset token.

**Request body**
```json
{
  "token":            "eyJ...",
  "password":         "NewSecurePass456!",
  "confirm_password": "NewSecurePass456!"
}
```

**Response 200**
```json
{ "message": "Password updated." }
```

| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 400 | Token not found |
| `TOKEN_EXPIRED` | 400 | Reset token older than 1 hour |
| `PASSWORD_TOO_WEAK` | 400 | Password fails complexity rules |

---

#### `PATCH /api/v1/auth/password`
Change password for authenticated user.

**Request body**
```json
{
  "current_password": "SecurePass123!",
  "new_password":     "NewSecurePass456!",
  "confirm_password": "NewSecurePass456!"
}
```

**Response 200**
```json
{ "message": "Password changed." }
```

| Code | HTTP | Condition |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Current password wrong |
| `PASSWORD_TOO_WEAK` | 400 | New password fails complexity rules |

---

#### `GET /api/v1/auth/me`
Return profile of authenticated user.

**Response 200**
```json
{
  "id":             1,
  "name":           "Jane Smith",
  "email":          "jane@example.com",
  "email_verified": true,
  "google_linked":  false,
  "created_at":     "2025-01-15T10:00:00Z"
}
```

---

#### `DELETE /api/v1/users/me`
Delete account and queue all data for erasure within 30 days.

**Response 200**
```json
{ "message": "Account scheduled for deletion. All data will be removed within 30 days." }
```

---

### 4.2 Resume Endpoints `/api/v1/resumes`

---

#### `GET /api/v1/resumes`
List all resumes for the authenticated user.

**Query params:** `page` (default 1), `per_page` (default 20, max 100)

**Response 200**
```json
{
  "data": [
    {
      "id":          1,
      "title":       "Senior Backend Engineer",
      "template_id": 2,
      "template_name": "Modern",
      "last_analysis_score": 81,
      "created_at":  "2025-01-15T10:00:00Z",
      "updated_at":  "2025-04-01T09:30:00Z"
    }
  ],
  "meta": { "total": 4, "page": 1, "per_page": 20 }
}
```

---

#### `POST /api/v1/resumes`
Create a new resume.

**Request body**
```json
{
  "title":       "Senior Backend Engineer",
  "template_id": 2
}
```

**Response 201**
```json
{
  "id":          5,
  "title":       "Senior Backend Engineer",
  "template_id": 2,
  "created_at":  "2025-04-03T11:00:00Z"
}
```

| Code | HTTP | Condition |
|---|---|---|
| `TEMPLATE_NOT_FOUND` | 404 | `template_id` does not exist or `ats_safe = false` |
| `VALIDATION_ERROR` | 400 | Missing title |

---

#### `GET /api/v1/resumes/:id`
Fetch full resume data for the editor.

**Response 200**
```json
{
  "id":          5,
  "title":       "Senior Backend Engineer",
  "template_id": 2,
  "personal_name":  "Jane Smith",
  "personal_email": "jane@example.com",
  "personal_phone": "+44 7700 000000",
  "personal_location": "London, UK",
  "personal_linkedin": "https://linkedin.com/in/janesmith",
  "personal_portfolio": "https://janesmith.dev",
  "summary":     "Senior backend engineer with 8 years...",
  "education":   [...],
  "experience":  [...],
  "skills":      [...],
  "projects":    [...],
  "certificates": [...],
  "updated_at":  "2025-04-01T09:30:00Z"
}
```

| Code | HTTP | Condition |
|---|---|---|
| `RESUME_NOT_FOUND` | 404 | ID not found or not owned by requester |

---

#### `PUT /api/v1/resumes/:id`
Save full resume state and create a version snapshot.

**Request body** — same shape as GET response (full resume object).

**Response 200**
```json
{
  "id":         5,
  "updated_at": "2025-04-03T11:45:00Z",
  "version_no": 7
}
```

---

#### `PATCH /api/v1/resumes/:id`
Partial update — update title or template only.

**Request body**
```json
{ "template_id": 3 }
```

**Response 200**
```json
{ "id": 5, "template_id": 3, "updated_at": "2025-04-03T11:50:00Z" }
```

---

#### `DELETE /api/v1/resumes/:id`
Delete a resume and all child records.

**Response 204** No content.

| Code | HTTP | Condition |
|---|---|---|
| `RESUME_NOT_FOUND` | 404 | ID not found or not owned by requester |

---

#### `POST /api/v1/resumes/:id/preview`
Render resume HTML for live preview. Called debounced every 300 ms from editor.

**Request body**
```json
{ "resume_data": { ...partial resume fields... } }
```

**Response 200**
```json
{ "html": "<div class='resume classic'>...</div>" }
```

---

#### `GET /api/v1/resumes/:id/export-pdf`
Render and return PDF. WeasyPrint primary, ReportLab fallback.

**Response 200**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="resume-5.pdf"`
- Binary PDF body

| Code | HTTP | Condition |
|---|---|---|
| `PDF_RENDER_FAILED` | 503 | Both renderers failed |
| `RESUME_NOT_FOUND` | 404 | — |

---

### 4.3 Resume Section Endpoints

All section endpoints follow the same pattern. `:section` = `education` \| `experience` \| `skills` \| `projects` \| `certificates`.

---

#### `POST /api/v1/resumes/:id/:section`
Add a new item to a section.

**Request body (experience example)**
```json
{
  "company":    "Acme Corp",
  "role":       "Senior Engineer",
  "start_date": "2022-03-01",
  "end_date":   null,
  "description": "Led migration to microservices..."
}
```

**Response 201**
```json
{ "id": 42, "position": 0 }
```

---

#### `PUT /api/v1/resumes/:id/:section/:item_id`
Update an existing section item.

**Response 200** — returns updated item.

---

#### `DELETE /api/v1/resumes/:id/:section/:item_id`
Delete a section item.

**Response 204** No content.

---

#### `PATCH /api/v1/resumes/:id/:section/reorder`
Update display order of section items.

**Request body**
```json
{ "order": [42, 38, 55] }
```

**Response 200**
```json
{ "message": "Order updated." }
```

---

### 4.4 Version Endpoints

---

#### `GET /api/v1/resumes/:id/versions`
List all snapshots for a resume, newest first.

**Response 200**
```json
{
  "data": [
    { "id": 31, "version_no": 7, "label": "Saved 3 Apr 2025, 11:45", "created_at": "2025-04-03T11:45:00Z" },
    { "id": 28, "version_no": 6, "label": "Saved 1 Apr 2025, 09:30", "created_at": "2025-04-01T09:30:00Z" }
  ]
}
```

---

#### `GET /api/v1/resumes/:id/versions/:version_no`
Fetch the full snapshot data for preview.

**Response 200**
```json
{
  "version_no": 6,
  "label":      "Saved 1 Apr 2025, 09:30",
  "data":       { ...full resume snapshot... },
  "created_at": "2025-04-01T09:30:00Z"
}
```

---

#### `POST /api/v1/resumes/:id/versions/:version_no/revert`
Overwrite active resume with snapshot and save as a new version.

**Response 200**
```json
{
  "message":    "Reverted to version 6.",
  "version_no": 8
}
```

---

### 4.5 Share Link Endpoints

---

#### `POST /api/v1/resumes/:id/share`
Generate a public share link. Idempotent — returns existing token if one exists.

**Response 201**
```json
{
  "token":      "aB3kX9",
  "public_url": "https://app.example.com/r/aB3kX9",
  "created_at": "2025-04-03T12:00:00Z",
  "expires_at": null
}
```

---

#### `DELETE /api/v1/resumes/:id/share`
Revoke the public link.

**Response 204** No content.

---

#### `GET /api/v1/public/:token` `[PUBLIC]`
Resolve a share token and return read-only resume data.

**Response 200**
```json
{
  "resume": { ...full resume data... },
  "template_html": "<div class='resume modern'>...</div>"
}
```

| Code | HTTP | Condition |
|---|---|---|
| `LINK_NOT_FOUND` | 404 | Token not in DB or deleted |
| `LINK_EXPIRED` | 410 | `expires_at` is in the past |

---

### 4.6 Template Endpoints

---

#### `GET /api/v1/templates`
List all ATS-safe templates.

**Response 200**
```json
{
  "data": [
    { "id": 1, "name": "Classic",  "thumbnail": "https://s3.../classic-thumb.png" },
    { "id": 2, "name": "Modern",   "thumbnail": "https://s3.../modern-thumb.png"  },
    { "id": 3, "name": "Creative", "thumbnail": "https://s3.../creative-thumb.png" }
  ]
}
```

Only returns templates where `ats_safe = true`.

---

### 4.7 ATS Analysis Endpoints

Rate limits: `POST /analyze` — 20/user/hour, 5 burst/min.

---

#### `POST /api/v1/analyze`
Submit resume + job description for ATS analysis. Runs asynchronously via Celery.

**Request body**
```json
{
  "resume_id":       123,
  "job_description": "We seek a senior Python developer with Flask, Docker..."
}
```

**Response 200** *(synchronous result; Celery task awaited up to 3 s)*
```json
{
  "analysis_id":       88,
  "match_score":       75.5,
  "keywords_found":    ["python", "flask", "aws"],
  "keywords_missing":  ["docker", "kubernetes"],
  "suggestions": [
    {
      "keyword":    "docker",
      "text":       "Deployed services using Docker.",
      "section":    "experience",
      "confidence": 0.91,
      "is_fallback": false
    },
    {
      "keyword":    "kubernetes",
      "text":       "Orchestrated containers with Kubernetes.",
      "section":    "experience",
      "confidence": 0.88,
      "is_fallback": false
    }
  ],
  "section_feedback": {
    "has_summary":        true,
    "has_skills":         true,
    "ats_penalty_reason": null
  }
}
```

| Code | HTTP | Condition |
|---|---|---|
| `JD_TOO_SHORT` | 400 | JD text < 50 characters |
| `JD_LANGUAGE_UNSUPPORTED` | 400 | Non-English JD detected |
| `RESUME_EMPTY` | 400 | Resume has no extractable text |
| `RESUME_NOT_FOUND` | 404 | `resume_id` not found or not owned |
| `ANALYSIS_TIMEOUT` | 503 | Pipeline exceeded 3 s |
| `RATE_LIMIT_EXCEEDED` | 429 | — |

---

#### `POST /api/v1/rewrite`
Generate AI-powered replacement phrases for specific keywords.

Rate limit: 30/user/hour, 8 burst/min.

**Request body**
```json
{
  "resume_text": "Developed web apps using Python and Flask.",
  "keywords":    ["docker", "rest api"],
  "context":     "Senior Backend Engineer at a fintech startup"
}
```

**Response 200**
```json
{
  "phrases": [
    { "keyword": "docker",   "suggestion": "Containerised services using Docker and docker-compose.", "confidence": 0.92, "is_fallback": false },
    { "keyword": "rest api", "suggestion": "Designed RESTful APIs consumed by iOS and Android clients.", "confidence": 0.89, "is_fallback": false }
  ]
}
```

---

#### `POST /api/v1/analyze/insert-suggestion`
Append an AI suggestion to the resume and re-score the keyword as addressed.

**Request body**
```json
{
  "resume_id":  123,
  "analysis_id": 88,
  "keyword":    "docker",
  "phrase":     "Deployed services using Docker.",
  "section":    "experience"
}
```

**Response 200**
```json
{
  "item_id":      44,
  "section":      "experience",
  "keyword_status": "addressed"
}
```

---

#### `POST /api/v1/batch/analyze`
Analyze multiple resumes against a single JD. Carol (Career Coach) persona.

Rate limit: 5/user/hour, 2 burst/min.

**Request body**
```json
{
  "resumes": [
    { "id": 123, "text": "..." },
    { "id": 124, "text": "..." }
  ],
  "job_description": "..."
}
```

**Response 200**
```json
{
  "results": [
    { "resume_id": 123, "match_score": 82.0, "keywords_missing": ["react"] },
    { "resume_id": 124, "match_score": 66.7, "keywords_missing": ["docker"] }
  ]
}
```

---

### 4.8 Cover Letter Endpoints

Rate limit: 10/user/hour, 3 burst/min.

---

#### `POST /api/v1/cover-letter`
Generate a tailored cover letter. Celery task.

**Request body**
```json
{
  "resume_id":       123,
  "job_description": "...",
  "company_name":    "Acme Corp",
  "tone":            "professional"
}
```

**Response 200**
```json
{
  "cover_letter":    "Dear Hiring Team,\n\nI am excited to apply...",
  "word_count":      312,
  "cover_letter_id": 45
}
```

`cover_letter_id` is a transient ID for the unsaved draft. The letter is **not persisted** until `POST /api/v1/cover-letter/:id/save` is called.

| Code | HTTP | Condition |
|---|---|---|
| `JD_TOO_SHORT` | 400 | — |
| `RESUME_EMPTY` | 400 | — |
| `COVER_LETTER_TIMEOUT` | 503 | LLM call exceeded 5 s after retries |
| `RATE_LIMIT_EXCEEDED` | 429 | — |

---

#### `POST /api/v1/cover-letter/:id/save`
Persist an edited cover letter draft to the database.

**Request body**
```json
{
  "resume_id":  123,
  "content":    "Dear Hiring Team,\n\n[user-edited version...]",
  "word_count": 298,
  "tone":       "professional"
}
```

**Response 201**
```json
{
  "id":         45,
  "created_at": "2025-04-03T13:00:00Z"
}
```

---

#### `GET /api/v1/resumes/:id/cover-letters`
List saved cover letters for a resume.

**Response 200**
```json
{
  "data": [
    { "id": 45, "word_count": 298, "tone": "professional", "created_at": "2025-04-03T13:00:00Z" }
  ]
}
```

---

#### `GET /api/v1/cover-letters/:id`
Fetch full cover letter content.

**Response 200**
```json
{
  "id":         45,
  "resume_id":  123,
  "content":    "Dear Hiring Team,\n\n...",
  "word_count": 298,
  "tone":       "professional",
  "created_at": "2025-04-03T13:00:00Z"
}
```

---

#### `DELETE /api/v1/cover-letters/:id`
Delete a saved cover letter.

**Response 204** No content.

---

### 4.9 Account / Privacy Endpoints

---

#### `GET /api/v1/account/settings`
Fetch user privacy settings.

**Response 200**
```json
{
  "ml_training_opt_out": false,
  "save_history_consent": true
}
```

---

#### `PATCH /api/v1/account/settings`
Update privacy settings.

**Request body**
```json
{
  "ml_training_opt_out": true
}
```

**Response 200** — returns updated settings object.

---

#### `GET /api/v1/account/export`
Trigger GDPR data export (all user data as JSON archive).

**Response 202**
```json
{ "message": "Export queued. You will receive an email with a download link within 24 hours." }
```

---

## 5. Authentication Flow

```
Register
  POST /auth/register
    → hash password (bcrypt, cost 12)
    → insert users row (email_verified = false)
    → send verification email (JWT token, 24h TTL)
    → 201

Verify Email
  POST /auth/verify-email { token }
    → decode token, look up user
    → set email_verified = true
    → 200

Login
  POST /auth/login { email, password }
    → bcrypt.verify(password, hash)
    → issue access token  (JWT HS256, exp: +1h)
    → issue refresh token (random 64-byte, bcrypt-hashed, stored in refresh_tokens)
    → 200 { access_token, refresh_token }

Authenticated Request
  GET /api/v1/resumes
    → Authorization: Bearer <access_token>
    → @jwt_required decorator decodes & validates token
    → injects g.user_id
    → handler runs

Silent Refresh (client-side)
  On 401 response from any endpoint:
    → POST /auth/refresh { refresh_token }
      → hash incoming token, look up refresh_tokens by hash
      → check not revoked, not expired
      → issue new access_token
      → 200 { access_token }

Logout
  POST /auth/logout { refresh_token }
    → set refresh_tokens.revoked = true
    → 200
```

---

## 6. Celery Task Inventory

All tasks use result_backend = Redis. Task IDs are UUIDs.

| Task name | Queue | Triggered by | Timeout | Retries |
|---|---|---|---|---|
| `ats.tasks.run_analysis` | `nlp` | `POST /analyze` | 30 s | 2 |
| `ats.tasks.run_batch_analysis` | `nlp` | `POST /batch/analyze` | 60 s | 1 |
| `cover_letter.tasks.generate_cover_letter` | `nlp` | `POST /cover-letter` | 30 s | 2 |
| `pdf.tasks.render_pdf` | `pdf` | `GET /resumes/:id/export-pdf` | 15 s | 1 |
| `auth.tasks.send_verification_email` | `default` | `POST /auth/register` | 10 s | 3 |
| `auth.tasks.send_password_reset_email` | `default` | `POST /auth/forgot-password` | 10 s | 3 |
| `auth.tasks.purge_expired_tokens` | `default` | Scheduled nightly | — | — |
| `audit.tasks.prune_audit_log` | `default` | Scheduled nightly | — | — |

**Worker startup:**
```bash
celery -A app.celery worker --concurrency 2 --queues nlp,pdf,default
```

---

## 7. Error Code Registry

| Code | HTTP | Module | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | all | Request body fails schema validation |
| `JD_TOO_SHORT` | 400 | ats | JD text < 50 characters |
| `JD_LANGUAGE_UNSUPPORTED` | 400 | ats | Non-English JD detected |
| `RESUME_EMPTY` | 400 | ats | Resume has no extractable text |
| `PASSWORD_TOO_WEAK` | 400 | auth | Password fails complexity rules |
| `TOKEN_INVALID` | 400 | auth | Token not found or malformed |
| `TOKEN_EXPIRED` | 400 | auth | Token TTL elapsed |
| `INVALID_CREDENTIALS` | 401 | auth | Wrong email or password |
| `TOKEN_REVOKED` | 401 | auth | Refresh token revoked |
| `UNAUTHORIZED` | 401 | all | Missing or invalid JWT |
| `EMAIL_NOT_VERIFIED` | 403 | auth | Login attempted before verification |
| `FORBIDDEN` | 403 | all | Resource exists but not owned by user |
| `RESUME_NOT_FOUND` | 404 | resume | ID not found or not owned |
| `TEMPLATE_NOT_FOUND` | 404 | resume | Template ID not found or not ATS-safe |
| `LINK_NOT_FOUND` | 404 | resume | Share token not in DB |
| `ANALYSIS_NOT_FOUND` | 404 | ats | analysis_id not found |
| `COVER_LETTER_NOT_FOUND` | 404 | cover_letter | Cover letter ID not found |
| `LINK_EXPIRED` | 410 | resume | Share link past expires_at |
| `EMAIL_ALREADY_EXISTS` | 409 | auth | Email already registered |
| `RATE_LIMIT_EXCEEDED` | 429 | all | Rate window exhausted |
| `ANALYSIS_TIMEOUT` | 503 | ats | Pipeline exceeded 3 s |
| `COVER_LETTER_TIMEOUT` | 503 | cover_letter | LLM call exceeded 5 s |
| `PDF_RENDER_FAILED` | 503 | pdf | Both WeasyPrint and ReportLab failed |
| `LLM_UNAVAILABLE` | 503 | ats / cover_letter | Primary and fallback LLM both unreachable |
| `INTERNAL_ERROR` | 500 | all | Unhandled exception |

---

## 8. Redis Key Conventions

| Key pattern | TTL | Stores |
|---|---|---|
| `embed:{sha256(text)}` | 1 hour | Serialised sentence-BERT embedding (numpy array → bytes) |
| `ratelimit:{endpoint}:{user_id}` | Sliding 1 hour | Request count for per-user rate limiting |
| `ratelimit:{endpoint}:ip:{ip}` | Sliding 1 hour | Request count for per-IP rate limiting |
| `celery-task:{task_id}` | 1 hour | Celery AsyncResult (auto-managed by Celery) |
| `session:verify:{token_hash}` | 24 hours | Email verification token hash |
| `session:reset:{token_hash}` | 1 hour | Password reset token hash |

---

## 9. Environment Variables

```bash
# ── Flask ────────────────────────────────────────────
FLASK_ENV=production                 # development | production
SECRET_KEY=<random-64-bytes>
JWT_SECRET_KEY=<random-64-bytes>     # rotated quarterly
JWT_ACCESS_TOKEN_EXPIRES=3600        # seconds
JWT_REFRESH_TOKEN_EXPIRES=2592000    # 30 days in seconds

# ── Database ─────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/resume_builder

# ── Redis ────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Celery ───────────────────────────────────────────
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# ── LLM ─────────────────────────────────────────────
LLM_PROVIDER=anthropic               # anthropic | openai | local
LLM_MODEL=claude-sonnet-4-5
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-4o-mini
LLM_TIMEOUT_SECONDS=5
LLM_MAX_DAILY_CALLS_PER_USER=50

# ── Storage ──────────────────────────────────────────
S3_BUCKET_NAME=resume-builder-pdfs
S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# ── Email ────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@example.com
SMTP_PASS=<password>

# ── OAuth ────────────────────────────────────────────
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>

# ── App ──────────────────────────────────────────────
APP_BASE_URL=https://app.example.com
FRONTEND_URL=https://app.example.com
```

---

## 10. Request Lifecycle

```
Client → NGINX (TLS termination, rate limit headers)
  → Gunicorn (WSGI, 4 workers)
    → Flask Router
      → @rate_limit decorator
          → Redis sliding window check
          → 429 if exceeded
      → @jwt_required decorator
          → decode + validate JWT
          → inject g.user_id
          → 401 if invalid/expired
      → Request schema validation (marshmallow)
          → 400 VALIDATION_ERROR if fails
      → Route handler
          │
          ├── Synchronous path (CRUD, preview, templates)
          │     → SQLAlchemy ORM → PostgreSQL
          │     → Response schema → JSON → 200/201/204
          │
          └── Async path (analyze, cover-letter, pdf)
                → Celery task dispatched to Redis queue
                → Flask awaits result (up to timeout)
                │
                ├── Result returned in time
                │     → persist to DB
                │     → JSON response → 200
                │
                └── Timeout
                      → 503 with appropriate error code
```

---

*AI-Powered Resume Builder · BACKEND_STRUCTURE.md · Derived from PRD v4.0 · Confidential*
