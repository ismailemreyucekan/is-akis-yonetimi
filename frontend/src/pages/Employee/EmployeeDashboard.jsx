import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import notificationService from '../../services/notificationService';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsData, tasksData, notifData] = await Promise.all([
        taskService.getStats(),
        taskService.getTasks({ per_page: 10 }),
        notificationService.getNotifications()
      ]);
      setStats(statsData.stats);
      setTodayTasks(tasksData.tasks);
      setNotifications(notifData.notifications.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels = { todo: 'Yapılacak', in_progress: 'Devam Ediyor', review: 'İncelemede', done: 'Tamamlandı' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Dashboard" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Hoş Geldiniz 👋</h1>
                  <p className="page-subtitle">Günlük görev özetiniz</p>
                </div>
              </div>

              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: '📋', label: 'Toplam', value: stats.total, color: 'var(--accent)' },
                    { icon: '⏳', label: 'Devam Eden', value: stats.in_progress, color: 'var(--warning)' },
                    { icon: '✅', label: 'Tamamlanan', value: stats.done, color: 'var(--success)' },
                    { icon: '⚠️', label: 'Geciken', value: stats.overdue, color: 'var(--danger)' },
                  ].map((c, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-icon" style={{ background: `${c.color}15`, color: c.color }}>{c.icon}</div>
                      <div className="stat-info">
                        <div className="stat-value">{c.value}</div>
                        <div className="stat-label">{c.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                {/* Görevler */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Görevlerim</h3>
                    {todayTasks.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Atanmış görev yok</p>
                    ) : (
                      todayTasks.filter(t => t.status !== 'done').slice(0, 6).map(t => (
                        <div key={t.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                        }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {t.project_name && `📁 ${t.project_name} · `}
                              {t.due_date ? `📅 ${new Date(t.due_date).toLocaleDateString('tr-TR')}` : 'Tarih yok'}
                            </div>
                          </div>
                          <span className={`badge badge-${t.status === 'in_progress' ? 'progress' : t.status}`}>
                            {statusLabels[t.status]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bildirimler */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Son Bildirimler</h3>
                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bildirim yok</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '8px 0', borderBottom: '1px solid var(--border-light)',
                          opacity: n.is_read ? 0.6 : 1
                        }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{n.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
