import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import styles from './Sidebar.module.css'

const NAV_SECTIONS = [
  {
    label: 'Cluster',
    items: [
      { to: '/pods', icon: '⚆', label: 'Pods' },
      { to: '/apps', icon: '♲', label: 'Spark apps' },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { to: '/deploy', icon: '▶', label: 'Deploy job' },
      { to: '/files', icon: '▤', label: 'Files (MinIO)' },
    ],
  },
  {
    label: 'Observability',
    items: [{ to: '/history', icon: '☷', label: 'Spark history' }],
  },
]

export function Sidebar() {
  const { connStatus } = useApp()
  const connLabel = connStatus === 'live' ? 'Live' : connStatus === 'error' ? 'Offline' : 'Demo'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoTitle}>SparkK8sFlow</div>
        <div className={styles.logoSub}>spark on kubernetes</div>
      </div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className={styles.navSection}>{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </div>
      ))}
      <div className={styles.footer}>
        <div className={`conn-pill ${connStatus}`}>
          <span className="conn-dot" />
          <span>{connLabel}</span>
        </div>
      </div>
    </aside>
  )
}
