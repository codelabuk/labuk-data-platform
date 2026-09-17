from flask import Blueprint, jsonify, request

from clients import custom_api, SPARK_GROUP, SPARK_VERSION, SPARK_PLURAL
from config import (SPARK_NAMESPACE, MINIO_SPARK_ENDPOINT, MINIO_ACCESS_KEY,
                    MINIO_SECRET_KEY, MINIO_BUCKET)
from decorators import handle_api_errors, with_namespace, require_json_fields

spark_apps_bp = Blueprint("spark_apps", __name__)


@spark_apps_bp.route("/api/spark-apps")
@with_namespace
@handle_api_errors(default={"items": []})
def list_spark_apps(ns):
    resp = custom_api.list_namespaced_custom_object(
        group=SPARK_GROUP, version=SPARK_VERSION, namespace=ns, plural=SPARK_PLURAL
    )
    result = []
    for item in resp.get("items", []):
        state = item.get("status", {}).get("applicationState", {})
        result.append({
            "name": item["metadata"]["name"],
            "namespace": item["metadata"]["namespace"],
            "state": state.get("state", "UNKNOWN"),
            "message": state.get("errorMessage", ""),
            "type": item["spec"].get("type"),
            "image": item["spec"].get("image"),
            "created": item["metadata"].get("creationTimestamp"),
        })
    return jsonify(result)


@spark_apps_bp.route("/api/spark-apps", methods=["POST"])
@require_json_fields("name", "jarPath")
def submit_spark_app():
    body = request.json
    ns = body.get("namespace", SPARK_NAMESPACE)

    spark_conf = {
        "spark.hadoop.fs.s3a.endpoint": MINIO_SPARK_ENDPOINT,
        "spark.hadoop.fs.s3a.access.key": MINIO_ACCESS_KEY,
        "spark.hadoop.fs.s3a.secret.key": MINIO_SECRET_KEY,
        "spark.hadoop.fs.s3a.path.style.access": "true",
        "spark.hadoop.fs.s3a.impl": "org.apache.hadoop.fs.s3a.S3AFileSystem",
        "spark.hadoop.fs.s3a.aws.credentials.provider":
                "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider",
        "spark.eventLog.enabled": "true",
        "spark.hadoop.fs.s3a.connection.ssl.enabled": "false",
        "spark.eventLog.dir": "s3a://" + MINIO_BUCKET + "/event-logs",
    }
    if body.get("sparkConf"):
        spark_conf.update(body["sparkConf"])

    spark_app = {
        "apiVersion": f"{SPARK_GROUP}/{SPARK_VERSION}",
        "kind": "SparkApplication",
        "metadata": {
            "name": body["name"],
            "namespace": ns
        },
        "spec": {
            "type": body.get("type", "Scala"),
            "mode": "cluster",
            "image": body.get("image", "spark-jobs:latest"),
            "imagePullPolicy": body.get("imagePullPolicy", "Never"),
            "mainApplicationFile": body["jarPath"],
            "sparkVersion": body.get("sparkVersion", "3.5.3"),
            "restartPolicy": {"type": "Never"},
            "sparkConf": spark_conf,
            "driver": {
                "cores": int(body.get("driverCores", 1)),
                "memory": body.get("driverMemory", "512m"),
                "serviceAccount": "spark"
            },
            "executor": {
                "cores": int(body.get("executorCores", 1)),
                "instances": int(body.get("executorInstances", 1)),
                "memory": body.get("executorMemory", "512m")
            }
        }
    }

    if body.get("mainClass"):
        spark_app["spec"]["mainClass"] = body["mainClass"]

    custom_api.create_namespaced_custom_object(
        group=SPARK_GROUP, version=SPARK_VERSION, namespace=ns,
        plural=SPARK_PLURAL, body=spark_app
    )

    return jsonify({"submitted": body["name"]}), 201


@spark_apps_bp.route("/api/spark-apps/<name>", methods=["DELETE"])
@with_namespace
def delete_spark_app(name, ns):
    custom_api.delete_namespaced_custom_object(
        group=SPARK_GROUP, version=SPARK_VERSION, namespace=ns,
        plural=SPARK_PLURAL, name=name
    )
    return jsonify({"deleted": name})
