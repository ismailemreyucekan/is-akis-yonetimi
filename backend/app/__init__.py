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
    from app.routes.projects import projects_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(workflows_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(admin_bp)

    # Sadece modellerin Alembic tarafından görülmesi için import ediyoruz
    with app.app_context():
        from app.models import (User, Task, Workflow, WorkflowStep,
                                WorkflowInstance, Notification, Project,
                                ProjectMember, ActivityLog)

    return app
