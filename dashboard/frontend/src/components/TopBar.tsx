import { useApp } from '../context/AppContext'
import styles from './TopBar.module.css'

export function TopBar() {
  const { namespace, setNamespace, namespaces, refresh, lastRefresh } = useApp()

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <select
          className={styles.nsSelect}
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
        >
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={refresh}>&#8635; Refresh</button>
      </div>
      <div className={styles.lastRefresh}>
        {lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString()}` : ''}
      </div>
    </div>
  )
}
