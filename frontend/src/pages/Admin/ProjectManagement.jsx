import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import projectService from '../../services/projectService';
import authService from '../../services/authService';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'active', start_date: '', end_date: '' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role_in_project: 'member' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [projData, usersData] = await Promise.all([
        projectService.getProjects(),
        authService.getUsers()
      ]);
      setProjects(projData.projects);
      setUsers(usersData.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (selectedProject) {
        await projectService.updateProject(selectedProject.id, form);
      } else {
        await projectService.createProject(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Projeyi silmek istediğinize emin misiniz?')) return;
    try {
      await projectService.deleteProject(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  }

  function openNew() {
    setSelectedProject(null);
    setForm({ name: '', description: '', status: 'active', start_date: '', end_date: '' });
    setShowModal(true);
  }

  function openEdit(p) {
    setSelectedProject(p);
    setForm({
      name: p.name, description: p.description || '',
      status: p.status,
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : ''
    });
    setShowModal(true);
  }

  function openMembers(p) {
    setSelectedProject(p);
    setMemberForm({ user_id: '', role_in_project: 'member' });
    setShowMemberModal(true);
  }

  async function handleAddMember(e) {
    e.preventDefault();
    try {
      await projectService.addMember(selectedProject.id, {
        user_id: parseInt(memberForm.user_id),
        role_in_project: memberForm.role_in_project
      });
      setMemberForm({ user_id: '', role_in_project: 'member' });
      loadData();
      // Refresh selected project
      const data = await projectService.getProject(selectedProject.id);
      setSelectedProject(data.project);
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  }

  async function handleRemoveMember(userId) {
    try {
      await projectService.removeMember(selectedProject.id, userId);
      loadData();
      const data = await projectService.getProject(selectedProject.id);
      setSelectedProject(data.project);
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  }

  const statusLabels = { active: 'Aktif', completed: 'Tamamlandı', archived: 'Arşiv' };
  const roleLabels = { manager: 'Yönetici', member: 'Üye', viewer: 'İzleyici' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Proje Yönetimi" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Projeler</h1>
              <p className="page-subtitle">Projeleri oluşturun ve yönetin</p>
            </div>
            <button className="btn btn-primary" onClick={openNew}>+ Yeni Proje</button>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : projects.length === 0 ? (
            <div className="card"><div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-title">Henüz proje yok</div>
            </div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {projects.map(p => (
                <div key={p.id} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{p.name}</h3>
                      <span className={`badge badge-${p.status}`}>{statusLabels[p.status]}</span>
                    </div>
                    {p.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{p.description}</p>}
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      <span>📋 {p.task_count} görev</span>
                      <span>👥 {p.member_count} üye</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Düzenle</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openMembers(p)}>👥 Üyeler</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proje Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{selectedProject ? 'Proje Düzenle' : 'Yeni Proje'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Proje Adı *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Başlangıç</label>
                      <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bitiş</label>
                      <input type="date" className="form-input" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                    </div>
                  </div>
                  {selectedProject && (
                    <div className="form-group">
                      <label className="form-label">Durum</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="active">Aktif</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="archived">Arşiv</option>
                      </select>
                    </div>
                  )}
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary">{selectedProject ? 'Güncelle' : 'Oluştur'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Üye Modal */}
          {showMemberModal && selectedProject && (
            <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <h2 className="modal-title">{selectedProject.name} — Üyeler</h2>
                  <button className="modal-close" onClick={() => setShowMemberModal(false)}>✕</button>
                </div>

                {/* Mevcut üyeler */}
                <div style={{ marginBottom: 16 }}>
                  {(selectedProject.members || []).map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid var(--border-light)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.user_name}</span>
                        <span className={`badge badge-${m.role_in_project === 'manager' ? 'progress' : 'done'}`} style={{ marginLeft: 8 }}>
                          {roleLabels[m.role_in_project]}
                        </span>
                      </div>
                      <button className="btn-icon" onClick={() => handleRemoveMember(m.user_id)} title="Çıkar" style={{ color: 'var(--danger)' }}>✕</button>
                    </div>
                  ))}
                </div>

                {/* Üye ekle */}
                <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Kullanıcı</label>
                    <select className="form-select" value={memberForm.user_id} onChange={e => setMemberForm({...memberForm, user_id: e.target.value})} required>
                      <option value="">Seçiniz</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
                    <label className="form-label">Rol</label>
                    <select className="form-select" value={memberForm.role_in_project} onChange={e => setMemberForm({...memberForm, role_in_project: e.target.value})}>
                      <option value="manager">Yönetici</option>
                      <option value="member">Üye</option>
                      <option value="viewer">İzleyici</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>Ekle</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
