import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { fetchConfig, fetchNamespaces, fetchPodLogs, fetchPods, fetchSparkApps } from '../api/client'
import type { DashboardConfig, Pod, SparkApp } from '../types/api'

export type ConnStatus = 'demo' | 'live' | 'error'
export type ToastKind = 'success' | 'error' | 'info'
export interface ToastMsg { id: number; text: string; kind: ToastKind }

interface LogDrawerState {
  open: boolean
  pod: string | null
  body: string
  loading: boolean
}

interface AppContextValue {
  namespace: string
  setNamespace: (ns: string) => void
  namespaces: string[]
  config: DashboardConfig | undefined
  connStatus: ConnStatus
  pods: Pod[]
  sparkJobPods: Pod[]
  infraPods: Pod[]
  apps: SparkApp[]
  lastRefresh: Date | null
  refresh: () => void
  toasts: ToastMsg[]
  toast: (text: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
  logDrawer: LogDrawerState
  openLogs: (pod: string) => void
  closeLogs: () => void
  refreshLogs: () => void
  pendingJarPath: string | null
  setPendingJarPath: (path: string | null) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const DEMO_LOGS = `26/04/04 09:10:05 INFO SparkContext: Running Spark version 3.5.3
26/04/04 09:10:05 INFO ResourceUtils: ==============================================================
26/04/04 09:10:06 INFO SparkContext: Submitted application: WordCount
26/04/04 09:10:07 INFO TaskSchedulerImpl: Starting task 0.0 in stage 0.0 (TID 0)
26/04/04 09:10:08 INFO DAGScheduler: Job 0 finished: collect at WordCount.scala:18, took 1.234s
(Hello,3) (Spark,2) (Docker,1) (CodeLabuk,1)
26/04/04 09:10:09 INFO SparkContext: Successfully stopped SparkContext`

export function AppProvider({ children }: { children: ReactNode }) {
  const [namespace, setNamespace] = useState('spark')
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [logDrawer, setLogDrawer] = useState<LogDrawerState>({ open: false, pod: null, body: '', loading: false })
  const [pendingJarPath, setPendingJarPath] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const configQuery = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    retry: false,
    staleTime: Infinity,
  })

  const namespacesQuery = useQuery({
    queryKey: ['namespaces'],
    queryFn: fetchNamespaces,
    retry: false,
    enabled: !!configQuery.data,
  })

  const podsQuery = useQuery({
    queryKey: ['pods', namespace],
    queryFn: () => fetchPods(namespace),
    refetchInterval: 30000,
    retry: false,
  })

  const appsQuery = useQuery({
    queryKey: ['spark-apps', namespace],
    queryFn: () => fetchSparkApps(namespace),
    refetchInterval: 30000,
    retry: false,
  })

  const connStatus: ConnStatus = useMemo(() => {
    if (podsQuery.isError || appsQuery.isError) return 'error'
    if (podsQuery.data !== undefined) return 'live'
    return 'demo'
  }, [podsQuery.isError, appsQuery.isError, podsQuery.data])

  const lastRefresh = podsQuery.dataUpdatedAt ? new Date(podsQuery.dataUpdatedAt) : null

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pods', namespace] })
    queryClient.invalidateQueries({ queryKey: ['spark-apps', namespace] })
    queryClient.invalidateQueries({ queryKey: ['namespaces'] })
  }, [queryClient, namespace])

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const loadLogs = useCallback(async (pod: string) => {
    setLogDrawer((d) => ({ ...d, loading: true }))
    if (connStatus !== 'live') {
      setLogDrawer((d) => ({ ...d, body: DEMO_LOGS, loading: false }))
      return
    }
    try {
      const data = await fetchPodLogs(pod, namespace)
      setLogDrawer((d) => ({ ...d, body: data.logs || 'No logs available.', loading: false }))
    } catch (e) {
      setLogDrawer((d) => ({ ...d, body: `Could not fetch logs: ${(e as Error).message}`, loading: false }))
    }
  }, [connStatus, namespace])

  const openLogs = useCallback((pod: string) => {
    setLogDrawer({ open: true, pod, body: 'Loading…', loading: true })
    void loadLogs(pod)
  }, [loadLogs])

  const closeLogs = useCallback(() => {
    setLogDrawer({ open: false, pod: null, body: '', loading: false })
  }, [])

  const refreshLogs = useCallback(() => {
    if (logDrawer.pod) void loadLogs(logDrawer.pod)
  }, [logDrawer.pod, loadLogs])

  const pods = podsQuery.data?.all ?? []

  const value: AppContextValue = {
    namespace,
    setNamespace,
    namespaces: namespacesQuery.data ?? [namespace],
    config: configQuery.data,
    connStatus,
    pods,
    sparkJobPods: podsQuery.data?.sparkJobs ?? [],
    infraPods: podsQuery.data?.infrastructure ?? [],
    apps: appsQuery.data ?? [],
    lastRefresh,
    refresh,
    toasts,
    toast,
    dismissToast,
    logDrawer,
    openLogs,
    closeLogs,
    refreshLogs,
    pendingJarPath,
    setPendingJarPath,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
