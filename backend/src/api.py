"""HTTP API handlers for Toma."""
import base64
import json
import os
import re
import uuid
from datetime import datetime, timedelta

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from common import (
    DEFAULT_WINDOW_MIN,
    TABLE,
    closest_slot,
    missed_after,
    now_mx,
    publish_alert,
    response,
    slot_datetime,
)
from tap_codes import DECODERS, DEFAULT_SCHEME

BEDROCK = boto3.client("bedrock-runtime")
LAMBDA = boto3.client("lambda")
CHECKER_FUNCTION = os.environ.get("CHECKER_FUNCTION", "")
MODEL_ID = os.environ["BEDROCK_MODEL_ID"]
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
EARLY_LIMIT_MIN = 120
DEMO_PID = "demo"


class ApiError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def _body(event) -> dict:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ApiError(400, "bad_json", "El cuerpo debe ser JSON")
    if not isinstance(data, dict):
        raise ApiError(400, "bad_json", "El cuerpo debe ser un objeto JSON")
    return data


def _short_id() -> str:
    return uuid.uuid4().hex[:8]


def _patient_items(pid: str) -> list[dict]:
    items, kwargs = [], {"KeyConditionExpression": Key("pk").eq(f"PATIENT#{pid}")}
    while True:
        page = TABLE.query(**kwargs)
        items += page["Items"]
        if "LastEvaluatedKey" not in page:
            return items
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def _validate_times(times) -> list[str]:
    if not isinstance(times, list) or not times or not all(isinstance(t, str) and TIME_RE.match(t) for t in times):
        raise ApiError(400, "bad_times", "times debe ser una lista de horas 'HH:MM' (24 h)")
    return sorted(set(times))


def _next_dose(times: list[str], now: datetime):
    for t in sorted(times):
        if slot_datetime(now, t) > now:
            return t
    return sorted(times)[0] + " (mañana)" if times else None


