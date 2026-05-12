from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.notification import Notification
from app.models.reminder_config import ReminderConfig
from app.utils import get_current_user, manager_or_admin_required

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Kullanıcının bildirimlerini listele."""
    user_id = get_jwt_identity()
    category = request.args.get('category')  # general, task, meeting, risk, system

    query = Notification.query.filter_by(user_id=user_id)

    if category:
        query = query.filter(Notification.category == category)

    notifications = query.order_by(Notification.created_at.desc())\
        .limit(50)\
        .all()

    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    # Kategori bazlı okunmamış sayıları
    unread_by_category = {}
    for cat in ['general', 'task', 'meeting', 'risk', 'system']:
        unread_by_category[cat] = Notification.query.filter_by(
            user_id=user_id, is_read=False, category=cat
        ).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count,
        'unread_by_category': unread_by_category
    }), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_required()
def mark_as_read(notification_id):
    """Bildirimi okundu olarak işaretle."""
    user_id = get_jwt_identity()
    notification = Notification.query.get_or_404(notification_id)

    if notification.user_id != int(user_id):
        return jsonify({'error': 'Yetkisiz erişim.'}), 403

    notification.is_read = True
    db.session.commit()

    return jsonify({'message': 'Bildirim okundu olarak işaretlendi.'}), 200


@notifications_bp.route('/read-all', methods=['PATCH'])
@jwt_required()
def mark_all_as_read():
    """Tüm bildirimleri okundu olarak işaretle."""
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False)\
        .update({'is_read': True})
    db.session.commit()

    return jsonify({'message': 'Tüm bildirimler okundu olarak işaretlendi.'}), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Bildirimi sil."""
    user_id = get_jwt_identity()
    notification = Notification.query.get_or_404(notification_id)

    if notification.user_id != int(user_id):
        return jsonify({'error': 'Yetkisiz erişim.'}), 403

    db.session.delete(notification)
    db.session.commit()

    return jsonify({'message': 'Bildirim silindi.'}), 200


@notifications_bp.route('/clear-read', methods=['DELETE'])
@jwt_required()
def clear_read_notifications():
    """Tüm okunmuş bildirimleri sil."""
    user_id = get_jwt_identity()
    deleted = Notification.query.filter_by(user_id=user_id, is_read=True).delete()
    db.session.commit()

    return jsonify({'message': f'{deleted} okunmuş bildirim silindi.'}), 200


# ========================
# HATIRLATICI YAPILANDIRMA
# ========================

@notifications_bp.route('/config', methods=['GET'])
@jwt_required()
def get_reminder_config():
    """Kullanıcının hatırlatıcı ayarlarını getir."""
    user = get_current_user()

    configs = ReminderConfig.query.filter_by(user_id=user.id).all()

    # Varsayılanlar yoksa oluştur
    if not configs:
        default_types = [
            ('deadline', 1440),   # 1 gün önce
            ('meeting', 60),      # 1 saat önce
            ('overdue', 0),       # Anlık
        ]
        for rtype, timing in default_types:
            config = ReminderConfig(
                user_id=user.id,
                reminder_type=rtype,
                timing_minutes=timing,
                is_active=True,
                created_by=user.id
            )
            db.session.add(config)
        db.session.commit()
        configs = ReminderConfig.query.filter_by(user_id=user.id).all()

    return jsonify({
        'configs': [c.to_dict() for c in configs]
    }), 200


@notifications_bp.route('/config', methods=['PUT'])
@jwt_required()
def update_reminder_config():
    """Hatırlatıcı ayarlarını güncelle."""
    user = get_current_user()
    data = request.get_json()

    configs = data.get('configs', [])

    for cfg in configs:
        existing = ReminderConfig.query.filter_by(
            user_id=user.id,
            reminder_type=cfg['reminder_type']
        ).first()

        if existing:
            existing.timing_minutes = cfg.get('timing_minutes', existing.timing_minutes)
            existing.is_active = cfg.get('is_active', existing.is_active)
        else:
            new_config = ReminderConfig(
                user_id=user.id,
                reminder_type=cfg['reminder_type'],
                timing_minutes=cfg.get('timing_minutes', 1440),
                is_active=cfg.get('is_active', True),
                created_by=user.id
            )
            db.session.add(new_config)

    db.session.commit()

    updated = ReminderConfig.query.filter_by(user_id=user.id).all()
    return jsonify({
        'message': 'Hatırlatıcı ayarları güncellendi.',
        'configs': [c.to_dict() for c in updated]
    }), 200


# ========================
# OTOMATİK HATIRLATICI
# ========================

@notifications_bp.route('/check-reminders', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def trigger_reminder_check():
    """Hatırlatıcı kontrolünü manuel tetikle (admin/manager)."""
    from app.utils.reminder_engine import run_all_reminder_checks
    results = run_all_reminder_checks()

    return jsonify({
        'message': 'Hatırlatıcı kontrolü tamamlandı.',
        'results': results
    }), 200
