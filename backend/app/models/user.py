from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class User(db.Model):
    """Kullanıcı modeli."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='employee')
    # Roller: admin, manager, employee
    department = db.Column(db.String(100), nullable=True)
    position = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    assigned_tasks = db.relationship('Task', backref='assignee', lazy='dynamic',
                                     foreign_keys='Task.assigned_to')
    created_tasks = db.relationship('Task', backref='creator', lazy='dynamic',
                                    foreign_keys='Task.created_by')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')

    def set_password(self, password):
        """Şifreyi hashle ve kaydet."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Şifre doğrulama."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Kullanıcıyı sözlük olarak döndür."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'department': self.department,
            'position': self.position,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.username}>'
