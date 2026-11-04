"""Entry point for the URLs written on NFC tags.

When FRONTEND_URL is set, requests are redirected to the hosted frontend with the same path and
query string, so tags keep working without being rewritten. Otherwise the bundled fallback page
is served.
"""
import os
from pathlib import Path

FRONTEND_URL = os.environ.get("FRONTEND_URL", "").rstrip("/")
_HTML = (Path(__file__).parent / "web" / "index.html").read_text(encoding="utf-8")


def handler(event, context):
    if FRONTEND_URL:
        query = event.get("rawQueryString")
        location = f"{FRONTEND_URL}{event.get('rawPath', '/')}" + (f"?{query}" if query else "")
        return {"statusCode": 302, "headers": {"location": location, "cache-control": "no-store"}}
    return {
        "statusCode": 200,
        "headers": {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"},
        "body": _HTML,
    }
