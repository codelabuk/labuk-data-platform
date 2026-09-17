from flask import Blueprint, jsonify

from clients import core_v1
from decorators import handle_api_errors, with_namespace

pods_bp = Blueprint("pods", __name__)


@pods_bp.route("/api/pods")
@with_namespace
def get_pods(ns):
    pods = core_v1.list_namespaced_pod(namespace=ns)
    spark_jobs = []
    infrastructure = []
    for pod in pods.items:
        labels = pod.metadata.labels or {}
        pod_data = {
            "name":      pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status":    pod.status.phase,
            "node":      pod.spec.node_name,
            "created":   pod.metadata.creation_timestamp.isoformat()
                         if pod.metadata.creation_timestamp else None,
            "labels":    labels
        }
        if "spark-role" in labels or "spark-app-name" in labels:
            spark_jobs.append(pod_data)
        else:
            infrastructure.append(pod_data)

    return jsonify({
        "sparkJobs": spark_jobs,
        "infrastructure": infrastructure,
        "all": spark_jobs + infrastructure
    })


@pods_bp.route("/api/pods/<name>/logs")
@with_namespace
@handle_api_errors(default={"logs": ""})
def get_pod_logs(name, ns):
    logs = core_v1.read_namespaced_pod_log(name=name, namespace=ns, tail_lines=200)
    return jsonify({"logs": logs})


@pods_bp.route("/api/pods/<name>", methods=["DELETE"])
@with_namespace
def delete_pod(name, ns):
    core_v1.delete_namespaced_pod(name=name, namespace=ns)
    return jsonify({"deleted": name})
