> **Implementation Note:** The visual principles below are achieved using Tailwind CSS utility classes generated via Google Stitch, rather than raw CSS variables. The custom CSS properties documented here (e.g. `--color-void`, `--accent-primary`) represent the design intent and serve as a reference for design decisions. In the actual codebase, Tailwind utility classes (e.g. `bg-gray-950`, `text-white`, `shadow-lg`) are used in place of the raw CSS tokens.

---

# FRONTEND_GUIDELINES.md
## AI-Powered Resume Builder — Design System

> 3D Glassmorphic Dark Interface · Version 1.0

---

## 1. Design Philosophy

### Concept: "Depth of Career"

The interface lives in **three-dimensional space**. Every surface has depth, light responds to interaction, and the UI feels like a physical workspace — not a flat screen. Think of it as a premium dark studio tool: the kind software that serious professionals use and trust.

**Core principles:**
- **Depth over flatness** — every element casts shadows, reflects light, or recedes into space
- **Purposeful motion** — 3D transforms on hover/focus, not decoration for decoration's sake
- **Precision typography** — sharp, confident, editorial
- **Light as a material** — gradients, glows, and reflections are part of the design language, not afterthoughts
- **Professional restraint** — dramatic but never garish; dark base keeps focus on the user's content

---

## 2. Color System

All colors are defined as CSS custom properties. Never use raw hex values in components.

```css
:root {
  /* ── Base Surfaces ─────────────────────────────── */
  --color-void:        #050508;   /* page background — near-black with blue tint */
  --color-depth-1:     #0c0c14;   /* deepest surface layer */
  --color-depth-2:     #12121e;   /* cards, panels */
  --color-depth-3:     #1a1a2e;   /* elevated surfaces */
  --color-depth-4:     #22223a;   /* hover states, active panels */

  /* ── Glass Layers ──────────────────────────────── */
  --glass-primary:     rgba(255, 255, 255, 0.04);
  --glass-secondary:   rgba(255, 255, 255, 0.07);
  --glass-hover:       rgba(255, 255, 255, 0.10);
  --glass-border:      rgba(255, 255, 255, 0.08);
  --glass-border-lit:  rgba(255, 255, 255, 0.18);

  /* ── Brand Accent — Electric Indigo ───────────── */
  --accent-primary:    #6c63ff;   /* primary CTA, active states */
  --accent-glow:       #8b85ff;   /* lighter variant for glow effects */
  --accent-deep:       #4a43cc;   /* pressed states */
  --accent-subtle:     rgba(108, 99, 255, 0.12);  /* tinted backgrounds */
  --accent-subtle-md:  rgba(108, 99, 255, 0.20);

  /* ── Status Colors ─────────────────────────────── */
  --color-success:     #00d9a3;   /* ATS keyword found, score high */
  --color-success-bg:  rgba(0, 217, 163, 0.10);
  --color-danger:      #ff5f7e;   /* missing keywords, errors */
  --color-danger-bg:   rgba(255, 95, 126, 0.10);
  --color-warning:     #ffb347;   /* low confidence suggestions */
  --color-warning-bg:  rgba(255, 179, 71, 0.10);
  --color-info:        #38bdf8;   /* informational, links */
  --color-info-bg:     rgba(56, 189, 248, 0.10);

  /* ── Score Gradient ────────────────────────────── */
  --score-low:         #ff5f7e;   /* 0–40 */
  --score-mid:         #ffb347;   /* 41–69 */
  --score-high:        #00d9a3;   /* 70–100 */

  /* ── Typography Colors ─────────────────────────── */
  --text-primary:      #f0f0f8;   /* headings, primary content */
  --text-secondary:    #9898b8;   /* labels, captions, metadata */
  --text-tertiary:     #5a5a7a;   /* placeholder text, disabled */
  --text-inverse:      #050508;   /* text on light/accent backgrounds */

  /* ── 3D Lighting ───────────────────────────────── */
  --light-top:         rgba(255, 255, 255, 0.12);  /* top-edge highlight */
  --light-left:        rgba(255, 255, 255, 0.06);  /* left-edge highlight */
  --shadow-ambient:    rgba(0, 0, 0, 0.60);
  --shadow-drop:       rgba(0, 0, 0, 0.80);
  --shadow-accent:     rgba(108, 99, 255, 0.35);   /* colored drop shadow */
  --shadow-success:    rgba(0, 217, 163, 0.30);
  --shadow-danger:     rgba(255, 95, 126, 0.30);
}
```

