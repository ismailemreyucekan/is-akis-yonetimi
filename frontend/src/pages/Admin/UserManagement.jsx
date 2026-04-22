import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import adminService from '../../services/adminService';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Yönetici' },
  { value: 'employee', label: 'Çalışan' },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'employee', department: '', position: '' });

  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await adminService.getUsers({ search, role: roleFilter });
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditUser(null);
    setForm({ username: '', email: '', full_name: '', password: '', role: 'employee', department: '', position: '' });
    setShowModal(true);
  }

  function openEdit(user) {
    setEditUser(user);
    setForm({
      username: user.username, email: user.email, full_name: user.full_name,
      password: '', role: user.role, department: user.department || '', position: user.position || ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editUser) {
        const data = { ...form };
        if (!data.password) delete data.password;
        await adminService.updateUser(editUser.id, data);
      } else {
        const api = (await import('../../services/api')).default;
        await api.post('/auth/register', form);
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  }

  async function handleDeactivate(user) {
    if (!confirm(`${user.full_name} kullanıcısını pasife almak istediğinize emin misiniz?`)) return;
    try {
      await adminService.deactivateUser(user.id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  }

  const roleLabels = { admin: 'Admin', manager: 'Yönetici', employee: 'Çalışan' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Kullanıcı Yönetimi" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Kullanıcılar</h1>
              <p className="page-subtitle">Sistem kullanıcılarını yönetin</p>
            </div>
            <button className="btn btn-primary" onClick={openNew}>+ Yeni Kullanıcı</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              type="text" className="form-input" placeholder="Ara..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">Tüm Roller</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Kullanıcı Adı</th>
                    <th>E-posta</th>
                    <th>Rol</th>
                    <th>Departman</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.full_name}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role === 'admin' ? 'urgent' : u.role === 'manager' ? 'progress' : 'done'}`}>
                          {roleLabels[u.role]}
                        </span>
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-done' : 'badge-todo'}`}>
                          {u.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEdit(u)} title="Düzenle">✏️</button>
                          {u.is_active && u.role !== 'admin' && (
                            <button className="btn-icon" onClick={() => handleDeactivate(u)} title="Pasife Al" style={{ color: 'var(--danger)' }}>🚫</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <h2 className="modal-title">{editUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ad Soyad *</label>
                      <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kullanıcı Adı *</label>
                      <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required disabled={!!editUser} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">E-posta *</label>
                      <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{editUser ? 'Şifre (değiştirmek için)' : 'Şifre *'}</label>
                      <input type="password" className="form-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Rol</label>
                      <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Departman</label>
                      <input className="form-input" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pozisyon</label>
                    <select className="form-select" value={form.position} onChange={e => setForm({...form, position: e.target.value})}>
                      <option value="">Seçiniz</option>
                      <option value="Sistem Yöneticisi">Sistem Yöneticisi</option>
                      <option value="Proje Yöneticisi">Proje Yöneticisi</option>
                      <option value="Takım Lideri">Takım Lideri</option>
                      <option value="Yazılım Geliştirici">Yazılım Geliştirici</option>
                      <option value="Tasarımcı">Tasarımcı</option>
                      <option value="Test Uzmanı">Test Uzmanı</option>
                      <option value="Sistem Analisti">Sistem Analisti</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary">{editUser ? 'Güncelle' : 'Oluştur'}</button>
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
