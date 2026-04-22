import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsData, projData, tasksData] = await Promise.all([
        taskService.getStats(),
        projectService.getProjects(),
        taskService.getTasks({ per_page: 8 })
      ]);
      setStats(statsData.stats);
      setProjects(projData.projects);
      setRecentTasks(tasksData.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels = { todo: 'Yapılacak', in_progress: 'Devam Ediyor', review: 'İncelemede', done: 'Tamamlandı' };
  const priorityLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Yönetici Paneli" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Takım Genel Bakış</h1>
                  <p className="page-subtitle">Projeler ve görevler durumu</p>
                </div>
              </div>

              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: '📋', label: 'Toplam Görev', value: stats.total, color: 'var(--accent)' },
                    { icon: '⏳', label: 'Devam Ediyor', value: stats.in_progress, color: 'var(--warning)' },
                    { icon: '🔍', label: 'İncelemede', value: stats.review, color: 'var(--info)' },
                    { icon: '✅', label: 'Tamamlandı', value: stats.done, color: 'var(--success)' },
                    { icon: '🔴', label: 'Acil', value: stats.urgent, color: 'var(--danger)' },
                    { icon: '⚠️', label: 'Geciken', value: stats.overdue, color: '#f97316' },
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Projeler */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Projelerim</h3>
                    {projects.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Proje yok</p>
                    ) : (
                      projects.slice(0, 5).map(p => (
                        <div key={p.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid var(--border-light)'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.task_count} görev · {p.member_count} üye</div>
                          </div>
                          <span className={`badge badge-${p.status}`}>{p.status === 'active' ? 'Aktif' : p.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Son görevler */}
                <div className="card">
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Son Görevler</h3>
                    {recentTasks.map(t => (
                      <div key={t.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--border-light)'
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {t.assignee_name || 'Atanmamış'} · {t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : 'Tarih yok'}
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
