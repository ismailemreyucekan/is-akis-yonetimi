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


def get_current_user():
    """Mevcut oturumdaki kullanıcıyı döndür."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)
