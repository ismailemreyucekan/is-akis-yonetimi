"""
Tekrarlanan görev motoru.
Recurrence rule'a göre görev örnekleri oluşturur.
"""
import json
from datetime import datetime, timedelta
from calendar import monthrange


def calculate_next_dates(rule, start_date, end_date, count=30):
    """
    Recurrence rule'a göre tarih listesi hesapla.
    
    rule: dict — {"frequency": "daily|weekly|monthly|custom", "interval": 1,
                   "days_of_week": [0,1,2...], "day_of_month": 15,
                   "exceptions": ["2026-06-01"]}
    start_date: datetime — başlangıç tarihi
    end_date: datetime — bitiş tarihi (dahil)
    count: int — maksimum oluşturulacak tarih sayısı
    """
    if isinstance(rule, str):
        rule = json.loads(rule)

    frequency = rule.get('frequency', 'daily')
    interval = rule.get('interval', 1)
    exceptions = set(rule.get('exceptions', []))
    days_of_week = rule.get('days_of_week', [])
    day_of_month = rule.get('day_of_month')

    dates = []
    current = start_date

    while current <= end_date and len(dates) < count:
        date_str = current.strftime('%Y-%m-%d')

        if date_str not in exceptions:
            if frequency == 'daily':
                dates.append(current)
            elif frequency == 'weekly':
                if current.weekday() in days_of_week or not days_of_week:
                    dates.append(current)
            elif frequency == 'monthly':
                target_day = day_of_month or start_date.day
                _, last_day = monthrange(current.year, current.month)
                actual_day = min(target_day, last_day)
                if current.day == actual_day:
                    dates.append(current)
            elif frequency == 'custom':
                # Custom: sadece belirtilen günlerde
                if current.weekday() in days_of_week:
                    dates.append(current)

        # Sonraki tarihe geç
        if frequency == 'daily':
            current += timedelta(days=interval)
        elif frequency == 'weekly':
            if days_of_week:
                # Haftanın belirli günleri: her gün kontrol et
                current += timedelta(days=1)
            else:
                current += timedelta(weeks=interval)
        elif frequency == 'monthly':
            # Bir sonraki ay
            month = current.month + interval
            year = current.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            target_day = day_of_month or start_date.day
            _, last_day = monthrange(year, month)
            actual_day = min(target_day, last_day)
            current = current.replace(year=year, month=month, day=actual_day)
        elif frequency == 'custom':
            current += timedelta(days=1)

    return dates


def generate_recurring_task_instances(parent_task, window_days=30):
    """
    Bir parent task'ın belirli bir zaman penceresi içindeki
    tekrarlanan örneklerini oluştur.
    
    Returns: list of Task dicts (henüz kayıt edilmemiş)
    """
    from app import db
    from app.models.task import Task

    if not parent_task.is_recurring or not parent_task.recurrence_rule:
        return []

    rule = parent_task.recurrence_rule
    if isinstance(rule, str):
        rule = json.loads(rule)

    now = datetime.utcnow()
    start = now
    end = parent_task.recurrence_end_date or (now + timedelta(days=window_days))
    end = min(end, now + timedelta(days=window_days))

    # Mevcut instance'ların tarihlerini al
    existing_dates = set()
    for instance in parent_task.recurring_instances.all():
        if instance.due_date:
            existing_dates.add(instance.due_date.strftime('%Y-%m-%d'))

    dates = calculate_next_dates(rule, start, end)
    created = []

    for date in dates:
        date_str = date.strftime('%Y-%m-%d')
        if date_str in existing_dates:
            continue

        # Aynı saat/dakikayı koru
        if parent_task.due_date:
            date = date.replace(
                hour=parent_task.due_date.hour,
                minute=parent_task.due_date.minute
            )

        instance = Task(
            title=parent_task.title,
            description=parent_task.description,
            status='todo',
            priority=parent_task.priority,
            due_date=date,
            label=parent_task.label,
            estimated_hours=parent_task.estimated_hours,
            assignees=parent_task.assignees,
            created_by=parent_task.created_by,
            project_id=parent_task.project_id,
            is_recurring=False,
            recurrence_parent_id=parent_task.id
        )
        db.session.add(instance)
        created.append(instance)

    if created:
        db.session.commit()

    return created
