#!/bin/bash
set -e
log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "⚠️  This will remove all labuk platform components"
read -p "Are you sure? (yes/no): " confirm
[ "$confirm" != "yes" ] && { log "Aborted"; exit 0; }

kubectl delete sparkapplication --all -n spark 2>/dev/null || true
kubectl delete -f k8s/base/spark/ 2>/dev/null || true
kubectl delete kafka labuk-kafka -n kafka 2>/dev/null || true
kubectl delete kafkatopic --all -n kafka 2>/dev/null || true
kubectl delete -f k8s/base/metastore/ 2>/dev/null || true
kubectl delete -f k8s/base/minio/ 2>/dev/null || true
helm uninstall spark-operator -n spark-operator 2>/dev/null || true
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true
kubectl delete -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka 2>/dev/null || true
kubectl delete -f k8s/base/namespaces/namespaces.yaml 2>/dev/null || true

log "✅ Teardown complete"
