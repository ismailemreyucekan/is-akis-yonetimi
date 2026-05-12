from datetime import datetime
from app import db

task_assignees = db.Table('task_assignees',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

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
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    label = db.Column(db.String(50), nullable=True)
    # Etiketler: frontend, backend, design, test, vb.
    estimated_hours = db.Column(db.Float, nullable=True)

    # Tekrarlanan görev alanları
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_rule = db.Column(db.Text, nullable=True)
    # JSON: {"frequency": "daily|weekly|monthly|custom", "interval": 1,
    #        "days_of_week": [0,1,2...], "day_of_month": 15,
    #        "end_date": "2026-12-31", "exceptions": ["2026-06-01"]}
    recurrence_parent_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    recurrence_end_date = db.Column(db.DateTime, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    workflow_instance_id = db.Column(db.Integer, db.ForeignKey('workflow_instances.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Tekrarlanan görev ilişkisi
    recurrence_parent = db.relationship('Task', remote_side='Task.id',
                                         backref=db.backref('recurring_instances', lazy='dynamic'))

    assignees = db.relationship('User', secondary=task_assignees, lazy='subquery',
        backref=db.backref('assigned_tasks', lazy=True))

    def to_dict(self):
        """Görevi sözlük olarak döndür."""
        import json
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'label': self.label,
            'estimated_hours': self.estimated_hours,
            'is_recurring': self.is_recurring,
            'recurrence_rule': json.loads(self.recurrence_rule) if self.recurrence_rule else None,
            'recurrence_parent_id': self.recurrence_parent_id,
            'recurrence_end_date': self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
            'assignees': [{'id': u.id, 'full_name': u.full_name} for u in self.assignees],
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
