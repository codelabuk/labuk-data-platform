import type { SparkJobForm } from '../types/api'

export function buildYaml(d: SparkJobForm) {
  const mc = d.mainClass ? `  mainClass: ${d.mainClass}\n` : ''
  return `apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: ${d.name || 'my-spark-job'}
  namespace: ${d.namespace}
spec:
  type: ${d.type}
  mode: cluster
  image: ${d.image}
  imagePullPolicy: IfNotPresent
${mc}  mainApplicationFile: ${d.jarPath}
  sparkVersion: "${d.sparkVersion}"
  restartPolicy:
    type: Never
  driver:
    cores: ${d.driverCores}
    memory: "${d.driverMemory}"
    serviceAccount: spark
  executor:
    cores: ${d.executorCores}
    instances: ${d.executorInstances}
    memory: "${d.executorMemory}"`
}
