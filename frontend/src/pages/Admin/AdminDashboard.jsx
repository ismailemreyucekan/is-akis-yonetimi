import { useState, useEffect } from 'react';
import Navbar from '../../components/Layout/Navbar';
import adminService from '../../services/adminService';
import meetingService from '../../services/meetingService';
import riskService from '../../services/riskService';
import { 
  Users, Folder, ClipboardList, CheckCircle, Hourglass, 
  Calendar, ShieldAlert, MessageSquare, PlusCircle, RefreshCw 
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [meetingStats, setMeetingStats] = useState(null);
  const [riskStats, setRiskStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [statsData, actData, mStats, rStats] = await Promise.all([
        adminService.getStats(),
        adminService.getActivity(15),
        meetingService.getStats().catch(() => ({ stats: null })),
        riskService.getStats().catch(() => ({ stats: null }))
      ]);
      setStats(statsData.stats);
      setActivity(actData.activity);
      setMeetingStats(mStats.stats);
      setRiskStats(rStats.stats);
    } catch (err) {
      console.error('Dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const statCards = stats ? [
    { icon: <Users size={20} />, label: 'Kullanıcılar', value: stats.total_users, color: 'var(--accent)', bgColor: 'var(--accent-bg)' },
    { icon: <Folder size={20} />, label: 'Aktif Projeler', value: stats.active_projects, color: 'var(--success)', bgColor: 'var(--success-bg)' },
    { icon: <ClipboardList size={20} />, label: 'Toplam Görev', value: stats.total_tasks, color: 'var(--info)', bgColor: 'var(--info-bg)' },
    { icon: <CheckCircle size={20} />, label: 'Tamamlanan', value: stats.completed_tasks, color: 'var(--success)', bgColor: 'var(--success-bg)' },
    { icon: <Hourglass size={20} />, label: 'Bekleyen', value: stats.pending_tasks, color: 'var(--warning)', bgColor: 'var(--warning-bg)' },
  ] : [];

  const actionLabels = {
    created: 'oluşturdu', status_changed: 'durumunu güncelledi',
    assigned: 'atadı', priority_changed: 'önceliğini değiştirdi', note: 'not ekledi'
  };

  return (
    <div className="app-layout">
      <div className="main-content bg-dashboard">
        <Navbar title="Dashboard" />
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
                  <div key={i} className="stat-card" style={{ borderLeft: `4px solid ${card.color}` }}>
                    <div className="stat-icon" style={{ background: card.bgColor, color: card.color }}>
                      {card.icon}
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">{card.value}</div>
                      <div className="stat-label">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Operations Row */}
              <div className="grid-2-col" style={{ marginBottom: 20 }}>
                {/* Meeting Widget */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} /> Toplantı Özeti
                    </h3>
                    {meetingStats ? (
                      <div className="grid-3-col">
                        {[
                          { label: 'Yaklaşan', value: meetingStats.upcoming, color: 'var(--info)' },
                          { label: 'Tamamlanan', value: meetingStats.completed, color: 'var(--success)' },
                          { label: 'Toplam', value: meetingStats.total, color: 'var(--accent)' },
                        ].map((item, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Veri yok</p>
                    )}
                  </div>
                </div>

                {/* Risk Widget */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={18} /> Risk & Sorun Özeti
                    </h3>
                    {riskStats ? (
                      <div className="grid-4-col">
                        {[
                          { label: 'Kritik', value: riskStats.critical, color: 'var(--danger)' },
                          { label: 'Yüksek', value: riskStats.high, color: '#f97316' },
                          { label: 'Açık', value: riskStats.open, color: 'var(--warning)' },
                          { label: 'Geciken', value: riskStats.overdue, color: 'var(--danger)' },
                        ].map((item, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Veri yok</p>
                    )}
                  </div>
                </div>
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
                          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {log.action === 'note' ? <MessageSquare size={16} /> : log.action === 'created' ? <PlusCircle size={16} /> : <RefreshCw size={16} />}
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
