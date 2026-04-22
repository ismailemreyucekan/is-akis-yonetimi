import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User

app = create_app()

with app.app_context():
    print("Seeding database...")
    
    # Varsayılan admin kullanıcısı
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@sistem.com',
            full_name='Sistem Yöneticisi',
            role='admin',
            department='Yönetim',
            position='Sistem Yöneticisi'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        print('[OK] Varsayılan admin kullanıcısı oluşturuldu (admin / admin123)')

    # Varsayılan manager kullanıcısı
    if not User.query.filter_by(username='yonetici').first():
        manager = User(
            username='yonetici',
            email='yonetici@sistem.com',
            full_name='Proje Yöneticisi',
            role='manager',
            department='Yazılım',
            position='Takım Lideri'
        )
        manager.set_password('yonetici123')
        db.session.add(manager)
        print('[OK] Varsayılan yönetici kullanıcısı oluşturuldu (yonetici / yonetici123)')

    # Varsayılan employee kullanıcısı
    if not User.query.filter_by(username='calisan').first():
        employee = User(
            username='calisan',
            email='calisan@sistem.com',
            full_name='Ahmet Yılmaz',
            role='employee',
            department='Yazılım',
            position='Yazılım Geliştirici'
        )
        employee.set_password('calisan123')
        db.session.add(employee)
        print('[OK] Varsayılan çalışan kullanıcısı oluşturuldu (calisan / calisan123)')

    db.session.commit()
    print("Veritabanı seeding tamamlandı!")
