from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from sqlalchemy import func
from app import db
from app.models.risk import Risk
from app.models.notification import Notification
from app.utils import get_current_user, manager_or_admin_required, create_notification

risks_bp = Blueprint('risks', __name__, url_prefix='/api/risks')


@risks_bp.route('', methods=['GET'])
@jwt_required()
def get_risks():
    """Risk/sorunları listele (filtreleme destekli)."""
    user = get_current_user()
    severity = request.args.get('severity')
    status = request.args.get('status')
    risk_type = request.args.get('type')
    project_id = request.args.get('project_id', type=int)
    assigned_to = request.args.get('assigned_to', type=int)

    query = Risk.query

    # Rol bazlı erişim
    if user.role == 'employee':
        query = query.filter(
            Risk.assignees.any(id=user.id) | (Risk.created_by == user.id)
        )

    if severity:
        query = query.filter(Risk.severity == severity)
    if status:
        query = query.filter(Risk.status == status)
    if risk_type:
        query = query.filter(Risk.risk_type == risk_type)
    if project_id:
        query = query.filter(Risk.project_id == project_id)
    if assigned_to:
        query = query.filter(Risk.assignees.any(id=assigned_to))

    query = query.order_by(
        # Kritik önce, sonra yeniden eskiye
        db.case(
            (Risk.severity == 'critical', 0),
            (Risk.severity == 'high', 1),
            (Risk.severity == 'medium', 2),
            (Risk.severity == 'low', 3),
            else_=4
        ),
        Risk.created_at.desc()
    )

    risks = query.limit(200).all()

    return jsonify({
        'risks': [r.to_dict() for r in risks]
    }), 200


