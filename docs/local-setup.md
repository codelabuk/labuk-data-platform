# Local Setup Guide — Labuk Data Platform

**Environment:** Docker Desktop on Windows (WSL2)  
**Kubernetes:** Docker Desktop built-in K8s   

---

## Architecture Overview

```
Namespaces:
  ingress-nginx   → NGINX ingress controller (routes HTTP traffic to services)
  kafka           → Strimzi operator + Kafka cluster (KRaft mode, no Zookeeper)
  metastore       → Hive Metastore + PostgreSQL (Iceberg catalog backend)
  minio           → MinIO object storage (S3-compatible, replaces AWS S3)
  spark-operator  → Spark Operator (manages SparkApplication CRDs)
  spark-platform  → Spark Dashboard (custom Flask app)
  spark           → Spark jobs, History Server, driver-ingress CronJob
```

---

## Prerequisites

Install these on Windows before starting:

```
- Docker Desktop (with Kubernetes enabled in Settings → Kubernetes)
- kubectl       (comes with Docker Desktop)
- Helm          (https://helm.sh/docs/intro/install/)
- Git
```

Verify:
```bash
kubectl version --client
helm version
docker version
```

---

## Installation Order

**Critical:** Install in this exact order. Each component depends on the previous.

```
1. Namespaces
2. RBAC
3. NGINX Ingress Controller      (Helm)
4. Strimzi Operator              (kubectl apply)
5. Spark Operator                (Helm)
6. MinIO
7. PostgreSQL
8. Hive Metastore
9. Kafka Cluster + Topics (KRaft)
10. Spark (config, history server, dashboard)
11. Driver Ingress Controller    (CronJob + ConfigMap + RBAC)
12. MinIO Buckets                (post-install)
```

All steps below are run for you by `scripts/bootstrap-local.sh` — the manual commands are shown for reference/troubleshooting.

---

## Step 1 — Namespaces

```bash
kubectl apply -k k8s/base/namespaces
```

Namespaces created:
- `kafka`
- `minio`
- `metastore`
- `spark`
- `spark-platform`

(`ingress-nginx` and `spark-operator` are created separately by their Helm installs via `--create-namespace`.)

Verify:
```bash
kubectl get namespaces
```

---

## Step 2 — RBAC

```bash
kubectl apply -k k8s/base/rbac
```

