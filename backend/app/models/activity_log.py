from datetime import datetime
from app import db


class ActivityLog(db.Model):
    """Görev aktivite geçmişi ve notlar."""
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(30), nullable=False)
    # Aksiyonlar: created, status_changed, assigned, priority_changed, note
    old_value = db.Column(db.String(200), nullable=True)
    new_value = db.Column(db.String(200), nullable=True)
    message = db.Column(db.Text, nullable=True)
    # Kullanıcının yazdığı not: "Bu görevi şu şekilde tamamladım..."
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # İlişkiler
    task = db.relationship('Task', backref=db.backref('activity_logs', lazy='dynamic',
                                                       order_by='ActivityLog.created_at.desc()'))
    user = db.relationship('User', backref='activity_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else None,
            'action': self.action,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<ActivityLog {self.action} on Task {self.task_id}>'
