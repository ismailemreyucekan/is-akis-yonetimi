from datetime import datetime
from app import db


class ReminderConfig(db.Model):
    """Hatırlatıcı yapılandırma modeli — kullanıcı/sistem bazlı hatırlatıcı ayarları."""
    __tablename__ = 'reminder_configs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    # user_id=None → sistem geneli varsayılan

    reminder_type = db.Column(db.String(30), nullable=False)
    # Tipler: deadline, meeting, overdue, task_status, assignment

    timing_minutes = db.Column(db.Integer, nullable=False, default=1440)
    # Kaç dakika önce hatırlatılacak (1440 = 1 gün, 60 = 1 saat)

    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # İlişkiler
    user = db.relationship('User', backref='reminder_configs', foreign_keys=[user_id])
    creator = db.relationship('User', foreign_keys=[created_by])

    # Benzersizlik: bir kullanıcı için bir tip sadece bir kez
    __table_args__ = (
        db.UniqueConstraint('user_id', 'reminder_type', name='uq_user_reminder_type'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'reminder_type': self.reminder_type,
            'timing_minutes': self.timing_minutes,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<ReminderConfig {self.reminder_type} - {self.timing_minutes}min>'
