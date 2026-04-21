import os
from datetime import timedelta
from dotenv import load_dotenv

# .env dosyasını yükle
basedir = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.dirname(basedir)
load_dotenv(os.path.join(backend_dir, '.env'))

instance_dir = os.path.join(backend_dir, 'instance')
os.makedirs(instance_dir, exist_ok=True)


def build_database_uri():
    """
    Veritabanı URI'sını oluştur.
    Öncelik sırası:
      1. DATABASE_URL ortam değişkeni (tam URI)
      2. DB_* ortam değişkenleri (PostgreSQL parçalı ayarlar)
      3. SQLite fallback (geliştirme için)
    """
    # 1. Doğrudan tam URI verilmişse onu kullan
    full_uri = os.environ.get('DATABASE_URL')
    if full_uri:
        return full_uri

    # 2. Parçalı PostgreSQL ayarları
    db_host = os.environ.get('DB_HOST')
    db_name = os.environ.get('DB_NAME')
    db_user = os.environ.get('DB_USER')
    db_password = os.environ.get('DB_PASSWORD')
    db_port = os.environ.get('DB_PORT', '5432')

    if db_host and db_name and db_user and db_password:
        return f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'

    # 3. Hiçbiri yoksa SQLite kullan
    return 'sqlite:///' + os.path.join(instance_dir, 'app.db')


class Config:
    """Temel konfigürasyon."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'gizli-anahtar-degistirin')
    SQLALCHEMY_DATABASE_URI = build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-gizli-anahtar')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)


class DevelopmentConfig(Config):
    """Geliştirme ortamı konfigürasyonu."""
    DEBUG = True


class ProductionConfig(Config):
    """Production ortamı konfigürasyonu."""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
