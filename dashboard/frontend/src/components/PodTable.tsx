import { useApp } from '../context/AppContext'
import { deletePod, sparkUiUrl } from '../api/client'
import type { Pod } from '../types/api'
import { fmtDate, fmtLabel } from '../utils/format'
import { StatusBadge } from './Badges'

export function PodTable({ pods, emptyMsg }: { pods: Pod[]; emptyMsg: string }) {
  const { namespace, openLogs, refresh, toast, connStatus, config } = useApp()

  async function handleDelete(name: string) {
    if (connStatus !== 'live') { toast('Not connected to API', 'error'); return }
    if (!confirm(`Delete pod "${name}"?`)) return
    await deletePod(name, namespace)
    toast(`Deleted pod "${name}"`, 'success')
    refresh()
  }

  if (!pods.length) {
    return (
      <div className="tbl-wrap"><table>
        <tbody><tr className="empty-row"><td colSpan={6}>{emptyMsg}</td></tr></tbody>
      </table></div>
    )
  }

  return (
    <div className="tbl-wrap"><table>
      <thead>
        <tr>
          <th style={{ width: '34%' }}>Name</th>
          <th style={{ width: '12%' }}>Status</th>
          <th style={{ width: '13%' }}>Role</th>
          <th style={{ width: '16%' }}>Node</th>
          <th style={{ width: '13%' }}>Created</th>
          <th style={{ width: '12%' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pods.map((p) => {
          const isDriver = p.labels?.['spark-role'] === 'driver'
          return (
            <tr key={p.name}>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }} title={p.name}>{p.name}</td>
              <td><StatusBadge status={p.status} /></td>
              <td style={{ color: 'var(--text2)' }}>{fmtLabel(p.labels)}</td>
              <td style={{ color: 'var(--text3)' }}>{p.node || '—'}</td>
              <td style={{ color: 'var(--text3)' }}>{fmtDate(p.created)}</td>
              <td>
                <button className="btn btn-sm" onClick={() => openLogs(p.name)}>logs</button>
                {isDriver && config && (
                  <a
                    href={sparkUiUrl(p, config.driverDomainSuffix)}
                    target="_blank" rel="noreferrer"
                    className="btn btn-sm" style={{ marginLeft: 4 }} title="Open Spark UI"
                  >UI</a>
                )}
                <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => handleDelete(p.name)}>del</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table></div>
  )
}
