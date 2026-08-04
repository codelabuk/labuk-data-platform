#!/bin/bash
set -e

CONTEXT="docker-desktop"
HELM_TIMEOUT="5m"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

wait_for_pods() {
  local namespace=$1
  local label=$2
  log "Waiting for pods in $namespace ($label)..."
  kubectl wait --for=condition=ready pod \
    -l "$label" -n "$namespace" \
    --timeout=300s
}

# ─── 0. Verify context ───────────────────────────────────────────
log "Checking kubectl context..."
kubectl config use-context $CONTEXT
kubectl cluster-info

# ─── 1. Namespaces ───────────────────────────────────────────────
log "Creating namespaces..."
kubectl apply -k k8s/base/namespaces
kubectl get namespaces

# ─── 2. RBAC ──────────────────────────────────────────────────────
log "Applying RBAC..."
kubectl apply -k k8s/base/rbac

# ─── 3. NGINX Ingress Controller ─────────────────────────────────
log "Installing nginx ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --timeout $HELM_TIMEOUT

wait_for_pods ingress-nginx "app.kubernetes.io/name=ingress-nginx"

# ─── 4. Strimzi Operator ─────────────────────────────────────────
log "Installing Strimzi operator..."
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

wait_for_pods kafka "name=strimzi-cluster-operator"

# ─── 5. Spark Operator ───────────────────────────────────────────
log "Installing Spark operator..."
helm repo add spark-operator https://kubeflow.github.io/spark-operator 2>/dev/null || true
helm repo update
helm upgrade --install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --set spark.jobNamespaces={spark} \
  --set webhook.enable=true \
  --timeout $HELM_TIMEOUT

wait_for_pods spark-operator "app.kubernetes.io/name=spark-operator"

# ─── 6. MinIO ────────────────────────────────────────────────────
log "Deploying MinIO..."
kubectl apply -k k8s/base/minio

wait_for_pods minio "app=minio"

# ─── 7. PostgreSQL ───────────────────────────────────────────────
log "Deploying PostgreSQL..."
kubectl apply -f k8s/base/metastore/postgre-setup.yaml

wait_for_pods metastore "app=postgres"

# ─── 8. Hive Metastore ───────────────────────────────────────────
log "Deploying Hive Metastore..."
kubectl apply -f k8s/base/metastore/hive-metastore.yaml

wait_for_pods metastore "app=hive-metastore"

# ─── 9. Kafka Cluster + Topics ────────────────────────────────────
log "Deploying Kafka cluster (KRaft mode) and topics..."
kubectl apply -k k8s/base/kafka

log "Waiting for Kafka to be ready (takes 2-3 minutes)..."
kubectl wait kafka/labuk-kafka \
  --for=condition=Ready \
  --timeout=300s \
  -n kafka

# ─── 10. Spark (config, history server, dashboard) ────────────────
log "Deploying Spark config, history server, and dashboard..."
log "(History server is scaled to 0 replicas by default to save memory)"
kubectl apply -k k8s/base/spark

wait_for_pods spark-platform "app=spark-dashboard"

# ─── 11. Driver Ingress Controller ───────────────────────────────
log "Deploying Driver Ingress Controller..."
kubectl apply -k k8s/base/ingress-controller/driver-ingress-controller

# ─── 12. MinIO Buckets ───────────────────────────────────────────
log "Creating MinIO buckets..."
bash scripts/utils/create-minio-buckets.sh

# ─── Done ────────────────────────────────────────────────────────
log ""
log "Local setup complete!"
log ""
log "Quick health check:"
echo "=== Namespaces ===" && kubectl get namespaces
echo "=== All Pods ===" && kubectl get pods -A | grep -v Completed
echo "=== Kafka ===" && kubectl get kafka -n kafka
log ""
log "Access points:"
log "  MinIO Console:    http://localhost:32091"
log "  Spark Dashboard:  http://localhost:32050"
log "  Spark History:    http://localhost:32080"
log ""
log "Next: upload JAR and submit a SparkApplication"
