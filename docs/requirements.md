# Toma — Requirements

> Updated to match the code in the repository (`backend/`, `docs/API.md`, `docs/UI_BRIEF.md`).
> Status: ✅ implemented · 🔜 planned · ⚠️ known gap. Requirements use EARS syntax (WHEN / IF / THE SYSTEM SHALL).

## 1. Introduction

**Toma** helps older adults with chronic conditions take their medication on time. An NFC sticker on each medicine box logs the dose when it is tapped with any phone, with no app. If a dose is missed or taken twice, the caregiver is notified. A photo of the prescription becomes a schedule automatically.

**Problem:** millions of people in Mexico live with diabetes and hypertension, many of them older adults. Missed doses, double doses and caregivers who find out too late are common.

## 2. Personas

| Persona | Needs |
|---|---|
| **Patient** (e.g., Doña Rosa, 65+, low vision) | One screen after the tap, readable at arm's length, understood in two seconds. No app, no account. |
| **Caregiver** (e.g., Laura, her daughter) | Know when a dose is missed or doubled; see today's status and adherence; set up medicines quickly. |
| **Judges** (5-minute pitch) | Tap a tag with their own phone and watch the dashboard update live. |

## 3. Functional requirements

### R1 — Dose registration by NFC tap
- ✅ R1.1 THE tag SHALL store the URL `https://<host>/t/{tagId}`. WHEN the ST25TV02KC has augmented NDEF enabled, the chip appends a tap code (`?c=<code>`). THE web page SHALL forward it as `ctr` in `POST /tap` together with `tagId`.
- ✅ R1.2 WHEN a tap arrives, THE SYSTEM SHALL find the medication bound to the tag, pick the scheduled time closest to now (the *slot*) and record the dose with `takenAt`, `minutesLate` and `onTime` (on time = at most `windowMin` minutes after the slot).
- ✅ R1.3 IF the tap is more than 120 minutes before the closest slot, THE SYSTEM SHALL respond `early`, save nothing and tell the patient when the dose is due.
- ✅ R1.4 WHEN a dose is taken after its window, THE SYSTEM SHALL still record it, marked not on time, even if a missed-dose alert was already sent.
- ✅ R1.5 THE tap page SHALL show the result (medicine, dose, next dose time) and the patient's record for the day.
- ✅ R1.6 IF the tag is unknown, or its medication was deleted, or it has no schedule, THE SYSTEM SHALL return a friendly Spanish error (`unknown_tag`, `unknown_med`, `no_schedule`).
- ✅ R1.7 THE tap page SHALL use large type and high contrast, in Spanish (Mexico), mobile-first, with no navigation chrome.

### R2 — Double-dose prevention
- ✅ R2.1 THE SYSTEM SHALL store at most one dose per patient, medicine, date and slot (enforced with a conditional write).
- ✅ R2.2 WHEN a tag is tapped for a slot whose dose is already recorded, THE SYSTEM SHALL NOT record a new dose and SHALL respond `duplicate` with `minutesAgo`: "¡Espera! Ya tomaste esta dosis hace N min."
- ✅ R2.3 WHEN a duplicate is detected, THE SYSTEM SHALL save a `duplicate` alert and publish it to the caregiver topic ("… intentó tomar … otra vez"). This is always on today.
- 🔜 R2.4 THE caregiver SHALL be able to turn duplicate notifications off per patient.

### R3 — Missed-dose alert
- ✅ R3.1 THE SYSTEM SHALL check all medications every minute. WHEN a slot's time plus its `windowMin` has passed with no dose recorded, THE SYSTEM SHALL save a `missed` alert and publish it to the caregiver topic.
- ✅ R3.2 THE message SHALL be in Spanish and name the patient, medicine, dose and slot, e.g. "Doña Rosa no ha tomado Metformina (850 mg) de las 20:00."
- ✅ R3.3 THE SYSTEM SHALL send at most one missed-dose alert per slot (conditional write on the alert item).
- ✅ R3.4 THE SYSTEM SHALL ignore slots earlier than the medication's creation time.
- ✅ R3.5 IF the dose is taken before the window closes, THE SYSTEM SHALL NOT send an alert (the checker finds the dose and skips the slot).
- ⚠️ R3.6 Delivery today is the SNS topic `toma-alertas` with an optional email subscription (`AlertEmail` parameter). The caregiver's phone number is stored but not used.
- 🔜 R3.7 THE SYSTEM SHALL send the alert as an SMS to the caregiver's phone, as in the original idea.

### R4 — Tap authenticity (anti-spoofing)
- ✅ R4.1 WHEN a tap includes `ctr`, THE SYSTEM SHALL decode it with the scheme configured on the tag (`hex` or `st25`) and accept it only if it is strictly greater than the last counter seen for that tag.
- ✅ R4.2 IF the counter was already used, THE SYSTEM SHALL respond `409 replay` ("la URL parece copiada o la etiqueta clonada") and record nothing.
- ✅ R4.3 IF the code is malformed, THE SYSTEM SHALL respond `400 bad_ctr`. IF the tag's scheme decoder is not deployed, `503 scheme_unavailable`.
- ✅ R4.4 THE `st25` decoder SHALL stay outside the repository (`tap_codes_private.py`, git-ignored) and be bundled only when deploying from the owner's machine. Without it, tags use the public `hex` scheme.
- ⚠️ R4.5 Today a tap **without** `ctr` is accepted for any tag. 🔜 A tag with the `st25` scheme SHALL reject taps that carry no valid code.
- 🔜 R4.6 THE SYSTEM SHALL log rejected taps so the caregiver can review them.

