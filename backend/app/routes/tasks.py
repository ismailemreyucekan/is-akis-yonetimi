from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.task import Task
from app.models.notification import Notification
from app.utils import get_current_user

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')


@tasks_bp.route('', methods=['GET'])
@jwt_required()
def get_tasks():
    """Görevleri listele (filtreleme ve sayfalama destekli)."""
    user = get_current_user()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    assigned_to = request.args.get('assigned_to', type=int)

    query = Task.query

    # Admin tüm görevleri görür, kullanıcı sadece kendisininkini
    if user.role != 'admin':
        query = query.filter(
            (Task.assigned_to == user.id) | (Task.created_by == user.id)
        )

    # Filtreler
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)

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
        assigned_to=data.get('assigned_to'),
        created_by=user.id
    )

    db.session.add(task)
    db.session.flush()

    # Atanan kişiye bildirim gönder
    if task.assigned_to and task.assigned_to != user.id:
        notification = Notification(
            user_id=task.assigned_to,
            title='Yeni Görev Atandı',
            message=f'"{task.title}" görevi size atandı.',
            type='task_assigned',
            related_task_id=task.id
        )
        db.session.add(notification)

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
    return jsonify({'task': task.to_dict()}), 200


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Görevi güncelle."""
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    # Yetki kontrolü
    if user.role != 'admin' and task.created_by != user.id and task.assigned_to != user.id:
        return jsonify({'error': 'Bu görevi düzenleme yetkiniz yok.'}), 403

    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        old_status = task.status
        task.status = data['status']
        # Durum değişikliği bildirimi
        if old_status != data['status'] and task.assigned_to:
            notify_user_id = task.created_by if task.assigned_to == user.id else task.assigned_to
            if notify_user_id != user.id:
                notification = Notification(
                    user_id=notify_user_id,
                    title='Görev Durumu Güncellendi',
                    message=f'"{task.title}" görevinin durumu "{data["status"]}" olarak güncellendi.',
                    type='task_updated',
                    related_task_id=task.id
                )
                db.session.add(notification)
    if 'priority' in data:
        task.priority = data['priority']
    if 'due_date' in data:
        task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
    if 'assigned_to' in data:
        old_assignee = task.assigned_to
        task.assigned_to = data['assigned_to']
        # Yeni atanan kişiye bildirim
        if data['assigned_to'] and data['assigned_to'] != old_assignee and data['assigned_to'] != user.id:
            notification = Notification(
                user_id=data['assigned_to'],
                title='Görev Atandı',
                message=f'"{task.title}" görevi size atandı.',
                type='task_assigned',
                related_task_id=task.id
            )
            db.session.add(notification)

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

    if user.role != 'admin' and task.created_by != user.id:
        return jsonify({'error': 'Bu görevi silme yetkiniz yok.'}), 403

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
    else:
        base_query = Task.query.filter(
            (Task.assigned_to == user.id) | (Task.created_by == user.id)
        )

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
