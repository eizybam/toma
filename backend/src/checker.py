"""Scheduled every minute: records missed doses and notifies the caregiver."""
import time
from datetime import datetime

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

from common import TABLE, missed_after, now_mx, publish_alert, slot_datetime

MAX_DELAY_S = 25


def _all_meds():
    kwargs = {"FilterExpression": Attr("sk").begins_with("MED#")}
    while True:
        page = TABLE.scan(**kwargs)
        yield from page["Items"]
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def handler(event, context):
    delay = int((event or {}).get("delaySeconds", 0))
    if delay:
        time.sleep(min(delay, MAX_DELAY_S))
    now = now_mx()
    today = now.strftime("%Y-%m-%d")
    sent = 0
    profiles = {}

    for med in _all_meds():
        pk, mid = med["pk"], med["medId"]
        created = datetime.fromisoformat(med["createdAt"])

        for slot in med.get("times", []):
            if slot_datetime(now, slot) < created or now < missed_after(med, slot, now):
                continue
            dose = TABLE.get_item(Key={"pk": pk, "sk": f"DOSE#{today}#{mid}#{slot}"}).get("Item")
            if dose:
                continue

            if pk not in profiles:
                profiles[pk] = TABLE.get_item(Key={"pk": pk, "sk": "PROFILE"}).get("Item", {})
            patient = profiles[pk].get("name", "El paciente")
            msg = f"{patient} no ha tomado {med['name']} ({med.get('dose', '')}) de las {slot}."

            try:
                TABLE.put_item(
                    Item={
                        "pk": pk,
                        "sk": f"ALERT#{today}#{mid}#{slot}",
                        "type": "missed",
                        "medId": mid,
                        "medName": med["name"],
                        "slot": slot,
                        "date": today,
                        "message": msg,
                        "createdAt": now.isoformat(),
                    },
                    ConditionExpression="attribute_not_exists(sk)",
                )
            except ClientError as e:
                if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                    continue
                raise
            publish_alert(f"Toma: dosis olvidada - {patient}", msg)
            sent += 1

    return {"alertsSent": sent}
