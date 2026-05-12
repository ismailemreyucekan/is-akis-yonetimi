import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import riskService from '../../services/riskService';
import projectService from '../../services/projectService';
import api from '../../services/api';

const SEVERITY_LABELS = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik' };
const SEVERITY_COLORS = { low: 'var(--text-muted)', medium: 'var(--warning)', high: '#f97316', critical: 'var(--danger)' };
const STATUS_LABELS = { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapatıldı' };
const STATUS_BADGE = { open: 'urgent', in_progress: 'progress', resolved: 'done', closed: 'todo' };
const TYPE_LABELS = { risk: 'Risk', issue: 'Sorun' };

export default function RiskTracker() {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRisk, setEditRisk] = useState(null);
  const [detailRisk, setDetailRisk] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [filters, setFilters] = useState({ severity: '', status: '', type: '' });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [form, setForm] = useState({
    title: '', description: '', risk_type: 'risk', severity: 'medium',
    status: 'open', probability: 'medium', impact: 'medium',
    assignees: [], project_id: '', deadline: '', mitigation_plan: '', resolution_notes: ''
  });

  async function loadData() {
    try {
      const params = {};
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const [riskData, statsData, usersData, projData] = await Promise.all([
        riskService.getRisks(params),
        riskService.getStats(),
        api.get('/auth/users'),
        projectService.getProjects().catch(() => ({ projects: [] }))
      ]);
      setRisks(riskData.risks);
      setStats(statsData.stats);
      setUsers(usersData.data.users);
      setProjects(projData.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filters]);

  function openCreate() {
    setEditRisk(null);
    setForm({
      title: '', description: '', risk_type: 'risk', severity: 'medium',
      status: 'open', probability: 'medium', impact: 'medium',
      assignees: [], project_id: '', deadline: '', mitigation_plan: '', resolution_notes: ''
    });
    setShowModal(true);
  }

  function openEdit(r) {
    setEditRisk(r);
    setForm({
      title: r.title, description: r.description || '', risk_type: r.risk_type,
      severity: r.severity, status: r.status, probability: r.probability || 'medium',
      impact: r.impact || 'medium', assignees: r.assignees?.map(a => a.id) || [],
      project_id: r.project_id || '', deadline: r.deadline?.slice(0, 16) || '',
      mitigation_plan: r.mitigation_plan || '', resolution_notes: r.resolution_notes || ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.project_id) payload.project_id = Number(payload.project_id);
      if (!payload.project_id) delete payload.project_id;
      if (!payload.deadline) delete payload.deadline;

      if (editRisk) {
        await riskService.updateRisk(editRisk.id, payload);
      } else {
        await riskService.createRisk(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu riski silmek istediğinize emin misiniz?')) return;
    try {
      await riskService.deleteRisk(id);
      loadData();
      setDetailRisk(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Silinemedi');
    }
  }

  async function handleQuickStatus(id, status) {
    try {
      await riskService.updateRisk(id, { status });
      loadData();
    } catch {}
  }

  function getSeverityDot(severity) {
    return (
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: SEVERITY_COLORS[severity], marginRight: 6
      }} />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Risk & Sorun Takibi" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Risk & Sorun Yönetimi</h1>
                  <p className="page-subtitle">Proje risklerini ve sorunlarını takip edin</p>
                </div>
                {canManage && (
                  <button className="btn btn-primary" onClick={openCreate}>
                    ➕ Yeni Risk/Sorun
                  </button>
                )}
              </div>

              {/* Stats */}
              {stats && (
                <div className="stats-grid animate-in">
                  {[
                    { icon: '📊', label: 'Toplam', value: stats.total, color: 'var(--accent)' },
                    { icon: '🔴', label: 'Kritik', value: stats.critical, color: 'var(--danger)' },
                    { icon: '🟠', label: 'Yüksek', value: stats.high, color: '#f97316' },
                    { icon: '🟡', label: 'Açık', value: stats.open, color: 'var(--warning)' },
                    { icon: '🔵', label: 'İşlemde', value: stats.in_progress, color: 'var(--info)' },
                    { icon: '✅', label: 'Çözülen', value: stats.resolved, color: 'var(--success)' },
                    { icon: '⚠️', label: 'Geciken', value: stats.overdue, color: 'var(--danger)' },
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

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 'auto', minWidth: 130 }}
                        value={filters.severity}
                        onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}>
                  <option value="">Tüm Ciddiyet</option>
                  <option value="critical">Kritik</option>
                  <option value="high">Yüksek</option>
                  <option value="medium">Orta</option>
                  <option value="low">Düşük</option>
                </select>
                <select className="form-select" style={{ width: 'auto', minWidth: 130 }}
                        value={filters.status}
                        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                  <option value="">Tüm Durum</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">İşlemde</option>
                  <option value="resolved">Çözüldü</option>
                  <option value="closed">Kapatıldı</option>
                </select>
                <select className="form-select" style={{ width: 'auto', minWidth: 130 }}
                        value={filters.type}
                        onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
                  <option value="">Tüm Tipler</option>
                  <option value="risk">Risk</option>
                  <option value="issue">Sorun</option>
                </select>
              </div>

              {/* Risk List */}
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  {risks.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">🛡️</span>
                      <div className="empty-state-title">Risk/Sorun bulunamadı</div>
                      <p className="empty-state-text">Yeni bir risk veya sorun eklemek için butonu kullanın.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Başlık</th>
                          <th>Tip</th>
                          <th>Ciddiyet</th>
                          <th>Durum</th>
                          <th>Atanan</th>
                          <th>Son Tarih</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {risks.map(r => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                                   onClick={() => setDetailRisk(r)}>
                                {r.title}
                              </div>
                              {r.project_name && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📁 {r.project_name}</div>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${r.risk_type === 'risk' ? 'badge-medium' : 'badge-high'}`}>
                                {TYPE_LABELS[r.risk_type]}
                              </span>
                            </td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem' }}>
                                {getSeverityDot(r.severity)}
                                <span style={{ fontWeight: 600, color: SEVERITY_COLORS[r.severity] }}>
                                  {SEVERITY_LABELS[r.severity]}
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${STATUS_BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {r.assignees?.length > 0 ? r.assignees.map(a => a.full_name).join(', ') : '—'}
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {r.deadline ? new Date(r.deadline).toLocaleDateString('tr-TR') : '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-icon" title="Detay" onClick={() => setDetailRisk(r)}>👁️</button>
                                {canManage && (
                                  <>
                                    <button className="btn-icon" title="Düzenle" onClick={() => openEdit(r)}>✏️</button>
                                    <button className="btn-icon" title="Sil" onClick={() => handleDelete(r.id)}>🗑️</button>
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
              <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{editRisk ? 'Risk/Sorun Düzenle' : 'Yeni Risk/Sorun'}</h2>
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
                      <label className="form-label">Tip</label>
                      <select className="form-select" value={form.risk_type}
                              onChange={e => setForm(p => ({ ...p, risk_type: e.target.value }))}>
                        <option value="risk">Risk</option>
                        <option value="issue">Sorun</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ciddiyet</label>
                      <select className="form-select" value={form.severity}
                              onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="critical">Kritik</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Olasılık</label>
                      <select className="form-select" value={form.probability}
                              onChange={e => setForm(p => ({ ...p, probability: e.target.value }))}>
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Etki</label>
                      <select className="form-select" value={form.impact}
                              onChange={e => setForm(p => ({ ...p, impact: e.target.value }))}>
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Durum</label>
                      <select className="form-select" value={form.status}
                              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="open">Açık</option>
                        <option value="in_progress">İşlemde</option>
                        <option value="resolved">Çözüldü</option>
                        <option value="closed">Kapatıldı</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Son Tarih</label>
                      <input className="form-input" type="datetime-local" value={form.deadline}
                             onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
                    </div>
                  </div>
                    <div className="form-group">
                      <label className="form-label">Proje</label>
                      <select className="form-select" value={form.project_id}
                              onChange={e => setForm(p => ({ ...p, project_id: e.target.value, assignees: [] }))}>
                        <option value="">Seçiniz</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {form.project_id && (
                    <div className="form-group">
                      <label className="form-label">Atanan Kişiler (Proje Üyeleri)</label>
                      <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                        {projects.find(p => p.id === Number(form.project_id))?.members?.map(m => (
                          <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={form.assignees.includes(m.user_id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setForm(p => ({ ...p, assignees: [...p.assignees, m.user_id] }));
                                } else {
                                  setForm(p => ({ ...p, assignees: p.assignees.filter(id => id !== m.user_id) }));
                                }
                              }} 
                            />
                            {m.user_name}
                          </label>
                        ))}
                        {(!projects.find(p => p.id === Number(form.project_id))?.members || projects.find(p => p.id === Number(form.project_id)).members.length === 0) && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bu projeye kayıtlı üye bulunmuyor.</div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea className="form-textarea" rows={3} value={form.description}
                              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Azaltma Planı</label>
                    <textarea className="form-textarea" rows={3} value={form.mitigation_plan}
                              placeholder="Bu riskin etkisini azaltmak için planlanan aksiyonlar..."
                              onChange={e => setForm(p => ({ ...p, mitigation_plan: e.target.value }))} />
                  </div>
                  {editRisk && (
                    <div className="form-group">
                      <label className="form-label">Çözüm Notları</label>
                      <textarea className="form-textarea" rows={2} value={form.resolution_notes}
                                onChange={e => setForm(p => ({ ...p, resolution_notes: e.target.value }))} />
                    </div>
                  )}
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary">{editRisk ? 'Güncelle' : 'Oluştur'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {detailRisk && (
            <div className="modal-overlay" onClick={() => setDetailRisk(null)}>
              <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{detailRisk.title}</h2>
                  <button className="modal-close" onClick={() => setDetailRisk(null)}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span className={`badge ${detailRisk.risk_type === 'risk' ? 'badge-medium' : 'badge-high'}`}>
                    {TYPE_LABELS[detailRisk.risk_type]}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                                 borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600,
                                 background: `${SEVERITY_COLORS[detailRisk.severity]}18`,
                                 color: SEVERITY_COLORS[detailRisk.severity] }}>
                    {SEVERITY_LABELS[detailRisk.severity]}
                  </span>
                  <span className={`badge badge-${STATUS_BADGE[detailRisk.status]}`}>
                    {STATUS_LABELS[detailRisk.status]}
                  </span>
                </div>

                <div className="grid-2-col" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                  <div><strong>Olasılık:</strong> {detailRisk.probability}</div>
                  <div><strong>Etki:</strong> {detailRisk.impact}</div>
                  <div><strong>Atananlar:</strong> {detailRisk.assignees?.length > 0 ? detailRisk.assignees.map(a => a.full_name).join(', ') : '—'}</div>
                  <div><strong>Proje:</strong> {detailRisk.project_name || '—'}</div>
                  <div><strong>Son Tarih:</strong> {detailRisk.deadline ? new Date(detailRisk.deadline).toLocaleDateString('tr-TR') : '—'}</div>
                  <div><strong>Oluşturan:</strong> {detailRisk.creator_name}</div>
                </div>

                {detailRisk.description && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>📝 Açıklama</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {detailRisk.description}
                    </p>
                  </div>
                )}

                {detailRisk.mitigation_plan && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>🛡️ Azaltma Planı</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                  background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                      {detailRisk.mitigation_plan}
                    </div>
                  </div>
                )}

                {detailRisk.resolution_notes && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: 6 }}>✅ Çözüm Notları</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                  background: 'var(--bg-input)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                      {detailRisk.resolution_notes}
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => { openEdit(detailRisk); setDetailRisk(null); }}>
                      ✏️ Düzenle
                    </button>
                    {detailRisk.status === 'open' && (
                      <button className="btn btn-primary" onClick={() => { handleQuickStatus(detailRisk.id, 'in_progress'); setDetailRisk(null); }}>
                        ▶ İşleme Al
                      </button>
                    )}
                    {detailRisk.status === 'in_progress' && (
                      <button className="btn btn-primary" onClick={() => { handleQuickStatus(detailRisk.id, 'resolved'); setDetailRisk(null); }}>
                        ✅ Çözüldü
                      </button>
                    )}
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
