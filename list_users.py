#!/usr/bin/env python3
"""
📋 List all users in the database
"""

from app import create_app
from app.extensions import db
from app.auth.models import User

app = create_app('development')

with app.app_context():
    users = User.query.all()
    
    if not users:
        print("❌ No users in database")
        print("\n✅ Run one of these to add users:")
        print("   1. python seed.py              (Seed demo data)")
        print("   2. Register via http://localhost:5000/register")
    else:
        print(f"✅ Found {len(users)} user(s):\n")
        for user in users:
            print(f"  📧 {user.email}")
            print(f"     ID: {user.id}")
            print(f"     Name: {user.name}")
            print(f"     Verified: {user.email_verified}")
            print()
