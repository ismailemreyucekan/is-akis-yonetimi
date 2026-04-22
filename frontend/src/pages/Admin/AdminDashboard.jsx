import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsData, actData] = await Promise.all([
        adminService.getStats(),
        adminService.getActivity(15)
      ]);
      setStats(statsData.stats);
      setActivity(actData.activity);
    } catch (err) {
      console.error('Dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = stats ? [
    { icon: '👥', label: 'Kullanıcılar', value: stats.total_users, color: 'var(--accent)' },
    { icon: '📁', label: 'Aktif Projeler', value: stats.active_projects, color: 'var(--success)' },
    { icon: '📋', label: 'Toplam Görev', value: stats.total_tasks, color: 'var(--info)' },
    { icon: '✅', label: 'Tamamlanan', value: stats.completed_tasks, color: 'var(--success)' },
    { icon: '⏳', label: 'Bekleyen', value: stats.pending_tasks, color: 'var(--warning)' },
  ] : [];

  const actionLabels = {
    created: 'oluşturdu', status_changed: 'durumunu güncelledi',
    assigned: 'atadı', priority_changed: 'önceliğini değiştirdi', note: 'not ekledi'
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Admin Dashboard" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Sistem Genel Bakış</h1>
                  <p className="page-subtitle">Tüm sistem istatistikleri ve aktiviteler</p>
                </div>
              </div>

              <div className="stats-grid animate-in">
                {statCards.map((card, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                      {card.icon}
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{card.value}</div>
                      <div className="stat-label">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {stats?.roles && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Rol Dağılımı</h3>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {Object.entries(stats.roles).map(([role, count]) => (
                        <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge badge-${role === 'admin' ? 'urgent' : role === 'manager' ? 'progress' : 'done'}`}>
                            {role === 'admin' ? 'Admin' : role === 'manager' ? 'Yönetici' : 'Çalışan'}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-body">
                  <h3 className="section-title" style={{ marginBottom: 14 }}>Son Aktiviteler</h3>
                  {activity.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Henüz aktivite yok</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activity.map(log => (
                        <div key={log.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '8px 0', borderBottom: '1px solid var(--border-light)'
                        }}>
                          <span style={{ fontSize: '0.9rem' }}>
                            {log.action === 'note' ? '💬' : log.action === 'created' ? '➕' : '🔄'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                              <strong>{log.user_name}</strong> {actionLabels[log.action] || log.action}
                            </div>
                            {log.message && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {log.message}
                              </div>
                            )}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {new Date(log.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
