import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import notificationService from '../../services/notificationService';
import './Navbar.css';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      // Sessiz hata
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Bildirimler işaretlenemedi:', err);
    }
  }

  async function handleMarkRead(id) {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Bildirim okunamadı:', err);
    }
  }

  function getIcon(type) {
    const icons = {
      task_assigned: '📋', task_updated: '✏️', task_note: '💬',
      workflow_update: '🔄', project_update: '📁',
      deadline_warning: '⏰', warning: '⚠️'
    };
    return icons[type] || 'ℹ️';
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
            onClick={() => setShowNotifications(!showNotifications)}
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
                {unreadCount > 0 && (
                  <button className="notification-read-all" onClick={handleMarkAllRead}>
                    Tümünü Oku
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span>🔕</span>
                    <p>Bildirim yok</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.is_read ? 'notification-unread' : ''}`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <span className="notification-item-icon">{getIcon(n.type)}</span>
                      <div className="notification-item-content">
                        <span className="notification-item-title">{n.title}</span>
                        <span className="notification-item-msg">{n.message}</span>
                        <span className="notification-item-time">{formatTimeAgo(n.created_at)}</span>
                      </div>
                      {!n.is_read && <span className="notification-dot"></span>}
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
