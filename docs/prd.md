# AI-Powered Resume Builder with ATS Keyword Matching Engine
**Product Requirements Document · Version 4.0 — Final**

| | |
|---|---|
| **Version** | 4.0 — Final |
| **Status** | Ready for Engineering Review |
| **Scope** | MVP (M1–M13) + Phase 2 Roadmap |
| **Stack** | Python 3.11 · Flask · PostgreSQL 15 · spaCy · sentence-transformers · LLM API |

---

## Abstract

This document is the authoritative specification for an AI-powered resume builder that generates ATS-optimised CVs, scores them against job descriptions using an NLP and transformer-embedding pipeline, and delivers language-model-generated improvement suggestions. It defines the complete product: user stories with acceptance criteria, a fully specified ML pipeline, concrete scoring algorithms, API contracts with error codes and rate limits, a normalised database schema with all tables defined, a modular monolith architecture, CI/CD strategy, security controls including prompt-injection guards, GDPR compliance requirements, a phased delivery roadmap, and a risk register.

---

## Contents

1. Product Overview
2. User Personas
3. User Stories & Acceptance Criteria
4. Functional Requirements
   - 4.1 ATS Keyword-Matching Pipeline
   - 4.2 AI Suggestion Engine
   - 4.3 Cover Letter Generator
   - 4.4 ATS Template Validation
5. Scoring Formula
6. ML / NLP Pipeline Design
7. API Contracts
8. Data Model
9. System Architecture
10. Deployment & CI/CD
11. Testing Strategy
12. Security
13. Privacy & GDPR Compliance
14. Roadmap & Milestones
15. Risk Register
16. Open Questions

---

## 1. Product Overview

### 1.1 Problem Statement

Applicant Tracking Systems (ATS) filter an estimated 75% of resumes before a human reviewer reads them. The root cause is not candidate quality — it is the absence of relevant keywords or the use of formatting that ATS parsers cannot process. Existing resume builders optimise for visual presentation and do not address this gap.

### 1.2 Solution

A web-based resume platform that provides structured guided data entry, live-preview rendering using ATS-validated templates, print-ready PDF export, and a job-description matching engine. The matching engine scores a resume against a pasted job description, surfaces missing keywords, and uses a language model to generate factual, targeted improvement suggestions.

### 1.3 Key Features

- **Structured Resume Editor** — multi-section forms (Personal, Summary, Education, Experience, Skills, Projects, Certifications) with live HTML preview updated within 300 ms
- **Template Library** — Classic, Modern, and Creative styles; every template passes the ATS validation suite before publication
- **PDF Export** — WeasyPrint primary renderer, ReportLab fallback; target render time < 2 s
- **ATS Keyword-Matching Module** — ensemble pipeline: TF-IDF + RAKE + spaCy NER + ESCO lexicon, followed by sentence-BERT semantic scoring
- **AI Suggestion Engine** — LLM-generated bullet-point phrases for each missing keyword, with prompt-injection guards and confidence scoring
- **Cover Letter Generator** — structured four-paragraph letter, tone-configurable, editable before saving
- **Version History** — automatic snapshots on save with one-click revert
- **Shareable Link** — tokenised, read-only public URL (6-character base62 token)

### 1.4 Out of Scope — MVP

- PDF resume upload and parsing — deferred to Phase 2
- Native iOS / Android application — web-responsive only at launch
- Non-English job descriptions — returns structured error in MVP; supported in Phase 2
- Job-board API integration (LinkedIn Easy Apply, Greenhouse) — Phase 3

---

## 2. User Personas

| Persona | Role | Goal | Primary Features Used |
|---|---|---|---|
| Alice | New Graduate | Build a first resume quickly with guidance | Editor, templates, live preview |
| Bob | Career Changer | Reframe experience to match a new domain | ATS analysis, AI suggestions, cover letter |
| Carol | Career Coach | Review and improve multiple client resumes | ATS scoring, version history, shareable link |
| Dan | Recruiter (indirect) | Receive well-structured, ATS-passing submissions | Not a direct user; benefits from output quality |

---

## 3. User Stories & Acceptance Criteria

### US-01 Resume Data Entry

**Story:** As a user, I can add, edit, and remove items in every resume section so that my resume is complete and accurate.

**Acceptance:**
- Each section has Add, Edit, and Delete controls.
- Changes reflect in the preview within 300 ms.
- Data persists on section save.
- Deleting an item removes it from the preview immediately.

### US-02 Live Preview

**Story:** As a user, I see my resume update in real time as I type, so I can see the final format immediately.

