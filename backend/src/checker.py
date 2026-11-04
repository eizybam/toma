"""Scheduled every minute: records missed doses and notifies the caregiver."""
from datetime import datetime

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

from common import DEFAULT_WINDOW_MIN, TABLE, now_mx, publish_alert, slot_datetime


def _all_meds():
    kwargs = {"FilterExpression": Attr("sk").begins_with("MED#")}
    while True:
        page = TABLE.scan(**kwargs)
        yield from page["Items"]
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def handler(event, context):
    now = now_mx()
    today = now.strftime("%Y-%m-%d")
    sent = 0
    profiles = {}

    for med in _all_meds():
        pk, mid = med["pk"], med["medId"]
        window = int(med.get("windowMin", DEFAULT_WINDOW_MIN))
        created = datetime.fromisoformat(med["createdAt"])

        for slot in med.get("times", []):
            due = slot_datetime(now, slot)
            if due < created or (now - due).total_seconds() < window * 60:
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
