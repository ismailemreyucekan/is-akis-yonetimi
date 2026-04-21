from datetime import datetime
from app import db


class Workflow(db.Model):
    """İş akışı şablonu modeli."""
    __tablename__ = 'workflows'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    steps = db.relationship('WorkflowStep', backref='workflow', lazy='dynamic',
                            order_by='WorkflowStep.order')
    instances = db.relationship('WorkflowInstance', backref='workflow', lazy='dynamic')
    author = db.relationship('User', backref='created_workflows', foreign_keys=[created_by])

    def to_dict(self, include_steps=False):
        """İş akışını sözlük olarak döndür."""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'author_name': self.author.full_name if self.author else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'step_count': self.steps.count()
        }
        if include_steps:
            data['steps'] = [step.to_dict() for step in self.steps.all()]
        return data

    def __repr__(self):
        return f'<Workflow {self.name}>'


class WorkflowStep(db.Model):
    """İş akışı adımı modeli."""
    __tablename__ = 'workflow_steps'

    id = db.Column(db.Integer, primary_key=True)
    workflow_id = db.Column(db.Integer, db.ForeignKey('workflows.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, nullable=False)
    assigned_role = db.Column(db.String(20), nullable=True)  # Hangi role atanacak

    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'name': self.name,
            'description': self.description,
            'order': self.order,
            'assigned_role': self.assigned_role
        }

    def __repr__(self):
        return f'<WorkflowStep {self.name}>'


class WorkflowInstance(db.Model):
    """Çalışan iş akışı örneği modeli."""
    __tablename__ = 'workflow_instances'

    id = db.Column(db.Integer, primary_key=True)
    workflow_id = db.Column(db.Integer, db.ForeignKey('workflows.id'), nullable=False)
    current_step = db.Column(db.Integer, default=1)
    status = db.Column(db.String(20), default='active')
    # Durumlar: active, completed, cancelled
    started_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    # İlişkiler
    tasks = db.relationship('Task', backref='workflow_instance', lazy='dynamic')
    starter = db.relationship('User', backref='started_workflows', foreign_keys=[started_by])
    assignee = db.relationship('User', backref='assigned_workflow_instances',
                               foreign_keys=[assigned_to])

    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'workflow_name': self.workflow.name if self.workflow else None,
            'current_step': self.current_step,
            'total_steps': self.workflow.steps.count() if self.workflow else 0,
            'status': self.status,
            'started_by': self.started_by,
            'starter_name': self.starter.full_name if self.starter else None,
            'assigned_to': self.assigned_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

    def __repr__(self):
        return f'<WorkflowInstance {self.id} - {self.status}>'