**Acceptance:**
- A debounced AJAX call fires 300 ms after the last keystroke.
- The preview matches the selected template CSS exactly.
- Preview rendering is not blocked by background save operations.

### US-03 Template Switching

**Story:** As a user, I can switch between resume designs without losing my data.

**Acceptance:**
- The template picker re-renders the preview with the new CSS.
- All field values carry over unchanged.
- Only templates with `ats_safe = true` are shown.

### US-04 PDF Export

**Story:** As a user, I can download a print-ready PDF of my resume.

**Acceptance:**
- The exported PDF faithfully represents the preview — same text, order, and styling. Minor sub-pixel rendering differences between the browser preview and WeasyPrint output are acceptable.
- Render time < 2 s at p95.
- If WeasyPrint fails, the ReportLab fallback activates without a user-visible error.

### US-05 ATS Analysis

**Story:** As a user, I can paste a job description and receive a match score with actionable keyword feedback.

**Acceptance:**
- The Analyse button triggers the pipeline (§4.1).
- The response is returned within 3 s and includes: `match_score` (0–100), `found_keywords` in green, `missing_keywords` in red, and up to five AI-generated suggestions.

**Error handling:**
- JD text < 50 characters → `JD_TOO_SHORT`
- Non-English text → `JD_LANGUAGE_UNSUPPORTED`
- Empty resume → `RESUME_EMPTY`

### US-06 AI Suggestion Insertion

**Story:** As a user, I can one-click insert an AI-generated phrase for a missing keyword into my resume.

**Acceptance:**
- Each suggestion is shown with an "Add to Resume" button.
- Clicking it appends the phrase to the relevant section, re-triggers the live preview, and marks the keyword as addressed.
- Every suggestion carries the label: *"AI-generated — review before submitting."*

### US-07 Cover Letter Generation

**Story:** As a user, I can generate a tailored cover letter for a specific job posting.

**Acceptance:**
- User provides JD text and optional tone.
- The system returns a four-paragraph letter of at most 350 words, rendered in an editable textarea.
- The letter is not saved until the user explicitly clicks "Save Cover Letter".

### US-08 Version History and Shareable Link

**Story:** As a user, I can view and restore past resume snapshots and share my resume via a public URL.

**Acceptance:**
- The version list shows a timestamp and auto-generated label for each snapshot.
- Revert copies the snapshot into the active resume and re-renders the preview.
- The public link is a 6-character base62 token stored in the `public_links` table and resolves to a read-only, mobile-responsive resume view.

### US-09 Authentication

**Story:** As a user, I can register, log in, and manage my account securely.

**Acceptance:**
- Email and password registration with bcrypt at cost factor 12.
- Email verification required before first login.
- Optional Google OAuth.
- JWT access token with 1-hour expiry and refresh token with 30-day expiry, stored hashed in the `refresh_tokens` table.
- Password reset via email link.

---

## 4. Functional Requirements

### 4.1 ATS Keyword-Matching Pipeline

Implemented in the `ats_module` and executed asynchronously via a Celery worker. Seven sequential stages.

#### Stage 1 — Input Handling

- Accept JD as raw pasted text or a URL. If a URL is provided, fetch with a 5-second timeout using the `requests` library, strip HTML with BeautifulSoup, and remove navigation, script, and style elements.
- Minimum accepted length: 50 characters. Maximum: 10,000 characters; truncate excess with a visible warning.
- Language detection: `langdetect` library, confidence threshold 0.90. If not English, return `JD_LANGUAGE_UNSUPPORTED`.

#### Stage 2 — Preprocessing

- Lowercase all text. Remove punctuation. Expand common abbreviations via a maintained lookup table.
- Remove English stopwords (NLTK corpus). Tokenise and lemmatise with spaCy `en_core_web_lg`.

#### Stage 3 — Keyword Extraction (Ensemble)

All four methods run in parallel. Results are unioned, ranked by aggregate score, and the top 30 candidates are retained.

1. **TF-IDF:** `TfidfVectorizer(ngram_range=(1,2), min_df=1, max_features=100)`. Accept terms with score > 0.10. `min_df=1` is required because the input is a single document.
2. **RAKE:** English stopwords, maximum phrase length 3 words, top 20 phrases.
3. **spaCy NER** (`en_core_web_lg`): accept entities labelled `SKILL`, `ORG`, or `PRODUCT` with confidence > 0.85.
4. **ESCO Skill Lexicon:** match lemmatised tokens against the 13,890-term English ESCO v1.1 skill list using exact string comparison.

#### Stage 4 — Resume Text Extraction

- Concatenate all resume fields: summary, each experience description, skills list, project descriptions, and certification names.
- Apply the identical preprocessing pipeline from Stage 2.

