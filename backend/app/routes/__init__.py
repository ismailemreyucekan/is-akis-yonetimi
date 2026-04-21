from app.routes.auth import auth_bp
from app.routes.tasks import tasks_bp
from app.routes.workflows import workflows_bp
from app.routes.notifications import notifications_bp

__all__ = ['auth_bp', 'tasks_bp', 'workflows_bp', 'notifications_bp']
