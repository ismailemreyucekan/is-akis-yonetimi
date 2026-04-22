import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import TaskDetailModal from '../../components/Tasks/TaskDetailModal';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Yapılacak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'review', label: 'İncelemede' },
  { value: 'done', label: 'Tamamlandı' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
  { value: 'urgent', label: 'Acil' },
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s.label]));
const PRIORITY_LABELS = Object.fromEntries(PRIORITY_OPTIONS.map(p => [p.value, p.label]));

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

export default function MyTasks({ defaultView = 'list' }) {
  const [view, setView] = useState(defaultView); // list | calendar
  const [tasks, setTasks] = useState([]);
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (view === 'list') loadListTasks();
    else loadCalendarTasks();
  }, [view, filterStatus, filterPriority, calYear, calMonth]);

  async function loadListTasks() {
    try {
      setLoading(true);
      const params = { per_page: 100 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const data = await taskService.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarTasks() {
    try {
      setLoading(true);
      const month = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      const data = await taskService.getCalendarTasks(month);
      setCalendarTasks(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      if (view === 'list') loadListTasks();
      else loadCalendarTasks();
    } catch (err) {
      console.error(err);
    }
  }

  // Calendar helpers
  function getCalendarDays() {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6; // Monday = 0

    const days = [];
    // Previous month padding
    for (let i = 0; i < startDay; i++) days.push(null);
    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }

  function getTasksForDay(day) {
    if (!day) return [];
    return calendarTasks.filter(t => {
      const d = new Date(t.due_date);
      return d.getDate() === day && d.getMonth() === calMonth && d.getFullYear() === calYear;
    });
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
    setSelectedDay(null);
  }

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Görevlerim" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Görevlerim</h1>
              <p className="page-subtitle">Atanan görevlerinizi takip edin</p>
            </div>
            <div className="view-toggle">
              <button className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📋 Liste</button>
              <button className={`view-toggle-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>📅 Takvim</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : view === 'list' ? (
            /* ===== LIST VIEW ===== */
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="">Tüm Durumlar</option>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="">Tüm Öncelikler</option>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {tasks.length === 0 ? (
                <div className="card"><div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">Görev bulunamadı</div>
                </div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="card"
                      onClick={() => setSelectedTask(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                            {task.project_name && `📁 ${task.project_name} · `}
                            {task.due_date ? `📅 ${new Date(task.due_date).toLocaleDateString('tr-TR')}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                          <select
                            className="form-select"
                            value={task.status}
                            onChange={(e) => { e.stopPropagation(); handleStatusChange(task.id, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 140, padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ===== CALENDAR VIEW ===== */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button className="btn btn-secondary btn-sm" onClick={prevMonth}>← Önceki</button>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{MONTHS_TR[calMonth]} {calYear}</h2>
                <button className="btn btn-secondary btn-sm" onClick={nextMonth}>Sonraki →</button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {DAYS_TR.map(d => (
                    <div key={d} style={{
                      padding: '8px', textAlign: 'center', fontSize: '0.72rem',
                      fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'
                    }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {getCalendarDays().map((day, i) => {
                    const dayTasks = getTasksForDay(day);
                    const isSelected = day === selectedDay;
                    return (
                      <div
                        key={i}
                        onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                        style={{
                          minHeight: 80, padding: '4px 6px',
                          borderRight: '1px solid var(--border-light)',
                          borderBottom: '1px solid var(--border-light)',
                          cursor: day ? 'pointer' : 'default',
                          background: isSelected ? 'var(--accent-bg)' : day ? 'transparent' : 'var(--bg-input)',
                          transition: 'background 100ms',
                        }}
                      >
                        {day && (
                          <>
                            <div style={{
                              fontSize: '0.78rem', fontWeight: isToday(day) ? 700 : 400,
                              color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)',
                              marginBottom: 4,
                              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: '50%',
                              background: isToday(day) ? 'var(--accent-bg)' : 'transparent',
                            }}>{day}</div>
                            {dayTasks.slice(0, 3).map(t => (
                              <div key={t.id} style={{
                                fontSize: '0.65rem', padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                                background: t.priority === 'urgent' ? 'var(--danger-bg)' :
                                            t.priority === 'high' ? 'rgba(249,115,22,0.12)' :
                                            'var(--accent-bg)',
                                color: t.priority === 'urgent' ? 'var(--danger)' :
                                       t.priority === 'high' ? '#f97316' :
                                       'var(--accent)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>{t.title}</div>
                            ))}
                            {dayTasks.length > 3 && (
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{dayTasks.length - 3} daha</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seçili gün detayı */}
              {selectedDay && (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 12 }}>
                      {selectedDay} {MONTHS_TR[calMonth]} {calYear} — Görevler
                    </h3>
                    {getTasksForDay(selectedDay).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bu gün için görev yok</p>
                    ) : (
                      getTasksForDay(selectedDay).map(t => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.project_name || ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span className={`badge badge-${t.status === 'in_progress' ? 'progress' : t.status}`}>{STATUS_LABELS[t.status]}</span>
                            <span className={`badge badge-${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Task Detail Modal */}
          {selectedTask && (
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onUpdate={() => { setSelectedTask(null); view === 'list' ? loadListTasks() : loadCalendarTasks(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
