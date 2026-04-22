from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from app import db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.utils import get_current_user, manager_or_admin_required, create_notification

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    """Projeleri listele (rol bazlı)."""
    user = get_current_user()

    if user.role == 'admin':
        projects = Project.query.order_by(Project.created_at.desc()).all()
    else:
        # Kullanıcının üyesi olduğu projeleri getir
        member_project_ids = db.session.query(ProjectMember.project_id).filter(
            ProjectMember.user_id == user.id
        ).subquery()
        projects = Project.query.filter(
            (Project.id.in_(member_project_ids)) | (Project.created_by == user.id)
        ).order_by(Project.created_at.desc()).all()

    return jsonify({
        'projects': [p.to_dict(include_members=True) for p in projects]
    }), 200


@projects_bp.route('', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def create_project():
    """Yeni proje oluştur (admin/manager)."""
    user = get_current_user()
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Proje adı zorunludur.'}), 400

    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        status=data.get('status', 'active'),
        start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
        end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
        created_by=user.id
    )
    db.session.add(project)
    db.session.flush()

    # Oluşturanı otomatik olarak proje yöneticisi yap
    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role_in_project='manager'
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({
        'message': 'Proje başarıyla oluşturuldu.',
        'project': project.to_dict(include_members=True)
    }), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Proje detayı."""
    project = Project.query.get_or_404(project_id)
    data = project.to_dict(include_members=True)
    # Görevleri de ekle
    data['tasks'] = [t.to_dict() for t in project.tasks.order_by(db.text('created_at desc')).all()]
    return jsonify({'project': data}), 200


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Proje güncelle."""
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    # Yetki kontrolü
    if user.role != 'admin':
        membership = ProjectMember.query.filter_by(
            project_id=project_id, user_id=user.id, role_in_project='manager'
        ).first()
        if not membership:
            return jsonify({'error': 'Bu projeyi düzenleme yetkiniz yok.'}), 403

    data = request.get_json()
    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'status' in data:
        old_status = project.status
        project.status = data['status']
        # Proje durumu değişince üyelere bildirim
        if old_status != data['status']:
            for pm in project.project_members:
                if pm.user_id != user.id:
                    create_notification(
                        user_id=pm.user_id,
                        title='Proje Durumu Güncellendi',
                        message=f'"{project.name}" projesi "{data["status"]}" olarak güncellendi.',
                        notif_type='project_update',
                        project_id=project.id
                    )
    if 'start_date' in data:
        project.start_date = datetime.fromisoformat(data['start_date']) if data['start_date'] else None
    if 'end_date' in data:
        project.end_date = datetime.fromisoformat(data['end_date']) if data['end_date'] else None

    db.session.commit()

    return jsonify({
        'message': 'Proje güncellendi.',
        'project': project.to_dict(include_members=True)
    }), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Proje sil."""
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    if user.role != 'admin' and project.created_by != user.id:
        return jsonify({'error': 'Bu projeyi silme yetkiniz yok.'}), 403

    # Önce üyelikleri sil
    ProjectMember.query.filter_by(project_id=project_id).delete()
    db.session.delete(project)
    db.session.commit()

    return jsonify({'message': 'Proje silindi.'}), 200


@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_member(project_id):
    """Projeye üye ekle."""
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    # Yetki kontrolü
    if user.role != 'admin':
        membership = ProjectMember.query.filter_by(
            project_id=project_id, user_id=user.id, role_in_project='manager'
        ).first()
        if not membership:
            return jsonify({'error': 'Bu projeye üye ekleme yetkiniz yok.'}), 403

    data = request.get_json()
    target_user_id = data.get('user_id')
    role_in_project = data.get('role_in_project', 'member')

    if not target_user_id:
        return jsonify({'error': 'Kullanıcı ID zorunludur.'}), 400

    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'error': 'Kullanıcı bulunamadı.'}), 404

    # Zaten üye mi kontrol
    existing = ProjectMember.query.filter_by(
        project_id=project_id, user_id=target_user_id
    ).first()
    if existing:
        return jsonify({'error': 'Bu kullanıcı zaten projenin üyesi.'}), 409

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user_id,
        role_in_project=role_in_project
    )
    db.session.add(member)

    # Bildirim gönder
    create_notification(
        user_id=target_user_id,
        title='Projeye Eklendiniz',
        message=f'"{project.name}" projesine {role_in_project} olarak eklendiniz.',
        notif_type='project_update',
        project_id=project.id
    )

    db.session.commit()

    return jsonify({
        'message': 'Üye eklendi.',
        'member': member.to_dict()
    }), 201


@projects_bp.route('/<int:project_id>/members/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_member_role(project_id, user_id):
    """Üye rolünü güncelle."""
    current_user = get_current_user()
    Project.query.get_or_404(project_id)

    if current_user.role != 'admin':
        membership = ProjectMember.query.filter_by(
            project_id=project_id, user_id=current_user.id, role_in_project='manager'
        ).first()
        if not membership:
            return jsonify({'error': 'Yetkiniz yok.'}), 403

    member = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not member:
        return jsonify({'error': 'Üye bulunamadı.'}), 404

    data = request.get_json()
    if 'role_in_project' in data:
        member.role_in_project = data['role_in_project']

    db.session.commit()
    return jsonify({'message': 'Rol güncellendi.', 'member': member.to_dict()}), 200


@projects_bp.route('/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(project_id, user_id):
    """Projeden üye çıkar."""
    current_user = get_current_user()
    project = Project.query.get_or_404(project_id)

    if current_user.role != 'admin':
        membership = ProjectMember.query.filter_by(
            project_id=project_id, user_id=current_user.id, role_in_project='manager'
        ).first()
        if not membership:
            return jsonify({'error': 'Yetkiniz yok.'}), 403

    member = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not member:
        return jsonify({'error': 'Üye bulunamadı.'}), 404

    db.session.delete(member)

    # Bildirim
    create_notification(
        user_id=user_id,
        title='Projeden Çıkarıldınız',
        message=f'"{project.name}" projesinden çıkarıldınız.',
        notif_type='project_update',
        project_id=project.id
    )

    db.session.commit()
    return jsonify({'message': 'Üye projeden çıkarıldı.'}), 200
