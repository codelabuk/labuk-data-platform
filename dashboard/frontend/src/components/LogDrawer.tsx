import { useApp } from '../context/AppContext'
import styles from './LogDrawer.module.css'

export function LogDrawer() {
  const { logDrawer, closeLogs, refreshLogs } = useApp()
  if (!logDrawer.open) return null

  return (
    <div className={styles.drawer}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>LOGS</span>
          <span className={styles.podName}>{logDrawer.pod}</span>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-sm" onClick={refreshLogs}>&#8635; Refresh</button>
          <button className="btn btn-sm" onClick={closeLogs}>&#10005; Close</button>
        </div>
      </div>
      <pre className={styles.body}>{logDrawer.loading ? 'Loading…' : logDrawer.body}</pre>
    </div>
  )
}