#### Stage 5 — Keyword Matching

- A JD keyword is classified as **found** if: (a) its lemmatised form appears in the resume text by exact match, or (b) its sentence-BERT embedding has cosine similarity > 0.80 with any resume phrase embedding.
- Synonyms are expanded one level deep using WordNet synsets before comparison.

#### Stage 6 — Semantic Similarity

- Encode both the full resume text and the full JD text with `all-MiniLM-L6-v2` (sentence-transformers, 384-dimensional output).
- Compute cosine similarity and scale to 0–100.
- Cache both embeddings in Redis using key `SHA256(text)`, TTL = 1 hour.

#### Stage 7 — Response

```json
{
  "match_score": 75.5,
  "keywords_found": ["python", "flask", "aws"],
  "keywords_missing": ["docker", "kubernetes"],
  "suggestions": [
    {
      "keyword": "docker",
      "text": "Deployed microservices using Docker and docker-compose.",
      "section": "experience",
      "confidence": 0.91
    }
  ],
  "section_feedback": {
    "has_summary": true,
    "has_skills": true,
    "ats_penalty_reason": null
  }
}
```

---

### 4.2 AI Suggestion Engine

#### Prompt Template

```
SYSTEM:
You are an expert resume writer. Generate exactly ONE concise bullet-point phrase
(maximum 20 words) incorporating the given keyword. Be factually conservative —
describe a plausible experience; do not claim undemonstrated expertise.
Return ONLY valid JSON: { "phrase": "...", "section": "experience|skills|summary" }
No preamble. No markdown. No explanation.

USER:
Keyword: ###KEYWORD###
Resume context: ###RESUME_SNIPPET###
Job description hint: ###JD_SNIPPET###
```

#### Prompt Injection Security

> **Hard launch requirement.** All user-controlled text inserted into LLM prompts must pass through `ats_module.sanitize_for_llm()`. The following controls are mandatory.

- Wrap all user-supplied input in unambiguous delimiters (`###` as shown above). The system prompt explicitly instructs the model that delimited content is untrusted.
- Strip common injection triggers before insertion using a case-insensitive regex list maintained in `config/injection_patterns.yaml` (e.g. `'ignore previous instructions'`, `'you are now'`, `'disregard all'`, `'SYSTEM:'`).
- Enforce length caps: `RESUME_SNIPPET` ≤ 200 characters, `JD_SNIPPET` ≤ 300 characters.
- Log the full prompt and response to `security_audit_log` whenever the stripping step removes any content. Retention: 90 days.

#### Fallback Logic

- LLM timeout (> 5 s) or HTTP error → template fallback: `'Experience with {keyword} in a professional context.'`
- Unparseable JSON response → retry once; if still fails → template fallback.
- Confidence < 0.70 → display suggestion in italics with label *"Low confidence — review before using."*

#### Post-Processing

- Verify the keyword appears verbatim in the generated phrase. If absent: discard, retry (maximum 2 retries), then template fallback.
- Strip all first-person pronouns (I, me, my, myself). Resumes use implied first person.
- Label every AI suggestion in the UI: *"AI-generated — review before submitting."*

---

### 4.3 Cover Letter Generator

Implemented in the `cover_letter_module` and dispatched as a separate Celery task. Does not share state with the ATS analysis task.

#### Letter Structure

- **Opening paragraph:** hook statement and the specific role name.
- **Why me paragraph:** the top three matched skills from the most recent ATS analysis for this resume.
- **Why them paragraph:** if a URL was provided, fetch and summarise the company About page; otherwise write a generic mission-alignment statement.
- **Closing paragraph:** a concrete call to action — request for interview, availability, contact preference.
- Maximum total length: 350 words. Enforced post-generation; re-prompt with explicit word budget if exceeded.

#### System Prompt

```
SYSTEM:
You are a professional cover letter writer. Write a tailored cover letter in
exactly 4 paragraphs, maximum 350 words total. Use active voice. Do not repeat
resume bullet points verbatim. Return plain text only — no markdown, no subject
line. Paragraphs separated by double newlines.

USER:
Resume data: ###RESUME_JSON###
Job posting: ###JD_TEXT###
Company name: ###COMPANY###
Tone: ###TONE###
```

- **Tone options:** professional (default), conversational, concise.
- Response rendered in an editable textarea. User clicks "Save Cover Letter" to persist to the `cover_letters` table.

---

### 4.4 ATS Template Validation Criteria

Every template must pass all checks below before its `ats_safe` flag is set to `true`. Checks run automatically in CI on every template change.

