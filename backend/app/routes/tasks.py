from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from calendar import monthrange
from app import db
from app.models.task import Task
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.utils import get_current_user, create_activity_log, create_notification

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')


@tasks_bp.route('', methods=['GET'])
@jwt_required()
def get_tasks():
    """Görevleri listele (filtreleme ve sayfalama destekli)."""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    assigned_to = request.args.get('assigned_to', type=int)
    project_id = request.args.get('project_id', type=int)

    query = Task.query

    # Admin tüm görevleri görür, diğerleri sadece kendisininkini
    if user.role == 'admin':
        pass  # tüm görevler
    elif user.role == 'manager':
        # Manager: oluşturduğu + atandığı görevler
        query = query.filter(
            (Task.assigned_to == user.id) | (Task.created_by == user.id)
        )
    else:
        # Employee: sadece atandığı görevler
        query = query.filter(Task.assigned_to == user.id)

    # Filtreler
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if project_id:
        query = query.filter(Task.project_id == project_id)

    query = query.order_by(Task.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'tasks': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@tasks_bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    """Yeni görev oluştur."""
    user = get_current_user()
    data = request.get_json()

    if not data.get('title'):
        return jsonify({'error': 'Görev başlığı zorunludur.'}), 400

    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        status=data.get('status', 'todo'),
        priority=data.get('priority', 'medium'),
        due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
        label=data.get('label'),
        estimated_hours=data.get('estimated_hours'),
        assigned_to=data.get('assigned_to'),
        created_by=user.id,
        project_id=data.get('project_id')
    )

    db.session.add(task)
    db.session.flush()

    # Aktivite logu
    create_activity_log(task, user, 'created', message=f'Görev oluşturuldu: {task.title}')

    # Atanan kişiye bildirim gönder
    if task.assigned_to and task.assigned_to != user.id:
        create_notification(
            user_id=task.assigned_to,
            title='Yeni Görev Atandı',
            message=f'"{task.title}" görevi size atandı.',
            notif_type='task_assigned',
            task_id=task.id,
            project_id=task.project_id
        )

    db.session.commit()

    return jsonify({
        'message': 'Görev başarıyla oluşturuldu.',
        'task': task.to_dict()
    }), 201


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    """Görev detayını getir."""
    task = Task.query.get_or_404(task_id)
    data = task.to_dict()
    # Aktivite loglarını da ekle
    data['activity'] = [log.to_dict() for log in task.activity_logs.limit(30).all()]
    return jsonify({'task': data}), 200


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Görevi güncelle."""
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    # Yetki kontrolü
    if user.role == 'employee' and task.assigned_to != user.id:
        return jsonify({'error': 'Bu görevi düzenleme yetkiniz yok.'}), 403
    if user.role == 'manager' and task.created_by != user.id and task.assigned_to != user.id:
        return jsonify({'error': 'Bu görevi düzenleme yetkiniz yok.'}), 403

    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        old_status = task.status
        task.status = data['status']
        if old_status != data['status']:
            create_activity_log(task, user, 'status_changed',
                                old_value=old_status, new_value=data['status'])
            # Bildirim: durum değişikliği
            notify_user_id = task.created_by if task.assigned_to == user.id else task.assigned_to
            if notify_user_id and notify_user_id != user.id:
                status_labels = {
                    'todo': 'Yapılacak', 'in_progress': 'Devam Ediyor',
                    'review': 'İncelemede', 'done': 'Tamamlandı'
                }
                create_notification(
                    user_id=notify_user_id,
                    title='Görev Durumu Güncellendi',
                    message=f'"{task.title}" → {status_labels.get(data["status"], data["status"])}',
                    notif_type='task_updated',
                    task_id=task.id
                )
    if 'priority' in data:
        old_priority = task.priority
        task.priority = data['priority']
        if old_priority != data['priority']:
            create_activity_log(task, user, 'priority_changed',
                                old_value=old_priority, new_value=data['priority'])
    if 'due_date' in data:
        task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
    if 'label' in data:
        task.label = data['label']
    if 'estimated_hours' in data:
        task.estimated_hours = data['estimated_hours']
    if 'assigned_to' in data:
        old_assignee = task.assigned_to
        task.assigned_to = data['assigned_to']
        if data['assigned_to'] and data['assigned_to'] != old_assignee:
            create_activity_log(task, user, 'assigned',
                                new_value=str(data['assigned_to']))
            if data['assigned_to'] != user.id:
                create_notification(
                    user_id=data['assigned_to'],
                    title='Görev Atandı',
                    message=f'"{task.title}" görevi size atandı.',
                    notif_type='task_assigned',
                    task_id=task.id
                )
    if 'project_id' in data:
        task.project_id = data['project_id']

    db.session.commit()

    return jsonify({
        'message': 'Görev başarıyla güncellendi.',
        'task': task.to_dict()
    }), 200


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Görevi sil."""
    user = get_current_user()
    task = Task.query.get_or_404(task_id)

    if user.role == 'employee':
        return jsonify({'error': 'Görev silme yetkiniz yok.'}), 403
    if user.role == 'manager' and task.created_by != user.id:
        return jsonify({'error': 'Bu görevi silme yetkiniz yok.'}), 403

    # İlişkili aktivite loglarını sil
    ActivityLog.query.filter_by(task_id=task_id).delete()
    # İlişkili bildirimleri sil
    Notification.query.filter_by(related_task_id=task_id).delete()

    db.session.delete(task)
    db.session.commit()

    return jsonify({'message': 'Görev başarıyla silindi.'}), 200


