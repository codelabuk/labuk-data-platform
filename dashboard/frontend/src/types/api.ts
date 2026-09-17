export interface PodLabels {
  [key: string]: string
}

export interface Pod {
  name: string
  namespace: string
  status: string | null
  node: string | null
  created: string | null
  labels: PodLabels
}

export interface PodsResponse {
  sparkJobs: Pod[]
  infrastructure: Pod[]
  all: Pod[]
}

export interface SparkApp {
  name: string
  namespace: string
  state: string
  message: string
  type: string
  image: string
  created: string | null
}

export interface DashboardConfig {
  defaultNamespace: string
  historyServerUrl: string
  historyExternalUrl: string
  namespaces: string[]
  driverDomainSuffix: string
}

export interface MinioFile {
  name: string
  size: number
  lastModified: string | null
  s3aPath: string
}

export interface MinioStatus {
  status?: string
  buckets?: string[]
  error?: string
}

export interface SparkJobForm {
  name: string
  type: 'Scala' | 'Java' | 'Python'
  jarPath: string
  mainClass: string
  image: string
  imagePullPolicy: string
  namespace: string
  sparkVersion: string
  driverCores: number
  driverMemory: string
  executorInstances: number
  executorCores: number
  executorMemory: string
}