- No `<table>` elements used for layout. Tables permitted only for genuinely tabular data.
- All section headings are semantic HTML (`h2`, `h3`). No headings simulated with styled divs.
- No text placed in image files or as image alt attributes.
- No absolutely positioned or floated elements containing resume content.
- Single-column or maximum two-column layout. No nested columns.
- All body text at font size ≥ 10 pt.
- **Automated extraction test:** render to PDF with WeasyPrint, extract text with pdfminer. Fail if extracted word count < 80% of input word count.

---

## 5. Scoring Formula

### 5.1 Components

> **Note:** The Section Bonus and Formatting Penalty are flat point adjustments added to or subtracted from the weighted score. They are not multiplied by any value. The maximum achievable score is 100 (60 + 30 + 5 + 5). The weights 0.60 and 0.30 are provisional and must be validated against real interview callback rate data in Phase 2.

| Component | Type | Value / Formula | Contribution |
|---|---|---|---|
| Keyword Match | Weighted (0.60) | `0.60 × (matched_count / total_jd_keywords) × 100` | 0–60 pts |
| Semantic Similarity | Weighted (0.30) | `0.30 × (cosine_similarity × 100)` | 0–30 pts |
| Skills Section Bonus | Flat additive | +5 pts if Skills section has ≥ 1 entry | +5 pts |
| Summary Section Bonus | Flat additive | +5 pts if Summary section has ≥ 20 characters | +5 pts |
| Formatting Penalty | Flat deduction | −10 pts if any ATS-blocker is detected (§4.4) | 0 or −10 pts |

### 5.2 Formula and Worked Example

```
KW_score  = 0.60 × (matched_keywords / total_jd_keywords) × 100
Sem_score = 0.30 × (cosine_similarity × 100)
Bonus     = (5 if skills_section_present else 0)
          + (5 if summary_section_present else 0)
Penalty   = 10 if ats_blocker_detected else 0
Score     = clamp(KW_score + Sem_score + Bonus - Penalty, 0, 100)
```

| Input | Calculation | Contribution |
|---|---|---|
| 5 JD keywords, 4 matched | `KW_score = 0.60 × 80 = 48.0` | 48.0 pts |
| Cosine similarity = 0.75 | `Sem_score = 0.30 × 75 = 22.5` | 22.5 pts |
| Skills section present | `Bonus += 5` | +5.0 pts |
| Summary present (≥ 20 chars) | `Bonus += 5` | +5.0 pts |
| No ATS blockers | `Penalty = 0` | 0.0 pts |
| **Final (clamped 0–100)** | `48.0 + 22.5 + 5.0 + 5.0` | **80.5 → 81 / 100** |

---

## 6. ML / NLP Pipeline Design

### 6.1 Data Sources

| Source | Volume | Purpose |
|---|---|---|
| Kaggle Resume Dataset | 2,400 labelled resumes across 24 categories | Baseline evaluation; NER training examples |
| O\*NET Database | 900+ standardised occupation profiles | Keyword reference; evaluation ground truth |
| ESCO Skill Taxonomy v1.1 | 13,890 English skill labels | Stage 3 lexicon matching |
| Opt-in User Pairs | Post-launch, consent-gated | Contrastive fine-tuning in Phase 2 |

### 6.2 Model Stack

| Layer | Technology | Purpose |
|---|---|---|
| Tokenisation / NER | spaCy `en_core_web_lg` | Tokenise, lemmatise, POS tag, entity extraction |
| Keyword Extraction | scikit-learn TF-IDF + RAKE-NLTK | Surface-form multi-word keyword candidates |
| Skill Grounding | ESCO lexicon (exact match after lemmatisation) | Domain-specific skill normalisation |
| Semantic Embedding | sentence-transformers / `all-MiniLM-L6-v2` | Dense 384-dim cosine similarity scoring |
| Suggestion Generation | Configurable LLM — see §6.3 | Bullet-point phrase generation |
| Cover Letter | Configurable LLM — see §6.3 | Structured long-form generation |

### 6.3 LLM Configuration

The LLM provider and model are injected via environment variables. No vendor is hardcoded in application logic. This enables switching providers without code changes.

```bash
# .env — never commit to version control
LLM_PROVIDER=anthropic           # anthropic | openai | local
LLM_MODEL=claude-sonnet-4-5      # or: gpt-4o, mistral-7b-instruct
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-4o-mini
LLM_TIMEOUT_SECONDS=5
LLM_MAX_DAILY_CALLS_PER_USER=50
```

### 6.4 Training Plan

#### Phase 1 — Zero-Shot Baseline