Creates the `spark` ServiceAccount used by SparkApplication driver/executor pods. See [RBAC Summary](#rbac-summary) below for the full list including the driver-ingress-controller ServiceAccount.

---

## Step 3 — NGINX Ingress Controller

Installed via Helm. Exposes services at `localhost:80` and `localhost:443`.

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

Verify:
```bash
kubectl get pods -n ingress-nginx
# ingress-nginx-controller-xxx   1/1   Running

kubectl get svc -n ingress-nginx
# ingress-nginx-controller   LoadBalancer   ...   localhost   80:xxx/TCP,443:xxx/TCP
```

---

## Step 4 — Strimzi Operator

Strimzi manages Kafka clusters via CRDs. Installed with `kubectl apply` (not Helm).

```bash
# Install Strimzi 0.46.x (supports KRaft mode)
kubectl create -f \
  'https://strimzi.io/install/latest?namespace=kafka' \
  -n kafka
```

Verify:
```bash
kubectl get pods -n kafka
# strimzi-cluster-operator-xxx   1/1   Running

kubectl get crd | grep kafka
# kafkas.kafka.strimzi.io
# kafkanodepools.kafka.strimzi.io
# kafkatopics.kafka.strimzi.io
```

> **Why not Helm?** Strimzi was applied directly in this setup.
> The Helm chart is available but not used here — keep consistent.

---

## Step 5 — Spark Operator

Installed via Helm. Manages `SparkApplication` CRDs.

```bash
helm repo add spark-operator https://kubeflow.github.io/spark-operator
helm repo update

helm upgrade --install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --set spark.jobNamespaces={spark} \
  --set webhook.enable=true
```

Verify:
```bash
kubectl get pods -n spark-operator
# spark-operator-controller-xxx   1/1   Running
# spark-operator-webhook-xxx      1/1   Running
```

---

## Step 6 — MinIO

S3-compatible object storage. Stores Iceberg table data, Spark checkpoints, and JARs.

```bash
kubectl apply -k k8s/base/minio
```

**Buckets used:**
| Bucket | Purpose |
|--------|---------|
| `warehouse` | Iceberg table data (Parquet files + metadata) |
| `checkpoints` | Spark Structured Streaming checkpoints |
| `spark-jars` | Application JARs deployed by SparkApplication |

**Access:**
- API: `http://minio.minio.svc.cluster.local:9000` (internal)
- Console: `http://localhost:32091` (NodePort)
- Credentials: `sparkadmin / sparkadmin123`

Verify:
```bash
kubectl get pods -n minio
# minio-xxx   1/1   Running

kubectl get svc -n minio
# minio   NodePort   ...   9000:32090/TCP,9001:32091/TCP
```

---

## Step 7 — PostgreSQL

Backend database for Hive Metastore. Stores table schema, partition info, and snapshot metadata.

```bash
kubectl apply -f k8s/base/metastore/postgre-setup.yaml
```

**Connection details:**
- Host: `postgres.metastore.svc.cluster.local:5432`
- Database: `metastore`
- User: `hive`
- Password: `hivepassword`

Verify:
```bash
kubectl get pods -n metastore
# postgres-xxx   1/1   Running
```

> **Why `apply -f` instead of `-k`?** Postgres must be `Ready` before the Hive Metastore schema-init Job in Step 8 runs, so the two are applied and waited on separately rather than as one Kustomize batch. `k8s/base/metastore/kustomization.yaml` still exists for anyone consuming this base directory as a whole (e.g. a future cloud overlay).

---

## Step 8 — Hive Metastore

Iceberg catalog backend. Spark connects here to resolve table names like `iceberg.bronze.raw_events`.

```bash
kubectl apply -f k8s/base/metastore/hive-metastore.yaml
```

**Connection:**
- Thrift: `thrift://hive-metastore.metastore.svc.cluster.local:9083`

**Used in all SparkApplication sparkConf:**
```yaml
spark.sql.catalog.iceberg.uri: thrift://hive-metastore.metastore.svc.cluster.local:9083
```

Verify:
```bash
kubectl get pods -n metastore
# hive-metastore-xxx   1/1   Running
# postgres-xxx         1/1   Running
```

---

## Step 9 — Kafka Cluster + Topics (KRaft Mode)

Kafka cluster managed by Strimzi. Uses KRaft (no Zookeeper). Two node pools: controller and broker.

```bash
kubectl apply -k k8s/base/kafka
```

This applies both the `Kafka`/`KafkaNodePool` cluster resources and the `KafkaTopic` resources together — the Strimzi topic operator queues topic creation until the cluster is ready, so applying them at the same time is safe.

**Topics:**
| Topic | Partitions | Purpose |
|-------|-----------|---------|
| `raw-events` | 3 | Raw events from EventGenerator |

Wait for Kafka to be ready (takes 2-3 minutes):
```bash
kubectl wait kafka/labuk-kafka \
  --for=condition=Ready \
  --timeout=300s \
  -n kafka
```

**Bootstrap server (used by all producers/consumers):**
```
labuk-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092
```

**Node pools:**
| Pool | Role | Replicas |
|------|------|----------|
| `controller` | KRaft controller | 1 |
| `broker` | Kafka broker | 1 |

Verify:
```bash
kubectl get kafka -n kafka
# labuk-kafka   True   ...   Ready

kubectl get pods -n kafka
# labuk-kafka-broker-0       1/1   Running
# labuk-kafka-controller-1   1/1   Running

kubectl exec -it labuk-kafka-broker-0 -n kafka -- \
  bin/kafka-topics.sh \
  --bootstrap-server labuk-kafka-kafka-bootstrap:9092 \
  --list
```

---

## Step 10 — Spark (config, history server, dashboard)

```bash
kubectl apply -k k8s/base/spark
```

This deploys three things together:
- **`spark-defaults` ConfigMap** — Iceberg catalog + S3A settings shared by SparkApplications
- **Spark History Server** — shows completed/running job history, reads event logs from MinIO. **Resource note:** scale to 0 replicas locally to save memory once it's up: `kubectl scale deployment spark-history-server -n spark --replicas=0`. Access at `http://localhost:32080` (NodePort 18080).
- **Spark Dashboard** — custom Flask app showing job status and metrics. Access at `http://localhost:32050` (NodePort 5000).

Verify:
```bash
kubectl get deployment spark-history-server -n spark
kubectl get pods -n spark-platform
# spark-dashboard-xxx   1/1   Running
```

---

## Step 11 — Driver Ingress Controller

**This is a custom component.** A CronJob that runs every minute and automatically creates Ingress rules for active Spark driver pods. This allows access to each driver's Spark UI at a unique URL.

```bash
kubectl apply -k k8s/base/ingress-controller/driver-ingress-controller
```

This applies the ServiceAccount, ClusterRole/ClusterRoleBinding, CronJob, and headless Service in one go. The `controller.py` script is loaded into the CronJob's ConfigMap via a Kustomize `configMapGenerator` (sourced from `controller.py` next to the manifest), so the script only needs to be edited in one place.

**How it works:**
- Every minute, a pod starts running `controller.py`
- The script finds all Spark driver pods in the `spark` namespace
- For each driver, it creates an Ingress rule pointing to that driver's Spark UI port (4040)
- When the driver pod is gone, the Ingress rule is cleaned up

**Service account:** `driver-ingress-controller` (needs pod read + ingress write permissions)

Verify:
```bash
kubectl get cronjob -n spark
# driver-ingress-controller   */1 * * * *   ...   Active

kubectl get jobs -n spark
# driver-ingress-controller-xxx   Complete
```

---

## Step 12 — MinIO Buckets

After MinIO is running, create the required buckets:

```bash
bash scripts/utils/create-minio-buckets.sh
```

Expected output:
```
[DATE]   0B warehouse/
[DATE]   0B checkpoints/
[DATE]   0B spark-jars/
[DATE]   0B spark-jobs/
```

`spark-jobs` is where the Spark Dashboard uploads job files and where the History Server writes event logs (`s3a://spark-jobs/event-logs`) — it's created here for idempotency, but the Dashboard also creates it itself on startup if missing.

---

## RBAC Summary

| ServiceAccount | Namespace | Purpose |
|---------------|-----------|---------|
| `spark` | `spark` | Used by SparkApplication driver/executor pods |
| `driver-ingress-controller` | `spark` | Used by the ingress CronJob |

```bash
kubectl apply -k k8s/base/rbac
```

---

## Custom Docker Image

All Spark jobs use a custom image with S3A and Iceberg JARs pre-baked:

```
Image: spark-codelabuk:latest
Base:  apache/spark:3.5.3
Extras: iceberg-spark-runtime, hadoop-aws, aws-java-sdk-bundle
```

Built locally — `imagePullPolicy: Never` in all local SparkApplication manifests.

```bash
# Rebuild image after changes
docker build -t spark-codelabuk:latest -f docker/Dockerfile .
```

---

## Deploying a Spark Job

After all infrastructure is running:

```bash
# Upload JAR to MinIO first
MINIO_POD=$(kubectl get pod -n minio -l app=minio -o jsonpath='{.items[0].metadata.name}')
kubectl cp target/labuk-streaming.jar minio/$MINIO_POD:/tmp/
kubectl exec -n minio $MINIO_POD -- \
  mc cp /tmp/labuk-streaming.jar /data/spark-jars/labuk-streaming.jar

# Submit SparkApplication
kubectl apply -f modules/streaming/k8s/overlays/local/bronze-job.yaml

# Watch logs
kubectl logs -f streaming-bronze-driver -n spark
```

---

## Resource Usage (Local Constraints)

| Component | CPU Request | Memory Request | Notes |
|-----------|------------|----------------|-------|
| Kafka broker | 250m | 512Mi | |
| Kafka controller | 100m | 256Mi | |
| Hive Metastore | 250m | 512Mi | |
| PostgreSQL | 250m | 512Mi | |
| MinIO | 200m | 256Mi | |
| Spark driver | 1000m | 512Mi | Driver-only mode (0 executors) |
| Spark Dashboard | 100m | 128Mi | |
| **Total** | **~2.2 CPU** | **~2.7GB** | Leaves room for Spark |

**Memory-saving tips:**
- Keep Spark History Server scaled to 0 when not needed
- Use `executor.instances: 0` (driver-only mode) for Spark jobs
- Don't run EventGenerator and Bronze job simultaneously at first

---

## Teardown

Remove everything cleanly:

```bash
bash scripts/teardown-local.sh
```

This mirrors `bootstrap-local.sh` in reverse: SparkApplications → driver-ingress-controller → spark (config/history/dashboard) → Kafka → Hive Metastore → PostgreSQL → MinIO → RBAC → Helm releases (spark-operator, ingress-nginx) → Strimzi → namespaces (which removes anything left inside, including the `ingress-nginx` and `spark-operator` namespaces created by Helm).

---

## Quick Health Check

Run this after setup to verify everything is working:

```bash
echo "=== Namespaces ===" && kubectl get namespaces
echo "=== All Pods ===" && kubectl get pods -A | grep -v Completed
echo "=== Kafka Ready ===" && kubectl get kafka -n kafka
echo "=== MinIO ===" && kubectl get pods -n minio
echo "=== Metastore ===" && kubectl get pods -n metastore
echo "=== Spark Operator ===" && kubectl get pods -n spark-operator
```

All pods should show `Running` or `1/1 Ready`.

---

## Known Issues (Local)

| Issue | Cause | Fix |
|-------|-------|-----|
| Strimzi operator crash-looping | Memory pressure | Scale down History Server first |
| Spark job pending (no resources) | CPU overcommit | Use `executor.instances: 0` |
| MinIO bucket access error | Bucket not created | Run Step 13 manually |
| Kafka controller not ready | Takes 2-3 min on startup | Wait, then `kubectl get kafka -n kafka` |

