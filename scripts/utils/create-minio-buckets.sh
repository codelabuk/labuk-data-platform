#!/bin/bash
set -e

log() { echo "[$(date '+%H:%M:%S')] $1"; }

MINIO_POD=$(kubectl get pod -n minio -l app=minio -o jsonpath='{.items[0].metadata.name}')

log "Creating MinIO buckets via pod $MINIO_POD..."

kubectl exec -n minio "$MINIO_POD" -- sh -c "
  mc alias set local http://localhost:9000 sparkadmin sparkadmin123 && \
  mc mb --ignore-existing local/warehouse && \
  mc mb --ignore-existing local/checkpoints && \
  mc mb --ignore-existing local/spark-jars && \
  mc mb --ignore-existing local/spark-jobs && \
  mc ls local/
"