- Deploy `all-MiniLM-L6-v2` without fine-tuning. Evaluate on 200 held-out JD-resume pairs.
- Targets: Keyword Extraction F1 ≥ 0.68, Precision@10 ≥ 0.65, Recall@10 ≥ 0.70.

#### Phase 2 — Contrastive Fine-Tuning

- Collect matched JD-resume pairs from opt-in users (resume submitted, outcome known).
- Fine-tune with `MultipleNegativesRankingLoss` (sentence-transformers library).
- Hyperparameters: batch size 16, learning rate 2e-5, 3 epochs on GPU.
- Targets: MAP@10 ≥ 0.75, nDCG@10 ≥ 0.72.

### 6.5 Evaluation Metrics

| Metric | Phase 1 Target | Phase 2 Target | Method |
|---|---|---|---|
| Keyword Extraction F1 | ≥ 0.68 | ≥ 0.80 | Manually annotated JD subset (n=100) |
| Precision@10 | ≥ 0.65 | ≥ 0.78 | Held-out JD-resume pairs |
| Recall@10 | ≥ 0.70 | ≥ 0.80 | Same held-out set |
| MAP@10 | ≥ 0.60 | ≥ 0.75 | Ranking evaluation |
| nDCG@10 | ≥ 0.62 | ≥ 0.72 | Graded relevance scoring |
| Analysis Latency p95 | < 3.0 s | < 2.0 s | Production APM (Prometheus) |

---

## 7. API Contracts

### 7.1 Conventions

- Base path: `/api/v1/`. All endpoints require: `Authorization: Bearer <jwt_access_token>`.
- All responses are JSON. Errors return HTTP 4xx / 5xx with: `{ "error": "Human-readable message", "code": "ERROR_CODE" }`.
- All endpoints return rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 7.2 Rate Limits

| Endpoint | Per User / Hour | Per IP / Hour | Burst / Min |
|---|---|---|---|
| `POST /analyze` | 20 | 60 | 5 |
| `POST /rewrite` | 30 | 90 | 8 |
| `POST /cover-letter` | 10 | 30 | 3 |
| `POST /batch/analyze` | 5 | 15 | 2 |
| `GET /resumes/*` | 120 | 300 | 30 |
| `POST /auth/*` | 10 | 20 | 5 |

Exceeding a limit returns HTTP 429 with error code `RATE_LIMIT_EXCEEDED` and a `Retry-After` header.

---

### 7.3 POST /api/v1/analyze

**Request**
```json
{
  "resume_id": 123,
  "job_description": "We seek a senior Python developer with Flask, Docker..."
}
```

**Response — 200 OK**
```json
{
  "match_score": 75.5,
  "keywords_found": ["python", "flask", "aws"],
  "keywords_missing": ["docker", "kubernetes"],
  "suggestions": [
    { "keyword": "docker", "text": "Deployed services using Docker.", "section": "experience", "confidence": 0.91 },
    { "keyword": "kubernetes", "text": "Orchestrated containers with Kubernetes.", "section": "experience", "confidence": 0.88 }
  ],
  "section_feedback": { "has_summary": true, "has_skills": true, "ats_penalty_reason": null }
}
```

**Error Reference**

| Condition | HTTP | Error Code |
|---|---|---|
| JD text shorter than 50 characters | 400 | `JD_TOO_SHORT` |
| JD language is not English | 400 | `JD_LANGUAGE_UNSUPPORTED` |
| Resume has no extractable text | 400 | `RESUME_EMPTY` |
| `resume_id` not found or not owned by requester | 404 | `RESUME_NOT_FOUND` |
| NLP model or LLM call timed out | 503 | `ANALYSIS_TIMEOUT` |
| Rate limit exceeded | 429 | `RATE_LIMIT_EXCEEDED` |

---

### 7.4 POST /api/v1/rewrite

**Request**
```json
{
  "resume_text": "Developed web apps using Python and Flask.",
  "keywords": ["docker", "rest api"],
  "context": "Senior Backend Engineer at a fintech startup"
}
```

**Response — 200 OK**
```json
{
  "phrases": [
    { "keyword": "docker", "suggestion": "Containerised services using Docker and docker-compose.", "confidence": 0.92 },
    { "keyword": "rest api", "suggestion": "Designed RESTful APIs consumed by iOS and Android clients.", "confidence": 0.89 }
  ]
}
```

---

### 7.5 POST /api/v1/cover-letter

**Request**
```json
{
  "resume_id": 123,
  "job_description": "...",
  "company_name": "Acme Corp",
  "tone": "professional"
}
```

**Response — 200 OK**
```json
{
  "cover_letter": "Dear Hiring Team,\n\nI am excited to apply...",
  "word_count": 312,
  "cover_letter_id": 45
}
```

