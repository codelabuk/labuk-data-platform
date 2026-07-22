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
kubectl apply -f k8s/base/namespaces/namespaces.yaml
kubectl get namespaces

# ─── 2. NGINX Ingress Controller ─────────────────────────────────
log "Installing nginx ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --timeout $HELM_TIMEOUT

wait_for_pods ingress-nginx "app.kubernetes.io/name=ingress-nginx"

# ─── 3. Strimzi Operator ─────────────────────────────────────────
log "Installing Strimzi operator..."
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

wait_for_pods kafka "name=strimzi-cluster-operator"

# ─── 4. Spark Operator ───────────────────────────────────────────
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

# ─── 5. MinIO ────────────────────────────────────────────────────
log "Deploying MinIO..."
kubectl apply -f k8s/base/minio/

wait_for_pods minio "app=minio"

# ─── 6. PostgreSQL ───────────────────────────────────────────────
log "Deploying PostgreSQL..."
kubectl apply -f k8s/base/metastore/postgres.yaml

wait_for_pods metastore "app=postgres"

# ─── 7. Hive Metastore ───────────────────────────────────────────
log "Deploying Hive Metastore..."
kubectl apply -f k8s/base/metastore/hive-metastore.yaml

wait_for_pods metastore "app=hive-metastore"

# ─── 8. Kafka Cluster ────────────────────────────────────────────
log "Deploying Kafka cluster (KRaft mode)..."
kubectl apply -f k8s/base/kafka/kafka-cluster.yaml

log "Waiting for Kafka to be ready (takes 2-3 minutes)..."
kubectl wait kafka/labuk-kafka \
  --for=condition=Ready \
  --timeout=300s \
  -n kafka

# ─── 9. Kafka Topics ─────────────────────────────────────────────
log "Creating Kafka topics..."
kubectl apply -f k8s/base/kafka/kafka-topics.yaml

# ─── 10. RBAC ────────────────────────────────────────────────────
log "Applying RBAC..."
kubectl apply -f k8s/base/rbac/

# ─── 11. Spark History Server ────────────────────────────────────
log "Deploying Spark History Server (scaled to 0 to save memory)..."
kubectl apply -f k8s/base/spark/spark-history.yaml

# ─── 12. Spark Dashboard ─────────────────────────────────────────
log "Deploying Spark Dashboard..."
kubectl apply -f k8s/base/spark/spark-dashboard.yaml

wait_for_pods spark-platform "app=spark-dashboard"

# ─── 13. Driver Ingress Controller ───────────────────────────────
log "Deploying Driver Ingress Controller..."
kubectl apply -f k8s/base/ingress-controller/spark-driver-ingress.yaml

# ─── 14. MinIO Buckets ───────────────────────────────────────────
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