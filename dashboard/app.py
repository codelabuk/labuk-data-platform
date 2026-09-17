from flask import Flask
from flask_cors import CORS

from routes import BLUEPRINTS


def create_app():
    app = Flask(__name__, static_folder="static")
    CORS(app)
    for bp in BLUEPRINTS:
        app.register_blueprint(bp)
    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
