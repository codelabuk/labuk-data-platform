import type { SparkJobForm } from '../types/api'

export const DEFAULT_FORM: SparkJobForm = {
  name: 'spark-pi',
  type: 'Scala',
  jarPath: 's3a://spark-jobs/jobs/simple_counter.py',
  mainClass: 'org.apache.spark.examples.SparkPi',
  image: 'spark-codelabuk:latest',
  imagePullPolicy: 'IfNotPresent',
  namespace: 'spark',
  sparkVersion: '3.5.1',
  driverCores: 1,
  driverMemory: '512m',
  executorInstances: 1,
  executorCores: 1,
  executorMemory: '512m',
}

type Preset = Partial<SparkJobForm>

export const PRESETS: Record<string, Preset> = {
  'scala-pi': {
    name: 'spark-pi', type: 'Scala',
    jarPath: 'local:///opt/spark/examples/jars/spark-examples_2.12-3.5.3.jar',
    mainClass: 'org.apache.spark.examples.SparkPi',
    image: 'apache/spark:3.5.3', sparkVersion: '3.5.3',
    driverCores: 1, driverMemory: '512m', executorInstances: 1, executorCores: 1, executorMemory: '512m',
  },
  'scala-wc': {
    name: 'scala-word-count', type: 'Scala',
    jarPath: 's3a://spark-jobs/jobs/scala/word-count_2.12-0.1.jar',
    mainClass: 'com.codelabuk.WordCount',
    image: 'spark-codelabuk:latest', sparkVersion: '3.5.3',
    driverCores: 1, driverMemory: '512m', executorInstances: 1, executorCores: 1, executorMemory: '512m',
  },
  'python-counter': {
    name: 'python-counter', type: 'Python',
    jarPath: 's3a://spark-jobs/jobs/simple_counter.py',
    mainClass: '',
    image: 'spark-codelabuk:latest', sparkVersion: '3.5.3',
    driverCores: 1, driverMemory: '512m', executorInstances: 1, executorCores: 1, executorMemory: '512m',
  },
  clear: {
    name: '', type: 'Scala', jarPath: '', mainClass: '',
    image: 'apache/spark:3.5.3', sparkVersion: '3.5.3',
    driverCores: 1, driverMemory: '512m', executorInstances: 1, executorCores: 1, executorMemory: '512m',
  },
}
