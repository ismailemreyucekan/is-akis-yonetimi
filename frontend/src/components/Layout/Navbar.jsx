import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import './Navbar.css';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    // Her 30 saniyede bir bildirimleri yenile
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
      // Sessiz hata — bildirimler yüklenemez ise UI'ı bozmasın
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Bildirimler okundu olarak işaretlenemedi:', err);
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

  function getNotificationIcon(type) {
    switch (type) {
      case 'task_assigned': return '📋';
      case 'task_updated': return '✏️';
      case 'workflow_update': return '🔄';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        {/* Bildirimler */}
        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className="btn-icon notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown animate-slide-up">
              <div className="notification-header">
                <span className="notification-header-title">Bildirimler</span>
                {unreadCount > 0 && (
                  <button
                    className="notification-read-all"
                    onClick={handleMarkAllRead}
                  >
                    Tümünü Okundu İşaretle
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span>🔕</span>
                    <p>Bildirim bulunmuyor</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${!notif.is_read ? 'notification-unread' : ''}`}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                    >
                      <span className="notification-item-icon">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="notification-item-content">
                        <span className="notification-item-title">{notif.title}</span>
                        <span className="notification-item-msg">{notif.message}</span>
                        <span className="notification-item-time">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                      {!notif.is_read && <span className="notification-dot"></span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Kullanıcı */}
        <div className="navbar-user">
          <span className="navbar-user-greeting">Merhaba,</span>
          <span className="navbar-user-name">{user?.full_name}</span>
        </div>
      </div>
    </header>
  );
}
