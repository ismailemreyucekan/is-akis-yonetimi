from datetime import datetime
from app import db


class Task(db.Model):
    """Görev modeli."""
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='todo')
    # Durumlar: todo, in_progress, review, done
    priority = db.Column(db.String(20), nullable=False, default='medium')
    # Öncelikler: low, medium, high, urgent
    due_date = db.Column(db.DateTime, nullable=True)
    label = db.Column(db.String(50), nullable=True)
    # Etiketler: frontend, backend, design, test, vb.
    estimated_hours = db.Column(db.Float, nullable=True)

    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    workflow_instance_id = db.Column(db.Integer, db.ForeignKey('workflow_instances.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Görevi sözlük olarak döndür."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'label': self.label,
            'estimated_hours': self.estimated_hours,
            'assigned_to': self.assigned_to,
            'assignee_name': self.assignee.full_name if self.assignee else None,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'workflow_instance_id': self.workflow_instance_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Task {self.title}>'
