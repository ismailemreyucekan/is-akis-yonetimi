from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.meeting import Meeting, MeetingParticipant
from app.models.notification import Notification
from app.utils import get_current_user, manager_or_admin_required, create_notification

meetings_bp = Blueprint('meetings', __name__, url_prefix='/api/meetings')


@meetings_bp.route('', methods=['GET'])
@jwt_required()
def get_meetings():
    """Toplantıları listele (rol bazlı filtreleme)."""
    user = get_current_user()
    status_filter = request.args.get('status')
    project_id = request.args.get('project_id', type=int)
    upcoming = request.args.get('upcoming', 'false') == 'true'

    query = Meeting.query

    # Rol bazlı erişim
    if user.role == 'admin':
        pass  # tüm toplantılar
    else:
        # Oluşturduğu veya katılımcı olduğu toplantılar
        participant_meeting_ids = db.session.query(MeetingParticipant.meeting_id)\
            .filter(MeetingParticipant.user_id == user.id).subquery()
        query = query.filter(
            (Meeting.created_by == user.id) |
            (Meeting.id.in_(participant_meeting_ids))
        )

    if status_filter:
        query = query.filter(Meeting.status == status_filter)
    if project_id:
        query = query.filter(Meeting.project_id == project_id)
    if upcoming:
        query = query.filter(Meeting.start_time >= datetime.utcnow())

    query = query.order_by(Meeting.start_time.desc())
    meetings = query.limit(100).all()

    return jsonify({
        'meetings': [m.to_dict() for m in meetings]
    }), 200


