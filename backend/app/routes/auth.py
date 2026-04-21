from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Yeni kullanıcı kaydı."""
    data = request.get_json()

    # Zorunlu alan kontrolü
    required = ['username', 'email', 'password', 'full_name']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} alanı zorunludur.'}), 400

    # Benzersizlik kontrolü
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Bu e-posta adresi zaten kullanılıyor.'}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        full_name=data['full_name'],
        role=data.get('role', 'user')
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'Kullanıcı başarıyla oluşturuldu.',
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Kullanıcı girişi."""
    data = request.get_json()

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Kullanıcı adı ve şifre gereklidir.'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre.'}), 401

    if not user.is_active:
        return jsonify({'error': 'Bu hesap devre dışı bırakılmış.'}), 403

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    return jsonify({
        'message': 'Giriş başarılı.',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Mevcut kullanıcı bilgilerini döndür."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'Kullanıcı bulunamadı.'}), 404

    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Access token'ı yenile."""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Tüm kullanıcıları listele (görev atama için)."""
    users = User.query.filter_by(is_active=True).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200
