import os
from app import create_app

# Set the environment to production by default for Vercel
# You can also set this in your Vercel project settings
os.environ.setdefault("FLASK_ENV", "production")

app = create_app()

if __name__ == "__main__":
    app.run()
