const STATUS_MAP: Record<string, string> = {
  running: 'running', completed: 'completed', succeeded: 'completed',
  pending: 'pending', containercreating: 'pending',
  failed: 'failed', error: 'failed',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status || '').toLowerCase()
  const cls = STATUS_MAP[s] || 'unknown'
  return (
    <span className={`badge badge-${cls}`}>
      <span className="badge-dot" />{s || 'unknown'}
    </span>
  )
}

const TYPE_MAP: Record<string, string> = { Scala: 'scala', Python: 'python', Java: 'java' }

export function TypeBadge({ type }: { type: string | null | undefined }) {
  const cls = TYPE_MAP[type || ''] || 'unknown'
  return <span className={`badge badge-${cls}`}>{type || '—'}</span>
}
