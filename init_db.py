import os
from app import create_app
from app.extensions import db
from app.auth.models import User
from app.resume.models import Template

app = create_app('development')

with app.app_context():
    print("Creating all tables...")
    db.create_all()
    
    # Check if a user exists
    user = User.query.filter_by(email='admin@example.com').first()
    if not user:
        print("Creating admin user...")
        from app.extensions import bcrypt
        hashed_password = bcrypt.generate_password_hash('admin123').decode('utf-8')
        admin = User(
            name='Admin User',
            email='admin@example.com',
            password_hash=hashed_password,
            email_verified=True
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin@example.com / admin123")
    else:
        print("Admin user already exists.")

    # Add a default template if none exist
    template = Template.query.first()
    if not template:
        print("Creating default template...")
        t = Template(
            name='Modern Obsidian',
            html_path='templates/modern.html',
            css_path='css/modern.css',
            ats_safe=True
        )
        db.session.add(t)
        db.session.commit()
        print("Default template created.")
    else:
        print("Templates already exist.")

    print("Database initialization complete.")