### Color Usage Rules

- **Never** use `--color-void` as a card background; it is the page canvas only.
- **Never** place `--text-secondary` on `--color-depth-1` — contrast is insufficient.
- The accent color `--accent-primary` is reserved for: primary buttons, active nav items, focus rings, and score highlights. Do not scatter it freely.
- Status colors (`--color-success`, `--color-danger`, `--color-warning`) appear only as semantic indicators, never as decorative color.

---

## 3. Typography

```css
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* ── Families ──────────────────────────────────── */
  --font-display:  'Syne', sans-serif;       /* headings, brand, large UI labels */
  --font-body:     'DM Sans', sans-serif;    /* all body copy, form labels, descriptions */
  --font-mono:     'JetBrains Mono', monospace; /* code, scores, keyword chips, tokens */

  /* ── Scale (Major Third — 1.250) ───────────────── */
  --text-xs:    0.64rem;    /* 10.2px — metadata, badges */
  --text-sm:    0.80rem;    /* 12.8px — captions, helper text */
  --text-base:  1.00rem;    /* 16px   — body text */
  --text-md:    1.25rem;    /* 20px   — large body, card intros */
  --text-lg:    1.563rem;   /* 25px   — section headings */
  --text-xl:    1.953rem;   /* 31px   — page headings */
  --text-2xl:   2.441rem;   /* 39px   — hero sub-headings */
  --text-3xl:   3.052rem;   /* 49px   — hero headings */
  --text-4xl:   3.815rem;   /* 61px   — display / landing hero */

  /* ── Line Heights ──────────────────────────────── */
  --leading-tight:   1.15;
  --leading-snug:    1.35;
  --leading-normal:  1.55;
  --leading-relaxed: 1.75;

  /* ── Letter Spacing ────────────────────────────── */
  --tracking-tight:  -0.03em;
  --tracking-normal:  0em;
  --tracking-wide:    0.06em;
  --tracking-wider:   0.12em;  /* ALL-CAPS labels */

  /* ── Font Weights ──────────────────────────────── */
  --weight-light:    300;
  --weight-regular:  400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-extrabold:800;
}
```

### Typography Roles

| Token | Font | Weight | Size | Usage |
|---|---|---|---|---|
| `.t-hero` | Syne | 800 | `--text-4xl` | Landing page hero |
| `.t-heading-1` | Syne | 700 | `--text-3xl` | Page titles |
| `.t-heading-2` | Syne | 700 | `--text-xl` | Section headings |
| `.t-heading-3` | Syne | 600 | `--text-lg` | Card headings, panel titles |
| `.t-label` | DM Sans | 500 | `--text-sm` | Form labels, ALL-CAPS captions |
| `.t-body` | DM Sans | 400 | `--text-base` | Descriptions, content |
| `.t-body-small` | DM Sans | 400 | `--text-sm` | Helper text, timestamps |
| `.t-score` | JetBrains Mono | 500 | `--text-2xl` | ATS score number |
| `.t-keyword` | JetBrains Mono | 400 | `--text-xs` | Keyword chips |
| `.t-code` | JetBrains Mono | 400 | `--text-sm` | Code, tokens, share links |

---

## 4. Spacing System

Based on a 4px base unit. All spacing uses this scale.

```css
:root {
  --space-1:   0.25rem;   /*  4px */
  --space-2:   0.5rem;    /*  8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */
  --space-24:  6rem;      /* 96px */
  --space-32:  8rem;      /* 128px */
}
```

### Spacing Application Rules

- **Component internal padding:** `--space-4` to `--space-6`
- **Card padding:** `--space-6` (compact) or `--space-8` (spacious)
- **Section vertical rhythm:** `--space-16` between major page sections
- **Form field gap:** `--space-4`
- **Inline element gap (chips, badges):** `--space-2`
- **Never** use arbitrary pixel values. Always reference a spacing token.

---

## 5. Border Radius

```css
:root {
  --radius-sm:   6px;    /* chips, badges, small inputs */
  --radius-md:   12px;   /* buttons, form fields */
  --radius-lg:   18px;   /* cards, panels */
  --radius-xl:   24px;   /* modal dialogs, large containers */
  --radius-2xl:  32px;   /* hero cards, feature panels */
  --radius-full: 9999px; /* pills, avatars, toggle tracks */
}
```

---

## 6. 3D Elevation System

