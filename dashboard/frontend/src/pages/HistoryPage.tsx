import { useApp } from '../context/AppContext'

export function HistoryPage() {
  const { config } = useApp()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Spark history server</div>
          <div className="page-sub">
            <a href={config?.historyExternalUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
              open in new tab
            </a>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Embedded view</span></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <iframe src="/proxy/history/" className="history-frame" title="Spark History Server" />
        </div>
      </div>
    </>
  )
}