@tasks_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_task_stats():
    """Görev istatistiklerini döndür."""
    user = get_current_user()

    if user.role == 'admin':
        base_query = Task.query
    elif user.role == 'manager':
        base_query = Task.query.filter(
            (Task.assigned_to == user.id) | (Task.created_by == user.id)
        )
    else:
        base_query = Task.query.filter(Task.assigned_to == user.id)

    total = base_query.count()
    todo = base_query.filter(Task.status == 'todo').count()
    in_progress = base_query.filter(Task.status == 'in_progress').count()
    review = base_query.filter(Task.status == 'review').count()
    done = base_query.filter(Task.status == 'done').count()
    urgent = base_query.filter(Task.priority == 'urgent').count()

    overdue = base_query.filter(
        Task.due_date < datetime.utcnow(),
        Task.status != 'done'
    ).count()

    return jsonify({
        'stats': {
            'total': total,
            'todo': todo,
            'in_progress': in_progress,
            'review': review,
            'done': done,
            'urgent': urgent,
            'overdue': overdue
        }
    }), 200


@tasks_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar_tasks():
    """Takvim görünümü için tarih bazlı görev listesi."""
    user = get_current_user()
    month_str = request.args.get('month')  # Format: 2026-04

    if not month_str:
        now = datetime.utcnow()
        year, month = now.year, now.month
    else:
        parts = month_str.split('-')
        year, month = int(parts[0]), int(parts[1])

    # Ay başı ve sonu
    start_date = datetime(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day, 23, 59, 59)

    query = Task.query.filter(
        Task.due_date >= start_date,
        Task.due_date <= end_date
    )

    # Rol bazlı filtreleme
    if user.role == 'admin':
        pass
    elif user.role == 'manager':
        query = query.filter(
            (Task.assigned_to == user.id) | (Task.created_by == user.id)
        )
    else:
        query = query.filter(Task.assigned_to == user.id)

    tasks = query.order_by(Task.due_date.asc()).all()

    return jsonify({
        'tasks': [t.to_dict() for t in tasks],
        'month': month_str or f'{year}-{month:02d}'
    }), 200


@tasks_bp.route('/<int:task_id>/notes', methods=['POST'])
@jwt_required()
def add_task_note(task_id):
    """Göreve not/yorum ekle."""
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'Not içeriği boş olamaz.'}), 400

    log = create_activity_log(task, user, 'note', message=message)

    # Not eklenince ilgili kişilere bildirim
    notify_ids = set()
    if task.assigned_to and task.assigned_to != user.id:
        notify_ids.add(task.assigned_to)
    if task.created_by and task.created_by != user.id:
        notify_ids.add(task.created_by)

    for uid in notify_ids:
        create_notification(
            user_id=uid,
            title='Görev Notu Eklendi',
            message=f'{user.full_name}: "{message[:80]}..."' if len(message) > 80 else f'{user.full_name}: "{message}"',
            notif_type='task_note',
            task_id=task.id
        )

    db.session.commit()

    return jsonify({
        'message': 'Not eklendi.',
        'log': log.to_dict()
    }), 201


@tasks_bp.route('/<int:task_id>/activity', methods=['GET'])
@jwt_required()
def get_task_activity(task_id):
    """Görev aktivite geçmişi."""
    Task.query.get_or_404(task_id)
    logs = ActivityLog.query.filter_by(task_id=task_id)\
        .order_by(ActivityLog.created_at.desc())\
        .limit(50).all()

    return jsonify({
        'activity': [log.to_dict() for log in logs]
    }), 200
