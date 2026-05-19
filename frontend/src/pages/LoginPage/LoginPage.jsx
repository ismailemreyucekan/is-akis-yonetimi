import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Zap, Sun, Moon, ListTodo, Shield, Calendar } from 'lucide-react';
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
    <div className="odoo-landing-page">
      {/* Navbar */}
      <nav className="odoo-navbar">
        <div className="odoo-logo">
          <span className="odoo-logo-icon"><Zap size={28} /></span>
          <span className="odoo-logo-text">İş Akış Yönetimi</span>
        </div>
        <div className="odoo-nav-links">
          <button className="odoo-theme-toggle" onClick={toggleTheme} aria-label="Temayı Değiştir" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {theme === 'dark' ? <><Sun size={16} /> Açık</> : <><Moon size={16} /> Koyu</>} Tema
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="odoo-hero-section">
        <div className="odoo-hero-container">

          {/* Sol - Pazarlama / Slogan */}
          <div className="odoo-hero-text">
            <h1 className="odoo-headline">
              Proje yönetim süreçlerinizin tamamı için <br />
              <span className="odoo-highlight-marker">tek bir platform.</span>
            </h1>
            <p className="odoo-subheadline">
              Görev, risk ve toplantılarınızı tek ekrandan <span className="odoo-highlight-underline">kolayca yönetin!</span>
            </p>
            <div className="odoo-hero-decoration">
              <svg width="150" height="150" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M 10 90 Q 50 10 90 80" stroke="#6b7280" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                <polygon points="85,75 95,85 80,85" fill="#6b7280" />
              </svg>
              <span className="odoo-deco-text">Hemen başlayın!</span>
            </div>
          </div>

          {/* Sağ - Giriş Formu (Card) */}
          <div className="odoo-hero-form">
            <div className="odoo-login-card">
              <h2 className="odoo-form-title">Sisteme Giriş Yapın</h2>
              {error && <div className="odoo-error-msg">{error}</div>}

              <form onSubmit={handleSubmit} className="odoo-form">
                <div className="odoo-input-group">
                  <label htmlFor="login-user">E-posta / Kullanıcı Adı</label>
                  <input
                    id="login-user"
                    type="text"
                    placeholder="ornek@sirket.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>

                <div className="odoo-input-group">
                  <label htmlFor="login-pass">Şifre</label>
                  <input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="odoo-form-options">
                  <label className="odoo-checkbox">
                    <input type="checkbox" />
                    <span>Beni hatırla</span>
                  </label>
                  <a href="#" className="odoo-forgot-link">Şifremi unuttum</a>
                </div>

                <button type="submit" className="odoo-btn-primary" disabled={loading}>
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Kavisli Dalga Geçişi (Wave) */}
        <div className="odoo-wave-divider">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,64L80,69.3C160,75,320,85,480,85.3C640,85,800,75,960,64C1120,53,1280,43,1360,37.3L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Uygulama Yetenekleri Bölümü */}
      <section className="odoo-capabilities-section">
        <div className="odoo-capabilities-container">

          <div className="odoo-capability-card">
            <div className="capability-icon"><ListTodo size={32} strokeWidth={1.5} /></div>
            <h3 className="capability-title">Proje & Görev Yönetimi</h3>
            <p className="capability-desc">
              İş paketlerini kolayca oluşturun, doğru kişilere atayın ve tüm proje süreçlerini anlık olarak tek bir ekrandan izleyin.
            </p>
          </div>

          <div className="odoo-capability-card">
            <div className="capability-icon"><Shield size={32} strokeWidth={1.5} /></div>
            <h3 className="capability-title">Risk Analizi & Takibi</h3>
            <p className="capability-desc">
              Projenizdeki potansiyel tehlikeleri erkenden tespit edin, etki analizlerini yapın ve hızlıca önlem alarak krizleri önleyin.
            </p>
          </div>

          <div className="odoo-capability-card">
            <div className="capability-icon"><Calendar size={32} strokeWidth={1.5} /></div>
            <h3 className="capability-title">Toplantı Organizasyonu</h3>
            <p className="capability-desc">
              Ekip içi senkronizasyonu artırmak için iletişim ve takvim yönetimini tek merkezde yapın, kararları hızlıca paylaşın.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
