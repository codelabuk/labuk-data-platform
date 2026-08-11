#!/bin/bash
set -e

# Load local overrides (DOMAIN=..., etc.) if present. Gitignored.
[ -f .env ] && { set -a; source .env; set +a; }

CONTEXT="docker-desktop"
HELM_TIMEOUT="5m"
DOMAIN="${DOMAIN:-codelabuk.dev}"
export DOMAIN

log() { echo "[$(date '+%H:%M:%S')] $1"; }

wait_for_pods() {
  local namespace=$1
  local label=$2
  log "Waiting for pods in $namespace ($label)..."
  kubectl wait --for=condition=ready pod \
    -l "$label" -n "$namespace" \
    --timeout=300s
}

# Renders a base/overlay with kustomize, substitutes the default domain
# (codelabuk.dev) for $DOMAIN, then applies. A no-op substitution for
# directories that don't reference the domain.
apply_k() {
  local dir=$1
  kubectl kustomize "$dir" | sed "s/codelabuk\.dev/${DOMAIN}/g" | kubectl apply -f -
}

log "Using DOMAIN=${DOMAIN} (override by setting DOMAIN or adding it to .env)"

# ─── 0. Verify context ───────────────────────────────────────────
log "Checking kubectl context..."
kubectl config use-context $CONTEXT
kubectl cluster-info

# 1. Namespaces
log "Creating namespaces..."
apply_k k8s/base/namespaces
kubectl get namespaces

#  2. TLS Certificates
log "Generating TLS certificates (mkcert) for *.${DOMAIN} and *.driver.${DOMAIN}..."
bash scripts/utils/generate-tls-certs.sh

# 3. RBAC
log "Applying RBAC..."
apply_k k8s/base/rbac

# 4. NGINX Ingress Controller
log "Installing nginx ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --timeout $HELM_TIMEOUT

wait_for_pods ingress-nginx "app.kubernetes.io/name=ingress-nginx"

# ─── 5. Strimzi Operator ─────────────────────────────────────────
log "Installing Strimzi operator..."
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

wait_for_pods kafka "name=strimzi-cluster-operator"

# ─── 6. Spark Operator ───────────────────────────────────────────
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

# ─── 7. MinIO ────────────────────────────────────────────────────
log "Deploying MinIO..."
apply_k k8s/base/minio

wait_for_pods minio "app=minio"

# ─── 8. PostgreSQL ───────────────────────────────────────────────
log "Deploying PostgreSQL..."
kubectl apply -f k8s/base/metastore/postgre-setup.yaml

wait_for_pods metastore "app=postgres"

# ─── 9. Hive Metastore ───────────────────────────────────────────
log "Deploying Hive Metastore..."
kubectl apply -f k8s/base/metastore/hive-metastore.yaml

wait_for_pods metastore "app=hive-metastore"

# ─── 10. Kafka Cluster + Topics ───────────────────────────────────
log "Deploying Kafka cluster (KRaft mode) and topics..."
apply_k k8s/base/kafka

log "Waiting for Kafka to be ready (takes 2-3 minutes)..."
kubectl wait kafka/labuk-kafka \
  --for=condition=Ready \
  --timeout=300s \
  -n kafka

# ─── 11. Spark (config, history server, dashboard) ────────────────
log "Deploying Spark config, history server, and dashboard..."
log "(History server is scaled to 0 replicas by default to save memory)"
apply_k k8s/base/spark

wait_for_pods spark-platform "app=spark-dashboard"

# ─── 12. Driver Ingress Controller ───────────────────────────────
log "Deploying Driver Ingress Controller..."
apply_k k8s/base/ingress-controller/driver-ingress-controller

# ─── 13. MinIO Buckets ───────────────────────────────────────────
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
log "  MinIO Console:    https://minio.${DOMAIN}          (or http://localhost:32091)"
log "  Spark Dashboard:  https://spark-dashboard.${DOMAIN} (or http://localhost:32050)"
log "  Spark History:    https://spark-history.${DOMAIN}   (or http://localhost:32080)"
log ""
log "Note: the HTTPS hostnames above need entries in your hosts file pointing at 127.0.0.1 — see docs/local-setup.md"
log ""
log "Next: upload JAR and submit a SparkApplication"