The Z-axis is a first-class design dimension. Every surface has a defined elevation level that determines its shadow, border lighting, and transform behavior.

```css
:root {
  /* ── Level 0 — Canvas (no elevation) ──────────── */
  --elev-0-bg:     var(--color-void);
  --elev-0-shadow: none;

  /* ── Level 1 — Recessed (inputs, code blocks) ── */
  --elev-1-bg:     var(--color-depth-1);
  --elev-1-shadow: inset 0 2px 8px rgba(0,0,0,0.5),
                   inset 0 1px 2px rgba(0,0,0,0.8);
  --elev-1-border: 1px solid rgba(255,255,255,0.04);

  /* ── Level 2 — Flat Card (standard panels) ───── */
  --elev-2-bg:     var(--color-depth-2);
  --elev-2-shadow: 0 4px 16px rgba(0,0,0,0.4),
                   0 1px 4px rgba(0,0,0,0.6);
  --elev-2-border: 1px solid var(--glass-border);

  /* ── Level 3 — Raised Card (hover, focus) ─────── */
  --elev-3-bg:     var(--color-depth-3);
  --elev-3-shadow: 0 8px 32px rgba(0,0,0,0.5),
                   0 2px 8px rgba(0,0,0,0.7),
                   0 0 0 1px var(--glass-border-lit);
  --elev-3-border: 1px solid var(--glass-border-lit);

  /* ── Level 4 — Floating (modals, dropdowns) ───── */
  --elev-4-bg:     var(--color-depth-3);
  --elev-4-shadow: 0 16px 64px rgba(0,0,0,0.7),
                   0 4px 16px rgba(0,0,0,0.8),
                   0 0 0 1px var(--glass-border-lit),
                   0 0 80px var(--shadow-accent);
  --elev-4-border: 1px solid rgba(255,255,255,0.14);

  /* ── Level 5 — Spotlight (primary CTA card) ───── */
  --elev-5-shadow: 0 24px 80px rgba(0,0,0,0.8),
                   0 0 0 1px var(--accent-primary),
                   0 0 120px var(--shadow-accent);
}
```

### 3D Card Technique

Cards use a persistent top-left light edge to simulate a physical light source from the upper-left corner:

```css
.card-3d {
  background: var(--elev-2-bg);
  border: var(--elev-2-border);
  box-shadow: var(--elev-2-shadow);
  border-radius: var(--radius-lg);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease;
}

/* Top-edge light strip */
.card-3d::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    var(--light-top) 0%,
    transparent 40%
  );
  pointer-events: none;
  z-index: 1;
}

/* Hover: lift and tilt */
.card-3d:hover {
  transform: translateY(-6px) rotateX(2deg) rotateY(-1deg);
  box-shadow: var(--elev-3-shadow);
}
```

### Mouse-Tracked 3D Tilt (JavaScript)

```javascript
// Apply to any element with data-tilt attribute
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);  // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);  // -1 to 1
    const maxTilt = 8; // degrees
    card.style.transform =
      `perspective(1000px) rotateX(${-dy * maxTilt}deg) rotateY(${dx * maxTilt}deg) translateZ(12px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  });
});
```

---

## 7. Component Library

---

### 7.1 Buttons

```css
/* ── Base Button ───────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: var(--weight-medium);
  font-size: var(--text-base);
  letter-spacing: var(--tracking-normal);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  -webkit-font-smoothing: antialiased;
}

/* Top-edge gloss on all buttons */
.btn::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

/* ── Primary ───────────────────────────────────── */
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-deep));
  color: #fff;
  box-shadow: 0 4px 20px var(--shadow-accent),
              0 1px 3px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.15);
}
.btn-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 32px var(--shadow-accent),
              0 2px 8px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(255,255,255,0.2);
}
.btn-primary:active {
  transform: translateY(1px) scale(0.99);
  box-shadow: 0 2px 8px var(--shadow-accent);
}

/* ── Secondary (Glass) ─────────────────────────── */
.btn-secondary {
  background: var(--glass-secondary);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3),
              inset 0 1px 0 var(--light-top);
}
.btn-secondary:hover {
  background: var(--glass-hover);
  border-color: var(--glass-border-lit);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.15);
}

/* ── Ghost ─────────────────────────────────────── */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--glass-primary);
  border-color: var(--glass-border);
}

