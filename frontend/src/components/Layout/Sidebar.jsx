import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const MENU_CONFIG = {
  admin: [
    { section: 'Genel', items: [
      { path: '/admin', label: 'Dashboard', icon: '📊', end: true },
    ]},
    { section: 'Yönetim', items: [
      { path: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
      { path: '/admin/projects', label: 'Projeler', icon: '📁' },
      { path: '/admin/workflows', label: 'İş Akışları', icon: '🔄' },
    ]},
    { section: 'Operasyon', items: [
      { path: '/admin/meetings', label: 'Toplantılar', icon: '📅' },
      { path: '/admin/risks', label: 'Risk & Sorunlar', icon: '🛡️' },
    ]},
    { section: 'Ayarlar', items: [
      { path: '/admin/notification-settings', label: 'Bildirim Ayarları', icon: '🔔' },
    ]},
  ],
  manager: [
    { section: 'Genel', items: [
      { path: '/manager', label: 'Dashboard', icon: '📊', end: true },
    ]},
    { section: 'Proje', items: [
      { path: '/manager/projects', label: 'Projelerim', icon: '📁' },
      { path: '/manager/board', label: 'Takım Panosu', icon: '📋' },
      { path: '/manager/workflows', label: 'İş Akışları', icon: '🔄' },
    ]},
    { section: 'Görevler', items: [
      { path: '/manager/tasks', label: 'Görev Listesi', icon: '📝' },
      { path: '/manager/calendar', label: 'Takvim', icon: '📅' },
    ]},
    { section: 'Operasyon', items: [
      { path: '/manager/meetings', label: 'Toplantılar', icon: '🤝' },
      { path: '/manager/risks', label: 'Risk & Sorunlar', icon: '🛡️' },
      { path: '/manager/notification-settings', label: 'Hatırlatıcılar', icon: '🔔' },
    ]},
  ],
  employee: [
    { section: 'Genel', items: [
      { path: '/app', label: 'Dashboard', icon: '📊', end: true },
    ]},
    { section: 'Görevler', items: [
      { path: '/app/tasks', label: 'Görevlerim', icon: '📋' },
      { path: '/app/calendar', label: 'Takvim', icon: '📅' },
    ]},
    { section: 'Diğer', items: [
      { path: '/app/meetings', label: 'Toplantılar', icon: '🤝' },
    ]},
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'employee';
  const sections = MENU_CONFIG[role] || MENU_CONFIG.employee;
  const roleLabels = { admin: 'Admin', manager: 'Yönetici', employee: 'Çalışan' };

  // Sayfa değiştiğinde mobil menüyü kapat
  function handleNavClick() {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  }

  // ESC ile kapat
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobil hamburger butonu */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Menüyü aç"
      >
        ☰
      </button>

      {/* Mobil overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">⚡</span>
            {!collapsed && <span className="logo-text">İş Akış</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            title={collapsed ? 'Genişlet' : 'Daralt'}
          >
            {window.innerWidth <= 768 ? '✕' : (collapsed ? '▶' : '◀')}
          </button>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.section}>
              {!collapsed && (
                <div className="sidebar-section-label">{section.section}</div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                  onClick={handleNavClick}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.full_name}</span>
                <span className="sidebar-user-role">{roleLabels[role]}</span>
              </div>
            )}
          </div>
          <button className="sidebar-logout" onClick={logout} title="Çıkış Yap">
            {collapsed ? '🚪' : '🚪 Çıkış'}
          </button>
        </div>
      </aside>
    </>
  );
}
