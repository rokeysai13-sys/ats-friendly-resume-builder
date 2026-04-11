# Rate Limiting Implementation Guide

## Overview
This document outlines the rate limiting configuration added to protect the Gemini API and backend from abuse.

---

## 1. Installation & Initialization

### ✅ Requirements Updated
- **Added**: `Flask-Limiter==3.5.0` to `requirements.txt`

### ✅ Extensions Initialized (app/extensions.py)
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60 per minute"],
    storage_uri="memory://"
)
```

**Key Details:**
- Uses `get_remote_address` strategy to identify clients by IP address
- Default global limit: **60 requests per minute**
- Storage: **memory://** (lightweight, no Redis required; can upgrade to `redis://` for distributed systems)

### ✅ App Initialization (app/__init__.py)
```python
from .extensions import db, migrate, bcrypt, celery, login_manager, limiter

def create_app(env: str | None = None) -> Flask:
    # ... existing code ...
    limiter.init_app(app)
    
    @app.errorhandler(429)
    def ratelimit_handler(e):
        """Handle rate limit errors (HTTP 429)."""
        if request.path.startswith("/api/"):
            return jsonify({
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please wait a moment."
            }), 429
        return render_template("auth/login.html", ..., error_message="Too many requests. Please try again later."), 429
```

---

## 2. Rate Limiting Applied

### ✅ Authentication Routes (app/auth/routes.py)

#### Login Endpoint
```python
@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute")
def login():
    """Limit login attempts to 5 per minute to prevent brute-force attacks."""
    # ... existing code ...
```

#### Register Endpoint
```python
@auth_bp.post("/register")
@limiter.limit("5 per minute")
def register():
    """Limit registration attempts to 5 per minute to prevent spam."""
    # ... existing code ...
```

**Rationale:** Prevents brute-force password attacks and account enumeration.

---

### ✅ API Routes (app/api/routes.py)

#### ATS Analysis Endpoint
```python
@api_bp.route("/resumes/<int:id>/ats-analyze", methods=["POST"])
@login_required
@limiter.limit("3 per minute")
def ats_analyze(id: int) -> Any:
    """Analyze resume against job description.
    Limited to 3 requests per minute due to high Gemini API costs.
    """
    # ... existing code ...
```

#### AI Optimize Bullet Endpoint
```python
@api_bp.route("/ai/optimize-bullet", methods=["POST"])
@login_required
@limiter.limit("3 per minute")
def ai_optimize_bullet() -> Any:
    """Rewrite sentence into STAR-style bullet.
    Limited to 3 requests per minute due to Gemini API costs.
    """
    # ... existing code ...
```

**Rationale:** Gemini API calls are expensive; 3 requests per minute per user = ~144 calls/day per user, manageable within typical API quotas.

---

## 3. Error Handling

### ✅ Backend Error Response (HTTP 429)
Returns clean JSON error:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please wait a moment."
}
```

Status Code: **429 Too Many Requests**

---

## 4. Frontend UI (editor.js)

### ✅ Glassmorphism Toast Notification

Added global toast system that displays when rate limit is hit (429 error):

```javascript
/**
 * Show a glassmorphism-styled toast notification for rate limiting.
 */
