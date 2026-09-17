import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitSparkApp } from '../api/client'
import { useApp } from '../context/AppContext'
import { DEFAULT_FORM, PRESETS } from '../data/presets'
import type { SparkJobForm } from '../types/api'
import { buildYaml } from '../utils/yaml'

export function DeployPage() {
  const { connStatus, toast, refresh, pendingJarPath, setPendingJarPath } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState<SparkJobForm>(() =>
    pendingJarPath ? { ...DEFAULT_FORM, jarPath: pendingJarPath } : DEFAULT_FORM,
  )
  const [showYaml, setShowYaml] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Clear the cross-page hand-off from FilesPage once it's been read into initial state above.
  useEffect(() => {
    if (pendingJarPath) setPendingJarPath(null)
  }, [pendingJarPath, setPendingJarPath])

  function set<K extends keyof SparkJobForm>(key: K, value: SparkJobForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setShowYaml(false)
  }

  function applyPreset(key: string) {
    const preset = PRESETS[key]
    if (!preset) return
    setForm((f) => ({ ...f, ...preset }))
    setShowYaml(false)
  }

  async function handleSubmit() {
    if (!form.name) { toast('Job name is required', 'error'); return }
    if (!form.jarPath) { toast('JAR / application file is required', 'error'); return }
    if ((form.type === 'Scala' || form.type === 'Java') && !form.mainClass) {
      toast('Main class is required for Scala/Java', 'error'); return
    }

    setSubmitting(true)
    if (connStatus !== 'live') {
      await new Promise((r) => setTimeout(r, 700))
      setSubmitting(false)
      toast('Not connected — run python app.py and refresh first', 'error')
      return
    }

    try {
      await submitSparkApp(form)
      toast(`Job "${form.name}" submitted successfully`, 'success')
      setTimeout(() => { refresh(); navigate('/apps') }, 1200)
    } catch (e) {
      toast(`Error: ${(e as Error).message}`, 'error')
    }
    setSubmitting(false)
  }

  const needsMainClass = form.type !== 'Python'

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Deploy job</div>
          <div className="page-sub">Submit a SparkApplication to the cluster via Spark Operator</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Quick presets</span></div>
        <div className="panel-body">
          <div className="preset-bar">
            <span className="preset-chip" onClick={() => applyPreset('scala-pi')}>Spark Pi (Scala)</span>
            <span className="preset-chip" onClick={() => applyPreset('scala-wc')}>Word count (Scala)</span>
            <span className="preset-chip" onClick={() => applyPreset('python-counter')}>Simple counter (Python)</span>
            <span className="preset-chip" onClick={() => applyPreset('clear')}>Clear form</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Job configuration</span></div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-section">Application</div>
            <div className="form-group">
              <label className="form-label">Job name *</label>
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="my-spark-job" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => set('type', e.target.value as SparkJobForm['type'])}>
                <option value="Scala">Scala</option>
                <option value="Java">Java</option>
                <option value="Python">Python</option>
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">JAR / application file *</label>
              <input className="form-input" value={form.jarPath} onChange={(e) => set('jarPath', e.target.value)} />
              <span className="form-hint">Use local:/// for image-baked files &nbsp;|&nbsp; s3a://spark-jobs/jobs/file.py for MinIO files</span>
            </div>
            {needsMainClass && (
              <div className="form-group">
                <label className="form-label">Main class *</label>
                <input className="form-input" value={form.mainClass} onChange={(e) => set('mainClass', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Spark image</label>
              <input className="form-input" value={form.image} onChange={(e) => set('image', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Namespace</label>
              <input className="form-input" value={form.namespace} onChange={(e) => set('namespace', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Spark version</label>
              <input className="form-input" value={form.sparkVersion} onChange={(e) => set('sparkVersion', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Image Pull Policy</label>
              <input className="form-input" value={form.imagePullPolicy} onChange={(e) => set('imagePullPolicy', e.target.value)} />
            </div>

            <div className="form-section">Driver</div>
            <div className="form-group">
              <label className="form-label">Cores</label>
              <input className="form-input" type="number" min={1} max={8} value={form.driverCores} onChange={(e) => set('driverCores', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Memory</label>
              <input className="form-input" value={form.driverMemory} onChange={(e) => set('driverMemory', e.target.value)} placeholder="512m or 1g" />
            </div>

            <div className="form-section">Executor</div>
            <div className="form-group">
              <label className="form-label">Instances</label>
              <input className="form-input" type="number" min={1} max={10} value={form.executorInstances} onChange={(e) => set('executorInstances', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cores</label>
              <input className="form-input" type="number" min={1} max={8} value={form.executorCores} onChange={(e) => set('executorCores', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Memory</label>
              <input className="form-input" value={form.executorMemory} onChange={(e) => set('executorMemory', e.target.value)} placeholder="512m or 1g" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-success" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <span className="spin" /> : '▶'} {submitting ? ' Submitting…' : ' Submit job'}
            </button>
            <button className="btn" onClick={() => setShowYaml((v) => !v)}>Preview YAML</button>
          </div>
          {showYaml && <pre className="yaml-pre">{buildYaml(form)}</pre>}
        </div>
      </div>
    </>
  )
}
