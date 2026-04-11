#!/usr/bin/env python3
"""
⚠️  DEVELOPMENT-ONLY DATABASE SEEDING SCRIPT ⚠️

🚫 DO NOT RUN IN PRODUCTION 🚫

This script is exclusively for LOCAL DEVELOPMENT and testing purposes.
It creates demo users and placeholder data for development environments only.

In production, all users are created via the /register endpoint.
No automatic user creation occurs on app startup.

Prerequisites:
  $ flask db upgrade   (Initializes schema via Flask-Migrate)
"""

import os
from app import create_app
from app.extensions import db, bcrypt
from app.auth.models import User
from app.resume.models import Resume, Template

def seed_database():
    """
    Seed the database with demo data for LOCAL DEVELOPMENT ONLY.
    
    This function:
    ✓ Creates a demo user (rokeysai13@gmail.com)
    ✓ Creates a classic resume template
    ✓ Creates a sample resume
    
    ⚠️  For production: Only users created via /register are permitted.
    ⚠️  No automatic user creation on app startup.
    """
    # Force use of development config
    app = create_app('development')
    with app.app_context():
        demo_email = 'rokeysai13@gmail.com'
        default_password = 'Sai@12345'

        # ✅ NO db.create_all() — Schema is managed via Flask-Migrate
        print("✓ Database schema should already be initialized via 'flask db upgrade'")
        print("✓ If not, run: flask db upgrade")

        # 1. Create a dummy User if not exists
        user = User.query.filter_by(email=demo_email).first()
        if not user:
            password_hash = bcrypt.generate_password_hash(default_password, rounds=12).decode('utf-8')
            user = User(
                name='Demo User',
                email=demo_email,
                password_hash=password_hash,
                email_verified=True,
            )
            db.session.add(user)
            db.session.flush() # To get user.id
            print(f"✓ Created User: {user.email} with password {default_password}")
        else:
            user.password_hash = bcrypt.generate_password_hash(default_password, rounds=12).decode('utf-8')
            print(f"✓ Updated User {user.email} with password {default_password}")
            user.email_verified = True

        # 2. Create a dummy Template if not exists
        template = Template.query.filter_by(name='Classic').first()
        if not template:
            template = Template(
                name='Classic',
                html_path='templates/classic.html',
                css_path='static/css/classic.css',
                ats_safe=True
            )
            db.session.add(template)
            db.session.flush()
            print(f"✓ Created Template: {template.name}")
        else:
            print(f"✓ Template {template.name} already exists.")

        # 3. Create the demo resume for this user if not exists
        resume = Resume.query.filter_by(user_id=user.id).first()
        if not resume:
            resume = Resume(
                user_id=user.id,
                template_id=template.id,
                title='Primary Resume',
                personal_name='Demo User',
                personal_email=demo_email,
                personal_phone='(555) 123-4567',
                personal_location='San Francisco, CA',
                personal_linkedin='linkedin.com/in/demo-user',
                summary='Senior Python Developer with 5+ years of experience in AI and Cloud infrastructure.'
            )
            db.session.add(resume)
            print("✓ Created demo resume for seeded user")
        else:
            print("✓ Demo resume already exists for seeded user.")
            # Optionally update it to ensure it has seed data
            resume.personal_name = 'Demo User'
            resume.personal_email = demo_email
            print("✓ Updated demo resume seed data.")

        db.session.commit()
        print("✓ Database seeded successfully!")
        print("\nNext steps:")
        print("  1. Run: python seed.py    (to seed with demo data)")
        print("  2. Run: flask run          (to start the development server)")

if __name__ == '__main__':
    seed_database()
