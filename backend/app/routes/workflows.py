from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from app import db
from app.models.workflow import Workflow, WorkflowStep, WorkflowInstance
from app.models.task import Task
from app.models.notification import Notification
from app.utils import admin_required, get_current_user

workflows_bp = Blueprint('workflows', __name__, url_prefix='/api/workflows')


@workflows_bp.route('', methods=['GET'])
@jwt_required()
def get_workflows():
    """İş akışı şablonlarını listele."""
    workflows = Workflow.query.filter_by(is_active=True).all()
    return jsonify({
        'workflows': [w.to_dict(include_steps=True) for w in workflows]
    }), 200


@workflows_bp.route('', methods=['POST'])
@jwt_required()
@admin_required
def create_workflow():
    """Yeni iş akışı şablonu oluştur (sadece admin)."""
    user = get_current_user()
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'İş akışı adı zorunludur.'}), 400

    if not data.get('steps') or len(data['steps']) == 0:
        return jsonify({'error': 'En az bir adım gereklidir.'}), 400

    workflow = Workflow(
        name=data['name'],
        description=data.get('description', ''),
        created_by=user.id
    )
    db.session.add(workflow)
    db.session.flush()

    # Adımları ekle
    for i, step_data in enumerate(data['steps'], 1):
        step = WorkflowStep(
            workflow_id=workflow.id,
            name=step_data['name'],
            description=step_data.get('description', ''),
            order=i,
            assigned_role=step_data.get('assigned_role')
        )
        db.session.add(step)

    db.session.commit()

    return jsonify({
        'message': 'İş akışı başarıyla oluşturuldu.',
        'workflow': workflow.to_dict(include_steps=True)
    }), 201


@workflows_bp.route('/<int:workflow_id>', methods=['GET'])
@jwt_required()
def get_workflow(workflow_id):
    """İş akışı detayı."""
    workflow = Workflow.query.get_or_404(workflow_id)
    return jsonify({'workflow': workflow.to_dict(include_steps=True)}), 200


@workflows_bp.route('/<int:workflow_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_workflow(workflow_id):
    """İş akışı şablonunu güncelle."""
    workflow = Workflow.query.get_or_404(workflow_id)
    data = request.get_json()

    if 'name' in data:
        workflow.name = data['name']
    if 'description' in data:
        workflow.description = data['description']
    if 'is_active' in data:
        workflow.is_active = data['is_active']

    if 'steps' in data:
        # Mevcut adımları sil ve yenilerini ekle
        WorkflowStep.query.filter_by(workflow_id=workflow.id).delete()
        for i, step_data in enumerate(data['steps'], 1):
            step = WorkflowStep(
                workflow_id=workflow.id,
                name=step_data['name'],
                description=step_data.get('description', ''),
                order=i,
                assigned_role=step_data.get('assigned_role')
            )
            db.session.add(step)

    db.session.commit()

    return jsonify({
        'message': 'İş akışı güncellendi.',
        'workflow': workflow.to_dict(include_steps=True)
    }), 200


@workflows_bp.route('/<int:workflow_id>/start', methods=['POST'])
@jwt_required()
def start_workflow(workflow_id):
    """İş akışını başlat — yeni bir instance oluştur."""
    user = get_current_user()
    workflow = Workflow.query.get_or_404(workflow_id)
    data = request.get_json() or {}

    if not workflow.is_active:
        return jsonify({'error': 'Bu iş akışı aktif değil.'}), 400

    instance = WorkflowInstance(
        workflow_id=workflow.id,
        current_step=1,
        status='active',
        started_by=user.id,
        assigned_to=data.get('assigned_to')
    )
    db.session.add(instance)
    db.session.flush()

    # İlk adım için otomatik görev oluştur
    first_step = WorkflowStep.query.filter_by(
        workflow_id=workflow.id, order=1
    ).first()

    if first_step:
        task = Task(
            title=f'{workflow.name} - {first_step.name}',
            description=first_step.description or f'{workflow.name} iş akışının ilk adımı.',
            status='todo',
            priority='medium',
            assigned_to=data.get('assigned_to'),
            created_by=user.id,
            workflow_instance_id=instance.id
        )
        db.session.add(task)

        # Bildirim
        if data.get('assigned_to') and data['assigned_to'] != user.id:
            notification = Notification(
                user_id=data['assigned_to'],
                title='Yeni İş Akışı Başlatıldı',
                message=f'"{workflow.name}" iş akışı başlatıldı ve size atandı.',
                type='workflow_update',
                related_workflow_id=instance.id
            )
            db.session.add(notification)

    db.session.commit()

    return jsonify({
        'message': 'İş akışı başarıyla başlatıldı.',
        'instance': instance.to_dict()
    }), 201


@workflows_bp.route('/instances', methods=['GET'])
@jwt_required()
def get_instances():
    """Çalışan iş akışı instance'larını listele."""
    user = get_current_user()

    if user.role == 'admin':
        instances = WorkflowInstance.query.order_by(WorkflowInstance.created_at.desc()).all()
    else:
        instances = WorkflowInstance.query.filter(
            (WorkflowInstance.started_by == user.id) |
            (WorkflowInstance.assigned_to == user.id)
        ).order_by(WorkflowInstance.created_at.desc()).all()

    return jsonify({
        'instances': [i.to_dict() for i in instances]
    }), 200


@workflows_bp.route('/instances/<int:instance_id>/advance', methods=['POST'])
@jwt_required()
def advance_workflow(instance_id):
    """İş akışını bir sonraki adıma ilerlet."""
    user = get_current_user()
    instance = WorkflowInstance.query.get_or_404(instance_id)

    if instance.status != 'active':
        return jsonify({'error': 'Bu iş akışı artık aktif değil.'}), 400

    total_steps = instance.workflow.steps.count()

    if instance.current_step >= total_steps:
        # Tüm adımlar tamamlandı
        instance.status = 'completed'
        instance.completed_at = datetime.utcnow()
        db.session.commit()
        return jsonify({
            'message': 'İş akışı tamamlandı!',
            'instance': instance.to_dict()
        }), 200

    # Sonraki adıma geç
    instance.current_step += 1
    next_step = WorkflowStep.query.filter_by(
        workflow_id=instance.workflow_id, order=instance.current_step
    ).first()

    if next_step:
        data = request.get_json() or {}
        task = Task(
            title=f'{instance.workflow.name} - {next_step.name}',
            description=next_step.description or '',
            status='todo',
            priority='medium',
            assigned_to=data.get('assigned_to', instance.assigned_to),
            created_by=user.id,
            workflow_instance_id=instance.id
        )
        db.session.add(task)

    db.session.commit()

    return jsonify({
        'message': f'Adım {instance.current_step}/{total_steps} aktif.',
        'instance': instance.to_dict()
    }), 200
