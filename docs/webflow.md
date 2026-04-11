# Webflow — AI-Powered Resume Builder
> Derived from PRD v4.0 · Every page · Every user path · No guessing

---

## Navigation Model

```
Public Zone (unauthenticated)
├── /                         Landing Page
├── /register                 Registration
├── /login                    Login
├── /forgot-password          Password Reset Request
├── /reset-password?token=… Password Reset Form
├── /verify-email?token=…   Email Verification
└── /r/:token                 Public Resume View (shared link, read-only)

Authenticated Zone (requires valid JWT)
├── /dashboard                Resume Dashboard
├── /resumes/new              New Resume Wizard
├── /resumes/:id/edit         Resume Editor
│   ├── (tab) personal
│   ├── (tab) summary
│   ├── (tab) education
│   ├── (tab) experience
│   ├── (tab) skills
│   ├── (tab) projects
│   └── (tab) certifications
├── /resumes/:id/analyze      ATS Analysis Panel
├── /resumes/:id/cover-letter Cover Letter Generator
├── /resumes/:id/versions     Version History
└── /account                  Account Settings
```

---

## Page-by-Page Specification

---

### `/` — Landing Page

**Purpose:** Convert visitors to registered users.

**Content blocks:**
- Hero: headline, sub-headline, CTA → `/register`
- Feature highlights: Editor, ATS Analysis, AI Suggestions, Cover Letter, Shareable Link
- How it works: 3-step illustration
- CTA strip → `/register`

**Navigation:**
- Header: Logo → `/`, Login → `/login`, Get Started → `/register`
- Footer: Links (no auth required)

**User paths:**
- Click "Get Started" or any CTA → `/register`
- Click "Login" → `/login`

---

### `/register` — Registration

**Purpose:** Create a new account.

**Fields:** Full name, Email, Password, Confirm Password

**Interactions:**
- Submit → POST `/api/v1/auth/register`
  - Success → system sends verification email → redirect to `/login` with banner: *"Check your email to verify your account."*
  - Error `EMAIL_ALREADY_EXISTS` → inline error on email field
  - Validation errors → inline field errors

- "Sign up with Google" button → Google OAuth flow → on return, account created/linked → redirect to `/dashboard`

**Navigation links:**
- "Already have an account? Log in" → `/login`

---

### `/login` — Login

**Purpose:** Authenticate existing users.

**Fields:** Email, Password

**Interactions:**
- Submit → POST `/api/v1/auth/login`
  - Success → store JWT access token + refresh token → redirect to `/dashboard`
  - `INVALID_CREDENTIALS` → banner error "Incorrect email or password."
  - `EMAIL_NOT_VERIFIED` → banner with "Resend verification email" action
  - Rate limit (10 failed attempts / IP / hour) → `RATE_LIMIT_EXCEEDED` banner

- "Continue with Google" → Google OAuth flow → redirect to `/dashboard`

**Navigation links:**
- "Forgot your password?" → `/forgot-password`
- "Don't have an account? Sign up" → `/register`

---

### `/forgot-password` — Password Reset Request

**Fields:** Email

**Interactions:**
- Submit → POST `/api/v1/auth/forgot-password`
  - Always shows success message (no email enumeration): *"If an account exists for that email, a reset link has been sent."*

**Navigation links:**
- "Back to login" → `/login`

---

### `/reset-password?token=…` — Password Reset Form

**Fields:** New Password, Confirm New Password

**Interactions:**
- Submit → POST `/api/v1/auth/reset-password`
  - Success → redirect to `/login` with banner: *"Password updated. Please log in."*
  - Expired/invalid token → error banner with "Request a new link" → `/forgot-password`

---

### `/verify-email?token=…` — Email Verification

**No form.** Token validated on page load.

**Interactions:**
- Valid token → POST `/api/v1/auth/verify-email` → success banner → redirect to `/login` with prompt to log in
- Invalid/expired token → error state with "Resend verification email" CTA

---

### `/dashboard` — Resume Dashboard

**Purpose:** Central hub. View, create, and manage resumes.

**Content:**
- Page header: "My Resumes" + "Create New Resume" button
- Resume cards (one per resume): title, last updated timestamp, template name, ATS score badge (if analysis has been run)
- Each card has actions: **Edit**, **Analyze**, **Download PDF**, **Delete**

