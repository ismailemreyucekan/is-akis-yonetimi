import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import taskService from '../../services/taskService';
import authService from '../../services/authService';
import './TasksPage.css';

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

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterPriority]);

  async function loadData() {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const [tasksData, usersData] = await Promise.all([
        taskService.getTasks(params),
        authService.getUsers()
      ]);
      setTasks(tasksData.tasks);
      setUsers(usersData.users);
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  function openNewModal() {
    setEditingTask(null);
    setForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigned_to: '',
      due_date: '',
    });
    setShowModal(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const data = {
      ...form,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      due_date: form.due_date || null,
    };

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, data);
      } else {
        await taskService.createTask(data);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Görev kaydedilemedi:', err);
      alert(err.response?.data?.error || 'Bir hata oluştu');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      await taskService.deleteTask(id);
      loadData();
    } catch (err) {
      console.error('Görev silinemedi:', err);
      alert(err.response?.data?.error || 'Silme hatası');
    }
  }

  async function handleStatusChange(task, newStatus) {
    try {
      await taskService.updateTask(task.id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Durum güncellenemedi:', err);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Görevler" />
        <div className="page-content">
          {/* Header */}
          <div className="page-header animate-fade-in">
            <div>
              <h1 className="page-title">Görev Yönetimi</h1>
              <p className="page-subtitle">Görevlerinizi oluşturun, düzenleyin ve takip edin</p>
            </div>
            <button className="btn btn-primary" onClick={openNewModal}>
              ＋ Yeni Görev
            </button>
          </div>

          {/* Filtreler */}
          <div className="tasks-filters animate-fade-in">
            <select
              className="form-select filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tüm Durumlar</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              className="form-select filter-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">Tüm Öncelikler</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Görev Listesi */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">Görev bulunamadı</div>
                <div className="empty-state-text">
                  Yeni bir görev oluşturarak başlayın.
                </div>
              </div>
            </div>
          ) : (
            <div className="tasks-list animate-slide-up">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className="task-card glass-card"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="task-card-header">
                    <h3 className="task-card-title">{task.title}</h3>
                    <div className="task-card-actions">
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(task)}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(task.id)}
                        title="Sil"
                        style={{ color: '#f87171' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="task-card-desc">{task.description}</p>
                  )}

                  <div className="task-card-meta">
                    <select
                      className="task-status-select"
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>

                    <span className={`badge badge-${task.priority}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>

                    {task.assignee_name && (
                      <span className="task-card-assignee">
                        👤 {task.assignee_name}
                      </span>
                    )}

                    {task.due_date && (
                      <span className="task-card-date">
                        📅 {new Date(task.due_date).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">
                    {editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}
                  </h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-title">Başlık *</label>
                    <input
                      id="task-title"
                      type="text"
                      className="form-input"
                      placeholder="Görev başlığını girin"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-desc">Açıklama</label>
                    <textarea
                      id="task-desc"
                      className="form-textarea"
                      placeholder="Görev açıklamasını girin"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="task-status">Durum</label>
                      <select
                        id="task-status"
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="task-priority">Öncelik</label>
                      <select
                        id="task-priority"
                        className="form-select"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="task-assignee">Atanan Kişi</label>
                      <select
                        id="task-assignee"
                        className="form-select"
                        value={form.assigned_to}
                        onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      >
                        <option value="">Seçiniz</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="task-due">Son Tarih</label>
                      <input
                        id="task-due"
                        type="date"
                        className="form-input"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingTask ? 'Güncelle' : 'Oluştur'}
                    </button>
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
