from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.notification import Notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Kullanıcının bildirimlerini listele."""
    user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .limit(50)\
        .all()

    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count
    }), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_required()
def mark_as_read(notification_id):
    """Bildirimi okundu olarak işaretle."""
    user_id = get_jwt_identity()
    notification = Notification.query.get_or_404(notification_id)

    if notification.user_id != user_id:
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