**Interactions:**
- "Create New Resume" → `/resumes/new`
- Card "Edit" → `/resumes/:id/edit`
- Card "Analyze" → `/resumes/:id/analyze`
- Card "Download PDF" → GET `/api/v1/resumes/:id/export-pdf` → file download
- Card "Delete" → confirmation modal → DELETE `/api/v1/resumes/:id` → card removed
- Header: Account icon → `/account`, Logout → clears tokens → `/login`

---

### `/resumes/new` — New Resume Wizard

**Purpose:** Named entry point before the editor; captures title and template choice.

**Steps:**
1. Enter resume title (free text)
2. Pick a template (grid of thumbnails — Classic, Modern, Creative; only `ats_safe = true` templates shown)
3. Submit → POST `/api/v1/resumes` → on success redirect to `/resumes/:id/edit?section=personal`

**Navigation:**
- "Cancel" → `/dashboard`

---

### `/resumes/:id/edit` — Resume Editor

**Purpose:** The primary workspace. Two-panel layout: form on the left, live preview on the right.

#### Left panel — Section Tabs

Each tab is a form section. Active section is highlighted.

| Tab | Fields |
|---|---|
| Personal | Full name, Email, Phone, Location, LinkedIn URL, Portfolio URL |
| Summary | Textarea (professional summary) |
| Education | School, Degree, Field, Start Year, End Year — repeatable |
| Experience | Company, Role, Start Date, End Date, Description (textarea) — repeatable |
| Skills | Skill name, Level (dropdown) — repeatable |
| Projects | Title, Description, URL — repeatable |
| Certifications | Name, Issuer, Year — repeatable |

**Controls per repeatable item:** Add item button, Edit (inline), Delete (confirm).

**Interactions:**
- Any keystroke → debounced 300 ms → POST `/api/v1/resumes/:id/preview` → right panel refreshes
- "Save" button → PUT `/api/v1/resumes/:id` → autosave confirmation toast; also triggers a version snapshot
- "Add item" (Education, Experience, etc.) → POST `/api/v1/resumes/:id/{section}` → item appears, preview refreshes
- "Delete item" → DELETE `/api/v1/resumes/:id/{section}/:item_id` → item removed, preview refreshes

#### Right panel — Live Preview

- Renders current resume using selected template CSS
- Matches template selected at `/resumes/new` or updated via template picker (see below)
- Not blocked by background save

#### Top toolbar (Editor)

| Button | Action |
|---|---|
| Template | Opens template picker modal → select template → preview re-renders, data unchanged |
| Download PDF | GET `/api/v1/resumes/:id/export-pdf` → file download (< 2 s) |
| Analyze | Navigate to `/resumes/:id/analyze` |
| Cover Letter | Navigate to `/resumes/:id/cover-letter` |
| Versions | Navigate to `/resumes/:id/versions` |
| Share | Opens share modal — generates or retrieves public link token → displays `https://app.domain/r/:token` with copy-to-clipboard |
| Back to Dashboard | `/dashboard` |

#### Template Picker Modal

- Grid of available templates (only `ats_safe = true`)
- Hover shows name; click selects
- "Apply" → PATCH `/api/v1/resumes/:id` with `template_id` → modal closes, preview re-renders
- "Cancel" → modal closes, no change

#### Share Modal

- Calls POST `/api/v1/resumes/:id/share` → creates entry in `public_links` table, returns token
- Displays full public URL
- "Copy Link" → clipboard
- "Remove Link" → DELETE `/api/v1/resumes/:id/share` → link revoked

---

### `/resumes/:id/analyze` — ATS Analysis Panel

**Purpose:** Score the resume against a job description and surface improvement actions.

**Layout:** Two-column — input on left, results on right (or stacked on mobile).

#### Input column

- Textarea: "Paste job description here" (or optionally paste a URL)
- Character counter (min 50, max 10,000)
- "Analyze" button

**Interactions — Analyze button clicked:**
- Client validates: length ≥ 50 chars, non-empty resume
- POST `/api/v1/analyze` with `resume_id` + `job_description`
- Loading state: spinner, "Analyzing…" (pipeline runs async via Celery; response within 3 s)

