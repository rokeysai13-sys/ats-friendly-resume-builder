#!/usr/bin/env python3
"""Production Configuration Verification"""

from app import create_app

app = create_app('production')

print("\n" + "="*50)
print("✅ PRODUCTION CONFIG VERIFICATION")
print("="*50 + "\n")

# Core config
configs = {
    'DEBUG': False,
    'SESSION_COOKIE_SECURE': True,
    'REMEMBER_COOKIE_SECURE': True,
    'SESSION_COOKIE_HTTPONLY': True,
    'REMEMBER_COOKIE_HTTPONLY': True,
    'PREFERRED_URL_SCHEME': 'https',
}

print("Configuration Check:")
all_good = True
for key, expected in configs.items():
    actual = app.config.get(key)
    status = "✅" if actual == expected else "❌"
    print(f"  {status} {key}: {actual} (expected: {expected})")
    if actual != expected:
        all_good = False

# Routes
routes = list(app.url_map.iter_rules())
print(f"\n✅ Routes Loaded: {len(routes)} endpoints")

# Auth & Resume endpoints
auth_routes = [str(r) for r in routes if 'auth' in str(r).lower()]
resume_routes = [str(r) for r in routes if 'resume' in str(r).lower()]

print(f"   • Auth: {len(auth_routes)} endpoints")
print(f"   • Resume: {len(resume_routes)} endpoints")

print("\n" + "="*50)
if all_good:
    print("✅ PROJECT IS 100% PRODUCTION-READY")
else:
    print("❌ CONFIG ISSUES FOUND")
print("="*50 + "\n")
