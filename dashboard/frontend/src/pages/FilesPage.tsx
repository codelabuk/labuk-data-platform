import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteFile, fetchFiles, fetchMinioStatus, uploadFile } from '../api/client'
import { useApp } from '../context/AppContext'

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FilesPage() {
  const { toast, setPendingJarPath } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const filesQuery = useQuery({ queryKey: ['files'], queryFn: () => fetchFiles(), retry: false })
  const statusQuery = useQuery({ queryKey: ['minio-status'], queryFn: fetchMinioStatus, retry: false })

  async function handleUpload(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.py' && ext !== '.jar') {
      toast('Only .py or .jar files are accepted', 'error')
      return
    }
    try {
      const result = await uploadFile(file)
      toast(`Uploaded "${result.uploaded}"`, 'success')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    } catch (e) {
      toast(`Upload failed: ${(e as Error).message}`, 'error')
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await deleteFile(name)
    toast(`Deleted "${name}"`, 'success')
    queryClient.invalidateQueries({ queryKey: ['files'] })
  }

  function handleUse(s3aPath: string) {
    setPendingJarPath(s3aPath)
    navigate('/deploy')
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleUpload(file)
  }

  const files = filesQuery.data ?? []
  const minioOk = statusQuery.data?.status === 'ok'

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Files (MinIO)</div>
          <div className="page-sub">Upload .py or .jar job files &middot; click <strong>use</strong> to copy s3a:// path into the Deploy form</div>
        </div>
        <span className={`conn-pill ${minioOk ? 'live' : 'error'}`}>
          <span className="conn-dot" />{minioOk ? 'MinIO connected' : 'MinIO unavailable'}
        </span>
      </div>

      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="upload-icon">&#8679;</div>
        <div className="upload-label">Drop .py or .jar here, or click to browse</div>
        <div className="upload-hint">Stored in MinIO at s3a://spark-jobs/jobs/</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.jar"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = '' }}
      />

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Uploaded files</span>
          <span className="panel-hint">{files.length} files</span>
        </div>
        {!files.length ? (
          <div className="tbl-wrap"><table>
            <tbody><tr className="empty-row"><td colSpan={5}>No files uploaded yet</td></tr></tbody>
          </table></div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead>
              <tr>
                <th style={{ width: '36%' }}>Filename</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '12%' }}>Size</th>
                <th style={{ width: '22%' }}>Uploaded</th>
                <th style={{ width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }} title={f.name}>{f.name.replace(/^jobs\//, '')}</td>
                  <td>{f.name.endsWith('.jar') ? 'jar' : 'py'}</td>
                  <td style={{ color: 'var(--text3)' }}>{fmtSize(f.size)}</td>
                  <td style={{ color: 'var(--text3)' }}>{f.lastModified ? new Date(f.lastModified).toLocaleString() : '—'}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => handleUse(f.s3aPath)}>use</button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => handleDelete(f.name)}>delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">How to use MinIO files in a job</span></div>
        <div className="panel-body" style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '0.75rem' }}>1. Upload your <code>.py</code> or <code>.jar</code> file above.</p>
          <p style={{ marginBottom: '0.75rem' }}>2. Click <strong>use</strong> on the file row — this copies the <code>s3a://</code> path into the Deploy form automatically.</p>
          <p style={{ marginBottom: '0.75rem' }}>3. Set <strong>Spark image</strong> to <code>spark-jobs:latest</code> (has Hadoop AWS JARs for s3a support).</p>
          <p>4. Submit — the Spark driver fetches the file from MinIO at runtime. No Docker rebuild needed.</p>
        </div>
      </div>
    </>
  )
}