### R5 — Prescription scanning with AI
- ✅ R5.1 WHEN a photo is submitted to `POST /prescriptions/parse`, THE SYSTEM SHALL read it with Amazon Bedrock (Nova 2 Lite) and return each medication's name, dose, times, duration and notes.
- ✅ R5.2 IF the recipe only says "every N hours", THE SYSTEM SHALL derive the times. IF a field is missing it SHALL be `null` (no invented medicines). IF the image is not a readable prescription, THE SYSTEM SHALL return `legible: false`.
- ✅ R5.3 THE web app SHALL resize the photo to about 1600 px, show a loading state (3–8 s), and show the parsed medicines for the caregiver to review before pressing "Agregar al tratamiento".
- 🔜 R5.3b THE review step SHALL let the caregiver edit names and times before saving.
- ✅ R5.4 WHEN the request has `save: true` and a `patientId`, THE SYSTEM SHALL create the medications that have times.
- ✅ R5.5 THE SYSTEM SHALL NOT store the prescription image; it is sent to the model and discarded.

### R6 — Caregiver dashboard
- ✅ R6.1 THE dashboard (`/p/{patientId}`) SHALL show today's timeline with each dose as `taken`, `due`, `missed` or `upcoming`.
- ✅ R6.2 THE dashboard SHALL show the adherence percentage and a per-day breakdown (1–30 days, default 7), counting only slots whose window has closed.
- ✅ R6.3 THE dashboard SHALL show an alerts feed (missed and duplicate, the six newest, new ones highlighted) and the medicine list with each tag id. The API also returns the last 30 doses, which the page does not display yet.
- ✅ R6.4 THE dashboard SHALL refresh every 5 seconds so a tap appears live.
- ✅ R6.5 THE API SHALL let a caller create a patient, add a medication (times, tolerance window 1–240 min, optional tag id and code scheme) and delete one, which unbinds its tag. Reusing a tag id rebinds the tag.
- ⚠️ R6.5b In the web app, medicines can currently be added only through the prescription flow, and the medicine list is read-only. 🔜 THE dashboard SHALL offer forms to add a medicine by hand (with tag id and code scheme), delete it, and create a patient.
- 🔜 R6.6 THE caregiver SHALL sign in before seeing a patient's data.

### R7 — Demo support
- ✅ R7.1 `POST /demo/seed` SHALL reset the patient `demo` with two medicines: `toma-demo-1` (Metformina, due now) and `toma-demo-2` (Losartán, overdue in about 2 minutes, to trigger the missed alert live).
- ✅ R7.2 THE page `/demo` SHALL offer one button that seeds the demo, links to the dashboard and both tap pages, and can simulate a cloned tag by sending the same code twice.

## 4. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NF1 | Fully serverless; no servers to patch. | ✅ |
| NF2 | Everything in one region, `us-east-2`. Python 3.13 on arm64. | ✅ |
| NF3 | Deployed with one command: `sam build && sam deploy --profile <profile>`. | ✅ |
| NF4 | DynamoDB on-demand with server-side encryption; SNS topic encrypted with the AWS managed key; HTTPS only. | ✅ |
| NF5 | API throttling: 20 requests/s, burst 50. | ✅ |
| NF6 | Times use Mexico City time (UTC-6, no daylight saving since 2022); API timestamps are ISO 8601 with offset. | ✅ |
| NF7 | Least-privilege IAM per function (table CRUD, SNS publish, `bedrock:InvokeModel` only for `api`; `checker` has no Bedrock access). | ✅ |
| NF8 | The patient never logs in: security of the tap comes from the tag counter and unguessable tag ids. | ✅ |
| NF9 | Alerts contain only the patient's display name, the medicine, and timing (dose and slot for missed doses, minutes since the first tap for duplicates). | ✅ |
| NF10 | Estimated cost for the demo is close to zero (free tiers and fractions of a cent). SNS email is free; SMS and Bedrock are the variable costs. | ✅ |

## 5. Out of scope (hackathon)

- Authentication and per-caregiver authorization (dashboard is open to anyone who knows the patient id).
- Native apps, multiple languages, per-patient time zones.
- Clinical features: interactions, dosing advice, pharmacy integration. Toma is not a medical device.
- Regulatory work (COFEPRIS / LFPDPPP): future work.

## 6. Open questions and known gaps

1. **ST25TV02KC code.** README states the chip appends a tap counter and the private decoder handles it. Confirm on real tags the exact URL format and whether the code is only a counter or also authenticated. Pitch wording must match what you verified ("a replayed or copied tap is rejected" is accurate for a counter; "cannot be forged" is not).
2. **Counter not mandatory (R4.5).** A copied URL without `c=` would still register a dose.
3. **SMS to Mexico.** SNS SMS needs origination rules and may be sandboxed (verified numbers only). Email works today.
4. **Open endpoints.** `POST /demo/seed`, patient data and CORS `*` are public. Fine for a demo, not for real patients.
5. **Frontend.** The web app is served by a Lambda (`backend/src/web/index.html`). A standalone Vite + React app on S3 + CloudFront is planned; `frontend/` only has `.env.example` so far.
