import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      setError(err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">⚡</div>
          <h1 className="login-title">İş Akış Yönetimi</h1>
          <p className="login-subtitle">Hesabınıza giriş yapın</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-user">Kullanıcı Adı veya E-posta</label>
            <input
              id="login-user"
              type="text"
              className="form-input"
              placeholder="Kullanıcı adınızı veya e-postanızı girin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-pass">Şifre</label>
            <input
              id="login-pass"
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
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="login-footer">
          <button className="login-theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Açık Tema' : '🌙 Koyu Tema'}
          </button>
        </div>
      </div>
    </div>
  );
}
