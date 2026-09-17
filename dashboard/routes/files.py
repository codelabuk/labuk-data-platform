import io
import os

from flask import Blueprint, jsonify, request

from clients import get_minio, ensure_bucket
from config import MINIO_BUCKET
from decorators import handle_api_errors

files_bp = Blueprint("files", __name__)


@files_bp.route("/api/files")
@handle_api_errors()
def list_files():
    ensure_bucket()
    mc = get_minio()
    prefix = request.args.get("prefix", "jobs/")
    objects = mc.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True)
    files = []
    for obj in objects:
        files.append({
            "name": obj.object_name,
            "size": obj.size,
            "lastModified": obj.last_modified.isoformat() if obj.last_modified else None,
            "s3aPath": "s3a://" + MINIO_BUCKET + "/" + obj.object_name,
        })
    return jsonify(files)


@files_bp.route("/api/files/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "no file in request"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty Filename"}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in (".py", ".jar"):
        return jsonify({"error": "Invalid Extension"}), 400
    object_name = "jobs/" + f.filename
    data = f.read()
    content_type = "text/x-python" if ext == ".py" else "application/octet-stream"
    try:
        ensure_bucket()
        mc = get_minio()
        mc.put_object(MINIO_BUCKET, object_name, io.BytesIO(data),
                      length=len(data), content_type=content_type)
        return jsonify({
            "uploaded": f.filename,
            "s3aPath": "s3a://" + MINIO_BUCKET + "/" + object_name,
            "size": len(data),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route("/api/files/<path:object_name>", methods=["DELETE"])
def delete_file(object_name):
    try:
        mc = get_minio()
        mc.remove_object(MINIO_BUCKET, object_name)
        return jsonify({"deleted": object_name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route("/api/minio/status")
@handle_api_errors()
def minio_status():
    ensure_bucket()
    mc = get_minio()
    buckets = [b.name for b in mc.list_buckets()]
    return jsonify({"status": "ok", "buckets": buckets})