**Success response → results column renders:**

| Result element | Description |
|---|---|
| Match Score | Large percentage dial / score out of 100 |
| Found Keywords | Chips shown in **green** |
| Missing Keywords | Chips shown in **red** |
| Section Feedback | Badges: "Has Summary ✓", "Has Skills ✓" or warnings if missing |
| ATS Penalty Warning | Shown if `ats_penalty_reason` is non-null |
| AI Suggestions | Up to 5 cards (see below) |

#### AI Suggestion Cards

Each card shows:
- Keyword (red chip)
- Suggested phrase (20 words max)
- Confidence badge (if < 0.70: italic label "Low confidence — review before using")
- Label: *"AI-generated — review before submitting."* (always visible)
- **"Add to Resume"** button

**"Add to Resume" interaction:**
- PATCH `/api/v1/resumes/:id/{section}` to append phrase to the suggested section
- Live preview in editor updates
- Keyword chip changes from red to green (marked as addressed)
- Button changes to "Added ✓" (disabled)

**Error states (displayed inline above results):**

| Error Code | User-Visible Message |
|---|---|
| `JD_TOO_SHORT` | "Job description must be at least 50 characters." |
| `JD_LANGUAGE_UNSUPPORTED` | "Only English job descriptions are supported in this version." |
| `RESUME_EMPTY` | "Your resume has no content to analyze. Add some sections first." |
| `ANALYSIS_TIMEOUT` | "Analysis timed out. Please try again." |
| `RATE_LIMIT_EXCEEDED` | "You've reached the analysis limit. Try again in [Retry-After] minutes." |

**Navigation:**
- "Back to Editor" → `/resumes/:id/edit`
- "Generate Cover Letter" → `/resumes/:id/cover-letter`

---

### `/resumes/:id/cover-letter` — Cover Letter Generator

**Purpose:** Generate a tailored four-paragraph cover letter.

**Input fields:**
- Job description textarea (pre-populated if arriving from Analyze page)
- Company name (optional text field)
- Tone selector: Professional (default) / Conversational / Concise

**Interactions:**
- "Generate Cover Letter" → POST `/api/v1/cover-letter` with `resume_id`, `job_description`, `company_name`, `tone`
- Loading spinner while Celery task runs

**Success → letter renders in editable textarea:**
- Word count shown below textarea (max 350 words; enforced server-side)
- User can freely edit the generated text
- "Save Cover Letter" → POST `/api/v1/cover-letter/save` with edited content → persists to `cover_letters` table → success toast
  - **Letter is NOT saved until this button is clicked.**
- "Regenerate" → clears textarea, re-runs generation with same inputs
- "Copy to Clipboard" → copies current textarea content

**Error states:**
- `JD_TOO_SHORT`, `RESUME_EMPTY`, `RATE_LIMIT_EXCEEDED` → same inline banners as Analyze page
- LLM timeout → "Generation failed. Please try again." with retry button

**Navigation:**
- "Back to Editor" → `/resumes/:id/edit`
- "Back to Analysis" → `/resumes/:id/analyze`

---

### `/resumes/:id/versions` — Version History

**Purpose:** Browse snapshots, compare, and revert.

**Content:**
- List of version snapshots, newest first
- Each row: version number, auto-generated label (e.g. "Saved 12 Apr 2025, 14:32"), thumbnail or text preview
- Actions per row: **Preview**, **Revert**

**Interactions:**
- "Preview" → opens modal showing read-only render of that snapshot using current template
- "Revert" → confirmation dialog "This will overwrite your current resume. Continue?"
  - Confirmed → POST `/api/v1/resumes/:id/versions/:version_no/revert` → copies snapshot data into active resume → redirects to `/resumes/:id/edit` with toast "Reverted to version [N]"
  - Cancelled → dialog closes, no change

**Navigation:**
- "Back to Editor" → `/resumes/:id/edit`

---

### `/r/:token` — Public Resume View (Shared Link)

**Purpose:** Read-only, mobile-responsive resume view for anyone with the link. No authentication required.

**Content:**
- Resume rendered in the template that was active when the link was created
- No editing controls, no download button, no navigation to app internals
- Footer: "Created with Resume Builder" (branding only)

