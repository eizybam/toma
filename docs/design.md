# Toma — Design

> As-built design, derived from `backend/template.yaml`, `backend/src/*` and `docs/API.md`. ✅ deployed · 🔜 planned.

## 1. Overview

Serverless, in one SAM stack (`toma-backend`, region `us-east-2`). One HTTP API fronts three Lambda functions:

| Function | Handler | Job |
|---|---|---|
| `ApiFunction` | `api.handler` | Taps, patients, medications, dashboard data, prescription parsing, demo seed |
| `WebFunction` | `web.handler` | Serves the single-page web app (tap page, dashboard, demo console) as HTML |
| `CheckerFunction` | `checker.handler` | Runs every minute from EventBridge Scheduler; records missed doses and alerts |

There is no server-side session and no separate frontend host yet: the NFC URL opens the page served by `WebFunction`, and that page calls the API with `fetch`.

See `architecture.md` and `architecture.png` for the diagram.

## 2. Repository layout

```
backend/
  template.yaml        SAM template (all AWS resources)
  samconfig.toml       stack toma-backend, region us-east-2
  src/api.py           HTTP handlers and business logic
  src/checker.py       missed-dose checker
  src/common.py        table, SNS, Mexico City time, slot math, response helper
  src/tap_codes.py     tap-code decoders per scheme (hex, st25)
  src/web.py           serves src/web/index.html
  src/web/index.html   single-page app (tap page, dashboard, demo, prescription upload)
  tests/               pytest (schedule math, validation, counters)
frontend/              planned Vite + React + TypeScript + Tailwind app (only .env.example so far)
docs/                  API.md, UI_BRIEF.md
```

## 3. AWS services

| Service | Role | Status |
|---|---|---|
| **API Gateway HTTP API** | Public routes, CORS `*`, throttling 20 rps / burst 50 | ✅ |
| **Lambda** (Python 3.13, arm64, 256 MB, 30 s) | `api`, `web` (128 MB, 5 s), `checker` | ✅ |
| **DynamoDB** (on-demand, SSE) | Single table for patients, medicines, tags, doses, alerts | ✅ |
| **EventBridge Scheduler** | `rate(1 minute)` → `checker`, no retries | ✅ |
| **SNS** topic `toma-alertas` (KMS `alias/aws/sns`) | Caregiver alerts; optional email subscription via `AlertEmail` | ✅ |
| **Bedrock** (`us.amazon.nova-2-lite-v1:0`, Converse API) | Reads prescription photos | ✅ |
| **S3 + CloudFront** | Hosting for the standalone frontend | 🔜 |
| **SNS SMS** | Text message to the caregiver's phone | 🔜 |
| **Cognito** (or equivalent) | Caregiver sign-in | 🔜 |

## 4. Data model (single table, `pk` / `sk`)

| pk | sk | Item |
|---|---|---|
| `PATIENT#<pid>` | `PROFILE` | `name`, `caregiverName`, `caregiverContact`, `createdAt` |
| `PATIENT#<pid>` | `MED#<mid>` | `name`, `dose`, `notes`, `times[]`, `windowMin`, `tagId`, `createdAt` |
| `PATIENT#<pid>` | `DOSE#<date>#<mid>#<HH:MM>` | `takenAt`, `minutesLate`, `onTime`, `tagId`. One per slot (conditional write) |
| `PATIENT#<pid>` | `ALERT#<date>#<mid>#<HH:MM>` | `type: missed`, `message`, `createdAt`. One per slot (conditional write) |
| `PATIENT#<pid>` | `ALERT#<date>#<mid>#<HH:MM>#DUP#<HHMMSS>` | `type: duplicate`, `message`, `createdAt` |
| `TAG#<tagId>` | `TAG` | `patientId`, `medId`, `codeScheme`, `lastCtr` (last counter seen) |

Access patterns: the dashboard reads everything for a patient with one `Query` on `pk`; a tap reads the tag, the med and the profile with `GetItem`; the checker scans for `MED#` items.

## 5. Flows

### 5.1 Tap (`POST /tap`)

```
Phone taps tag → opens https://<host>/t/<tagId>?c=<code>
  web page → POST /tap { tagId, ctr }
    1. GetItem TAG#<tagId>                       → 404 unknown_tag if missing
    2. If ctr present:
         decoder = DECODERS[tag.codeScheme]      → 503 if scheme not deployed
         counter = decoder(ctr)                  → 400 bad_ctr if invalid
         UpdateItem lastCtr = counter
           IF lastCtr is absent OR lastCtr < counter  → 409 replay otherwise
    3. GetItem MED and PROFILE
    4. slot, diff = closest_slot(times, now)     (diff > 0 means late)
    5. diff < -120 min                           → status "early" (nothing saved)
    6. PutItem DOSE#<date>#<mid>#<slot> IF attribute_not_exists(sk)
         ok       → status "recorded" (minutesLate, onTime = diff <= windowMin)
         conflict → PutItem ALERT (duplicate) + SNS publish → status "duplicate" (minutesAgo)
  page then GETs /patients/<pid> to show the day's record and next dose
```

The conditional put in step 6 is what guarantees one dose per slot even with two simultaneous taps.

| Result | HTTP | Meaning |
|---|---|---|
| `recorded` | 200 | Dose saved |
| `duplicate` | 200 | Already taken; caregiver notified |
| `early` | 200 | More than 2 h before the slot; nothing saved |
| `missing_tag`, `bad_ctr`, `no_schedule` | 400 | Bad request |
| `unknown_tag`, `unknown_med` | 404 | Unknown tag or deleted medicine |
| `replay` | 409 | Counter already used |
| `scheme_unavailable` | 503 | Tag's decoder is not deployed |

