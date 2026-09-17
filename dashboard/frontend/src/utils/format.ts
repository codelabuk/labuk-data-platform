import type { PodLabels } from '../types/api'

export function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function fmtLabel(labels: PodLabels | null | undefined) {
  if (!labels || !Object.keys(labels).length) return '—'
  return labels['spark-role'] || labels['app'] || Object.values(labels)[0] || '—'
}
