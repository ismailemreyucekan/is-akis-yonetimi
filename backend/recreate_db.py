import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

app = create_app()

with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Done! Now run 'npm run db:migrate' and 'npm run db:upgrade'.")
