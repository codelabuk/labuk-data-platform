import requests as req_lib
from flask import Blueprint, Response, jsonify, request

from config import SPARK_HISTORY_URL, SPARK_NAMESPACE

proxy_bp = Blueprint("proxy", __name__)


@proxy_bp.route("/proxy/history/")
@proxy_bp.route("/proxy/history/<path:subpath>")
def proxy_history(subpath=""):
    target = f"{SPARK_HISTORY_URL}/{subpath}"
    if request.query_string:
        target += "?" + request.query_string.decode()
    try:
        resp = req_lib.get(target, timeout=5, stream=True)
        content_type = resp.headers.get("Content-Type", "text/html")
        content = resp.content
        if "text/html" in content_type:
            content = content \
                .replace(b'href="/', b'href="/proxy/history/') \
                .replace(b'src="/', b'src="/proxy/history/') \
                .replace(b'action="/', b'action="/proxy/history/')
        return Response(content, status=resp.status_code, content_type=content_type)
    except Exception as e:
        return f"<p>History server unavailable: {e}</p>", 503


@proxy_bp.route("/proxy/spark-ui/<pod_name>/<path:path>")
@proxy_bp.route("/proxy/spark-ui/<pod_name>/")
@proxy_bp.route("/proxy/spark-ui/<pod_name>")
def proxy_spark_ui(pod_name, path=""):
    namespace = request.args.get("namespace", SPARK_NAMESPACE)
    target_url = f"http://{pod_name}.{namespace}.svc.cluster.local:4040/{path}"
    if request.query_string:
        target_url += "?" + request.query_string.decode("utf-8")

    try:
        resp = req_lib.request(
            method=request.method,
            url=target_url,
            headers={k: v for k, v in request.headers if k.lower() != "host"},
            data=request.get_data(),
            allow_redirects=False,
            timeout=30
        )

        headers = [(k, v) for k, v in resp.headers.items()
                   if k.lower() not in ("transfer-encoding", "connection")]

        if "Location" in resp.headers:
            location = resp.headers["Location"]
            if location.startswith("http"):
                location = location.replace(
                    f"http://{pod_name}.{namespace}.svc.cluster.local:4040",
                    f"/proxy/spark-ui/{pod_name}"
                )
            headers = [(k, v if k != "Location" else location) for k, v in headers]

        return Response(resp.content, status=resp.status_code, headers=headers)

    except Exception as e:
        return jsonify({
            "error": f"Cannot connect to Spark UI for pod {pod_name}",
            "details": str(e),
            "pod": pod_name,
            "namespace": namespace
        }), 502
