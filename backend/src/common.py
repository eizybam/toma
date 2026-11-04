"""Shared helpers: table access, Mexico City time, schedule math and alerts."""
import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3

# Mexico dropped daylight saving time in 2022.
MX_TZ = timezone(timedelta(hours=-6), "America/Mexico_City")

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
SNS = boto3.client("sns")
ALERTS_TOPIC_ARN = os.environ["ALERTS_TOPIC_ARN"]

DEFAULT_WINDOW_MIN = 30


def now_mx() -> datetime:
    return datetime.now(MX_TZ)


def slot_datetime(day: datetime, slot: str) -> datetime:
    hh, mm = (int(x) for x in slot.split(":"))
    return day.replace(hour=hh, minute=mm, second=0, microsecond=0)


def closest_slot(times: list[str], when: datetime) -> tuple[str, int]:
    """Closest scheduled time to `when` and the offset in minutes (positive = late)."""
    best, best_diff = None, None
    for t in times:
        diff = int((when - slot_datetime(when, t)).total_seconds() // 60)
        if best_diff is None or abs(diff) < abs(best_diff):
            best, best_diff = t, diff
    return best, best_diff


def publish_alert(subject: str, message: str) -> None:
    SNS.publish(TopicArn=ALERTS_TOPIC_ARN, Subject=subject[:99], Message=message)


def _default(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    if isinstance(o, set):
        return list(o)
    raise TypeError(type(o))


def response(status: int, body) -> dict:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body, default=_default, ensure_ascii=False),
    }
