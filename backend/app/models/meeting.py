from datetime import datetime
from app import db


class Meeting(db.Model):
    """Toplantı modeli."""
    __tablename__ = 'meetings'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    agenda = db.Column(db.Text, nullable=True)

    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)

    location = db.Column(db.String(300), nullable=True)
    meeting_link = db.Column(db.String(500), nullable=True)

    status = db.Column(db.String(20), nullable=False, default='scheduled')
    # Durumlar: scheduled, completed, cancelled

    notes = db.Column(db.Text, nullable=True)
    outcomes = db.Column(db.Text, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    creator = db.relationship('User', backref='created_meetings', foreign_keys=[created_by])
    project = db.relationship('Project', backref='meetings')
    participants = db.relationship('MeetingParticipant', backref='meeting',
                                   lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_participants=True):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'agenda': self.agenda,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'location': self.location,
            'meeting_link': self.meeting_link,
            'status': self.status,
            'notes': self.notes,
            'outcomes': self.outcomes,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'participant_count': self.participants.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_participants:
            data['participants'] = [p.to_dict() for p in self.participants.all()]
        return data

    def __repr__(self):
        return f'<Meeting {self.title}>'


class MeetingParticipant(db.Model):
    """Toplantı katılımcı modeli."""
    __tablename__ = 'meeting_participants'

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='invited')
    # Durumlar: invited, accepted, declined
    is_required = db.Column(db.Boolean, default=True)

    # Benzersizlik
    __table_args__ = (
        db.UniqueConstraint('meeting_id', 'user_id', name='uq_meeting_participant'),
    )

    # İlişkiler
    user = db.relationship('User', backref='meeting_participations')

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else None,
            'user_email': self.user.email if self.user else None,
            'status': self.status,
            'is_required': self.is_required
        }

    def __repr__(self):
        return f'<MeetingParticipant {self.user_id} @ Meeting {self.meeting_id}>'
