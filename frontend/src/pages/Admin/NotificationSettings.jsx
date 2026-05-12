import { useState, useEffect } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Navbar from '../../components/Layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const TIMING_OPTIONS = [
  { value: 15, label: '15 dakika önce' },
  { value: 30, label: '30 dakika önce' },
  { value: 60, label: '1 saat önce' },
  { value: 120, label: '2 saat önce' },
  { value: 360, label: '6 saat önce' },
  { value: 720, label: '12 saat önce' },
  { value: 1440, label: '1 gün önce' },
  { value: 2880, label: '2 gün önce' },
  { value: 4320, label: '3 gün önce' },
  { value: 10080, label: '1 hafta önce' },
];

const TYPE_LABELS = {
  deadline: { icon: '⏰', title: 'Görev Son Tarihi', desc: 'Görevlerin son tarihine yaklaşıldığında hatırlatıcı gönder' },
  meeting: { icon: '📅', title: 'Toplantı Hatırlatıcı', desc: 'Toplantı başlamadan önce hatırlatıcı gönder' },
  overdue: { icon: '🔴', title: 'Gecikme Uyarısı', desc: 'Gecikmiş görevler için uyarı bildirimi gönder' },
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  async function loadConfigs() {
    try {
      const data = await notificationService.getConfig();
      setConfigs(data.configs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfigs(); }, []);

  function updateConfig(type, field, value) {
    setConfigs(prev => prev.map(c =>
      c.reminder_type === type ? { ...c, [field]: value } : c
    ));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = configs.map(c => ({
        reminder_type: c.reminder_type,
        timing_minutes: c.timing_minutes,
        is_active: c.is_active
      }));
      await notificationService.updateConfig(payload);
      alert('Ayarlar kaydedildi!');
    } catch (err) {
      alert('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleTriggerCheck() {
    try {
      const result = await notificationService.triggerReminderCheck();
      setCheckResult(result.results);
    } catch (err) {
      alert(err.response?.data?.error || 'Kontrol başarısız');
    }
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Bildirim Ayarları" />
        <div className="page-content">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Hatırlatıcı Ayarları</h1>
                  <p className="page-subtitle">Bildirim zamanlama ve hatırlatıcı tercihlerinizi yönetin</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canManage && (
                    <button className="btn btn-secondary" onClick={handleTriggerCheck}>
                      🔄 Kontrol Et
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
                  </button>
                </div>
              </div>

              {checkResult && (
                <div className="card" style={{ marginBottom: 16, borderColor: 'var(--success)' }}>
                  <div className="card-body">
                    <h3 className="section-title" style={{ marginBottom: 8, color: 'var(--success)' }}>
                      ✅ Hatırlatıcı Kontrolü Tamamlandı
                    </h3>
                    <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem' }}>
                      <span>⏰ Son Tarih: <strong>{checkResult.deadline_reminders}</strong></span>
                      <span>🔴 Gecikme: <strong>{checkResult.overdue_warnings}</strong></span>
                      <span>📅 Toplantı: <strong>{checkResult.meeting_reminders}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {configs.map(config => {
                  const meta = TYPE_LABELS[config.reminder_type] || {
                    icon: '🔔', title: config.reminder_type, desc: ''
                  };
                  return (
                    <div key={config.id} className="card">
                      <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
                            <span style={{ fontSize: '1.6rem' }}>{meta.icon}</span>
                            <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{meta.title}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{meta.desc}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <select
                              className="form-select"
                              style={{ width: 'auto', minWidth: 160, opacity: config.is_active ? 1 : 0.5 }}
                              value={config.timing_minutes}
                              onChange={e => updateConfig(config.reminder_type, 'timing_minutes', Number(e.target.value))}
                              disabled={!config.is_active}
                            >
                              {TIMING_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem' }}>
                              <input
                                type="checkbox"
                                checked={config.is_active}
                                onChange={e => updateConfig(config.reminder_type, 'is_active', e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                              />
                              Aktif
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="card" style={{ marginTop: 20, borderColor: 'var(--info)', borderStyle: 'dashed' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: '1.3rem' }}>💡</span>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Nasıl çalışır?</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.8 }}>
                      <li>Hatırlatıcılar, belirlenen zamanlama ayarına göre otomatik olarak oluşturulur.</li>
                      <li>Aynı olay için 24 saat içinde tekrar hatırlatıcı gönderilmez.</li>
                      <li>"Kontrol Et" butonu ile anlık kontrol tetikleyebilirsiniz.</li>
                      <li>Ayarları devre dışı bırakarak belirli bildirim türlerini kapatabilirsiniz.</li>
                    </ul>
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
