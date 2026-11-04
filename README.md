# Toma

Un toque y la dosis queda registrada.

Toma helps older adults with chronic conditions take their medication on time. An NFC sticker
on each medicine box logs the dose when tapped with any phone, no app required. If a dose is
missed or taken twice, the caregiver is notified. A photo of the prescription becomes a
schedule automatically.

## Architecture

```
NFC tag ──► Frontend (S3 + CloudFront) ──► API Gateway (HTTP API) ──► Lambda (api)
                                                                       │   ├─► DynamoDB
                                                                       │   ├─► Bedrock (Nova 2 Lite, prescription OCR)
                                                                       │   └─► SNS (duplicate-dose alert)
EventBridge Scheduler (every minute) ──► Lambda (checker) ──► DynamoDB, SNS (missed-dose alert)
```

| Service | Role |
|---|---|
| API Gateway HTTP API | Public REST endpoints with throttling and CORS |
| AWS Lambda (Python 3.13, arm64) | Tap handling, dashboard data, prescription parsing, missed-dose checks |
| Amazon DynamoDB | Single-table store for patients, medications, tags, doses and alerts |
| Amazon EventBridge Scheduler | Runs the missed-dose checker every minute |
| Amazon SNS | Caregiver notifications |
| Amazon Bedrock | Extracts medications and schedules from prescription photos |

Tags are ST25TV02KC (ISO 15693). With augmented NDEF the chip appends a tap counter to the URL;
the backend rejects counters it has already seen, so copied URLs or cloned tags cannot fake a dose.
The ST25 decoder is proprietary and is not part of this repository: it lives in
`backend/src/tap_codes_private.py` (git-ignored) and is bundled only when deploying from the owner's
machine. Without it, tags use the public `hex` scheme.

## Repository

```
backend/    SAM template, Lambda source and tests
frontend/   Web app (tap page and caregiver dashboard)
docs/       API contract and UI brief
```

## Backend

Requirements: AWS CLI v2, SAM CLI, Python 3.13, an AWS profile for the project.

```bash
cd backend
sam build
sam deploy --profile <profile>
```

Optional: `--parameter-overrides AlertEmail=you@example.com` subscribes an email to alerts.

Tests:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

API reference: [docs/API.md](docs/API.md).

### Data model

Single DynamoDB table, `pk` / `sk`:

| pk | sk | Item |
|---|---|---|
| `PATIENT#<pid>` | `PROFILE` | Patient and caregiver |
| `PATIENT#<pid>` | `MED#<mid>` | Medication, times, tolerance window, tag |
| `PATIENT#<pid>` | `DOSE#<date>#<mid>#<HH:MM>` | Dose taken (one per slot, enforced with a conditional write) |
| `PATIENT#<pid>` | `ALERT#<date>#<mid>#<HH:MM>` | Missed or duplicate dose alert |
| `TAG#<tagId>` | `TAG` | Tag binding and last seen counter |

## Team

Ian Navarro
Diego Sanchez
Javier Diaz
Alonso Astudillo
