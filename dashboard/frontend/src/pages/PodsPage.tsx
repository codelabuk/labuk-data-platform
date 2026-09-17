import { PodTable } from '../components/PodTable'
import { MetricCard } from '../components/MetricCard'
import { useApp } from '../context/AppContext'

export function PodsPage() {
  const { pods, sparkJobPods, infraPods, apps } = useApp()

  const running = pods.filter((p) => (p.status || '').toLowerCase() === 'running').length
  const activeApps = apps.filter((a) => (a.state || '').toUpperCase() === 'RUNNING').length
  const failedPods = pods.filter((p) => (p.status || '').toLowerCase() === 'failed').length
  const failedApps = apps.filter((a) => (a.state || '').toUpperCase() === 'FAILED').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pods</div>
          <div className="page-sub">All pods in selected namespace &middot; click logs to inspect &middot; auto-refreshes every 30s</div>
        </div>
      </div>

      <div className="metrics">
        <MetricCard label="Total pods" value={pods.length || '--'} />
        <MetricCard label="Running" value={pods.length ? running : '--'} color="green" />
        <MetricCard label="Active spark apps" value={apps.length ? activeApps : '--'} color="blue" />
        <MetricCard label="Failed" value={pods.length || apps.length ? failedPods + failedApps : '--'} color="red" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Spark job pods</span>
          <span className="panel-hint">{sparkJobPods.length} spark pods</span>
        </div>
        <PodTable pods={sparkJobPods} emptyMsg="No Spark job pods running" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Infrastructure pods</span>
          <span className="panel-hint">{infraPods.length} pods</span>
        </div>
        <PodTable pods={infraPods} emptyMsg="No infrastructure pods" />
      </div>
    </>
  )
}
