import { useState, useEffect } from 'react';
import taskService from '../../services/taskService';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Yapılacak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'review', label: 'İncelemede' },
  { value: 'done', label: 'Tamamlandı' },
];
const PRIORITY_LABELS = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil' };
const ACTION_LABELS = {
  created: 'Görev oluşturuldu',
  status_changed: 'Durum güncellendi',
  assigned: 'Görev atandı',
  priority_changed: 'Öncelik değiştirildi',
  note: 'Not eklendi',
};

export default function TaskDetailModal({ task, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('detail');
  const [activity, setActivity] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);

  useEffect(() => {
    loadActivity();
  }, [task.id]);

  async function loadActivity() {
    try {
      const data = await taskService.getActivity(task.id);
      setActivity(data.activity);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      await taskService.updateTask(task.id, { status: newStatus });
      setCurrentStatus(newStatus);
      loadActivity();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await taskService.addNote(task.id, note);
      setNote('');
      loadActivity();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">{task.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'detail' ? 'active' : ''}`} onClick={() => setActiveTab('detail')}>Detay</button>
          <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Aktivite</button>
          <button className={`tab ${activeTab === 'note' ? 'active' : ''}`} onClick={() => setActiveTab('note')}>Not Ekle</button>
        </div>

        {activeTab === 'detail' && (
          <div>
            {task.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Açıklama</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Durum</div>
                <select
                  className="form-select"
                  value={currentStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Öncelik</div>
                <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Atanan</div>
                <span style={{ fontSize: '0.85rem' }}>{task.assignee_name || '—'}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Bitiş Tarihi</div>
                <span style={{ fontSize: '0.85rem' }}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Proje</div>
                <span style={{ fontSize: '0.85rem' }}>{task.project_name || '—'}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Etiket</div>
                <span style={{ fontSize: '0.85rem' }}>{task.label || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>Henüz aktivite yok</p>
            ) : (
              activity.map(log => (
                <div key={log.id} style={{
                  display: 'flex', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <span style={{ fontSize: '0.9rem', marginTop: 2 }}>
                    {log.action === 'note' ? '💬' : log.action === 'created' ? '➕' : log.action === 'status_changed' ? '🔄' : '📋'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem' }}>
                      <strong>{log.user_name}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}> {ACTION_LABELS[log.action] || log.action}</span>
                    </div>
                    {log.old_value && log.new_value && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {log.old_value} → {log.new_value}
                      </div>
                    )}
                    {log.message && (
                      <div style={{
                        fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4,
                        background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--accent)'
                      }}>
                        {log.message}
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'note' && (
          <form onSubmit={handleAddNote}>
            <div className="form-group">
              <label className="form-label">Not / Yorum</label>
              <textarea
                className="form-textarea"
                placeholder="Bu görev hakkında not yazın... (ör: Bu görevi şu şekilde tamamladım...)"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={!note.trim() || submitting}>
                {submitting ? 'Gönderiliyor...' : '💬 Not Ekle'}
              </button>
            </div>
          </form>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { onUpdate(); }}>Kapat & Yenile</button>
        </div>
      </div>
    </div>
  );
}