/* ── Danger ─────────────────────────────────────── */
.btn-danger {
  background: linear-gradient(135deg, var(--color-danger), #cc3050);
  color: #fff;
  box-shadow: 0 4px 20px var(--shadow-danger);
}
.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--shadow-danger);
}

/* ── Sizes ─────────────────────────────────────── */
.btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-sm); }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: var(--text-md); }
.btn-icon { padding: var(--space-3); aspect-ratio: 1; }
```

---

### 7.2 Cards

```css
/* ── Base 3D Card ──────────────────────────────── */
.card {
  background: var(--elev-2-bg);
  border: var(--elev-2-border);
  box-shadow: var(--elev-2-shadow);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  position: relative;
  overflow: hidden;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.35s ease;
}

/* Light-leak from top-left corner */
.card::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 60%; height: 1px;
  background: linear-gradient(90deg, var(--light-top), transparent);
  border-radius: var(--radius-lg) 0 0 0;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--elev-3-shadow);
}

/* ── Glass Card ────────────────────────────────── */
.card-glass {
  background: var(--glass-primary);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--elev-3-shadow);
}
.card-glass:hover {
  background: var(--glass-secondary);
  border-color: var(--glass-border-lit);
}

/* ── Accent Card (score highlight, featured) ───── */
.card-accent {
  background: var(--accent-subtle);
  border: 1px solid rgba(108, 99, 255, 0.30);
  box-shadow: 0 8px 32px var(--shadow-accent),
              0 0 0 1px rgba(108,99,255,0.15);
}

/* ── Stat Card ─────────────────────────────────── */
.card-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6);
}
.card-stat__value {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  line-height: var(--leading-tight);
}
.card-stat__label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}
```

---

### 7.3 Form Elements

```css
/* ── Label ─────────────────────────────────────── */
.form-label {
  display: block;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  margin-bottom: var(--space-2);
}

/* ── Input / Textarea ──────────────────────────── */
.form-input,
.form-textarea {
  width: 100%;
  background: var(--elev-1-bg);
  border: var(--elev-1-border);
  box-shadow: var(--elev-1-shadow);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);
  transition: border-color 0.2s ease,
              box-shadow 0.2s ease;
  outline: none;
}
.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-tertiary);
}
.form-input:focus,
.form-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: var(--elev-1-shadow),
              0 0 0 3px var(--accent-subtle-md),
              0 0 20px var(--accent-subtle);
}

/* ── Select ─────────────────────────────────────── */
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239898b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
  padding-right: var(--space-10);
  cursor: pointer;
}

/* ── Helper Text ───────────────────────────────── */
.form-helper { font-size: var(--text-sm); color: var(--text-tertiary); margin-top: var(--space-2); }
.form-error  { font-size: var(--text-sm); color: var(--color-danger);   margin-top: var(--space-2); }
```

---

### 7.4 Keyword Chips

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}
.chip:hover { transform: translateY(-1px) scale(1.04); }

/* Found keyword — green */
.chip-success {
  color: var(--color-success);
  background: var(--color-success-bg);
  border-color: rgba(0, 217, 163, 0.25);
  box-shadow: 0 0 12px var(--shadow-success);
}

/* Missing keyword — red */
.chip-danger {
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-color: rgba(255, 95, 126, 0.25);
  box-shadow: 0 0 12px var(--shadow-danger);
}

/* Neutral */
.chip-neutral {
  color: var(--text-secondary);
  background: var(--glass-primary);
  border-color: var(--glass-border);
}

/* Accent */
.chip-accent {
  color: var(--accent-glow);
  background: var(--accent-subtle);
  border-color: rgba(108, 99, 255, 0.25);
}
```

---

### 7.5 ATS Score Dial

The score is displayed as a 3D circular gauge — the product's signature UI moment.

```css
.score-dial {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-dial__svg {
  position: absolute;
  inset: 0;
  transform: rotateX(20deg);           /* 3D tilt effect */
  filter: drop-shadow(0 8px 20px var(--shadow-accent));
}

.score-dial__track {
  fill: none;
  stroke: var(--color-depth-3);
  stroke-width: 8;
}

.score-dial__fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              stroke 0.6s ease;
  /* stroke-dasharray and stroke-dashoffset set via JS based on score */
}

/* Colour the arc by score band */
.score-dial--low    .score-dial__fill { stroke: var(--score-low); }
.score-dial--mid    .score-dial__fill { stroke: var(--score-mid); }
.score-dial--high   .score-dial__fill { stroke: var(--score-high); }

.score-dial__value {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  line-height: 1;
  position: relative;
  z-index: 1;
}

.score-dial__label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  margin-top: var(--space-1);
  text-align: center;
}
```

