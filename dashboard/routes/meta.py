import os

from flask import Blueprint, jsonify, send_from_directory, current_app

from config import (SPARK_NAMESPACE, SPARK_HISTORY_URL, SPARK_HISTORY_EXTERNAL_URL,
                    DASHBOARD_NAMESPACES, DRIVER_DOMAIN_SUFFIX)

meta_bp = Blueprint("meta", __name__)

DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "dist")


def _serve_spa(_path=""):
    if os.path.exists(os.path.join(DIST_DIR, "index.html")):
        return send_from_directory(DIST_DIR, "index.html")
    return (
        "Frontend build not found — run `npm run build` in dashboard/frontend, "
        "or use `npm run dev` for local development.",
        200,
    )


@meta_bp.route("/")
@meta_bp.route("/<path:_path>")
def index(_path=""):
    # SPA fallback: any non-API, non-static route serves the React app so
    # client-side routes (e.g. /pods, /deploy) survive a refresh/deep link.
    return _serve_spa(_path)


@meta_bp.route("/health")
def health():
    return jsonify({"status": "ok"})


@meta_bp.route("/api/namespaces")
def list_namespaces():
    return jsonify(DASHBOARD_NAMESPACES)


@meta_bp.route("/api/config")
def get_config():
    return jsonify({
        "defaultNamespace": SPARK_NAMESPACE,
        "historyServerUrl": SPARK_HISTORY_URL,
        "historyExternalUrl": SPARK_HISTORY_EXTERNAL_URL,
        "namespaces": DASHBOARD_NAMESPACES,
        "driverDomainSuffix": DRIVER_DOMAIN_SUFFIX
    })
