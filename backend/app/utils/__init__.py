from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from app.models.user import User


def admin_required(fn):
    """Admin yetkisi gerektiren endpoint'ler için decorator."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Bu işlem için admin yetkisi gereklidir.'}), 403
        return fn(*args, **kwargs)
    return wrapper


def manager_required(fn):
    """Manager yetkisi gerektiren endpoint'ler için decorator."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role != 'manager':
            return jsonify({'error': 'Bu işlem için yönetici yetkisi gereklidir.'}), 403
        return fn(*args, **kwargs)
    return wrapper


def manager_or_admin_required(fn):
    """Manager veya admin yetkisi gerektiren endpoint'ler için decorator."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ('admin', 'manager'):
            return jsonify({'error': 'Bu işlem için yönetici veya admin yetkisi gereklidir.'}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """Mevcut oturumdaki kullanıcıyı döndür."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def create_activity_log(task, user, action, old_value=None, new_value=None, message=None):
    """Görev için aktivite logu oluştur."""
    from app import db
    from app.models.activity_log import ActivityLog

    log = ActivityLog(
        task_id=task.id,
        user_id=user.id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        message=message
    )
    db.session.add(log)
    return log


def create_notification(user_id, title, message, notif_type='info',
                        task_id=None, workflow_id=None, project_id=None):
    """Bildirim oluştur."""
    from app import db
    from app.models.notification import Notification

    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        related_task_id=task_id,
        related_workflow_id=workflow_id,
        related_project_id=project_id
    )
    db.session.add(notif)
    return notif
