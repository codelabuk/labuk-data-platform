from functools import wraps

from flask import jsonify, request

from config import SPARK_NAMESPACE


def handle_api_errors(default=None, status=200):
    """Catch exceptions raised by a view and return them as JSON instead of a 500 page."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                body = dict(default or {})
                body["error"] = str(e)
                return jsonify(body), status
        return wrapper
    return decorator


def with_namespace(fn):
    """Inject the `ns` kwarg from the `namespace` query param (defaulting to SPARK_NAMESPACE)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        ns = request.args.get("namespace", SPARK_NAMESPACE)
        return fn(*args, ns=ns, **kwargs)
    return wrapper


def require_json_fields(*fields):
    """Validate that the JSON body carries the given required fields before the view runs."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            body = request.json or {}
            missing = [f for f in fields if not body.get(f)]
            if missing:
                return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400
            return fn(*args, **kwargs)
        return wrapper
    return decorator
