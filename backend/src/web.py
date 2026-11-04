"""Serves the single-page web app until the standalone frontend is hosted."""
from pathlib import Path

_HTML = (Path(__file__).parent / "web" / "index.html").read_text(encoding="utf-8")


def handler(event, context):
    return {
        "statusCode": 200,
        "headers": {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"},
        "body": _HTML,
    }
