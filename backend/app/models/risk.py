from datetime import datetime
from app import db

risk_assignees = db.Table('risk_assignees',
    db.Column('risk_id', db.Integer, db.ForeignKey('risks.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class Risk(db.Model):
    """Risk ve sorun takip modeli."""
    __tablename__ = 'risks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)

    risk_type = db.Column(db.String(20), nullable=False, default='risk')
    # Tipler: risk, issue

    severity = db.Column(db.String(20), nullable=False, default='medium')
    # Seviyeler: low, medium, high, critical

    status = db.Column(db.String(20), nullable=False, default='open')
    # Durumlar: open, in_progress, resolved, closed

    probability = db.Column(db.String(20), nullable=True, default='medium')
    # Olasılık: low, medium, high

    impact = db.Column(db.String(20), nullable=True, default='medium')
    # Etki: low, medium, high

    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    deadline = db.Column(db.DateTime, nullable=True)
    mitigation_plan = db.Column(db.Text, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    assignees = db.relationship('User', secondary=risk_assignees, lazy='subquery',
        backref=db.backref('assigned_risks_list', lazy=True))
    creator = db.relationship('User', backref='created_risks', foreign_keys=[created_by])
    project = db.relationship('Project', backref='risks')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'risk_type': self.risk_type,
            'severity': self.severity,
            'status': self.status,
            'probability': self.probability,
            'impact': self.impact,
            'assignees': [{'id': u.id, 'full_name': u.full_name} for u in self.assignees],
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'mitigation_plan': self.mitigation_plan,
            'resolution_notes': self.resolution_notes,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Risk {self.title} [{self.severity}]>'
