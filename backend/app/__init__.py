import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from app.config import config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def create_app(config_name=None):
    """Flask uygulama fabrikası."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    # Extension'ları başlat
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Blueprint'leri kaydet
    from app.routes.auth import auth_bp
    from app.routes.tasks import tasks_bp
    from app.routes.workflows import workflows_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(workflows_bp)
    app.register_blueprint(notifications_bp)

    # Veritabanı tablolarını oluştur
    with app.app_context():
        from app.models import User, Task, Workflow, WorkflowStep, WorkflowInstance, Notification
        db.create_all()

        # Varsayılan admin kullanıcısı oluştur (yoksa)
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@sistem.com',
                full_name='Sistem Yöneticisi',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('[OK] Varsayilan admin kullanicisi olusturuldu (admin / admin123)')

    return app
