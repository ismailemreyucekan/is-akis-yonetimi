import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User

app = create_app()

with app.app_context():
    print("--- USERS TABLE ---")
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id} | Username: {u.username} | Email: {u.email} | Role: {u.role} | Name: {u.full_name}")
