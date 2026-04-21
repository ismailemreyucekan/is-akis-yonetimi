import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './WorkflowsPage.css';

export default function WorkflowsPage() {
  const { isAdmin } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [users, setUsers] = useState([]);
  const [startAssignee, setStartAssignee] = useState('');

  // Yeni iş akışı formu
  const [form, setForm] = useState({
    name: '',
    description: '',
    steps: [{ name: '', description: '' }]
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [wfData, instData, usersData] = await Promise.all([
        api.get('/workflows'),
        api.get('/workflows/instances'),
        api.get('/auth/users')
      ]);
      setWorkflows(wfData.data.workflows);
      setInstances(instData.data.instances);
      setUsers(usersData.data.users);
    } catch (err) {
      console.error('İş akışları yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  function addStep() {
    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, { name: '', description: '' }]
    }));
  }

  function removeStep(index) {
    if (form.steps.length <= 1) return;
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  }

  function updateStep(index, field, value) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/workflows', form);
      setShowModal(false);
      setForm({ name: '', description: '', steps: [{ name: '', description: '' }] });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'İş akışı oluşturulamadı');
    }
  }

  function openStartModal(workflow) {
    setSelectedWorkflow(workflow);
    setStartAssignee('');
    setShowStartModal(true);
  }

  async function handleStart() {
    try {
      await api.post(`/workflows/${selectedWorkflow.id}/start`, {
        assigned_to: startAssignee ? parseInt(startAssignee) : null
      });
      setShowStartModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'İş akışı başlatılamadı');
    }
  }

  async function handleAdvance(instanceId) {
    try {
      await api.post(`/workflows/instances/${instanceId}/advance`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'İş akışı ilerletilemedi');
    }
  }

  const STATUS_LABELS = {
    active: 'Aktif',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi'
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="İş Akışları" />
        <div className="page-content">
          {/* Header */}
          <div className="page-header animate-fade-in">
            <div>
              <h1 className="page-title">İş Akışları</h1>
              <p className="page-subtitle">İş akışlarınızı oluşturun ve yönetin</p>
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                ＋ Yeni İş Akışı
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              {/* İş Akışı Şablonları */}
              <div className="wf-section animate-fade-in">
                <h2 className="section-title" style={{ marginBottom: 16 }}>Şablonlar</h2>
                {workflows.length === 0 ? (
                  <div className="glass-card">
                    <div className="empty-state">
                      <div className="empty-state-icon">🔄</div>
                      <div className="empty-state-title">Henüz iş akışı yok</div>
                      <div className="empty-state-text">Bir iş akışı şablonu oluşturarak başlayın.</div>
                    </div>
                  </div>
                ) : (
                  <div className="wf-grid">
                    {workflows.map(wf => (
                      <div key={wf.id} className="wf-card glass-card">
                        <div className="wf-card-header">
                          <h3 className="wf-card-name">{wf.name}</h3>
                          <span className="wf-card-steps">{wf.step_count} adım</span>
                        </div>
                        {wf.description && (
                          <p className="wf-card-desc">{wf.description}</p>
                        )}
                        {wf.steps && (
                          <div className="wf-steps-preview">
                            {wf.steps.map((step, i) => (
                              <div key={step.id} className="wf-step-item">
                                <span className="wf-step-num">{i + 1}</span>
                                <span className="wf-step-name">{step.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', marginTop: 14 }}
                          onClick={() => openStartModal(wf)}
                        >
                          ▶ Başlat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Çalışan İş Akışları */}
              <div className="wf-section animate-slide-up" style={{ marginTop: 32 }}>
                <h2 className="section-title" style={{ marginBottom: 16 }}>Aktif İş Akışları</h2>
                {instances.length === 0 ? (
                  <div className="glass-card">
                    <div className="empty-state">
                      <div className="empty-state-icon">⏳</div>
                      <div className="empty-state-title">Aktif iş akışı yok</div>
                      <div className="empty-state-text">Bir şablonu başlatarak yeni bir iş akışı oluşturun.</div>
                    </div>
                  </div>
                ) : (
                  <div className="wf-instances">
                    {instances.map(inst => (
                      <div key={inst.id} className="wf-instance-card glass-card">
                        <div className="wf-instance-header">
                          <div>
                            <h3 className="wf-instance-name">{inst.workflow_name}</h3>
                            <span className="wf-instance-starter">
                              Başlatan: {inst.starter_name}
                            </span>
                          </div>
                          <span className={`badge badge-${inst.status === 'active' ? 'progress' : inst.status === 'completed' ? 'done' : 'todo'}`}>
                            {STATUS_LABELS[inst.status]}
                          </span>
                        </div>

                        {/* İlerleme Çubuğu */}
                        <div className="wf-progress">
                          <div className="wf-progress-bar">
                            <div
                              className="wf-progress-fill"
                              style={{
                                width: `${(inst.current_step / inst.total_steps) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="wf-progress-text">
                            {inst.current_step} / {inst.total_steps} adım
                          </span>
                        </div>

                        {inst.status === 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAdvance(inst.id)}
                            style={{ marginTop: 10 }}
                          >
                            Sonraki Adım →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Yeni İş Akışı Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
                <div className="modal-header">
                  <h2 className="modal-title">Yeni İş Akışı</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">İş Akışı Adı *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Örn: Proje Onay Süreci"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea
                      className="form-textarea"
                      placeholder="İş akışının kısa açıklaması"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Adımlar *</label>
                    <div className="wf-steps-form">
                      {form.steps.map((step, i) => (
                        <div key={i} className="wf-step-form-item">
                          <span className="wf-step-form-num">{i + 1}</span>
                          <div className="wf-step-form-fields">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Adım adı"
                              value={step.name}
                              onChange={(e) => updateStep(i, 'name', e.target.value)}
                              required
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Açıklama (opsiyonel)"
                              value={step.description}
                              onChange={(e) => updateStep(i, 'description', e.target.value)}
                            />
                          </div>
                          {form.steps.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => removeStep(i)}
                              style={{ color: '#f87171' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={addStep}
                      style={{ marginTop: 10 }}
                    >
                      ＋ Adım Ekle
                    </button>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Başlat Modal */}
          {showStartModal && selectedWorkflow && (
            <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                <div className="modal-header">
                  <h2 className="modal-title">İş Akışını Başlat</h2>
                  <button className="modal-close" onClick={() => setShowStartModal(false)}>✕</button>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                  <strong>{selectedWorkflow.name}</strong> iş akışını başlatmak üzeresiniz.
                </p>
                <div className="form-group">
                  <label className="form-label">Atanan Kişi (opsiyonel)</label>
                  <select
                    className="form-select"
                    value={startAssignee}
                    onChange={(e) => setStartAssignee(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowStartModal(false)}>
                    İptal
                  </button>
                  <button className="btn btn-primary" onClick={handleStart}>
                    ▶ Başlat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
