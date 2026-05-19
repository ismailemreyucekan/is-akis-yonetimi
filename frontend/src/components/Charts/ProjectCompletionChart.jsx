import { useState, useEffect } from 'react';
import {
  TrendingUp, CheckCircle, Clock, Archive, BarChart2,
  MessageSquare, AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import taskService from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY = 'project_notes_v1';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveNotes(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ─── Animasyonlu bar ──────────────────────────────────────────────────────────
function AnimatedBar({ pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-input)', overflow: 'hidden', flex: 1 }}>
      <div style={{
        height: '100%', width: `${width}%`, borderRadius: 99,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        transition: 'width 700ms cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 8px ${color}55`,
      }} />
    </div>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }) {
  const r = 44, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-input)" strokeWidth={14} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = circ * pct;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={14}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${-90 + offset * 360 / total}deg)`,
              transition: 'stroke-dasharray 800ms ease',
              filter: `drop-shadow(0 0 4px ${seg.color}66)`,
            }}
          />
        );
        offset += seg.value;
        return el;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="9">PROJE</text>
    </svg>
  );
}

// ─── Not / Uyarı paneli ───────────────────────────────────────────────────────
function NotesPanel({ projectId, projectName, onClose }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(() => (loadNotes()[projectId] || []));
  const [text, setText] = useState('');
  const [type, setType] = useState('note'); // 'note' | 'warning'

  function addNote() {
    if (!text.trim()) return;
    const newNote = {
      id: Date.now(),
      type,
      text: text.trim(),
      author: user?.full_name || user?.username || 'Kullanıcı',
      createdAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    const all = loadNotes();
    all[projectId] = updated;
    saveNotes(all);
    setText('');
  }

  function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    const all = loadNotes();
    all[projectId] = updated;
    saveNotes(all);
  }

  const warnings = notes.filter(n => n.type === 'warning');
  const regularNotes = notes.filter(n => n.type === 'note');

  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-color)',
      borderTop: 'none',
    }}>
      {/* Panel başlık */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--bg-input)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={14} color="var(--accent)" />
          {projectName} — Notlar & Uyarılar
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Uyarılar bölümü */}
        {warnings.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f0b429', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> UYARILAR
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {warnings.map(n => (
                <NoteItem key={n.id} note={n} onDelete={deleteNote} />
              ))}
            </div>
          </div>
        )}

        {/* Notlar bölümü */}
        {regularNotes.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={11} /> NOTLAR
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {regularNotes.map(n => (
                <NoteItem key={n.id} note={n} onDelete={deleteNote} />
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
            Henüz not veya uyarı eklenmemiş
          </p>
        )}

        {/* Yeni not formu */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          paddingTop: 10, borderTop: '1px solid var(--border-color)'
        }}>
          {/* Tip seçici */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { val: 'note',    label: '📝 Not',   color: 'var(--accent)' },
              { val: 'warning', label: '⚠️ Uyarı', color: '#f0b429'       },
            ].map(opt => (
              <button key={opt.val} onClick={() => setType(opt.val)} style={{
                flex: 1, padding: '5px 0', border: '1px solid',
                borderColor: type === opt.val ? opt.color : 'var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: type === opt.val ? opt.color + '18' : 'transparent',
                color: type === opt.val ? opt.color : 'var(--text-muted)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms',
              }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Metin alanı */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addNote(); }}
            placeholder={type === 'warning' ? 'Uyarı mesajını yazın... (Ctrl+Enter gönderir)' : 'Notunuzu yazın... (Ctrl+Enter gönderir)'}
            rows={2}
            style={{
              width: '100%', padding: '8px 10px', resize: 'vertical',
              background: 'var(--bg-input)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
              borderColor: type === 'warning' ? '#f0b42955' : 'var(--border-color)',
            }}
          />

          <button onClick={addNote} disabled={!text.trim()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 'var(--radius-md)', border: 'none',
            background: type === 'warning' ? '#f0b429' : 'var(--accent)',
            color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            opacity: text.trim() ? 1 : 0.5, transition: 'opacity 150ms',
          }}>
            <Plus size={13} />
            {type === 'warning' ? 'Uyarı Ekle' : 'Not Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tek not satırı ───────────────────────────────────────────────────────────
function NoteItem({ note, onDelete }) {
  const isWarn = note.type === 'warning';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 10px', borderRadius: 'var(--radius-sm)',
      background: isWarn ? '#f0b42912' : 'var(--bg-input)',
      border: `1px solid ${isWarn ? '#f0b42930' : 'var(--border-color)'}`,
    }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>
        {isWarn ? <AlertTriangle size={12} color="#f0b429" /> : <MessageSquare size={12} color="var(--accent)" />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {note.text}
        </p>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 8 }}>
          <span>{note.author}</span>
          <span>{new Date(note.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <button onClick={() => onDelete(note.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', padding: 2, flexShrink: 0,
        borderRadius: 'var(--radius-sm)', transition: 'color 150ms',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function ProjectCompletionChart({ projects = [] }) {
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading]               = useState(true);
  const [expandedId, setExpandedId]         = useState(null);
  const [allNotes, setAllNotes]             = useState(loadNotes());

  useEffect(() => {
    if (!projects.length) { setLoading(false); return; }
    Promise.all(
      projects.map(p =>
        taskService.getTasks({ project_id: p.id, per_page: 200 })
          .then(r => ({ id: p.id, tasks: r.tasks || [] }))
          .catch(() => ({ id: p.id, tasks: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ id, tasks }) => { map[id] = tasks; });
      setTasksByProject(map);
      setLoading(false);
    });
  }, [projects]);

  // Notlar güncellendiğinde yeniden oku
  function refreshNotes() { setAllNotes(loadNotes()); }

  const projectStats = projects.map(p => {
    const tasks  = tasksByProject[p.id] || [];
    const total  = tasks.length || p.task_count || 0;
    const done   = tasks.filter(t => t.status === 'done').length;
    const inProg = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const todo   = tasks.filter(t => t.status === 'todo').length;
    const pct    = total > 0 ? Math.round((done / total) * 100) : (p.status === 'completed' ? 100 : 0);
    const noteCount = (allNotes[p.id] || []).length;
    const warnCount = (allNotes[p.id] || []).filter(n => n.type === 'warning').length;
    return { ...p, total, done, inProg, review, todo, pct, noteCount, warnCount };
  }).sort((a, b) => b.pct - a.pct);

  const statusCounts = {
    active:    projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived:  projects.filter(p => p.status === 'archived').length,
  };
  const donutSegments = [
    { label: 'Tamamlandı', value: statusCounts.completed, color: '#3ecf8e' },
    { label: 'Aktif',      value: statusCounts.active,    color: '#5b6abf' },
    { label: 'Arşivlendi', value: statusCounts.archived,  color: '#6b7280' },
  ].filter(s => s.value > 0);

  const avgPct = projectStats.length
    ? Math.round(projectStats.reduce((s, p) => s + p.pct, 0) / projectStats.length)
    : 0;

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-body">
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="var(--accent)" />
            Proje Tamamlanma Durumu
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-bg)', borderRadius: 'var(--radius-md)',
            padding: '4px 10px', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600
          }}>
            <TrendingUp size={13} /> Ort. %{avgPct}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Henüz proje yok
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 20, alignItems: 'start' }}>

            {/* SOL — Proje listesi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectStats.map((p, i) => (
                <div key={p.id}>
                  {/* Proje satırı */}
                  <div
                    onClick={() => { toggleExpand(p.id); refreshNotes(); }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      background: expandedId === p.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                      borderRadius: expandedId === p.id ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                      border: `1px solid ${expandedId === p.id ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderBottom: expandedId === p.id ? 'none' : undefined,
                      transition: 'all 150ms',
                    }}
                  >
                    {/* Üst satır */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: p.pct === 100 ? 'rgba(62,207,142,0.15)' : 'var(--bg-secondary)',
                          color: p.pct === 100 ? '#3ecf8e' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </span>
                        {/* Not/Uyarı rozet */}
                        {p.warnCount > 0 && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99,
                            background: '#f0b42920', color: '#f0b429', fontWeight: 700,
                          }}>
                            <AlertTriangle size={9} /> {p.warnCount}
                          </span>
                        )}
                        {p.noteCount > p.warnCount && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99,
                            background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700,
                          }}>
                            <MessageSquare size={9} /> {p.noteCount - p.warnCount}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Görev sayaçları */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { val: p.done,   color: '#3ecf8e', title: 'Tamamlandı' },
                            { val: p.inProg, color: '#f0b429', title: 'Devam Ediyor' },
                            { val: p.review, color: '#4a9eff', title: 'İncelemede' },
                            { val: p.todo,   color: '#6b7280', title: 'Yapılacak' },
                          ].filter(x => x.val > 0).map((x, j) => (
                            <span key={j} title={x.title} style={{
                              fontSize: '0.68rem', padding: '1px 5px', borderRadius: 4,
                              background: x.color + '18', color: x.color, fontWeight: 600,
                            }}>{x.val}</span>
                          ))}
                        </div>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 700, minWidth: 34, textAlign: 'right',
                          color: p.pct === 100 ? '#3ecf8e' : p.pct >= 70 ? '#f0b429' : 'var(--text-secondary)',
                        }}>%{p.pct}</span>
                        {expandedId === p.id
                          ? <ChevronUp size={14} color="var(--accent)" />
                          : <ChevronDown size={14} color="var(--text-muted)" />
                        }
                      </div>
                    </div>

                    {/* Progress bar */}
                    <AnimatedBar
                      pct={p.pct}
                      color={p.pct === 100 ? '#3ecf8e' : p.pct >= 70 ? '#f0b429' : '#5b6abf'}
                      delay={i * 80}
                    />
                  </div>

                  {/* Not paneli aç/kapa butonu — her zaman görünür */}
                  {/* ── Not / Uyarı aç-kapa butonu ── */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); refreshNotes(); }}
                    onMouseEnter={e => {
                      if (expandedId !== p.id) {
                        e.currentTarget.style.background = 'var(--accent-bg)';
                        e.currentTarget.style.color = 'var(--accent)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (expandedId !== p.id) {
                        e.currentTarget.style.background = 'var(--bg-input)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '8px 14px',
                      background: expandedId === p.id ? 'var(--accent-bg)' : 'var(--bg-input)',
                      border: `1px solid ${expandedId === p.id ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderTop: 'none',
                      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                      cursor: 'pointer',
                      color: expandedId === p.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      transition: 'all 180ms ease',
                      boxShadow: expandedId === p.id ? 'inset 0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {expandedId === p.id
                      ? <ChevronUp size={13} />
                      : <MessageSquare size={13} />
                    }
                    <span>
                      {expandedId === p.id ? 'Notları Kapat' : '💬 Not & Uyarı Ekle'}
                    </span>
                    {p.noteCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 18, height: 18, padding: '0 5px',
                        background: expandedId === p.id ? 'var(--accent)' : 'rgba(91,106,191,0.15)',
                        color: expandedId === p.id ? '#fff' : '#5b6abf',
                        borderRadius: 99,
                        fontSize: '0.68rem', fontWeight: 700,
                        lineHeight: 1,
                      }}>{p.noteCount}</span>
                    )}
                    {expandedId === p.id && <ChevronDown size={0} style={{ display: 'none' }} />}
                  </button>

                  {/* Not/Uyarı paneli */}
                  {expandedId === p.id && (
                    <NotesPanel
                      projectId={p.id}
                      projectName={p.name}
                      onClose={() => { setExpandedId(null); refreshNotes(); }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* SAĞ — Donut + legend */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <DonutChart segments={donutSegments} size={130} />
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Tamamlandı', value: statusCounts.completed, color: '#3ecf8e', icon: <CheckCircle size={12} /> },
                  { label: 'Aktif',      value: statusCounts.active,    color: '#5b6abf', icon: <Clock size={12} />        },
                  { label: 'Arşivlendi',value: statusCounts.archived,   color: '#6b7280', icon: <Archive size={12} />      },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                    background: item.value > 0 ? item.color + '10' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: item.color }}>
                      {item.icon}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.value > 0 ? item.color : 'var(--text-muted)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)', border: '1px solid var(--border-color)', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: avgPct >= 70 ? '#3ecf8e' : avgPct >= 40 ? '#f0b429' : '#5b6abf' }}>
                  %{avgPct}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Genel İlerleme</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
