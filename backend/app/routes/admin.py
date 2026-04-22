from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from app import db
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.activity_log import ActivityLog
from app.models.notification import Notification
from app.utils import admin_required, get_current_user

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@admin_required
def get_stats():
    """Genel sistem istatistikleri."""
    total_users = User.query.filter_by(is_active=True).count()
    total_projects = Project.query.count()
    active_projects = Project.query.filter_by(status='active').count()
    total_tasks = Task.query.count()
    completed_tasks = Task.query.filter_by(status='done').count()
    pending_tasks = Task.query.filter(Task.status != 'done').count()

    # Rol dağılımı
    role_counts = db.session.query(
        User.role, func.count(User.id)
    ).filter_by(is_active=True).group_by(User.role).all()
    roles = {role: count for role, count in role_counts}

    return jsonify({
        'stats': {
            'total_users': total_users,
            'total_projects': total_projects,
            'active_projects': active_projects,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'roles': roles
        }
    }), 200


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """Tüm kullanıcıları listele (arama + filtreleme)."""
    search = request.args.get('search', '')
    role_filter = request.args.get('role', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = User.query

    if search:
        search_term = f'%{search}%'
        query = query.filter(
            (User.full_name.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.username.ilike(search_term))
        )

    if role_filter:
        query = query.filter(User.role == role_filter)

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Kullanıcı bilgilerini güncelle (admin)."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        # E-posta benzersizlik kontrolü
        existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
        if existing:
            return jsonify({'error': 'Bu e-posta adresi zaten kullanılıyor.'}), 409
        user.email = data['email']
    if 'role' in data:
        if data['role'] not in ('admin', 'manager', 'employee'):
            return jsonify({'error': 'Geçersiz rol.'}), 400
        user.role = data['role']
    if 'department' in data:
        user.department = data['department']
    if 'position' in data:
        user.position = data['position']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()

    return jsonify({
        'message': 'Kullanıcı güncellendi.',
        'user': user.to_dict()
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def deactivate_user(user_id):
    """Kullanıcıyı pasife al (silmez, deaktif eder)."""
    current = get_current_user()
    if current.id == user_id:
        return jsonify({'error': 'Kendinizi pasife alamazsınız.'}), 400

    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()

    return jsonify({'message': f'{user.full_name} pasife alındı.'}), 200


@admin_bp.route('/activity', methods=['GET'])
@jwt_required()
@admin_required
def get_recent_activity():
    """Son aktivite logları."""
    limit = request.args.get('limit', 30, type=int)
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

    return jsonify({
        'activity': [log.to_dict() for log in logs]
    }), 200