---

### 7.6 Navigation

```css
/* ── Sidebar Nav ───────────────────────────────── */
.sidebar {
  width: 240px;
  background: var(--color-depth-1);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-4);
  gap: var(--space-2);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  text-decoration: none;
  border: 1px solid transparent;
}
.nav-item:hover {
  color: var(--text-primary);
  background: var(--glass-primary);
  border-color: var(--glass-border);
  transform: translateX(2px);
}
.nav-item.active {
  color: var(--accent-glow);
  background: var(--accent-subtle);
  border-color: rgba(108, 99, 255, 0.20);
  box-shadow: inset 3px 0 0 var(--accent-primary),
              0 0 20px var(--accent-subtle);
}

/* ── Top Bar ────────────────────────────────────── */
.topbar {
  height: 60px;
  background: rgba(12, 12, 20, 0.80);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
```

---

### 7.7 Modal

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 8, 0.80);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--color-depth-3);
  border: 1px solid var(--glass-border-lit);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  width: min(560px, calc(100vw - var(--space-8)));
  box-shadow: var(--elev-4-shadow);
  position: relative;
  animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}

/* Top-edge gloss */
.modal::before {
  content: '';
  position: absolute;
  top: 0; left: var(--space-8); right: var(--space-8);
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--glass-border-lit), transparent);
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

### 7.8 Toast Notifications

```css
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  z-index: 2000;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-depth-3);
  border: 1px solid var(--glass-border-lit);
  box-shadow: var(--elev-4-shadow);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-width: 280px;
  backdrop-filter: blur(20px);
  animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-success { border-left: 3px solid var(--color-success); box-shadow: var(--elev-4-shadow), -4px 0 20px var(--shadow-success); }
.toast-danger  { border-left: 3px solid var(--color-danger);  box-shadow: var(--elev-4-shadow), -4px 0 20px var(--shadow-danger); }
.toast-info    { border-left: 3px solid var(--accent-primary); box-shadow: var(--elev-4-shadow), -4px 0 20px var(--shadow-accent); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(48px) scale(0.92); }
  to   { opacity: 1; transform: translateX(0)    scale(1); }
}
```

---

### 7.9 Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
}
.badge-success { color: var(--color-success); background: var(--color-success-bg); }
.badge-danger  { color: var(--color-danger);  background: var(--color-danger-bg);  }
.badge-warning { color: var(--color-warning); background: var(--color-warning-bg); }
.badge-accent  { color: var(--accent-glow);   background: var(--accent-subtle);    }
.badge-neutral { color: var(--text-secondary);background: var(--glass-primary);    }
```

---

## 8. Layout System

```css
/* ── Page Shell ────────────────────────────────── */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr;
  min-height: 100vh;
  background: var(--color-void);
}
.app-shell__topbar  { grid-column: 1 / -1; }
.app-shell__sidebar { grid-row: 2; }
.app-shell__main    { grid-row: 2; padding: var(--space-8); overflow-y: auto; }

/* ── Editor Layout (two-panel) ─────────────────── */
.editor-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: var(--space-6);
  height: calc(100vh - 60px);
}
.editor-layout__form    { overflow-y: auto; padding-right: var(--space-2); }
.editor-layout__preview { position: sticky; top: 0; height: 100%; overflow: hidden; }

/* ── Dashboard Grid ────────────────────────────── */
.resume-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
}

/* ── Analyze Layout ────────────────────────────── */
.analyze-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  align-items: start;
}