def tap(event):
    data = _body(event)
    tag_id = str(data.get("tagId", "")).strip()
    if not tag_id:
        raise ApiError(400, "missing_tag", "Falta tagId")

    tag = TABLE.get_item(Key={"pk": f"TAG#{tag_id}", "sk": "TAG"}).get("Item")
    if not tag:
        raise ApiError(404, "unknown_tag", "Esta etiqueta no está registrada")

    ctr_raw = data.get("ctr")
    if ctr_raw not in (None, ""):
        decoder = DECODERS.get(tag.get("codeScheme", DEFAULT_SCHEME))
        if decoder is None:
            raise ApiError(503, "scheme_unavailable", "Esta etiqueta usa un esquema de código no disponible")
        ctr = decoder(str(ctr_raw))
        if ctr is None:
            raise ApiError(400, "bad_ctr", "Código de toque inválido")
        try:
            TABLE.update_item(
                Key={"pk": f"TAG#{tag_id}", "sk": "TAG"},
                UpdateExpression="SET lastCtr = :c",
                ConditionExpression="attribute_not_exists(lastCtr) OR lastCtr < :c",
                ExpressionAttributeValues={":c": ctr},
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise ApiError(409, "replay", "Este toque ya se usó: la URL parece copiada o la etiqueta clonada")
            raise

    pid, mid = tag["patientId"], tag["medId"]
    pk = f"PATIENT#{pid}"
    med = TABLE.get_item(Key={"pk": pk, "sk": f"MED#{mid}"}).get("Item")
    if not med:
        raise ApiError(404, "unknown_med", "La medicina de esta etiqueta ya no existe")
    patient = TABLE.get_item(Key={"pk": pk, "sk": "PROFILE"}).get("Item", {})

    now = now_mx()
    today = now.strftime("%Y-%m-%d")
    times = med.get("times", [])
    slot, diff = closest_slot(times, now)
    base = {
        "patientId": pid,
        "patientName": patient.get("name"),
        "medId": mid,
        "medName": med["name"],
        "dose": med.get("dose"),
        "slot": slot,
        "nextDose": _next_dose(times, now),
    }

    if slot is None:
        raise ApiError(400, "no_schedule", "Esta medicina no tiene horarios")

    if diff < -EARLY_LIMIT_MIN:
        return response(200, {**base, "status": "early", "minutesUntil": -diff,
                              "message": f"Todavía no toca. Tu dosis es a las {slot}."})

    dose_sk = f"DOSE#{today}#{mid}#{slot}"
    window = int(med.get("windowMin", DEFAULT_WINDOW_MIN))
    try:
        TABLE.put_item(
            Item={
                "pk": pk, "sk": dose_sk, "medId": mid, "medName": med["name"], "slot": slot,
                "date": today, "takenAt": now.isoformat(), "minutesLate": max(diff, 0),
                "onTime": diff <= window, "tagId": tag_id,
            },
            ConditionExpression="attribute_not_exists(sk)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        prev = TABLE.get_item(Key={"pk": pk, "sk": dose_sk})["Item"]
        ago = int((now - datetime.fromisoformat(prev["takenAt"])).total_seconds() // 60)
        msg = f"{patient.get('name', 'El paciente')} intentó tomar {med['name']} otra vez (ya la tomó hace {ago} min)."
        TABLE.put_item(Item={
            "pk": pk, "sk": f"ALERT#{today}#{mid}#{slot}#DUP#{now.strftime('%H%M%S')}",
            "type": "duplicate", "medId": mid, "medName": med["name"], "slot": slot,
            "date": today, "message": msg, "createdAt": now.isoformat(),
        })
        publish_alert(f"Toma: posible dosis doble - {patient.get('name', '')}", msg)
        return response(200, {**base, "status": "duplicate", "minutesAgo": ago,
                              "message": f"¡Espera! Ya tomaste esta dosis hace {ago} min."})

    return response(200, {**base, "status": "recorded", "takenAt": now.isoformat(),
                          "minutesLate": max(diff, 0), "onTime": diff <= window,
                          "message": "Dosis registrada"})


def create_patient(event, pid=None):
    data = _body(event)
    name = str(data.get("name", "")).strip()
    if not name:
        raise ApiError(400, "missing_name", "Falta name")
    pid = pid or _short_id()
    item = {
        "pk": f"PATIENT#{pid}", "sk": "PROFILE", "patientId": pid, "name": name,
        "caregiverName": data.get("caregiverName", ""), "caregiverContact": data.get("caregiverContact", ""),
        "createdAt": now_mx().isoformat(),
    }
    TABLE.put_item(Item=item)
    return response(201, item)


def _put_med(pid, data, created_at=None):
    name = str(data.get("name", "")).strip()
    if not name:
        raise ApiError(400, "missing_name", "Falta name")
    times = _validate_times(data.get("times"))
    window = int(data.get("windowMin", DEFAULT_WINDOW_MIN))
    if not 1 <= window <= 240:
        raise ApiError(400, "bad_window", "windowMin debe estar entre 1 y 240")
    mid = _short_id()
    tag_id = str(data.get("tagId") or f"toma-{mid}")
    scheme = data.get("codeScheme", DEFAULT_SCHEME)
    if scheme not in DECODERS:
        raise ApiError(400, "bad_scheme", f"codeScheme debe ser uno de: {', '.join(sorted(DECODERS))}")
    item = {
        "pk": f"PATIENT#{pid}", "sk": f"MED#{mid}", "medId": mid, "name": name,
        "dose": data.get("dose", ""), "notes": data.get("notes", ""), "times": times,
        "windowMin": window, "tagId": tag_id, "createdAt": created_at or now_mx().isoformat(),
    }
    TABLE.put_item(Item=item)
    TABLE.put_item(Item={"pk": f"TAG#{tag_id}", "sk": "TAG", "tagId": tag_id, "patientId": pid,
                         "medId": mid, "codeScheme": scheme})
    return item


def create_med(event, pid):
    if not TABLE.get_item(Key={"pk": f"PATIENT#{pid}", "sk": "PROFILE"}).get("Item"):
        raise ApiError(404, "unknown_patient", "Paciente no encontrado")
    return response(201, _put_med(pid, _body(event)))


def delete_med(pid, mid):
    med = TABLE.get_item(Key={"pk": f"PATIENT#{pid}", "sk": f"MED#{mid}"}).get("Item")
    if not med:
        raise ApiError(404, "unknown_med", "Medicina no encontrada")
    TABLE.delete_item(Key={"pk": f"TAG#{med['tagId']}", "sk": "TAG"})
    TABLE.delete_item(Key={"pk": f"PATIENT#{pid}", "sk": f"MED#{mid}"})
    return response(200, {"deleted": mid})


def _adherence(meds, doses, now, days):
    """Taken vs. expected doses per day, ignoring slots still inside their window."""
    taken_keys = {(d["date"], d["medId"], d["slot"]) for d in doses}
    out = []
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        date = day.strftime("%Y-%m-%d")
        expected = taken = 0
        for m in meds:
            created = datetime.fromisoformat(m["createdAt"])
            for t in m.get("times", []):
                if slot_datetime(day, t) < created or missed_after(m, t, day) > now:
                    continue
                expected += 1
                taken += (date, m["medId"], t) in taken_keys
        out.append({"date": date, "expected": expected, "taken": taken,
                    "pct": round(100 * taken / expected) if expected else None})
    return out


def get_patient(pid, days=7):
    items = _patient_items(pid)
    profile = next((i for i in items if i["sk"] == "PROFILE"), None)
    if not profile:
        raise ApiError(404, "unknown_patient", "Paciente no encontrado")
    meds = [i for i in items if i["sk"].startswith("MED#")]
    doses = [i for i in items if i["sk"].startswith("DOSE#")]
    alerts = sorted((i for i in items if i["sk"].startswith("ALERT#")),
                    key=lambda a: a["createdAt"], reverse=True)

    now = now_mx()
    today = now.strftime("%Y-%m-%d")
    taken_today = {(d["medId"], d["slot"]): d for d in doses if d["date"] == today}
    schedule = []
    for m in meds:
        created = datetime.fromisoformat(m["createdAt"])
        for t in m.get("times", []):
            due = slot_datetime(now, t)
            d = taken_today.get((m["medId"], t))
            if not d and due < created:
                continue
            if d:
                status = "taken"
            elif now >= missed_after(m, t, now):
                status = "missed"
            elif now >= due:
                status = "due"
            else:
                status = "upcoming"
            schedule.append({"medId": m["medId"], "medName": m["name"], "dose": m.get("dose"), "slot": t,
                             "status": status, "takenAt": d["takenAt"] if d else None})
    schedule.sort(key=lambda s: s["slot"])

    adherence = _adherence(meds, doses, now, days)
    exp = sum(a["expected"] for a in adherence)
    tak = sum(a["taken"] for a in adherence)

    return response(200, {
        "profile": profile,
        "meds": meds,
        "today": schedule,
        "alerts": alerts[:20],
        "recentDoses": sorted(doses, key=lambda d: d["takenAt"], reverse=True)[:30],
        "adherence": {"days": adherence, "pct": round(100 * tak / exp) if exp else None},
        "serverTime": now.isoformat(),
    })


PROMPT = """Eres un asistente que lee recetas médicas mexicanas (pueden estar escritas a mano).
Extrae cada medicamento de la imagen. Responde SOLO con JSON válido, sin texto extra, con esta forma:
{"medicamentos":[{"nombre":"Metformina","dosis":"850 mg, 1 tableta","cadaHoras":12,"horarios":["08:00","20:00"],"duracionDias":30,"indicaciones":"con alimentos"}],"legible":true,"notas":""}
Reglas:
- "horarios" en formato 24 h HH:MM. Si la receta solo dice "cada N horas", propón horarios empezando a las 08:00.
- Si un dato no aparece, usa null. No inventes medicamentos.
- Si la imagen no es una receta o no se puede leer, responde {"medicamentos":[],"legible":false,"notas":"motivo"}."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ApiError(502, "bad_model_output", "El modelo no devolvió JSON")
    return json.loads(m.group(0))


def _normalize_med(m: dict) -> dict:
    times = [t for t in (m.get("horarios") or []) if isinstance(t, str) and TIME_RE.match(t)]
    every = m.get("cadaHoras")
    if not times and isinstance(every, (int, float)) and 1 <= every <= 24:
        times = [f"{(8 + int(every) * k) % 24:02d}:00" for k in range(int(24 // every))]
    return {"name": m.get("nombre"), "dose": m.get("dosis"), "times": sorted(set(times)),
            "durationDays": m.get("duracionDias"), "notes": m.get("indicaciones")}


def parse_prescription(event):
    data = _body(event)
    img_b64 = data.get("imageBase64", "")
    if "," in img_b64[:100]:
        img_b64 = img_b64.split(",", 1)[1]
    try:
        img = base64.b64decode(img_b64, validate=True)
    except Exception:
        raise ApiError(400, "bad_image", "imageBase64 inválido")
    if not img:
        raise ApiError(400, "bad_image", "Falta imageBase64")
    fmt = {"image/png": "png", "image/webp": "webp", "image/gif": "gif"}.get(data.get("mediaType"), "jpeg")

    out = BEDROCK.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [
            {"image": {"format": fmt, "source": {"bytes": img}}},
            {"text": PROMPT},
        ]}],
        inferenceConfig={"maxTokens": 1500, "temperature": 0},
    )
    text = "".join(c.get("text", "") for c in out["output"]["message"]["content"])
    parsed = _extract_json(text)
    meds = [_normalize_med(m) for m in parsed.get("medicamentos", []) if m.get("nombre")]

    created = []
    pid = data.get("patientId")
    if pid and data.get("save"):
        for m in meds:
            if m["times"]:
                created.append(_put_med(pid, {"name": m["name"], "dose": m["dose"] or "",
                                              "times": m["times"], "notes": m["notes"] or ""}))
    return response(200, {"legible": parsed.get("legible", bool(meds)), "notes": parsed.get("notas", ""),
                          "medications": meds, "created": created})


def seed_demo(event):
    """Reset the demo patient: Metformina is due now and Losartán is missed after a few seconds."""
    for it in _patient_items(DEMO_PID):
        if it["sk"].startswith("MED#"):
            TABLE.delete_item(Key={"pk": f"TAG#{it['tagId']}", "sk": "TAG"})
        TABLE.delete_item(Key={"pk": it["pk"], "sk": it["sk"]})

    data = _body(event)
    now = now_mx()
    TABLE.put_item(Item={
        "pk": f"PATIENT#{DEMO_PID}", "sk": "PROFILE", "patientId": DEMO_PID, "name": data.get("name", "Doña Rosa"),
        "caregiverName": data.get("caregiverName", "Laura (hija)"), "caregiverContact": data.get("caregiverContact", ""),
        "createdAt": (now - timedelta(days=7)).isoformat(),
    })
    missed_in = max(5, min(int(data.get("missedInSeconds", 15)), 25))
    due_at = now + timedelta(seconds=missed_in)
    near = now.strftime("%H:%M")
    created_at = (now - timedelta(minutes=5)).isoformat()
    m1 = _put_med(DEMO_PID, {"name": "Metformina", "dose": "850 mg", "times": sorted({"08:00", near, "20:00"}),
                             "windowMin": 30, "tagId": "toma-demo-1"}, created_at)
    m2 = _put_med(DEMO_PID, {"name": "Losartán", "dose": "50 mg", "times": [near], "windowMin": 1,
                             "tagId": "toma-demo-2"}, created_at)
    m2["dueAt"] = due_at.isoformat()
    TABLE.put_item(Item=m2)
    if CHECKER_FUNCTION:
        LAMBDA.invoke(FunctionName=CHECKER_FUNCTION, InvocationType="Event",
                      Payload=json.dumps({"delaySeconds": missed_in + 1}).encode())
    return response(201, {"patientId": DEMO_PID, "meds": [m1, m2],
                          "info": f"Toca toma-demo-1 para registrar. Si no tocas toma-demo-2, en {missed_in} s llega el aviso."})


def handler(event, context):
    route = event.get("routeKey", "")
    p = event.get("pathParameters") or {}
    qs = event.get("queryStringParameters") or {}
    try:
        if route == "POST /tap":
            return tap(event)
        if route == "POST /patients":
            return create_patient(event)
        if route == "GET /patients/{pid}":
            return get_patient(p["pid"])
        if route == "GET /patients/{pid}/history":
            days = max(1, min(int(qs.get("days", 7)), 30))
            return get_patient(p["pid"], days)
        if route == "POST /patients/{pid}/meds":
            return create_med(event, p["pid"])
        if route == "DELETE /patients/{pid}/meds/{mid}":
            return delete_med(p["pid"], p["mid"])
        if route == "POST /prescriptions/parse":
            return parse_prescription(event)
        if route == "POST /demo/seed":
            return seed_demo(event)
        return response(404, {"error": "not_found"})
    except ApiError as e:
        return response(e.status, {"error": e.code, "message": e.message})
    except ValueError as e:
        return response(400, {"error": "bad_request", "message": str(e)})
