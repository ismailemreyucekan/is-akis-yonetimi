import './StatsCard.css';

export default function StatsCard({ icon, label, value, color, trend }) {
  return (
    <div className="stats-card glass-card" style={{ '--card-accent': color }}>
      <div className="stats-card-top">
        <span className="stats-card-icon">{icon}</span>
        {trend !== undefined && (
          <span className={`stats-card-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stats-card-value">{value}</div>
      <div className="stats-card-label">{label}</div>
      <div className="stats-card-glow"></div>
    </div>
  );
}