### 5.2 Missed-dose checker

Every minute `checker` scans the table for `MED#` items. For each medicine and each of its slots today:

1. Skip if the slot is before the medicine's `createdAt`, or its window (`windowMin`) has not closed.
2. Skip if a `DOSE#<today>#<mid>#<slot>` item exists.
3. Otherwise `PutItem ALERT#...` with `attribute_not_exists(sk)`. If it succeeds, publish to SNS; if the condition fails, an earlier run already alerted, so skip.

Writing the alert before publishing makes the checker safe to run every minute without duplicate notifications. If SNS fails after the alert is written, that alert is not retried.

### 5.3 Prescription parsing (`POST /prescriptions/parse`)

1. The browser resizes the photo to about 1600 px and sends it as base64 (request limit about 6 MB).
2. `api` calls Bedrock Converse with the image and a Spanish prompt that demands JSON only (`medicamentos`, `legible`, `notas`), `temperature` 0, `maxTokens` 1500.
3. The reply is parsed with a tolerant JSON extractor. Each medicine is normalized: invalid times dropped; if only `cadaHoras` is present, times are derived.
4. With `save: true` and a `patientId`, medicines that have times are created; otherwise the web app shows them for review and the caregiver confirms, which calls `POST /patients/{pid}/meds`.

No prescription image is stored.

### 5.4 Dashboard (`GET /patients/{pid}`)

One `Query` returns profile, medicines, doses and alerts. The handler builds: today's schedule with `taken` / `due` / `missed` / `upcoming`, the newest 20 alerts, the newest 30 doses, and adherence per day. Adherence only counts slots whose window has closed. `GET /patients/{pid}/history?days=N` returns the same shape with 1–30 days.

## 6. Tap authentication

| Scheme | Used for | Decoder |
|---|---|---|
| `hex` (default) | Simulated tags, demo | 1–8 hex digits, public (`tap_codes.py`) |
| `st25` | Real ST25TV02KC tags | `tap_codes_private.py`, git-ignored, bundled only when deploying from the owner's machine |

Each tag stores `lastCtr`. The conditional update only succeeds for a larger counter, so replaying a copied URL fails with `409`. This is a **counter check**: it stops replays and naive copies; it is not a cryptographic signature unless the private decoder also verifies one.

⚠️ The check runs only when `ctr` is present. A static URL without `c=` still works. Fix: store `requireCounter` on tags whose scheme is `st25` and reject taps without a valid code.

## 7. API surface

| Method | Path | Handler | Purpose |
|---|---|---|---|
| POST | `/tap` | api | Register a dose |
| POST | `/patients` | api | Create patient |
| GET | `/patients/{pid}` | api | Dashboard data |
| GET | `/patients/{pid}/history?days=` | api | Same, 1–30 days |
| POST | `/patients/{pid}/meds` | api | Add medicine and bind tag |
| DELETE | `/patients/{pid}/meds/{mid}` | api | Delete medicine and unbind tag |
| POST | `/prescriptions/parse` | api | AI extraction (optionally save) |
| POST | `/demo/seed` | api | Reset demo patient |
| GET | `/`, `/demo`, `/t/{tagId}`, `/p/{pid}` | web | The web app |

Errors are always `{ "error": code, "message": texto en español }`. Full contract: `docs/API.md`.

## 8. Security and privacy

Today:
- HTTPS only; DynamoDB encrypted at rest; SNS topic encrypted.
- One IAM policy per function; only `api` can call Bedrock.
- API throttling (20 rps, burst 50).
- Alerts carry only patient name, medicine, dose and slot.
- The proprietary tap decoder is excluded from git.

Gaps to state honestly or close:
- No authentication: anyone with a patient id can read or change that patient's data. Ids are short (8 hex chars) except `demo`.
- `POST /demo/seed` is public and wipes the `demo` patient. Disable it after the event.
- CORS allows any origin.
- Rejected taps are not logged.

## 9. Failure modes and limits

| Case | Behavior |
|---|---|
| Phone offline at tap | Page cannot load; the missed-dose alert still fires |
| Bedrock error or unreadable photo | `legible: false` or 502; the caregiver adds medicines manually |
| SNS publish fails | The alert item exists but no notification is sent; no retry |
| Tap after the window | Dose is recorded, `onTime: false` |
| Tap at 23:50 with slots 08:00 and 20:00 | Closest slot is 20:00 (late) |
| Checker at scale | It scans the whole table each minute. Fine for a demo. For more patients, add an index on medicines or schedule one event per dose |
| Time zone | Fixed UTC-6 for all patients |

## 10. Cost drivers

`rate(1 minute)` is about 43,200 checker invocations per month, each with one DynamoDB scan. Both are tiny at demo size and within free tiers. Bedrock is billed per prescription, and SMS (when added) per message, in the destination country's rate. Measure the real figure in Cost Explorer before quoting it.

## 11. Testing

`backend/tests/test_schedule.py` covers slot math, time validation, next-dose rollover, prescription normalization and JSON extraction, adherence, unknown routes and the hex counter. Not yet covered: `tap()` (record / duplicate / early / replay), `checker`, and the seed. Run with `pytest` in `backend/`.

## 12. Deployment

```bash
cd backend
sam build
sam deploy --profile <profile> [--parameter-overrides AlertEmail=you@example.com]
```

Outputs: `ApiUrl`, `TableName`, `AlertsTopicArn`. If `AlertEmail` is set, the recipient must confirm the SNS subscription email once.
