import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sun, Moon, Bell, BellOff, Trash2, X, ClipboardList, Edit2,
  MessageSquare, RefreshCw, Folder, Clock, AlertTriangle,
  Calendar, Shield, AlertCircle, Info, Zap, LogOut, ChevronDown,
  Menu, LayoutDashboard, Users, ShieldAlert,
  Handshake, FileText, ClipboardCheck, User
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import './Navbar.css';

const CATEGORY_TABS = [
  { key: null, label: 'Tümü' },
  { key: 'task', label: 'Görev' },
  { key: 'meeting', label: 'Toplantı' },
  { key: 'risk', label: 'Risk' },
  { key: 'system', label: 'Sistem' },
];

// Role-based navigation config with dropdown groups
const NAV_CONFIG = {
  admin: [
    {
      label: 'Dashboard',
      path: '/admin',
      icon: <LayoutDashboard size={16} />,
      end: true,
    },
    {
      label: 'Yönetim',
      icon: <Users size={16} />,
      dropdown: [
        { path: '/admin/users', label: 'Kullanıcılar', icon: <Users size={15} /> },
        { path: '/admin/projects', label: 'Projeler', icon: <Folder size={15} /> },
      ],
    },
    {
      label: 'Operasyon',
      icon: <Calendar size={16} />,
      dropdown: [
        { path: '/admin/meetings', label: 'Toplantılar', icon: <Handshake size={15} /> },
        { path: '/admin/risks', label: 'Risk & Sorunlar', icon: <ShieldAlert size={15} /> },
      ],
    },
    {
      label: 'Ayarlar',
      path: '/admin/notification-settings',
      icon: <Bell size={16} />,
    },
  ],
  manager: [
    {
      label: 'Dashboard',
      path: '/manager',
      icon: <LayoutDashboard size={16} />,
      end: true,
    },
    {
      label: 'Proje',
      icon: <Folder size={16} />,
      dropdown: [
        { path: '/manager/projects', label: 'Projelerim', icon: <Folder size={15} /> },
        { path: '/manager/board', label: 'Takım Panosu', icon: <ClipboardCheck size={15} /> },
      ],
    },
    {
      label: 'Görevler',
      icon: <ClipboardList size={16} />,
      dropdown: [
        { path: '/manager/tasks', label: 'Görev Listesi', icon: <FileText size={15} /> },
        { path: '/manager/calendar', label: 'Takvim', icon: <Calendar size={15} /> },
      ],
    },
    {
      label: 'Operasyon',
      icon: <Handshake size={16} />,
      dropdown: [
        { path: '/manager/meetings', label: 'Toplantılar', icon: <Handshake size={15} /> },
        { path: '/manager/risks', label: 'Risk & Sorunlar', icon: <ShieldAlert size={15} /> },
        { path: '/manager/notification-settings', label: 'Hatırlatıcılar', icon: <Bell size={15} /> },
      ],
    },
  ],
  employee: [
    {
      label: 'Dashboard',
      path: '/app',
      icon: <LayoutDashboard size={16} />,
      end: true,
    },
    {
      label: 'Görevlerim',
      path: '/app/tasks',
      icon: <ClipboardList size={16} />,
    },
    {
      label: 'Takvim',
      path: '/app/calendar',
      icon: <Calendar size={16} />,
    },
    {
      label: 'Toplantılar',
      path: '/app/meetings',
      icon: <Handshake size={16} />,
    },
  ],
};

