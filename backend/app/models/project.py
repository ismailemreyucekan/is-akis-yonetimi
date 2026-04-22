from datetime import datetime
from app import db


# Proje üyeleri ara tablosu
class ProjectMember(db.Model):
    """Proje-Kullanıcı ilişki tablosu (proje bazlı roller)."""
    __tablename__ = 'project_members'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role_in_project = db.Column(db.String(20), nullable=False, default='member')
    # Proje rolleri: manager, member, viewer
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Benzersizlik kısıtı
    __table_args__ = (
        db.UniqueConstraint('project_id', 'user_id', name='uq_project_user'),
    )

    # İlişkiler
    user = db.relationship('User', backref='project_memberships')
    project = db.relationship('Project', backref='project_members')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else None,
            'user_email': self.user.email if self.user else None,
            'role_in_project': self.role_in_project,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }


class Project(db.Model):
    """Proje modeli."""
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='active')
    # Durumlar: active, completed, archived
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    creator = db.relationship('User', backref='created_projects', foreign_keys=[created_by])
    tasks = db.relationship('Task', backref='project', lazy='dynamic')

    def to_dict(self, include_members=False):
        """Projeyi sözlük olarak döndür."""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'task_count': self.tasks.count() if self.tasks else 0,
            'member_count': len(self.project_members) if self.project_members else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_members:
            data['members'] = [m.to_dict() for m in self.project_members]
        return data

    def __repr__(self):
        return f'<Project {self.name}>'
