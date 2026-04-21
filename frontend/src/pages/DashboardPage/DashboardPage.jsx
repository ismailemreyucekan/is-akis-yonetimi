import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import StatsCard from '../../components/Dashboard/StatsCard';
import taskService from '../../services/taskService';
import './DashboardPage.css';

const STATUS_LABELS = {
  todo: 'Yapılacak',
  in_progress: 'Devam Ediyor',
  review: 'İncelemede',
  done: 'Tamamlandı'
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil'
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [statsData, tasksData] = await Promise.all([
        taskService.getStats(),
        taskService.getTasks({ per_page: 5 })
      ]);
      setStats(statsData.stats);
      setRecentTasks(tasksData.tasks);
    } catch (err) {
      console.error('Dashboard yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Gösterge Paneli" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* İstatistik Kartları */}
              <div className="stats-grid animate-fade-in">
                <StatsCard
                  icon="📋"
                  label="Toplam Görev"
                  value={stats?.total || 0}
                  color="#6366f1"
                />
                <StatsCard
                  icon="⏳"
                  label="Devam Ediyor"
                  value={stats?.in_progress || 0}
                  color="#f59e0b"
                />
                <StatsCard
                  icon="✅"
                  label="Tamamlandı"
                  value={stats?.done || 0}
                  color="#10b981"
                />
                <StatsCard
                  icon="🔴"
                  label="Acil"
                  value={stats?.urgent || 0}
                  color="#ef4444"
                />
                <StatsCard
                  icon="⚠️"
                  label="Süresi Geçmiş"
                  value={stats?.overdue || 0}
                  color="#f97316"
                />
                <StatsCard
                  icon="🔍"
                  label="İncelemede"
                  value={stats?.review || 0}
                  color="#3b82f6"
                />
              </div>

              {/* Son Görevler */}
              <div className="dashboard-section animate-slide-up">
                <div className="section-header">
                  <h2 className="section-title">Son Görevler</h2>
                  <Link to="/tasks" className="btn btn-secondary btn-sm">
                    Tümünü Gör →
                  </Link>
                </div>

                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {recentTasks.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">Henüz görev yok</div>
                      <div className="empty-state-text">
                        Görevler sayfasından yeni bir görev oluşturabilirsiniz.
                      </div>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Görev</th>
                          <th>Durum</th>
                          <th>Öncelik</th>
                          <th>Atanan</th>
                          <th>Son Tarih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTasks.map((task) => (
                          <tr key={task.id}>
                            <td>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                {task.title}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${task.status === 'in_progress' ? 'progress' : task.status}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${task.priority}`}>
                                {PRIORITY_LABELS[task.priority]}
                              </span>
                            </td>
                            <td>{task.assignee_name || '—'}</td>
                            <td>
                              {task.due_date
                                ? new Date(task.due_date).toLocaleDateString('tr-TR')
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
