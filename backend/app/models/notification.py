from datetime import datetime
from app import db


class Notification(db.Model):
    """Uygulama içi bildirim modeli."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), default='info')
    # Tipler: info, task_assigned, task_updated, task_note,
    #         workflow_update, project_update, deadline_warning, warning
    is_read = db.Column(db.Boolean, default=False)
    related_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    related_workflow_id = db.Column(db.Integer, db.ForeignKey('workflow_instances.id'), nullable=True)
    related_project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # İlişkiler
    related_task = db.relationship('Task', backref='notifications')
    related_workflow_instance = db.relationship('WorkflowInstance', backref='notifications')
    related_project = db.relationship('Project', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'related_task_id': self.related_task_id,
            'related_workflow_id': self.related_workflow_id,
            'related_project_id': self.related_project_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Notification {self.title}>'