/* ── Container ─────────────────────────────────── */
.container      { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-6); }
.container-sm   { max-width: 720px;  margin: 0 auto; padding: 0 var(--space-6); }
.container-wide { max-width: 1440px; margin: 0 auto; padding: 0 var(--space-8); }
```

---

## 9. Motion & Animation

```css
:root {
  /* ── Durations ─────────────────────────────────── */
  --duration-instant:  80ms;
  --duration-fast:    150ms;
  --duration-normal:  250ms;
  --duration-slow:    400ms;
  --duration-slower:  600ms;
  --duration-scene:  1000ms;

  /* ── Easings ───────────────────────────────────── */
  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter:      cubic-bezier(0, 0, 0.2, 1);
  --ease-exit:       cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot for 3D lifts */
  --ease-bouncy:     cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

/* ── Page Enter Animation ──────────────────────── */
.page-enter {
  animation: pageEnter var(--duration-slow) var(--ease-enter) both;
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stagger children ──────────────────────────── */
.stagger > * { animation: pageEnter var(--duration-slow) var(--ease-enter) both; }
.stagger > *:nth-child(1) { animation-delay: 0ms; }
.stagger > *:nth-child(2) { animation-delay: 60ms; }
.stagger > *:nth-child(3) { animation-delay: 120ms; }
.stagger > *:nth-child(4) { animation-delay: 180ms; }
.stagger > *:nth-child(5) { animation-delay: 240ms; }

/* ── Pulse glow (loading, processing) ─────────── */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px var(--shadow-accent); }
  50%       { box-shadow: 0 0 48px var(--shadow-accent), 0 0 80px var(--accent-subtle); }
}
.pulsing { animation: pulseGlow 2s ease-in-out infinite; }

/* ── Skeleton loading ──────────────────────────── */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-depth-2) 25%,
    var(--color-depth-3) 50%,
    var(--color-depth-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

---

## 10. Background & Atmosphere

The page background is not a flat color — it has an ambient depth field.

```css
body {
  background-color: var(--color-void);
  background-image:
    radial-gradient(ellipse 80% 50% at 20% -10%, rgba(108, 99, 255, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0, 217, 163, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse 100% 100% at 50% 50%, rgba(12, 12, 20, 0.9) 0%, var(--color-void) 100%);
  min-height: 100vh;
}

/* Optional noise texture overlay for depth */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
}
```

---

## 11. Accessibility

- **Focus rings:** all interactive elements must show a visible 3px focus ring using `outline: 3px solid var(--accent-primary); outline-offset: 3px;`
- **Minimum contrast:** `--text-primary` on `--color-depth-2` = 11.3:1. `--text-secondary` on `--color-depth-2` = 5.2:1 (meets WCAG AA).
- **Reduce motion:** respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .card-3d:hover,
  .btn:hover {
    transform: none !important;
  }
}
```

- **Keyboard navigation:** all 3D tilt effects driven by mouse must have no keyboard equivalent (cosmetic only). Keyboard navigation relies on focus styles, not transform feedback.
- **Screen readers:** all icon-only buttons must carry `aria-label`. Keyword chips carry `role="status"` once updated after analysis.
- **Color alone:** never use color as the only differentiator. Found/missing keywords use color + label text + icon.

---

## 12. Responsive Breakpoints

```css
/* ── Breakpoint Tokens ─────────────────────────── */
/* sm:  640px  — large phones                       */
/* md:  768px  — tablets                            */
/* lg:  1024px — small desktops                     */
/* xl:  1280px — standard desktops                  */
/* 2xl: 1536px — large monitors                     */

@media (max-width: 1024px) {
  .app-shell         { grid-template-columns: 1fr; }
  .app-shell__sidebar { display: none; }  /* collapses to hamburger menu */
  .editor-layout     { grid-template-columns: 1fr; }
  .editor-layout__preview { display: none; } /* hidden on mobile; PDF export still available */
  .analyze-layout    { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .resume-grid { grid-template-columns: 1fr; }
  .modal       { padding: var(--space-6); }
  .topbar      { padding: 0 var(--space-4); }
}
```

---

## 13. Z-Index Scale

```css
:root {
  --z-base:     0;
  --z-raised:   10;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  500;
  --z-modal:    1000;
  --z-toast:    2000;
  --z-tooltip:  3000;
}
```

---

## 14. Design Tokens — Quick Reference

| Token | Value | Usage |
|---|---|---|
| `--accent-primary` | `#6c63ff` | CTAs, active states, focus rings |
| `--color-success` | `#00d9a3` | Found keywords, high score |
| `--color-danger` | `#ff5f7e` | Missing keywords, errors |
| `--color-warning` | `#ffb347` | Low-confidence suggestions |
| `--font-display` | Syne | All headings |
| `--font-body` | DM Sans | All body copy, forms |
| `--font-mono` | JetBrains Mono | Scores, keywords, code |
| `--radius-lg` | `18px` | Standard card radius |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | All 3D lift/hover animations |
| `--duration-normal` | `250ms` | Standard transitions |

---

*AI-Powered Resume Builder · FRONTEND_GUIDELINES.md v1.0 · Confidential*
