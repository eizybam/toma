# Toma API

Base URL: `https://dfw205xdab.execute-api.us-east-2.amazonaws.com`

All requests and responses are JSON. Errors always look like:

```json
{ "error": "unknown_tag", "message": "Esta etiqueta no está registrada" }
```

Times are 24 h `HH:MM` in Mexico City time (UTC-6). Timestamps are ISO 8601 with offset.

## NFC flow

Each tag stores a URL pointing to the frontend, not the API:

```
https://<frontend-host>/t/<tagId>
```

With augmented NDEF enabled on the ST25TV02KC, the chip appends a tap counter, for example
`/t/toma-demo-1?c=0000A3`. The frontend must forward that value as `ctr` when it is present.

Demo tags: `toma-demo-1` (Metformina) and `toma-demo-2` (Losartán).

## Endpoints

### `POST /tap`

Registers a dose for the medication bound to the tag.

Request:

```json
{ "tagId": "toma-demo-1", "ctr": "0000A3" }
```

`ctr` is optional. It is decoded according to the tag's `codeScheme`:

| codeScheme | Format | Use |
|---|---|---|
| `hex` (default) | 1–8 hex digits | Simulated tags and the demo |
| `st25` | ST25TV02KC unique tap code | Real tags; decoder deployed privately |

Each accepted code must be greater than the last one seen for that tag, otherwise `409 replay`.

Response `200` — `status` drives the UI:

| status | Meaning | Extra fields |
|---|---|---|
| `recorded` | Dose saved | `takenAt`, `minutesLate`, `onTime` |
| `duplicate` | This dose was already taken; caregiver is notified | `minutesAgo` |
| `early` | More than 2 h before the scheduled time; nothing saved | `minutesUntil` |

Always present: `patientId`, `patientName`, `medId`, `medName`, `dose`, `slot`, `nextDose`, `message`.

```json
{
  "status": "recorded",
  "patientId": "demo",
  "patientName": "Doña Rosa",
  "medId": "306bbd16",
  "medName": "Metformina",
  "dose": "850 mg",
  "slot": "12:25",
  "nextDose": "20:00",
  "takenAt": "2026-11-04T12:25:10-06:00",
  "minutesLate": 0,
  "onTime": true,
  "message": "Dosis registrada"
}
```

Errors: `400 missing_tag`, `400 bad_ctr`, `404 unknown_tag`, `409 replay` (copied URL or cloned tag).

To simulate a cloned tag, send a fresh hex code such as `Date.now().toString(16)`, then send the
exact same body again; the second request returns `409 replay`.

### `GET /patients/{pid}`

Everything the caregiver dashboard needs.

```json
{
  "profile": { "patientId": "demo", "name": "Doña Rosa", "caregiverName": "Laura (hija)", "caregiverContact": "" },
  "meds": [
    { "medId": "306bbd16", "name": "Metformina", "dose": "850 mg", "times": ["08:00", "20:00"],
      "windowMin": 30, "tagId": "toma-demo-1", "notes": "", "createdAt": "..." }
  ],
  "today": [
    { "medId": "306bbd16", "medName": "Metformina", "dose": "850 mg", "slot": "08:00",
      "status": "taken", "takenAt": "..." }
  ],
  "alerts": [
    { "type": "missed", "medName": "Losartán", "slot": "12:26", "message": "Doña Rosa no ha tomado...", "createdAt": "..." }
  ],
  "recentDoses": [ { "medName": "Metformina", "slot": "08:00", "takenAt": "...", "onTime": true, "minutesLate": 0 } ],
  "adherence": { "pct": 86, "days": [ { "date": "2026-11-04", "expected": 3, "taken": 2, "pct": 67 } ] },
  "serverTime": "2026-11-04T12:30:00-06:00"
}
```

`today[].status`: `taken`, `due` (inside the tolerance window), `missed`, `upcoming`.
`alerts[].type`: `missed` or `duplicate`. Alerts are newest first.
`adherence.pct` and `days[].pct` are `null` when there is nothing to measure yet.

Poll this endpoint every 5–10 s on the dashboard to show taps live.

### `GET /patients/{pid}/history?days=7`

Same shape as above, with `adherence.days` covering `days` (1–30).

### `POST /patients`

```json
{ "name": "Doña Rosa", "caregiverName": "Laura", "caregiverContact": "+52 55..." }
```

`201` returns the profile including the generated `patientId`.

### `POST /patients/{pid}/meds`

```json
{ "name": "Losartán", "dose": "50 mg", "times": ["09:00", "21:00"], "windowMin": 30, "tagId": "toma-abc", "codeScheme": "hex", "notes": "" }
```

`tagId` is optional; one is generated if omitted. Reusing a `tagId` rebinds the tag. `201` returns the medication.

### `DELETE /patients/{pid}/meds/{mid}`

Removes the medication and unbinds its tag.

### `POST /prescriptions/parse`

Reads a prescription photo with Amazon Bedrock (Nova 2 Lite).

```json
{ "imageBase64": "data:image/jpeg;base64,...", "mediaType": "image/jpeg", "patientId": "demo", "save": false }
```

Resize images on the client to about 1600 px on the long side before sending (request limit is 6 MB).
With `"save": true` and a `patientId`, medications with times are created immediately.

```json
{
  "legible": true,
  "notes": "",
  "medications": [
    { "name": "Metformina", "dose": "850 mg", "times": ["08:00", "20:00"], "durationDays": 30, "notes": "con alimentos" }
  ],
  "created": []
}
```

Takes 3–8 s; show a loading state.

### `POST /demo/seed`

Resets patient `demo` with two medications. `toma-demo-1` is due now; `toma-demo-2` is marked
missed after `missedInSeconds` (default 15, range 5–25) and the alert is sent if it is not tapped.

```json
{ "name": "Doña Rosa", "caregiverName": "Laura (hija)", "missedInSeconds": 15 }
```

All fields are optional.
