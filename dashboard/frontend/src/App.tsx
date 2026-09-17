import { Navigate, Route, Routes } from 'react-router-dom'
import styles from './App.module.css'
import { LogDrawer } from './components/LogDrawer'
import { Sidebar } from './components/Sidebar'
import { ToastStack } from './components/ToastStack'
import { TopBar } from './components/TopBar'
import { DeployPage } from './pages/DeployPage'
import { FilesPage } from './pages/FilesPage'
import { HistoryPage } from './pages/HistoryPage'
import { PodsPage } from './pages/PodsPage'
import { SparkAppsPage } from './pages/SparkAppsPage'

export default function App() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar />
        <div className={styles.content}>
          <Routes>
            <Route path="/" element={<Navigate to="/pods" replace />} />
            <Route path="/pods" element={<PodsPage />} />
            <Route path="/apps" element={<SparkAppsPage />} />
            <Route path="/deploy" element={<DeployPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/pods" replace />} />
          </Routes>
        </div>
      </div>
      <LogDrawer />
      <ToastStack />
    </div>
  )
}
