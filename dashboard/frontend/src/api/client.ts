import type {
  DashboardConfig,
  MinioFile,
  MinioStatus,
  Pod,
  PodsResponse,
  SparkApp,
  SparkJobForm,
} from '../types/api'

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), ...init })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

export function fetchConfig() {
  return getJson<DashboardConfig>('/api/config')
}

export function fetchNamespaces() {
  return getJson<string[]>('/api/namespaces')
}

export function fetchPods(namespace: string) {
  return getJson<PodsResponse>(`/api/pods?namespace=${encodeURIComponent(namespace)}`)
}

export async function fetchPodLogs(name: string, namespace: string) {
  return getJson<{ logs: string; error?: string }>(
    `/api/pods/${encodeURIComponent(name)}/logs?namespace=${encodeURIComponent(namespace)}`,
  )
}

export async function deletePod(name: string, namespace: string) {
  await fetch(`/api/pods/${encodeURIComponent(name)}?namespace=${encodeURIComponent(namespace)}`, {
    method: 'DELETE',
  })
}

export function fetchSparkApps(namespace: string) {
  return getJson<SparkApp[]>(`/api/spark-apps?namespace=${encodeURIComponent(namespace)}`)
}

export async function submitSparkApp(form: SparkJobForm) {
  const res = await fetch('/api/spark-apps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || body.message || res.statusText)
  }
  return body as { submitted: string }
}

export async function deleteSparkApp(name: string, namespace: string) {
  await fetch(`/api/spark-apps/${encodeURIComponent(name)}?namespace=${encodeURIComponent(namespace)}`, {
    method: 'DELETE',
  })
}

export function fetchFiles(prefix = 'jobs/') {
  return getJson<MinioFile[]>(`/api/files?prefix=${encodeURIComponent(prefix)}`)
}

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/files/upload', { method: 'POST', body: formData })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || res.statusText)
  return body as { uploaded: string; s3aPath: string; size: number }
}

export async function deleteFile(name: string) {
  await fetch(`/api/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

export function fetchMinioStatus() {
  return getJson<MinioStatus>('/api/minio/status')
}

export function sparkUiUrl(pod: Pod, driverDomainSuffix: string) {
  return `https://${pod.name}${driverDomainSuffix}`
}
