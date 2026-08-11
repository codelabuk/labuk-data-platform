#!/bin/bash
set -e

DOMAIN="${DOMAIN:-codelabuk.dev}"
CERT_DIR="${CERT_DIR:-.certs}"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required but not installed. See https://github.com/FiloSottile/mkcert#installation" >&2
  exit 1
fi

# One-time per machine: generates and trusts a local CA in the OS/browser
# trust stores. Safe to re-run — no-ops if already installed.
mkcert -install

mkdir -p "$CERT_DIR"

WILD_CERT="_wildcard.${DOMAIN}.pem"
WILD_KEY="_wildcard.${DOMAIN}-key.pem"
DRIVER_CERT="_wildcard.driver.${DOMAIN}.pem"
DRIVER_KEY="_wildcard.driver.${DOMAIN}-key.pem"

if [ ! -f "$CERT_DIR/$WILD_CERT" ]; then
  log "Generating cert for *.${DOMAIN}..."
  ( cd "$CERT_DIR" && mkcert "*.${DOMAIN}" )
else
  log "Cert for *.${DOMAIN} already exists, skipping."
fi

if [ ! -f "$CERT_DIR/$DRIVER_CERT" ]; then
  log "Generating cert for *.driver.${DOMAIN}..."
  ( cd "$CERT_DIR" && mkcert "*.driver.${DOMAIN}" )
else
  log "Cert for *.driver.${DOMAIN} already exists, skipping."
fi

create_secret() {
  local name=$1 namespace=$2 cert=$3 key=$4
  log "Applying TLS secret $name (-n $namespace)..."
  kubectl create secret tls "$name" -n "$namespace" \
    --cert="$CERT_DIR/$cert" --key="$CERT_DIR/$key" \
    --dry-run=client -o yaml | kubectl apply -f -
}

create_secret minio-tls           minio          "$WILD_CERT"   "$WILD_KEY"
create_secret spark-dashboard-tls spark-platform "$WILD_CERT"   "$WILD_KEY"
create_secret spark-history-tls   spark          "$WILD_CERT"   "$WILD_KEY"
create_secret driver-wildcard-tls spark          "$DRIVER_CERT" "$DRIVER_KEY"

log "TLS certificates ready for *.${DOMAIN} and *.driver.${DOMAIN}"
