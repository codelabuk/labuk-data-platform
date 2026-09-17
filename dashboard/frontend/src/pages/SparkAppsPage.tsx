import { useNavigate } from 'react-router-dom'
import { deleteSparkApp } from '../api/client'
import { StatusBadge, TypeBadge } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { fmtDate } from '../utils/format'

export function SparkAppsPage() {
  const { apps, namespace, refresh, toast, connStatus } = useApp()
  const navigate = useNavigate()

  async function handleDelete(name: string) {
    if (connStatus !== 'live') { toast('Not connected to API', 'error'); return }
    if (!confirm(`Delete SparkApplication "${name}"?`)) return
    await deleteSparkApp(name, namespace)
    toast(`Deleted "${name}"`, 'success')
    refresh()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Spark applications</div>
          <div className="page-sub">SparkApplication CRDs managed by Spark Operator</div>
        </div>
        <button className="btn btn-success" onClick={() => navigate('/deploy')}>+ Deploy new job</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Applications</span>
          <span className="panel-hint">{apps.length} total</span>
        </div>
        {!apps.length ? (
          <div className="tbl-wrap"><table>
            <tbody><tr className="empty-row"><td colSpan={6}>No SparkApplications found — submit a job from Deploy job page</td></tr></tbody>
          </table></div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead>
              <tr>
                <th style={{ width: '26%' }}>Name</th>
                <th style={{ width: '12%' }}>State</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '28%' }}>Image</th>
                <th style={{ width: '13%' }}>Created</th>
                <th style={{ width: '11%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.name}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }} title={a.name}>{a.name}</td>
                  <td><StatusBadge status={a.state} /></td>
                  <td><TypeBadge type={a.type} /></td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }} title={a.image || ''}>{(a.image || '—').replace('apache/', '')}</td>
                  <td style={{ color: 'var(--text3)' }}>{fmtDate(a.created)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.name)}>delete</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
