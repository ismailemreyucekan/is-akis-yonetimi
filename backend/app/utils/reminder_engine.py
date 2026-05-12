"""
Otomatik hatırlatıcı motoru.
Görev son tarihleri ve toplantılar için zamanlanmış bildirim oluşturur.
"""
from datetime import datetime, timedelta
from app import db
from app.models.task import Task
from app.models.meeting import Meeting, MeetingParticipant
from app.models.notification import Notification
from app.models.reminder_config import ReminderConfig


def get_reminder_timing(user_id, reminder_type):
    """Kullanıcının belirli bir hatırlatıcı tipi için zamanlama ayarını döndür."""
    config = ReminderConfig.query.filter_by(
        user_id=user_id, reminder_type=reminder_type, is_active=True
    ).first()

    if not config:
        # Sistem geneli varsayılan
        config = ReminderConfig.query.filter_by(
            user_id=None, reminder_type=reminder_type, is_active=True
        ).first()

    if config:
        return config.timing_minutes
    # Hardcoded varsayılan
    defaults = {'deadline': 1440, 'meeting': 60, 'overdue': 0}
    return defaults.get(reminder_type, 1440)


def _notification_exists(user_id, notif_type, related_id, field='related_task_id'):
    """Aynı bildirim zaten var mı kontrol et (son 24 saat içinde)."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    query = Notification.query.filter(
        Notification.user_id == user_id,
        Notification.type == notif_type,
        Notification.created_at >= cutoff
    )
    if field == 'related_task_id':
        query = query.filter(Notification.related_task_id == related_id)
    return query.first() is not None


def check_deadline_reminders():
    """Yaklaşan son tarihleri kontrol et ve hatırlatıcı oluştur."""
    now = datetime.utcnow()
    created_count = 0

    # Tüm aktif (tamamlanmamış) görevleri al
    tasks = Task.query.filter(
        Task.due_date.isnot(None),
        Task.status != 'done',
        Task.status != 'done'
    ).all()

    for task in tasks:
        if not task.assignees:
            continue
        for assignee in task.assignees:
            timing = get_reminder_timing(assignee.id, 'deadline')
            reminder_time = task.due_date - timedelta(minutes=timing)

            # Hatırlatma zamanı geldiyse ve henüz gönderilmemişse
            if reminder_time <= now < task.due_date:
                if not _notification_exists(assignee.id, 'deadline_warning', task.id):
                    remaining = task.due_date - now
                    if remaining.days > 0:
                        time_text = f'{remaining.days} gün'
                    else:
                        hours = remaining.seconds // 3600
                        time_text = f'{hours} saat' if hours > 0 else f'{remaining.seconds // 60} dakika'

                    notif = Notification(
                        user_id=assignee.id,
                        title='⏰ Son Tarih Yaklaşıyor',
                        message=f'"{task.title}" görevi için {time_text} kaldı.',
                        type='deadline_warning',
                        priority='high',
                        category='task',
                        related_task_id=task.id,
                        related_project_id=task.project_id
                    )
                    db.session.add(notif)
                    created_count += 1

    db.session.commit()
    return created_count


def check_overdue_tasks():
    """Gecikmiş görevleri kontrol et ve bildirim oluştur."""
    now = datetime.utcnow()
    created_count = 0

    overdue_tasks = Task.query.filter(
        Task.due_date < now,
        Task.status != 'done',
        Task.status != 'done'
    ).all()

    for task in overdue_tasks:
        if not task.assignees:
            continue
        for assignee in task.assignees:
            if not _notification_exists(assignee.id, 'overdue_warning', task.id):
                overdue_time = now - task.due_date
                if overdue_time.days > 0:
                    time_text = f'{overdue_time.days} gün'
                else:
                    time_text = f'{overdue_time.seconds // 3600} saat'

                notif = Notification(
                    user_id=assignee.id,
                    title='🔴 Görev Gecikti',
                    message=f'"{task.title}" görevi {time_text} gecikti!',
                    type='deadline_warning',
                    priority='critical',
                    category='task',
                    related_task_id=task.id,
                    related_project_id=task.project_id
                )
                db.session.add(notif)
                created_count += 1

                # Görev oluşturana da bildirim
                if task.created_by and task.created_by != assignee.id:
                    if not _notification_exists(task.created_by, 'overdue_warning', task.id):
                        notif2 = Notification(
                            user_id=task.created_by,
                            title='⚠️ Atanan Görev Gecikti',
                            message=f'"{task.title}" görevi {time_text} gecikti (Atanan: {assignee.full_name}).',
                            type='deadline_warning',
                            priority='high',
                            category='task',
                            related_task_id=task.id
                        )
                        db.session.add(notif2)
                        created_count += 1

    db.session.commit()
    return created_count


def check_meeting_reminders():
    """Yaklaşan toplantıları kontrol et ve hatırlatıcı oluştur."""
    now = datetime.utcnow()
    created_count = 0

    upcoming_meetings = Meeting.query.filter(
        Meeting.start_time > now,
        Meeting.status == 'scheduled'
    ).all()

    for meeting in upcoming_meetings:
        participants = MeetingParticipant.query.filter_by(
            meeting_id=meeting.id
        ).all()

        # Toplantı oluşturana da hatırlatma
        user_ids = {meeting.created_by}
        for p in participants:
            user_ids.add(p.user_id)

        for uid in user_ids:
            timing = get_reminder_timing(uid, 'meeting')
            reminder_time = meeting.start_time - timedelta(minutes=timing)

            if reminder_time <= now < meeting.start_time:
                # Daha önce gönderilmedi mi kontrol et
                existing = Notification.query.filter(
                    Notification.user_id == uid,
                    Notification.type == 'meeting_reminder',
                    Notification.message.contains(str(meeting.id)),
                    Notification.created_at >= now - timedelta(hours=24)
                ).first()

                if not existing:
                    remaining = meeting.start_time - now
                    if remaining.days > 0:
                        time_text = f'{remaining.days} gün'
                    else:
                        hours = remaining.seconds // 3600
                        time_text = f'{hours} saat' if hours > 0 else f'{remaining.seconds // 60} dakika'

                    notif = Notification(
                        user_id=uid,
                        title='📅 Toplantı Hatırlatıcı',
                        message=f'"{meeting.title}" toplantısına {time_text} kaldı. [meeting:{meeting.id}]',
                        type='meeting_reminder',
                        priority='high',
                        category='meeting',
                        related_project_id=meeting.project_id
                    )
                    db.session.add(notif)
                    created_count += 1

    db.session.commit()
    return created_count


def run_all_reminder_checks():
    """Tüm hatırlatıcı kontrollerini çalıştır."""
    results = {
        'deadline_reminders': check_deadline_reminders(),
        'overdue_warnings': check_overdue_tasks(),
        'meeting_reminders': check_meeting_reminders()
    }
    return results
