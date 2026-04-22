import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import authService from '../../services/authService';
import projectService from '../../services/projectService';

const COLUMNS = [
  { id: 'todo', title: 'Yapılacak', color: 'var(--text-muted)' },
  { id: 'in_progress', title: 'Devam Ediyor', color: 'var(--warning)' },
  { id: 'review', title: 'İncelemede', color: 'var(--info)' },
  { id: 'done', title: 'Tamamlandı', color: 'var(--success)' },
];

const PRIORITY_LABELS = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' };

export default function TeamBoard() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', project_id: '', label: '' });

  useEffect(() => { loadData(); }, [filterProject]);

  async function loadData() {
    try {
      setLoading(true);
      const params = { per_page: 200 };
      if (filterProject) params.project_id = filterProject;

      const [tasksData, usersData, projData] = await Promise.all([
        taskService.getTasks(params),
        authService.getUsers(),
        projectService.getProjects()
      ]);
      setTasks(tasksData.tasks);
      setUsers(usersData.users);
      setProjects(projData.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getColumnTasks(status) {
    return tasks.filter(t => t.status === status);
  }

  async function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId);

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      await taskService.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error(err);
      loadData(); // Revert
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      await taskService.createTask({
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        project_id: form.project_id ? parseInt(form.project_id) : null,
      });
      setShowModal(false);
      setForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', project_id: '', label: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Takım Panosu" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Kanban Board</h1>
              <p className="page-subtitle">Görevleri sürükleyerek durumunu değiştirin</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: 180 }}>
                <option value="">Tüm Projeler</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Görev</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, minHeight: 400 }}>
                {COLUMNS.map(col => (
                  <Droppable droppableId={col.id} key={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          background: snapshot.isDraggingOver ? 'var(--accent-bg)' : 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          padding: 12,
                          transition: 'background 150ms ease',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${col.color}`
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: col.color }}>{col.title}</span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, background: 'var(--accent-bg)',
                            padding: '2px 8px', borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)'
                          }}>{getColumnTasks(col.id).length}</span>
                        </div>

                        <div style={{ flex: 1, minHeight: 50 }}>
                          {getColumnTasks(col.id).map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    background: snapshot.isDragging ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 12px',
                                    marginBottom: 8,
                                    boxShadow: snapshot.isDragging ? 'var(--shadow-md)' : 'none',
                                    cursor: 'grab',
                                  }}
                                >
                                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                                    {task.title}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                    <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                                    {task.label && <span style={{ fontSize: '0.68rem', color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>{task.label}</span>}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    <span>{task.assignee_name || 'Atanmamış'}</span>
                                    {task.due_date && <span>{new Date(task.due_date).toLocaleDateString('tr-TR')}</span>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          )}

          {/* Create Task Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Yeni Görev</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleCreateTask}>
                  <div className="form-group">
                    <label className="form-label">Başlık *</label>
                    <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Öncelik</label>
                      <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Atanan</label>
                      <select className="form-select" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                        <option value="">Seçiniz</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Proje</label>
                      <select className="form-select" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
                        <option value="">Seçiniz</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bitiş Tarihi</label>
                      <input type="date" className="form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Etiket</label>
                    <input className="form-input" placeholder="ör: frontend, backend, design" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary">Oluştur</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
