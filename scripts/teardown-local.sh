#!/bin/bash
set -e
log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "This will remove all labuk platform components"
read -p "Are you sure? (yes/no): " confirm
[ "$confirm" != "yes" ] && { log "Aborted"; exit 0; }

log "Removing Spark jobs..."
kubectl delete sparkapplication --all -n spark 2>/dev/null || true

log "Removing Driver Ingress Controller..."
kubectl delete -k k8s/base/ingress-controller/driver-ingress-controller 2>/dev/null || true

log "Removing Spark (config, history server, dashboard)..."
kubectl delete -k k8s/base/spark 2>/dev/null || true

log "Removing Kafka cluster and topics..."
kubectl delete -k k8s/base/kafka 2>/dev/null || true

log "Removing Hive Metastore..."
kubectl delete -f k8s/base/metastore/hive-metastore.yaml 2>/dev/null || true

log "Removing PostgreSQL..."
kubectl delete -f k8s/base/metastore/postgre-setup.yaml 2>/dev/null || true

log "Removing MinIO..."
kubectl delete -k k8s/base/minio 2>/dev/null || true

log "Removing RBAC..."
kubectl delete -k k8s/base/rbac 2>/dev/null || true

log "Removing Helm releases..."
helm uninstall spark-operator -n spark-operator 2>/dev/null || true
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true

log "Removing Strimzi..."
kubectl delete -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka 2>/dev/null || true

log "Removing namespaces (removes anything left inside)..."
kubectl delete -k k8s/base/namespaces 2>/dev/null || true

log "Teardown complete"
