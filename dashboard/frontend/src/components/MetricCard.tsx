export function MetricCard({ label, value, color }: { label: string; value: number | string; color?: 'green' | 'red' | 'blue' }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value${color ? ` ${color}` : ''}`}>{value}</div>
    </div>
  )
}