function showRateLimitToast(message = "Too many requests. Please wait a moment.", duration = 4000) {
    // Creates a frosted glass effect with:
    // - Backdrop blur filter
    // - Semi-transparent white background (rgba(255, 255, 255, 0.15))
    // - Subtle border and shadow
    // - Slide-in/slide-out animations
}
```

### ✅ Updated apiRequest Function
```javascript
async function apiRequest(url, options = {}) {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
        // ... existing auth handling ...
    }

    if (response.status === 429) {
        // NEW: Show glassmorphism toast
        showRateLimitToast("Whoa! Slow down, the AI is catching its breath.");
    }

    return response;
}
```

### Toast Features:
- **Position:** Top-right corner (fixed positioning)
- **Style:** Glassmorphism (frosted glass effect)
  - Blur backdrop filter (10px)
  - Semi-transparent background (rgba(255, 255, 255, 0.15))
  - 1px border with opacity
  - Rounded corners (12px)
  - Box shadow with depth
- **Animation:** Smooth slide-in (300ms) and slide-out (300ms)
- **Duration:** 4 seconds (auto-dismiss)
- **Message:** "Whoa! Slow down, the AI is catching its breath."

---

## 5. Rate Limit Summary Table

| Endpoint | Method | Limit | Purpose |
|----------|--------|-------|---------|
| `/api/v1/auth/login` | POST | 5/min | Prevent brute-force |
| `/api/v1/auth/register` | POST | 5/min | Prevent spam |
| `/api/v1/resumes/<id>/ats-analyze` | POST | 3/min | Protect Gemini costs |
| `/api/v1/ai/optimize-bullet` | POST | 3/min | Protect Gemini costs |
| All other `/api/v1/*` | ANY | 60/min | Default global limit |

---

## 6. Storage Options

### Current: Memory Storage
```python
storage_uri="memory://"
```
- ✅ Works out-of-the-box
- ✅ No external dependencies
- ❌ Per-process only (doesn't work across multiple workers)

### Future: Redis Storage (Production Ready)
To upgrade for multi-worker environments:
```python
storage_uri="redis://localhost:6379/1"  # Use Redis DB 1
```

---

## 7. Testing Rate Limiting

### Manual Test: Rapid Login Attempts
```bash
# First attempt - succeeds
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' 

# Repeat 5 times rapidly...
# On 6th attempt within 60 seconds → HTTP 429
```

### Expected Response (429):
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please wait a moment."
}
```

### Frontend: Toast appears with message
"Whoa! Slow down, the AI is catching its breath."

---

## 8. Configuration in Flask

### Per-Route Customization
```python
@app.route("/expensive-endpoint", methods=["POST"])
@limiter.limit("1 per minute")  # Very strict
def expensive_operation():
    pass

@app.route("/normal-endpoint", methods=["POST"])
@limiter.limit("30 per minute")  # Normal
def normal_operation():
    pass
```

### Dynamic Limits (Advanced)
```python
from flask_limiter.util import get_remote_address

def get_limit():
    # Can vary by user, role, IP, etc.
    if is_admin():
        return "100 per minute"
    return "10 per minute"

@app.route("/api/endpoint", methods=["POST"])
@limiter.limit(get_limit)
def endpoint():
    pass
```

---

## 9. Monitoring & Analytics

### Track Rate Limit Hits
Add logging to the error handler:
```python
@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning(f"Rate limit exceeded: {request.remote_addr} -> {request.path}")
    # ... return error ...
```

### Check Current Usage (In-Memory)
```python
from flask_limiter import LIMITER

# Get limiter state (memory storage only)
limiter.storage.get_key(key)
```

---

## 10. Production Considerations

### ✅ Implemented
- Clean JSON error responses
- User-friendly frontend notifications
- Appropriate rate limits per endpoint
- Global fallback limit (60/min)

### 🔄 Future Enhancements
1. **Redis Backend:** Switch to Redis for distributed rate limiting
2. **Per-User Limits:** Different limits for free vs premium users
3. **Whitelist IPs:** Skip rate limiting for internal services
4. **Monitoring Dashboard:** Track rate limit hits by endpoint
5. **Graceful Upgrade:** Implement retry-after headers
6. **Analytics:** Log rate limit events for cost optimization

---

## 11. Dependencies

### Required
```
Flask-Limiter==3.5.0
```

### Optional
```
redis>=4.0.0  # For production distributed rate limiting
```

---

## 12. Quick Reference: File Changes

### Modified Files
1. ✅ `requirements.txt` - Added Flask-Limiter
2. ✅ `app/extensions.py` - Initialized Limiter
3. ✅ `app/__init__.py` - Initialized limiter with app + error handler
4. ✅ `app/auth/routes.py` - Added @limiter.limit decorators
5. ✅ `app/api/routes.py` - Added @limiter.limit decorators
6. ✅ `app/static/js/editor.js` - Added glassmorphism toast + 429 handling

### New Functions
- `showRateLimitToast()` - Glassmorphism toast in editor.js

---

## Conclusion

Your application is now protected from API abuse with:
- **5 attempts/min** for authentication (brute-force protection)
- **3 requests/min** for expensive AI operations (cost control)
- **Beautiful glassmorphism toast** notifications for rate limit feedback
- **Production-ready error responses** with proper HTTP status codes

The implementation is backward-compatible and can be upgraded to Redis for multi-worker deployments without code changes.