**Behavior:**
- Expired or revoked token → 404 page with message "This resume link is no longer available."
- Valid token → GET `/api/v1/public/:token` → renders resume data

---

### `/account` — Account Settings

**Sections:**

| Section | Fields / Actions |
|---|---|
| Profile | Name (editable), Email (read-only), "Change Password" flow |
| Change Password | Current password, New password, Confirm → PATCH `/api/v1/auth/password` |
| Connected Accounts | Google OAuth connection status, "Connect" / "Disconnect" |
| Privacy | "Opt out of ML training data" toggle (default: anonymised aggregate only), "Download my data" |
| Danger Zone | "Delete my account" → confirmation modal → DELETE `/api/v1/users/me` → all data queued for deletion within 30 days → logout → `/` |

**Navigation:**
- "Back to Dashboard" → `/dashboard`

---

## Full User Path Flows

---

### Path A — New user, builds first resume, exports PDF

```
/ (Landing)
  → /register
    → Email verification sent
  → /login
    → /dashboard (empty state)
  → /resumes/new
    → Enter title, pick template
  → /resumes/:id/edit (personal tab)
    → Fill in all sections
    → Download PDF (toolbar)
  → PDF file downloaded ✓
```

---

### Path B — User runs ATS analysis and inserts suggestion

```
/dashboard
  → /resumes/:id/edit
    → (resume already has content)
  → Click "Analyze" (toolbar)
  → /resumes/:id/analyze
    → Paste JD
    → Click "Analyze"
    → Score + missing keywords appear
    → Click "Add to Resume" on a suggestion
      → Section updated, keyword goes green
  → "Back to Editor"
  → /resumes/:id/edit (changes visible in preview)
    → Save
  → Download PDF ✓
```

---

### Path C — User generates and saves a cover letter

```
/resumes/:id/analyze
  → (Analysis already run)
  → Click "Generate Cover Letter"
  → /resumes/:id/cover-letter
    → JD pre-populated
    → Set tone: Conversational
    → Click "Generate Cover Letter"
    → Letter appears in textarea
    → User edits letter
    → Click "Save Cover Letter"
  → Toast: "Cover letter saved." ✓
```

---

### Path D — Career Coach uses batch analysis and shares a link

```
/dashboard
  → POST /api/v1/batch/analyze (API, Carol's workflow — up to 5 resumes / hour)
    → Scores returned for each resume_id

  Per resume:
  → /resumes/:id/edit
    → Click "Share" (toolbar)
    → Share modal: copy public link /r/:token
  → Send link to client ✓

  Client opens /r/:token
    → Reads resume (no login required) ✓
```

---

### Path E — User reverts to a previous version

```
/resumes/:id/edit
  → Click "Versions" (toolbar)
  → /resumes/:id/versions
    → List of snapshots
    → Click "Preview" on version 3 → modal preview
    → Click "Revert" on version 3
      → Confirmation dialog
      → Confirm
  → /resumes/:id/edit (version 3 data restored, preview refreshed) ✓
```

---

### Path F — Returning user, token expired mid-session

```
/resumes/:id/edit
  → Save triggered → API returns 401 (JWT expired)
  → App silently attempts POST /api/v1/auth/refresh with refresh token
    → Success → new access token stored → save retried transparently
    → Failure (refresh expired/revoked) → redirect to /login with message
      "Your session has expired. Please log in again."
  → /login → authenticate → redirect back to /resumes/:id/edit ✓
```

---

### Path G — Password reset

```
/login
  → "Forgot your password?"
  → /forgot-password
    → Enter email → Submit
    → Banner: "If an account exists, a reset link has been sent."
  → (Email received) → click reset link
  → /reset-password?token=…
    → Enter new password → Submit
  → /login with banner: "Password updated. Please log in." ✓
```

---

### Path H — Account deletion (GDPR Right to Erasure)

```
/account
  → Danger Zone → "Delete my account"
  → Confirmation modal: "All your data will be permanently deleted within 30 days."
  → Confirm → DELETE /api/v1/users/me
  → Logout → /
  → Data deletion queued; completed within 30 days ✓
```

---

