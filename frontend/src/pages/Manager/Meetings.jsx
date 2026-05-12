import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import meetingService from '../../services/meetingService';
import api from '../../services/api';

const STATUS_LABELS = { scheduled: 'Planlandı', completed: 'Tamamlandı', cancelled: 'İptal' };
const STATUS_BADGE = { scheduled: 'progress', completed: 'done', cancelled: 'urgent' };

export default function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [users, setUsers] = useState([]);

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [form, setForm] = useState({
    title: '', description: '', agenda: '', start_time: '', end_time: '',
    location: '', meeting_link: '', project_id: '', participants: []
  });

  async function loadData() {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const [meetData, statsData, usersData] = await Promise.all([
        meetingService.getMeetings(params),
        meetingService.getStats(),
        api.get('/auth/users')
      ]);
      setMeetings(meetData.meetings);
      setStats(statsData.stats);
      setUsers(usersData.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filter]);

  function openCreate() {
    setEditMeeting(null);
    setForm({ title: '', description: '', agenda: '', start_time: '', end_time: '',
              location: '', meeting_link: '', project_id: '', participants: [] });
    setShowModal(true);
  }

  function openEdit(m) {
    setEditMeeting(m);
    setForm({
      title: m.title, description: m.description || '', agenda: m.agenda || '',
      start_time: m.start_time?.slice(0, 16) || '', end_time: m.end_time?.slice(0, 16) || '',
      location: m.location || '', meeting_link: m.meeting_link || '',
      project_id: m.project_id || '',
      participants: m.participants?.map(p => p.user_id) || []
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { ...form, participants: form.participants.map(Number) };
      if (editMeeting) {
        await meetingService.updateMeeting(editMeeting.id, payload);
      } else {
        await meetingService.createMeeting(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu toplantıyı silmek istediğinize emin misiniz?')) return;
    try {
      await meetingService.deleteMeeting(id);
      loadData();
      setDetailMeeting(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Silinemedi');
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await meetingService.updateStatus(id, status);
      loadData();
      if (detailMeeting?.id === id) {
        const updated = await meetingService.getMeeting(id);
        setDetailMeeting(updated.meeting);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Durum güncellenemedi');
    }
  }

  async function handleSaveNotes(id, notes, outcomes) {
    try {
      await meetingService.updateNotes(id, notes, outcomes);
      loadData();
    } catch (err) {
      alert('Notlar kaydedilemedi');
    }
  }

  function toggleParticipant(uid) {
    setForm(prev => ({
      ...prev,
      participants: prev.participants.includes(uid)
        ? prev.participants.filter(id => id !== uid)
        : [...prev.participants, uid]
    }));
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Toplantılar" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Toplantı Yönetimi</h1>
                  <p className="page-subtitle">Tüm toplantıları planlayın ve yönetin</p>
                </div>
                {canManage && (
                  <button className="btn btn-primary" onClick={openCreate}>
                    ➕ Yeni Toplantı
                  </button>
                )}
              </div>

              {/* Stats */}
              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: '📅', label: 'Toplam', value: stats.total, color: 'var(--accent)' },
                    { icon: '🟢', label: 'Planlanan', value: stats.scheduled, color: 'var(--warning)' },
                    { icon: '⏰', label: 'Yaklaşan', value: stats.upcoming, color: 'var(--info)' },
                    { icon: '✅', label: 'Tamamlanan', value: stats.completed, color: 'var(--success)' },
                    { icon: '❌', label: 'İptal', value: stats.cancelled, color: 'var(--danger)' },
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

              {/* Filter */}
              <div style={{ marginBottom: 16 }}>
                <div className="view-toggle">
                  {[
                    { key: 'all', label: 'Tümü' },
                    { key: 'scheduled', label: 'Planlanan' },
                    { key: 'completed', label: 'Tamamlanan' },
                    { key: 'cancelled', label: 'İptal' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`view-toggle-btn ${filter === f.key ? 'active' : ''}`}
                      onClick={() => setFilter(f.key)}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              {/* Meeting List */}
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  {meetings.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">📅</span>
                      <div className="empty-state-title">Toplantı bulunamadı</div>
                      <p className="empty-state-text">Yeni bir toplantı oluşturmak için yukarıdaki butonu kullanın.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Toplantı</th>
                          <th>Tarih & Saat</th>
                          <th>Konum</th>
                          <th>Katılımcılar</th>
                          <th>Durum</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.map(m => (
                          <tr key={m.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                                   onClick={() => setDetailMeeting(m)}>
                                {m.title}
                              </div>
                              {m.project_name && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📁 {m.project_name}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.82rem' }}>{formatDate(m.start_time)}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>→ {formatDate(m.end_time)}</div>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {m.location || m.meeting_link ? (
                                m.meeting_link ? (
                                  <a href={m.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem' }}>🔗 Online</a>
                                ) : m.location
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td>
                              <span className="badge badge-active">{m.participant_count} kişi</span>
                            </td>
                            <td>
                              <span className={`badge badge-${STATUS_BADGE[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-icon" title="Detay" onClick={() => setDetailMeeting(m)}>👁️</button>
                                {canManage && (
                                  <>
                                    <button className="btn-icon" title="Düzenle" onClick={() => openEdit(m)}>✏️</button>
                                    <button className="btn-icon" title="Sil" onClick={() => handleDelete(m.id)}>🗑️</button>
                                  </>
                                )}
                              </div>
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

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{editMeeting ? 'Toplantıyı Düzenle' : 'Yeni Toplantı'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Başlık *</label>
                    <input className="form-input" value={form.title}
                           onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Başlangıç *</label>
                      <input className="form-input" type="datetime-local" value={form.start_time}
                             onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bitiş *</label>
                      <input className="form-input" type="datetime-local" value={form.end_time}
                             onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Konum</label>
                      <input className="form-input" value={form.location}
                             onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Online Link</label>
                      <input className="form-input" value={form.meeting_link} placeholder="https://..."
                             onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gündem</label>
                    <textarea className="form-textarea" rows={3} value={form.agenda}
                              onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea className="form-textarea" rows={2} value={form.description}
                              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Katılımcılar</label>
                    <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)', padding: 8 }}>
                      {users.filter(u => u.id !== user.id).map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                                                    fontSize: '0.82rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={form.participants.includes(u.id)}
                                 onChange={() => toggleParticipant(u.id)} />
                          <span>{u.full_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({u.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary">{editMeeting ? 'Güncelle' : 'Oluştur'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {detailMeeting && (
            <div className="modal-overlay" onClick={() => setDetailMeeting(null)}>
              <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{detailMeeting.title}</h2>
                  <button className="modal-close" onClick={() => setDetailMeeting(null)}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span className={`badge badge-${STATUS_BADGE[detailMeeting.status]}`}>
                    {STATUS_LABELS[detailMeeting.status]}
                  </span>
                  {detailMeeting.project_name && (
                    <span className="badge badge-active">📁 {detailMeeting.project_name}</span>
                  )}
                </div>

                <div className="grid-2-col" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                  <div><strong>Başlangıç:</strong> {formatDate(detailMeeting.start_time)}</div>
                  <div><strong>Bitiş:</strong> {formatDate(detailMeeting.end_time)}</div>
                  <div><strong>Konum:</strong> {detailMeeting.location || '—'}</div>
                  <div><strong>Oluşturan:</strong> {detailMeeting.creator_name}</div>
                </div>

                {detailMeeting.meeting_link && (
                  <div style={{ marginBottom: 12 }}>
                    <a href={detailMeeting.meeting_link} target="_blank" rel="noreferrer"
                       className="btn btn-primary btn-sm">🔗 Toplantıya Katıl</a>
                  </div>
                )}

                {detailMeeting.agenda && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>📋 Gündem</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                  background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                      {detailMeeting.agenda}
                    </div>
                  </div>
                )}

                {detailMeeting.description && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>📝 Açıklama</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{detailMeeting.description}</p>
                  </div>
                )}

                {/* Participants */}
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: 8 }}>👥 Katılımcılar ({detailMeeting.participants?.length || 0})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {detailMeeting.participants?.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '6px 8px', background: 'var(--bg-input)',
                                                borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)' }}>
                          {p.user_name?.charAt(0)}
                        </div>
                        <span style={{ flex: 1 }}>{p.user_name}</span>
                        <span className={`badge badge-${p.status === 'accepted' ? 'done' : p.status === 'declined' ? 'urgent' : 'todo'}`}>
                          {p.status === 'accepted' ? 'Kabul' : p.status === 'declined' ? 'Red' : 'Davetli'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {(detailMeeting.notes || detailMeeting.outcomes) && (
                  <div style={{ marginBottom: 14 }}>
                    {detailMeeting.notes && (
                      <div style={{ marginBottom: 10 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>📝 Notlar</h4>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                      background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                          {detailMeeting.notes}
                        </div>
                      </div>
                    )}
                    {detailMeeting.outcomes && (
                      <div>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>🎯 Sonuçlar</h4>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                      background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                          {detailMeeting.outcomes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {canManage && detailMeeting.status === 'scheduled' && (
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => handleStatusChange(detailMeeting.id, 'cancelled')}>
                      ❌ İptal Et
                    </button>
                    <button className="btn btn-primary" onClick={() => handleStatusChange(detailMeeting.id, 'completed')}>
                      ✅ Tamamlandı
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
