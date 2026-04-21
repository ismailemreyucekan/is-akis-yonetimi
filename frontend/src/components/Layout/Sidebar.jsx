import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const menuItems = [
  {
    path: '/dashboard',
    label: 'Gösterge Paneli',
    icon: '📊',
  },
  {
    path: '/tasks',
    label: 'Görevler',
    icon: '📋',
  },
  {
    path: '/workflows',
    label: 'İş Akışları',
    icon: '🔄',
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
          {!collapsed && <span className="logo-text">İş Akış</span>}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Menü */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Alt Bölüm - Kullanıcı */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.full_name}</span>
              <span className="sidebar-user-role">
                {user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
              </span>
            </div>
          )}
        </div>
        <button
          className="sidebar-logout"
          onClick={logout}
          title="Çıkış Yap"
        >
          {collapsed ? '🚪' : '🚪 Çıkış'}
        </button>
      </div>
    </aside>
  );
}