## Error & Edge State Handling

| Scenario | Page | Behavior |
|---|---|---|
| Unverified email tries to log in | `/login` | Banner with "Resend verification email" link |
| Accessing `/resumes/:id/edit` for another user's resume | `/resumes/:id/edit` | 403 → redirect to `/dashboard` with "Resume not found." |
| Accessing any auth-required route without JWT | Any `/resumes/*`, `/dashboard`, `/account` | Redirect to `/login?next=<original-path>` |
| Public link expired or deleted | `/r/:token` | 404 page: "This resume link is no longer available." |
| PDF export fails (WeasyPrint + ReportLab both fail) | `/resumes/:id/edit` | Toast error: "PDF export failed. Please try again." |
| ATS analysis rate limit hit | `/resumes/:id/analyze` | Inline banner with countdown from `Retry-After` header |
| LLM suggestion generation times out (> 5 s) | `/resumes/:id/analyze` | Template fallback phrase shown in place of LLM phrase; labelled as fallback |
| Non-English JD pasted | `/resumes/:id/analyze` | `JD_LANGUAGE_UNSUPPORTED` inline error |
| JD over 10,000 characters | `/resumes/:id/analyze` | Client-side truncation warning before submission |
| Template not ATS-safe | Template picker modal | Filtered out; never shown |
| Version revert cancelled | `/resumes/:id/versions` | Dialog closes, no state change |
| Cover letter over 350 words | `/resumes/:id/cover-letter` | Server re-prompts LLM with word budget; user sees compliant letter or error if retries fail |

---

## State That Persists Across Sessions

| Data | Where stored |
|---|---|
| Resume content (all sections) | `resumes` + section tables (PostgreSQL) |
| Active template per resume | `resumes.template_id` |
| Version snapshots | `versions` table (JSONB) |
| Cover letters | `cover_letters` table |
| Last ATS analysis result | `resume_analysis` table |
| Public share tokens | `public_links` table |
| Refresh tokens | `refresh_tokens` table (hashed) |

**Not persisted until user explicitly saves:**
- Cover letter content (textarea is transient until "Save Cover Letter" is clicked)
- Unsaved editor changes after a crash (auto-save fires on each Save button press, not continuously)

---

## API → Page Mapping (Quick Reference)

| API Endpoint | Triggered From |
|---|---|
| `POST /api/v1/auth/register` | `/register` |
| `POST /api/v1/auth/login` | `/login` |
| `POST /api/v1/auth/refresh` | Silently, on 401 anywhere |
| `POST /api/v1/auth/forgot-password` | `/forgot-password` |
| `POST /api/v1/auth/reset-password` | `/reset-password` |
| `POST /api/v1/auth/verify-email` | `/verify-email` |
| `GET /api/v1/resumes` | `/dashboard` |
| `POST /api/v1/resumes` | `/resumes/new` |
| `GET /api/v1/resumes/:id` | `/resumes/:id/edit` (load) |
| `PUT /api/v1/resumes/:id` | `/resumes/:id/edit` (save) |
| `DELETE /api/v1/resumes/:id` | `/dashboard` (card delete) |
| `POST /api/v1/resumes/:id/preview` | `/resumes/:id/edit` (debounced live preview) |
| `GET /api/v1/resumes/:id/export-pdf` | Editor toolbar / dashboard card |
| `POST /api/v1/resumes/:id/share` | Editor share modal |
| `DELETE /api/v1/resumes/:id/share` | Editor share modal |
| `GET /api/v1/public/:token` | `/r/:token` |
| `GET /api/v1/resumes/:id/versions` | `/resumes/:id/versions` |
| `POST /api/v1/resumes/:id/versions/:n/revert` | `/resumes/:id/versions` |
| `POST /api/v1/analyze` | `/resumes/:id/analyze` |
| `POST /api/v1/batch/analyze` | API (Carol persona, up to 5/hr) |
| `POST /api/v1/rewrite` | `/resumes/:id/analyze` (AI suggestions) |
| `POST /api/v1/cover-letter` | `/resumes/:id/cover-letter` |
| `PATCH /api/v1/auth/password` | `/account` |
| `DELETE /api/v1/users/me` | `/account` (danger zone) |