const ROLE_LABELS = { admin: 'Admin', manager: 'Yönetici', employee: 'Çalışan' };

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navRef = useRef(null);

  const role = user?.role || 'employee';
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.employee;

  useEffect(() => {
    if (title) document.title = `${title} | İş Akış Yönetimi`;
  }, [title]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on ESC
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setOpenDropdown(null);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  async function loadNotifications(category = null) {
    try {
      const data = await notificationService.getNotifications(category);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, []);

  function handleCategoryChange(cat) {
    setActiveCategory(cat);
    loadNotifications(cat);
  }

  async function handleToggleNotifications() {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    setShowUserMenu(false);
    setOpenDropdown(null);

    if (willOpen && unreadCount > 0) {
      try {
        await notificationService.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } catch {
        // silent
      }
    }
  }

  async function handleClearRead() {
    try {
      await notificationService.clearRead();
      loadNotifications(activeCategory);
    } catch {}
  }

  async function handleDeleteNotification(e, id) {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  }

  function handleNotificationClick(notification) {
    setShowNotifications(false);
    const prefix = role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/app';

    if (notification.type === 'meeting_invite' || notification.type === 'meeting_reminder') {
      navigate(`${prefix}/meetings`);
    } else if (notification.type === 'risk_update') {
      navigate(`${prefix}/risks`);
    } else if (notification.related_task_id) {
      navigate(`${prefix}/tasks`);
    } else if (notification.related_project_id) {
      navigate(`${prefix}/projects`);
    } else if (notification.related_workflow_id) {
      navigate(role === 'employee' ? '/app' : `${prefix}/workflows`);
    } else {
      navigate(prefix);
    }
  }

  function getNotifIcon(type) {
    const icons = {
      task_assigned: <ClipboardList size={16} />, task_updated: <Edit2 size={16} />,
      task_note: <MessageSquare size={16} />, workflow_update: <RefreshCw size={16} />,
      project_update: <Folder size={16} />, deadline_warning: <Clock size={16} />,
      warning: <AlertTriangle size={16} />, meeting_invite: <Calendar size={16} />,
      meeting_reminder: <Bell size={16} />, risk_update: <Shield size={16} />,
      overdue_warning: <AlertCircle size={16} color="var(--danger)" />,
    };
    return icons[type] || <Info size={16} />;
  }

  function getPriorityColor(priority) {
    const colors = { critical: 'var(--danger)', high: '#f97316', normal: 'var(--text-secondary)', low: 'var(--text-muted)' };
    return colors[priority] || colors.normal;
  }

  function formatTimeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
    return `${Math.floor(diff / 86400)} gün`;
  }

  function toggleDropdown(label) {
    setOpenDropdown(prev => (prev === label ? null : label));
    setShowUserMenu(false);
    setShowNotifications(false);
  }

  function handleNavClick() {
    setOpenDropdown(null);
    setMobileOpen(false);
  }

  // Check if any dropdown item is currently active
  function isDropdownActive(dropdown) {
    return dropdown.some(item => window.location.pathname === item.path || window.location.pathname.startsWith(item.path + '/'));
  }

  return (
    <header className="navbar" ref={navRef}>
      {/* ── Logo ── */}
      <div className="navbar-brand">
        <span className="navbar-logo-icon"><Zap size={20} color="#f59e0b" /></span>
        <span className="navbar-logo-text">İş Akış</span>
      </div>

      {/* ── Mobile hamburger ── */}
      <button
        className="navbar-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Menü"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* ── Navigation Links ── */}
      <nav className={`navbar-nav ${mobileOpen ? 'navbar-nav-open' : ''}`}>
        {navItems.map(item => {
          if (item.dropdown) {
            const active = isDropdownActive(item.dropdown);
            const isOpen = openDropdown === item.label;
            return (
              <div key={item.label} className="navbar-dropdown-wrapper">
                <button
                  className={`navbar-nav-btn ${active ? 'navbar-nav-btn-active' : ''}`}
                  onClick={() => toggleDropdown(item.label)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <ChevronDown size={13} className={`navbar-chevron ${isOpen ? 'navbar-chevron-open' : ''}`} />
                </button>
                {isOpen && (
                  <div className="navbar-dropdown">
                    {item.dropdown.map(sub => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) =>
                          `navbar-dropdown-item ${isActive ? 'navbar-dropdown-item-active' : ''}`
                        }
                        onClick={handleNavClick}
                      >
                        <span className="navbar-dropdown-icon">{sub.icon}</span>
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `navbar-nav-link ${isActive ? 'navbar-nav-link-active' : ''}`
              }
              onClick={handleNavClick}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Right Actions ── */}
      <div className="navbar-actions">
        {/* Theme Toggle */}
        <button className="navbar-icon-btn" onClick={toggleTheme} title="Tema Değiştir">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="notification-wrapper" ref={notifRef}>
          <button className="navbar-icon-btn" onClick={handleToggleNotifications}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">Bildirimler</span>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleClearRead}
                  title="Okunanları temizle"
                >
                  <Trash2 size={12} /> Temizle
                </button>
              </div>

              <div className="notification-tabs">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.key || 'all'}
                    className={`notification-tab ${activeCategory === tab.key ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      <BellOff size={24} />
                    </span>
                    <p>Bildirim yok</p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.is_read ? 'notification-item-unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="notification-item-icon">{getNotifIcon(n.type)}</span>
                      <div className="notification-item-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="notification-item-title">{n.title}</span>
                          {n.priority && n.priority !== 'normal' && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: getPriorityColor(n.priority), flexShrink: 0
                            }} />
                          )}
                        </div>
                        <span className="notification-item-msg">{n.message}</span>
                        <span className="notification-item-time">{formatTimeAgo(n.created_at)}</span>
                      </div>
                      <button
                        className="notification-item-delete"
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        title="Sil"
                      ><X size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="navbar-user-wrapper" ref={userMenuRef}>
          <button
            className={`navbar-user-btn ${showUserMenu ? 'navbar-user-btn-open' : ''}`}
            onClick={() => { setShowUserMenu(v => !v); setShowNotifications(false); setOpenDropdown(null); }}
          >
            <div className="navbar-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.full_name}</span>
              <span className="navbar-user-role">{ROLE_LABELS[role]}</span>
            </div>
            <ChevronDown size={13} className={`navbar-chevron ${showUserMenu ? 'navbar-chevron-open' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="navbar-user-dropdown">
              <div className="navbar-user-dropdown-header">
                <div className="navbar-avatar navbar-avatar-lg">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
              </div>
              <div className="navbar-user-dropdown-divider" />
              <button className="navbar-user-dropdown-item navbar-logout-item" onClick={logout}>
                <LogOut size={15} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="navbar-mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}
    </header>
  );
}