@risks_bp.route('', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def create_risk():
    """Yeni risk/sorun oluştur."""
    user = get_current_user()
    data = request.get_json()

    if not data.get('title'):
        return jsonify({'error': 'Başlık zorunludur.'}), 400

    from app.models.user import User
    assignee_ids = data.get('assignees', [])
    assignees = User.query.filter(User.id.in_(assignee_ids)).all() if assignee_ids else []

    risk = Risk(
        title=data['title'],
        description=data.get('description', ''),
        risk_type=data.get('risk_type', 'risk'),
        severity=data.get('severity', 'medium'),
        status=data.get('status', 'open'),
        probability=data.get('probability', 'medium'),
        impact=data.get('impact', 'medium'),
        assignees=assignees,
        project_id=data.get('project_id'),
        deadline=datetime.fromisoformat(data['deadline']) if data.get('deadline') else None,
        mitigation_plan=data.get('mitigation_plan', ''),
        created_by=user.id
    )

    db.session.add(risk)
    db.session.flush()

    # Atanan kişilere bildirim
    for assignee in risk.assignees:
        if assignee.id != user.id:
            type_label = 'Risk' if risk.risk_type == 'risk' else 'Sorun'
            severity_labels = {'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek', 'critical': 'Kritik'}
            create_notification(
                user_id=assignee.id,
                title=f'🔶 Yeni {type_label} Atandı',
                message=f'"{risk.title}" — Ciddiyet: {severity_labels.get(risk.severity, risk.severity)}',
                notif_type='risk_update',
                project_id=risk.project_id
            )

    db.session.commit()

    return jsonify({
        'message': 'Risk/sorun oluşturuldu.',
        'risk': risk.to_dict()
    }), 201


@risks_bp.route('/<int:risk_id>', methods=['GET'])
@jwt_required()
def get_risk(risk_id):
    """Risk detayını getir."""
    risk = Risk.query.get_or_404(risk_id)
    return jsonify({'risk': risk.to_dict()}), 200


@risks_bp.route('/<int:risk_id>', methods=['PUT'])
@jwt_required()
def update_risk(risk_id):
    """Riski güncelle."""
    user = get_current_user()
    risk = Risk.query.get_or_404(risk_id)

    if user.role == 'employee' and user not in risk.assignees:
        return jsonify({'error': 'Bu riski düzenleme yetkiniz yok.'}), 403

    data = request.get_json()

    if 'title' in data:
        risk.title = data['title']
    if 'description' in data:
        risk.description = data['description']
    if 'risk_type' in data:
        risk.risk_type = data['risk_type']
    if 'severity' in data:
        risk.severity = data['severity']
    if 'status' in data:
        old_status = risk.status
        risk.status = data['status']
        # Durum değişikliğinde bildirim
        if old_status != data['status']:
            notify_ids = {u.id for u in risk.assignees}
            notify_ids.discard(user.id)
            for notify_id in notify_ids:
                status_labels = {'open': 'Açık', 'in_progress': 'İşlemde', 'resolved': 'Çözüldü', 'closed': 'Kapatıldı'}
                create_notification(
                    user_id=notify_id,
                    title='🔶 Risk Durumu Güncellendi',
                    message=f'"{risk.title}" → {status_labels.get(data["status"], data["status"])}',
                    notif_type='risk_update',
                    project_id=risk.project_id
                )
    if 'probability' in data:
        risk.probability = data['probability']
    if 'impact' in data:
        risk.impact = data['impact']
    if 'assignees' in data:
        from app.models.user import User
        new_assignee_ids = data['assignees']
        old_assignee_ids = {u.id for u in risk.assignees}
        
        new_assignees = User.query.filter(User.id.in_(new_assignee_ids)).all() if new_assignee_ids else []
        risk.assignees = new_assignees
        
        added_assignees = [u for u in new_assignees if u.id not in old_assignee_ids]
        
        for assignee in added_assignees:
            if assignee.id != user.id:
                create_notification(
                    user_id=assignee.id,
                    title='🔶 Risk Atandı',
                    message=f'"{risk.title}" riski size atandı.',
                    notif_type='risk_update',
                    project_id=risk.project_id
                )
    if 'project_id' in data:
        risk.project_id = data['project_id']
    if 'deadline' in data:
        risk.deadline = datetime.fromisoformat(data['deadline']) if data['deadline'] else None
    if 'mitigation_plan' in data:
        risk.mitigation_plan = data['mitigation_plan']
    if 'resolution_notes' in data:
        risk.resolution_notes = data['resolution_notes']

    db.session.commit()

    return jsonify({
        'message': 'Risk güncellendi.',
        'risk': risk.to_dict()
    }), 200


@risks_bp.route('/<int:risk_id>', methods=['DELETE'])
@jwt_required()
@manager_or_admin_required
def delete_risk(risk_id):
    """Riski sil."""
    user = get_current_user()
    risk = Risk.query.get_or_404(risk_id)

    if user.role != 'admin' and risk.created_by != user.id:
        return jsonify({'error': 'Bu riski silme yetkiniz yok.'}), 403

    db.session.delete(risk)
    db.session.commit()

    return jsonify({'message': 'Risk silindi.'}), 200


@risks_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_risk_stats():
    """Risk istatistikleri."""
    user = get_current_user()

    if user.role == 'admin':
        base = Risk.query
    elif user.role == 'manager':
        base = Risk.query
    else:
        base = Risk.query.filter(
            Risk.assignees.any(id=user.id) | (Risk.created_by == user.id)
        )

    total = base.count()
    open_count = base.filter(Risk.status == 'open').count()
    in_progress = base.filter(Risk.status == 'in_progress').count()
    resolved = base.filter(Risk.status == 'resolved').count()
    closed = base.filter(Risk.status == 'closed').count()

    critical = base.filter(Risk.severity == 'critical', Risk.status.in_(['open', 'in_progress'])).count()
    high = base.filter(Risk.severity == 'high', Risk.status.in_(['open', 'in_progress'])).count()

    risks_count = base.filter(Risk.risk_type == 'risk').count()
    issues_count = base.filter(Risk.risk_type == 'issue').count()

    # Geciken riskler
    from datetime import datetime as dt
    overdue = base.filter(
        Risk.deadline < dt.utcnow(),
        Risk.status.in_(['open', 'in_progress'])
    ).count()

    return jsonify({
        'stats': {
            'total': total,
            'open': open_count,
            'in_progress': in_progress,
            'resolved': resolved,
            'closed': closed,
            'critical': critical,
            'high': high,
            'risks_count': risks_count,
            'issues_count': issues_count,
            'overdue': overdue
        }
    }), 200
