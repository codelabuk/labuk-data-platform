from .meta import meta_bp
from .pods import pods_bp
from .spark_apps import spark_apps_bp
from .files import files_bp
from .proxy import proxy_bp

BLUEPRINTS = [meta_bp, pods_bp, spark_apps_bp, files_bp, proxy_bp]
