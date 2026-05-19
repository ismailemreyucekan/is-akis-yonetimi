import { useState, useEffect } from 'react';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import meetingService from '../../services/meetingService';
import riskService from '../../services/riskService';
import { 
  ClipboardList, Hourglass, Search, CheckCircle, 
  AlertCircle, AlertTriangle, Calendar, ShieldAlert, RefreshCw, Plus, Folder
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [meetingStats, setMeetingStats] = useState(null);
  const [riskStats, setRiskStats] = useState(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [statsData, projData, tasksData, mStats, rStats, mList] = await Promise.all([
        taskService.getStats(), projectService.getProjects(),
        taskService.getTasks({ per_page: 5 }),
        meetingService.getStats().catch(() => ({ stats: null })),
        riskService.getStats().catch(() => ({ stats: null })),
        meetingService.getMeetings({ upcoming: 'true' }).catch(() => ({ meetings: [] }))
      ]);
      setStats(statsData.stats);
      setProjects(projData.projects);
      setRecentTasks(tasksData.tasks);
      setMeetingStats(mStats.stats);
      setRiskStats(rStats.stats);
      setUpcomingMeetings(mList.meetings?.slice(0, 3) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const statusLabels = { todo: 'Yapılacak', in_progress: 'Devam Ediyor', review: 'İncelemede', done: 'Tamamlandı' };
  const priorityLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' };

  return (
    <div className="app-layout">
      <div className="main-content bg-dashboard">
        <Navbar title="Yönetici Paneli" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Takım Genel Bakış</h1>
                  <p className="page-subtitle">Projeler, görevler ve operasyon durumu</p>
                </div>
              </div>

              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: <ClipboardList size={20} />, label: 'Toplam Görev', value: stats.total, color: 'var(--accent)', bgColor: 'var(--accent-bg)' },
                    { icon: <Hourglass size={20} />, label: 'Devam Ediyor', value: stats.in_progress, color: 'var(--warning)', bgColor: 'var(--warning-bg)' },
                    { icon: <Search size={20} />, label: 'İncelemede', value: stats.review, color: 'var(--info)', bgColor: 'var(--info-bg)' },
                    { icon: <CheckCircle size={20} />, label: 'Tamamlandı', value: stats.done, color: 'var(--success)', bgColor: 'var(--success-bg)' },
                    { icon: <AlertCircle size={20} />, label: 'Acil', value: stats.urgent, color: 'var(--danger)', bgColor: 'var(--danger-bg)' },
                    { icon: <AlertTriangle size={20} />, label: 'Geciken', value: stats.overdue, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.08)' },
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

              <div className="grid-2-col" style={{ marginBottom: 16 }}>
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} /> Yaklaşan Toplantılar
                    </h3>
                    {upcomingMeetings.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                        <div style={{ background: 'var(--bg-input)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <Calendar size={24} color="var(--text-muted)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Yaklaşan toplantı yok</p>
                        <Link to="/manager/meetings" state={{ openCreate: true }} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Plus size={14} /> Yeni Toplantı Planla
                        </Link>
                      </div>
                    ) : upcomingMeetings.map(m => (
                      <div key={m.id} className="list-item">
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(m.start_time).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {m.participant_count} katılımcı
                          </div>
                        </div>
                        <span className="badge badge-progress">Planlandı</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={18} /> Risk Durumu
                    </h3>
                    {riskStats ? (
                      <div className="grid-3-col">
                        {[
                          { label: 'Kritik', value: riskStats.critical, color: 'var(--danger)' },
                          { label: 'Yüksek', value: riskStats.high, color: '#f97316' },
                          { label: 'Açık', value: riskStats.open, color: 'var(--warning)' },
                        ].map((item, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Veri yok</p>}
                  </div>
                </div>
              </div>

              <div className="grid-2-col">
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Projelerim</h3>
                    {projects.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                        <div style={{ background: 'var(--bg-input)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <Folder size={24} color="var(--text-muted)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Henüz aktif proje yok</p>
                        <Link to="/manager/projects" state={{ openCreate: true }} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Plus size={14} /> Yeni Proje
                        </Link>
                      </div>
                    ) : projects.slice(0, 5).map(p => (
                      <div key={p.id} className="list-item">
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.task_count} görev · {p.member_count} üye</div>
                        </div>
                        <span className={`badge badge-${p.status}`}>{p.status === 'active' ? 'Aktif' : p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Son Görevler</h3>
                    {recentTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                        <div style={{ background: 'var(--bg-input)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <ClipboardList size={24} color="var(--text-muted)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Görüntülenecek görev yok</p>
                        <Link to="/manager/tasks" state={{ openCreate: true }} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Plus size={14} /> Yeni Görev
                        </Link>
                      </div>
                    ) : recentTasks.map(t => (
                      <div key={t.id} className="list-item">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                            {t.is_recurring && <RefreshCw size={14} style={{ marginRight: 6 }} />}{t.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {t.assignees?.length > 0 ? t.assignees.map(a => a.full_name).join(', ') : 'Atanmamış'} · {t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : 'Tarih yok'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          <span className={`badge badge-${t.status === 'in_progress' ? 'progress' : t.status}`}>{statusLabels[t.status]}</span>
                          <span className={`badge badge-${t.priority}`}>{priorityLabels[t.priority]}</span>
                        </div>
                      </div>
                    ))}
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
