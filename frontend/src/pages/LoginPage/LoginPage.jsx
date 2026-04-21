import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Giriş yapılırken bir hata oluştu.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Arka Plan Efektleri */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1"></div>
        <div className="login-bg-orb login-bg-orb-2"></div>
        <div className="login-bg-orb login-bg-orb-3"></div>
      </div>

      <div className="login-container animate-slide-up">
        {/* Sol Panel — Branding */}
        <div className="login-branding">
          <div className="login-brand-content">
            <span className="login-brand-icon">⚡</span>
            <h1 className="login-brand-title">İş Akış</h1>
            <p className="login-brand-subtitle">Yönetim Sistemi</p>
            <div className="login-brand-features">
              <div className="login-feature">
                <span>📋</span>
                <span>Görev Yönetimi</span>
              </div>
              <div className="login-feature">
                <span>🔄</span>
                <span>İş Akışları</span>
              </div>
              <div className="login-feature">
                <span>📊</span>
                <span>Anlık İstatistikler</span>
              </div>
              <div className="login-feature">
                <span>🔔</span>
                <span>Bildirimler</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Panel — Form */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <h2 className="login-title">Hoş Geldiniz</h2>
            <p className="login-subtitle">Hesabınıza giriş yapın</p>

            {error && (
              <div className="login-error animate-fade-in">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Kullanıcı Adı
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="Kullanıcı adınızı girin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                    Giriş Yapılıyor...
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </form>

            <div className="login-hint">
              <span>Varsayılan: </span>
              <code>admin</code> / <code>admin123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
