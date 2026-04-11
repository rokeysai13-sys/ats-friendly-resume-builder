#!/usr/bin/env python3
"""
🔐 Secure User Password Reset Utility

This script allows resetting a user's password using the proper bcrypt hashing method.
Works for development, testing, and emergency scenarios.

Usage:
    python reset_user_password.py <email> [new_password]

If new_password is omitted, a secure random password will be generated.
"""

import sys
import secrets
import string
from app import create_app
from app.extensions import db, bcrypt
from app.auth.models import User


def generate_secure_password(length: int = 16) -> str:
    """Generate a cryptographically secure random password."""
    characters = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(characters) for _ in range(length))


def reset_password(email: str, new_password: str | None = None) -> bool:
    """
    Reset a user's password with proper bcrypt hashing.
    
    Args:
        email: User email address
        new_password: If None, generates a secure random password
        
    Returns:
        True if successful, False if user not found
    """
    app = create_app('development')
    
    with app.app_context():
        # Find user by email
        user = User.query.filter_by(email=email.lower().strip()).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        # Generate or use provided password
        if new_password is None:
            new_password = generate_secure_password()
            print(f"🔑 Generated secure password: {new_password}")
        
        # Hash with bcrypt (rounds=12, same as register flow)
        password_hash = bcrypt.generate_password_hash(new_password, rounds=12).decode('utf-8')
        
        # Update user
        user.password_hash = password_hash
        user.email_verified = True  # Ensure email is verified
        
        db.session.commit()
        
        print(f"✅ Password reset successfully for: {user.email}")
        print(f"   Name: {user.name}")
        print(f"   New Password: {new_password}")
        print(f"   Email Verified: {user.email_verified}")
        
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExample:")
        print("  python reset_user_password.py rokeysai13@gmail.com MyNewPassword123!")
        print("  python reset_user_password.py rokeysai13@gmail.com  # Auto-generates secure password")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = reset_password(email, password)
    sys.exit(0 if success else 1)