---

### 7.6 POST /api/v1/batch/analyze

**Request**
```json
{
  "resumes": [
    { "id": 123, "text": "..." },
    { "id": 124, "text": "..." }
  ],
  "job_description": "..."
}
```

**Response — 200 OK**
```json
{
  "results": [
    { "resume_id": 123, "match_score": 82.0, "keywords_missing": ["react"] },
    { "resume_id": 124, "match_score": 66.7, "keywords_missing": ["docker"] }
  ]
}
```

---

## 8. Data Model

### 8.1 Schema

| Table | Key Fields | Notes |
|---|---|---|
| `users` | `id PK`, `name`, `email UNIQUE`, `password_hash`, `created_at` | Unique index on email |
| `resumes` | `id PK`, `user_id FK`, `title`, `template_id`, `created_at`, `updated_at` | Index on `user_id` |
| `education` | `id PK`, `resume_id FK`, `school`, `degree`, `start_year`, `end_year` | |
| `experience` | `id PK`, `resume_id FK`, `company`, `role`, `start_date`, `end_date`, `description TEXT` | |
| `skills` | `id PK`, `resume_id FK`, `skill_name`, `level` | Index on `(resume_id, skill_name)` |
| `projects` | `id PK`, `resume_id FK`, `title`, `description`, `url` | |
| `certificates` | `id PK`, `resume_id FK`, `name`, `issuer`, `year` | |
| `templates` | `id PK`, `name`, `html_path`, `css_path`, `ats_safe BOOL DEFAULT false` | Only `ats_safe=true` shown to users |
| `versions` | `id PK`, `resume_id FK`, `version_no INT`, `data JSONB`, `created_at` | Composite UNIQUE `(resume_id, version_no)` |
| `job_descriptions` | `id PK`, `user_id FK`, `resume_id FK`, `text TEXT`, `keywords TEXT[]`, `created_at` | |
| `resume_analysis` | `id PK`, `resume_id FK`, `jobdesc_id FK`, `match_score REAL`, `found TEXT[]`, `missing TEXT[]`, `suggestions JSONB` | |
| `cover_letters` | `id PK`, `resume_id FK`, `jobdesc_id FK`, `content TEXT`, `word_count INT`, `created_at` | |
| `public_links` | `id PK`, `resume_id FK`, `token VARCHAR(12) UNIQUE`, `created_at`, `expires_at` | 6-char base62; ~56 billion combinations |
| `refresh_tokens` | `id PK`, `user_id FK`, `token_hash VARCHAR(255)`, `expires_at`, `revoked BOOL DEFAULT false` | Hash only; never store plaintext |
| `security_audit_log` | `id PK`, `user_id FK`, `event_type VARCHAR(80)`, `payload JSONB`, `created_at` | Injection events; 90-day retention |

### 8.2 DDL

```sql
CREATE TABLE public_links (
  id         SERIAL PRIMARY KEY,
  resume_id  INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  token      VARCHAR(12) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cover_letters (
  id         SERIAL PRIMARY KEY,
  resume_id  INTEGER NOT NULL REFERENCES resumes(id),
  jobdesc_id INTEGER REFERENCES job_descriptions(id),
  content    TEXT NOT NULL,
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  event_type VARCHAR(80) NOT NULL,
  payload    JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. System Architecture

### 9.1 Approach — Modular Monolith

The MVP is implemented as a single Flask application with clearly separated internal modules. A modular monolith ships faster than a microservices architecture, is easier to debug, and can be decomposed later when real performance data justifies it.

The Flask application and Celery worker share the same codebase and database connection string but run as separate OS processes:

```bash
# Web server process
gunicorn "app:create_app()" --workers 4 --bind 0.0.0.0:8000