@meetings_bp.route('', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def create_meeting():
    """Yeni toplantı oluştur (admin/manager)."""
    user = get_current_user()
    data = request.get_json()

    if not data.get('title') or not data.get('start_time') or not data.get('end_time'):
        return jsonify({'error': 'Başlık, başlangıç ve bitiş zamanı zorunludur.'}), 400

    meeting = Meeting(
        title=data['title'],
        description=data.get('description', ''),
        agenda=data.get('agenda', ''),
        start_time=datetime.fromisoformat(data['start_time']),
        end_time=datetime.fromisoformat(data['end_time']),
        location=data.get('location'),
        meeting_link=data.get('meeting_link'),
        status='scheduled',
        created_by=user.id,
        project_id=data.get('project_id')
    )

    db.session.add(meeting)
    db.session.flush()

    # Katılımcıları ekle
    participant_ids = data.get('participants', [])
    for pid in participant_ids:
        if pid != user.id:
            participant = MeetingParticipant(
                meeting_id=meeting.id,
                user_id=pid,
                status='invited',
                is_required=True
            )
            db.session.add(participant)

            # Davet bildirimi
            create_notification(
                user_id=pid,
                title='📅 Toplantı Daveti',
                message=f'"{meeting.title}" toplantısına davet edildiniz. ({meeting.start_time.strftime("%d.%m.%Y %H:%M")})',
                notif_type='meeting_invite',
                project_id=meeting.project_id
            )

    db.session.commit()

    return jsonify({
        'message': 'Toplantı başarıyla oluşturuldu.',
        'meeting': meeting.to_dict()
    }), 201


@meetings_bp.route('/<int:meeting_id>', methods=['GET'])
@jwt_required()
def get_meeting(meeting_id):
    """Toplantı detayını getir."""
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify({'meeting': meeting.to_dict()}), 200


@meetings_bp.route('/<int:meeting_id>', methods=['PUT'])
@jwt_required()
@manager_or_admin_required
def update_meeting(meeting_id):
    """Toplantıyı güncelle."""
    user = get_current_user()
    meeting = Meeting.query.get_or_404(meeting_id)

    if user.role != 'admin' and meeting.created_by != user.id:
        return jsonify({'error': 'Bu toplantıyı düzenleme yetkiniz yok.'}), 403

    data = request.get_json()

    if 'title' in data:
        meeting.title = data['title']
    if 'description' in data:
        meeting.description = data['description']
    if 'agenda' in data:
        meeting.agenda = data['agenda']
    if 'start_time' in data:
        meeting.start_time = datetime.fromisoformat(data['start_time'])
    if 'end_time' in data:
        meeting.end_time = datetime.fromisoformat(data['end_time'])
    if 'location' in data:
        meeting.location = data['location']
    if 'meeting_link' in data:
        meeting.meeting_link = data['meeting_link']
    if 'project_id' in data:
        meeting.project_id = data['project_id']

    db.session.commit()

    return jsonify({
        'message': 'Toplantı güncellendi.',
        'meeting': meeting.to_dict()
    }), 200


@meetings_bp.route('/<int:meeting_id>', methods=['DELETE'])
@jwt_required()
@manager_or_admin_required
def delete_meeting(meeting_id):
    """Toplantıyı sil."""
    user = get_current_user()
    meeting = Meeting.query.get_or_404(meeting_id)

    if user.role != 'admin' and meeting.created_by != user.id:
        return jsonify({'error': 'Bu toplantıyı silme yetkiniz yok.'}), 403

    db.session.delete(meeting)
    db.session.commit()

    return jsonify({'message': 'Toplantı silindi.'}), 200


@meetings_bp.route('/<int:meeting_id>/status', methods=['PATCH'])
@jwt_required()
@manager_or_admin_required
def update_meeting_status(meeting_id):
    """Toplantı durumunu güncelle."""
    user = get_current_user()
    meeting = Meeting.query.get_or_404(meeting_id)

    if user.role != 'admin' and meeting.created_by != user.id:
        return jsonify({'error': 'Yetkiniz yok.'}), 403

    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ('scheduled', 'completed', 'cancelled'):
        return jsonify({'error': 'Geçersiz durum.'}), 400

    old_status = meeting.status
    meeting.status = new_status
    db.session.commit()

    # Katılımcılara bildirim
    if new_status != old_status:
        status_labels = {'scheduled': 'Planlandı', 'completed': 'Tamamlandı', 'cancelled': 'İptal Edildi'}
        for p in meeting.participants.all():
            create_notification(
                user_id=p.user_id,
                title='📅 Toplantı Durumu Güncellendi',
                message=f'"{meeting.title}" → {status_labels.get(new_status, new_status)}',
                notif_type='meeting_reminder',
                project_id=meeting.project_id
            )
        db.session.commit()

    return jsonify({
        'message': 'Toplantı durumu güncellendi.',
        'meeting': meeting.to_dict()
    }), 200


@meetings_bp.route('/<int:meeting_id>/participants', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def add_participant(meeting_id):
    """Toplantıya katılımcı ekle."""
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json()
    user_id = data.get('user_id')
    is_required = data.get('is_required', True)

    if not user_id:
        return jsonify({'error': 'Kullanıcı ID gerekli.'}), 400

    existing = MeetingParticipant.query.filter_by(
        meeting_id=meeting_id, user_id=user_id
    ).first()

    if existing:
        return jsonify({'error': 'Bu kullanıcı zaten katılımcı.'}), 409

    participant = MeetingParticipant(
        meeting_id=meeting_id,
        user_id=user_id,
        status='invited',
        is_required=is_required
    )
    db.session.add(participant)

    create_notification(
        user_id=user_id,
        title='📅 Toplantı Daveti',
        message=f'"{meeting.title}" toplantısına davet edildiniz.',
        notif_type='meeting_invite',
        project_id=meeting.project_id
    )

    db.session.commit()

    return jsonify({
        'message': 'Katılımcı eklendi.',
        'participant': participant.to_dict()
    }), 201


@meetings_bp.route('/<int:meeting_id>/participants/<int:user_id>', methods=['DELETE'])
@jwt_required()
@manager_or_admin_required
def remove_participant(meeting_id, user_id):
    """Toplantıdan katılımcı çıkar."""
    participant = MeetingParticipant.query.filter_by(
        meeting_id=meeting_id, user_id=user_id
    ).first_or_404()

    db.session.delete(participant)
    db.session.commit()

    return jsonify({'message': 'Katılımcı çıkarıldı.'}), 200


@meetings_bp.route('/<int:meeting_id>/notes', methods=['PUT'])
@jwt_required()
def update_meeting_notes(meeting_id):
    """Toplantı notlarını güncelle."""
    user = get_current_user()
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json()

    if 'notes' in data:
        meeting.notes = data['notes']
    if 'outcomes' in data:
        meeting.outcomes = data['outcomes']

    db.session.commit()

    return jsonify({
        'message': 'Toplantı notları güncellendi.',
        'meeting': meeting.to_dict()
    }), 200


@meetings_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar_meetings():
    """Takvim görünümü için toplantıları getir."""
    user = get_current_user()
    month_str = request.args.get('month')  # Format: 2026-05

    if not month_str:
        now = datetime.utcnow()
        year, month = now.year, now.month
    else:
        parts = month_str.split('-')
        year, month = int(parts[0]), int(parts[1])

    from calendar import monthrange
    start_date = datetime(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day, 23, 59, 59)

    query = Meeting.query.filter(
        Meeting.start_time >= start_date,
        Meeting.start_time <= end_date,
        Meeting.status != 'cancelled'
    )

    if user.role != 'admin':
        participant_ids = db.session.query(MeetingParticipant.meeting_id)\
            .filter(MeetingParticipant.user_id == user.id).subquery()
        query = query.filter(
            (Meeting.created_by == user.id) |
            (Meeting.id.in_(participant_ids))
        )

    meetings = query.order_by(Meeting.start_time.asc()).all()

    return jsonify({
        'meetings': [m.to_dict(include_participants=False) for m in meetings],
        'month': month_str or f'{year}-{month:02d}'
    }), 200


@meetings_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_meeting_stats():
    """Toplantı istatistikleri."""
    user = get_current_user()

    if user.role == 'admin':
        base_query = Meeting.query
    else:
        participant_ids = db.session.query(MeetingParticipant.meeting_id)\
            .filter(MeetingParticipant.user_id == user.id).subquery()
        base_query = Meeting.query.filter(
            (Meeting.created_by == user.id) |
            (Meeting.id.in_(participant_ids))
        )

    total = base_query.count()
    scheduled = base_query.filter(Meeting.status == 'scheduled').count()
    completed = base_query.filter(Meeting.status == 'completed').count()
    cancelled = base_query.filter(Meeting.status == 'cancelled').count()
    upcoming = base_query.filter(
        Meeting.start_time >= datetime.utcnow(),
        Meeting.status == 'scheduled'
    ).count()

    return jsonify({
        'stats': {
            'total': total,
            'scheduled': scheduled,
            'completed': completed,
            'cancelled': cancelled,
            'upcoming': upcoming
        }
    }), 200
