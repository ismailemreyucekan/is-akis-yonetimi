import { useState, useEffect } from 'react';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import notificationService from '../../services/notificationService';
import meetingService from '../../services/meetingService';
import { 
  ClipboardList, Hourglass, CheckCircle, AlertTriangle, 
  RefreshCw, Folder, Calendar, Plus 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [statsData, tasksData, notifData, mData] = await Promise.all([
        taskService.getStats(),
        taskService.getTasks({ per_page: 10 }),
        notificationService.getNotifications(),
        meetingService.getMeetings({ upcoming: 'true' }).catch(() => ({ meetings: [] }))
      ]);
      setStats(statsData.stats);
      setTodayTasks(tasksData.tasks);
      setNotifications(notifData.notifications.slice(0, 5));
      setUpcomingMeetings(mData.meetings?.slice(0, 3) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const statusLabels = { todo: 'Yapılacak', in_progress: 'Devam Ediyor', review: 'İncelemede', done: 'Tamamlandı' };

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
                  <h1 className="page-title">Hoş Geldiniz</h1>
                  <p className="page-subtitle">Günlük görev özetiniz</p>
                </div>
              </div>

              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: <ClipboardList size={20} />, label: 'Toplam', value: stats.total, color: 'var(--accent)', bgColor: 'var(--accent-bg)' },
                    { icon: <Hourglass size={20} />, label: 'Devam Eden', value: stats.in_progress, color: 'var(--warning)', bgColor: 'var(--warning-bg)' },
                    { icon: <CheckCircle size={20} />, label: 'Tamamlanan', value: stats.done, color: 'var(--success)', bgColor: 'var(--success-bg)' },
                    { icon: <AlertTriangle size={20} />, label: 'Geciken', value: stats.overdue, color: 'var(--danger)', bgColor: 'var(--danger-bg)' },
                  ].map((c, i) => (
                    <div key={i} className="stat-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                      <div className="stat-icon" style={{ background: c.bgColor, color: c.color }}>{c.icon}</div>
                      <div className="stat-info">
                        <div className="stat-value">{c.value}</div>
                        <div className="stat-label">{c.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid-2-1">
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Görevlerim</h3>
                    {todayTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                        <div style={{ background: 'var(--bg-input)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <ClipboardList size={24} color="var(--text-muted)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Atanmış görev bulunmuyor</p>
                      </div>
                    ) : todayTasks.filter(t => t.status !== 'done').slice(0, 6).map(t => (
                      <div key={t.id} className="list-item">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            {t.is_recurring && <RefreshCw size={14} style={{ marginRight: 6 }} />} {t.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center' }}>
                            {t.project_name && <><Folder size={12} style={{ marginRight: 4 }} /> {t.project_name} <span style={{ margin: '0 6px' }}>·</span> </>}
                            {t.due_date ? <><Calendar size={12} style={{ marginRight: 4 }} /> {new Date(t.due_date).toLocaleDateString('tr-TR')}</> : 'Tarih yok'}
                          </div>
                        </div>
                        <span className={`badge badge-${t.status === 'in_progress' ? 'progress' : t.status}`}>{statusLabels[t.status]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Upcoming Meetings */}
                  <div className="card">
                    <div className="card-body">
                      <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18} /> Yaklaşan Toplantılar
                      </h3>
                      {upcomingMeetings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                          <div style={{ background: 'var(--bg-input)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                            <Calendar size={20} color="var(--text-muted)" />
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>Yaklaşan toplantı yok</p>
                          <Link to="/app/meetings" state={{ openCreate: true }} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={14} /> Planla
                          </Link>
                        </div>
                      ) : upcomingMeetings.map(m => (
                        <div key={m.id} className="list-item">
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {new Date(m.start_time).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="card">
                    <div className="card-body">
                      <h3 className="section-title" style={{ marginBottom: 12 }}>Son Bildirimler</h3>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Yeni bildirim yok</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} className="list-item" style={{ opacity: n.is_read ? 0.6 : 1, display: 'block' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{n.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                        </div>
                      ))}
                    </div>
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
