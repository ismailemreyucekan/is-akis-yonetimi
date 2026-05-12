import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import notificationService from '../../services/notificationService';
import './Navbar.css';

const CATEGORY_TABS = [
  { key: null, label: 'Tümü' },
  { key: 'task', label: 'Görev' },
  { key: 'meeting', label: 'Toplantı' },
  { key: 'risk', label: 'Risk' },
  { key: 'system', label: 'Sistem' },
];

export default function Navbar({ title }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications(category = null) {
    try {
      const data = await notificationService.getNotifications(category);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Sessiz hata
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

  // Bildirim paneli açıldığında tüm okunmamışları okundu yap
  async function handleToggleNotifications() {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);

    if (willOpen && unreadCount > 0) {
      try {
        await notificationService.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } catch {
        // Sessiz hata
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

  // Bildirime tıklandığında ilgili sayfaya yönlendir
  function handleNotificationClick(notification) {
    setShowNotifications(false);

    const role = user?.role || 'employee';
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

  function getIcon(type) {
    const icons = {
      task_assigned: '📋', task_updated: '✏️', task_note: '💬',
      workflow_update: '🔄', project_update: '📁',
      deadline_warning: '⏰', warning: '⚠️',
      meeting_invite: '📅', meeting_reminder: '🔔',
      risk_update: '🛡️', overdue_warning: '🔴'
    };
    return icons[type] || 'ℹ️';
  }

  function getPriorityColor(priority) {
    const colors = {
      critical: 'var(--danger)',
      high: '#f97316',
      normal: 'var(--text-secondary)',
      low: 'var(--text-muted)'
    };
    return colors[priority] || colors.normal;
  }

  function formatTimeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
    return `${Math.floor(diff / 86400)} gün`;
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        <button className="theme-toggle" onClick={toggleTheme} title="Tema Değiştir">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className="notification-btn"
            onClick={handleToggleNotifications}
          >
            🔔
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
                  style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                  onClick={handleClearRead}
                  title="Okunanları temizle"
                >
                  🗑️ Temizle
                </button>
              </div>

              {/* Category Tabs */}
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
                    <span>🔕</span>
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
                      <span className="notification-item-icon">{getIcon(n.type)}</span>
                      <div className="notification-item-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="notification-item-title">{n.title}</span>
                          {n.priority && n.priority !== 'normal' && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: getPriorityColor(n.priority),
                              flexShrink: 0
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
                      >✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-user">
          <span className="navbar-user-name">{user?.full_name}</span>
        </div>
      </div>
    </header>
  );
}