# Background worker process (same codebase, different entry point)
celery -A app.celery worker --concurrency 2 --queues nlp,pdf
```

### 9.2 Module Boundaries

| Module | Responsibilities |
|---|---|
| `auth_module` | JWT issuance and validation, refresh token lifecycle, bcrypt hashing, Google OAuth |
| `resume_module` | CRUD for all resume entities, template selection, version snapshot and revert |
| `ats_module` | Keyword extraction pipeline (Stages 1–7), semantic similarity, suggestion generation |
| `pdf_module` | HTML-to-PDF via WeasyPrint, ReportLab fallback, S3 upload of generated file |
| `cover_letter_module` | LLM cover letter generation, word count enforcement, `cover_letters` persistence |

### 9.3 Infrastructure

| Component | Role | Sizing (MVP) |
|---|---|---|
| NGINX | Reverse proxy, TLS termination, static files | 1 vCPU, 1 GB RAM |
| Flask / Gunicorn | HTTP API, synchronous endpoints | 2 vCPU, 4 GB RAM (4 workers) |
| Celery Worker | NLP analysis, PDF rendering, cover letter generation | 4 vCPU, 8 GB RAM (2 concurrency) |
| PostgreSQL 15 | All structured data, JSONB snapshots | 2 vCPU, 8 GB RAM (managed RDS) |
| Redis 7 | Celery broker, embedding cache (TTL 1 h) | 1 vCPU, 2 GB RAM |
| AWS S3 / MinIO | Generated PDFs, future resume file uploads | Managed storage |

> **Decomposition trigger:** Extract the `ats_module` into a standalone service only when production data shows NLP task p95 latency exceeds 3 seconds under sustained load of ≥ 50 RPS. Do not decompose speculatively.

---

## 10. Deployment & CI/CD

### 10.1 CI/CD Pipeline

1. **Code quality:** Flake8, Black format check, mypy type check — on every push.
2. **Unit tests:** pytest. Fail if coverage drops below 80%.
3. **Docker build:** web app and worker images — on push to main.
4. **Model validation gate:** run evaluation script; fail if Keyword F1 < 0.68 or MAP@10 < 0.60. Triggered only when model files change.
5. **ATS template validation:** pdfminer extraction test on all templates; fail if any template falls below 80%.
6. **Integration tests:** deploy to staging, run Cypress E2E suite covering US-01 through US-09.
7. **Security scan:** Trivy CVE scan; fail on CRITICAL severity findings.
8. **Production deploy:** Kubernetes rolling update, one pod at a time, 60-second health check.
9. **Automatic rollback:** revert to previous image if health check fails within 60 seconds of deployment.

---

## 11. Testing Strategy

| Type | Tooling | Coverage / Target | Trigger |
|---|---|---|---|
| Unit | pytest | ≥ 80% line coverage; scoring formula, keyword extraction, all API handlers | Every push |
| Integration | pytest + test DB | All API endpoints; all documented error codes | Merge to main |
| End-to-End | Cypress | US-01 through US-09 happy paths and primary error states | Staging deploy |
| Model Eval | Custom script | Keyword F1, P@10, R@10, MAP@10, nDCG@10 per §6.5 targets | Model file change |
| Performance | Locust | 50 concurrent: PDF < 2 s, ATS analysis < 3 s at p95 | Weekly scheduled |
| Security | Trivy + OWASP ZAP | No CRITICAL CVEs; OWASP Top 10 automated scan | Every build |
| Prompt Injection | pytest (unit) | 20 adversarial JD/resume inputs; verify sanitisation function strips all patterns | Every push |

---

## 12. Security

### 12.1 Authentication

- Passwords hashed with bcrypt, cost factor 12.
- JWT access tokens: 1-hour expiry, HS256 signing, secret rotated quarterly.
- Refresh tokens: 30-day expiry, stored as bcrypt hashes in `refresh_tokens`. Revocation sets `revoked = true`.
- Failed login attempts rate-limited at 10 per IP per hour.

### 12.2 Prompt Injection Controls

- All user-supplied text entering an LLM prompt passes through `sanitize_for_llm()` in the respective module.
- Injection trigger phrases stripped using a regex list maintained in `config/injection_patterns.yaml`.
- Input length caps enforced: `RESUME_SNIPPET` ≤ 200 chars, `JD_SNIPPET` ≤ 300 chars.
- Sanitisation events with `stripped_count > 0` logged to `security_audit_log`.

### 12.3 Transport and Storage

- All HTTP traffic over TLS 1.3. HSTS header enforced.
- Database: AES-256 at rest. S3 buckets: server-side encryption; public access denied.
- Secrets injected via environment variables or AWS Secrets Manager. Never committed to version control.

### 12.4 LLM Vendor DPA

> **Hard launch blocker.** Signing a Data Processing Agreement with each LLM vendor before sending any user data to their APIs is required. This must be tracked as a release gate in the CI/CD pipeline.

---

## 13. Privacy & GDPR Compliance

- **Data Minimisation:** collect only name, email, and resume content. No third-party tracking pixels in MVP.
- **Consent:** explicit opt-in to save resume history. Users who decline receive transient-only processing — no data written to the database.
- **ML Training Opt-Out:** settings toggle. Default: anonymised aggregate data only.
- **Retention:** automatic deletion after 24 months of inactivity. Right to Erasure fulfilled within 30 days.
- **Encryption:** TLS 1.3 in transit; AES-256 at rest for resume data, cover letters, and snapshots.
- **Audit Logging:** login, data export, deletion, and prompt injection events logged with user ID and timestamp.
- **Vendor DPA:** all LLM vendor DPAs must be signed before user data is processed by external APIs (§12.4).

---

## 14. Roadmap & Milestones

| # | Milestone | Deliverable & Acceptance Criteria | Effort |
|---|---|---|---|
| M1 | Core Resume Builder | Editor, ATS-validated templates, live preview (300 ms), PDF export (< 2 s) | 4 pw |
| M2 | Auth & Storage | Register / login, JWT + refresh tokens, full resume CRUD persisted | 3 pw |
| M3 | ATS Prototype | TF-IDF (`min_df=1`) + ESCO lexicon, keyword list, basic score endpoint live | 4 pw |
| M4 | NLP Improvements | spaCy NER + sentence-BERT semantic score, Redis embedding cache operational | 5 pw |
| M5 | AI Suggestions | LLM suggestion engine with prompt template, injection guard, and fallback logic | 4 pw |
| M6 | Cover Letter Generator | `POST /cover-letter`, four-paragraph structure, editable UI, DB persistence | 3 pw |
| M7 | Versioning & Sharing | Snapshot history with revert, `public_links` table, tokenised public URL | 3 pw |
| M8 | UX Refinement | ATS panel polish, all error states surfaced, AI suggestion labelling in UI | 2 pw |
| M9 | API Hardening | Rate limiting per §7.2, OpenAPI spec, request validation middleware | 2 pw |
| M10 | Testing & QA | ≥ 80% coverage, Cypress E2E passing, prompt injection test suite green | 3 pw |
| M11 | Deployment & CI/CD | All CI stages passing including model gate and template validation; staging live | 3 pw |
| M12 | Beta Release | 10–20 real users; NPS collected; no P0 bugs outstanding | 2 pw |
| M13 | Scalability & Security | Locust: 200 RPS, latency SLAs met. Trivy + OWASP ZAP: no CRITICAL findings | 3 pw |
| M14 | NLP Fine-Tuning (Ph. 2) | Contrastive training on opt-in pairs; MAP@10 ≥ 0.75 achieved | 5 pw |
| M15 | Scoring A/B Test (Ph. 2) | Weights 0.60/0.30 validated or revised against interview callback rate | 3 pw |
| M16 | Job Board API (Ph. 3) | LinkedIn Easy Apply or Greenhouse integration replaces Copy-to-Clipboard | 6 pw |

**MVP (M1–M13): approximately 41 person-weeks across 7–10 months with one to two engineers.**

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM generates suggestions claiming undemonstrated skills | Medium | High | Keyword-presence guard (§4.2); 'AI-generated' label; user explicit insert only |
| Prompt injection via user-supplied JD or resume text | Medium | High | Mandatory `sanitize_for_llm()` (§4.2, §12.2); `security_audit_log` monitoring |
| NLP keyword extraction precision too low | Medium | High | Ensemble approach + ESCO lexicon fallback; manual keyword override in UI |
| Scoring weights poorly calibrated | High | Medium | Documented as provisional; A/B test in M15 against callback rate data |
| WeasyPrint rendering failure on complex CSS | Low | Medium | ReportLab fallback (US-04); template CI pdfminer extraction test |
| LLM API cost overrun | Medium | Medium | Per-user daily cap (50 calls); Redis suggestion caching; config-switchable model |
| LLM vendor DPA not signed before launch | Medium | High | Hard release gate in CI/CD pipeline; assigned legal owner and deadline |
| Data privacy non-compliance | Low | High | GDPR controls by design (§13); legal review pre-launch; vendor DPAs in place |

---

## 16. Open Questions

| Question | Options | Owner | Required By |
|---|---|---|---|
| Primary LLM vendor? | Anthropic Claude vs OpenAI GPT-4o — both supported via §6.3 env config | Eng Lead | M5 |
| NLP inference: self-hosted vs API? | sentence-transformers on Celery worker (free, ~200 ms) vs HuggingFace Inference API (~500 ms) | Infra | M4 |
| DOCX export at launch? | Nice-to-have; adds LibreOffice to the worker container; consider deferring to M14 | PM | M1 |
| Public link token length? | 6-char base62 (~56B combos) adequate for MVP; re-evaluate at 100K+ active links | Eng | M7 |
| Rate limit enforcement layer? | NGINX `ngx_http_limit_req_module` vs Flask middleware vs API Gateway | Eng | M9 |

---

*AI-Powered Resume Builder · Product Requirements Document v4.0 · Confidential*
