# UI brief

## Product

Toma helps older adults take their medication on time. Each medicine box has an NFC sticker.
The patient taps it with a phone, the dose is logged, and the caregiver is alerted if a dose is
missed or taken twice. A prescription photo becomes a schedule automatically.

The backend is live; see [API.md](API.md). The UI lives in `frontend/`.

## Audiences

- **Patient** (65+, low vision, little tech experience): sees one screen after tapping. Must be
  readable at arm's length and understandable in two seconds.
- **Caregiver** (adult child, 30–50): checks a dashboard on their phone or laptop.
- **Judges** during a 5-minute pitch: will tap a tag with their own phone and watch the dashboard
  update on the projector.

## Screens

1. **Tap result** — `/t/:tagId` (opened by the NFC tag; read `c` from the query string and send it as `ctr`).
   - `recorded`: big confirmation, medicine name and dose, next dose time.
   - `duplicate`: clear warning in a different color: "Ya tomaste esta dosis hace N min".
   - `early`: calm "todavía no toca", shows the scheduled time.
   - `replay` / `unknown_tag`: friendly error.
   - Large type, very high contrast, one main message, no navigation chrome.
2. **Caregiver dashboard** — `/p/:patientId` (demo: `/p/demo`).
   - Today's timeline of doses with status (taken / due / missed / upcoming).
   - Adherence percentage and a 7-day chart.
   - Alerts feed (missed, duplicate), newest first, visually urgent.
   - Medication list with tag ids; add and delete medication.
   - Polls every 5 s so a judge's tap appears live; animate new entries.
3. **Prescription upload** — inside the dashboard or `/p/:patientId/receta`.
   - Take or upload a photo, show a loading state (3–8 s), review the parsed medications,
     edit times, confirm to save.
4. **Demo control** — `/demo`: one button that calls `POST /demo/seed` and links to the dashboard
   and to both tap pages. For rehearsing the pitch.

## Design direction

- Warm, human and trustworthy — closer to a well-designed health product than a SaaS template.
  Avoid generic AI-landing-page aesthetics: no purple gradients, no glassmorphism everywhere,
  no stock hero with three feature cards.
- Spanish (Mexico) copy, short and kind. Use "tú".
- Mobile first. The tap page is the hero of the demo.
- Accessible: WCAG AA contrast minimum, AAA on the tap page, touch targets ≥ 48 px,
  respects `prefers-reduced-motion`.
- Motion is meaningful: a satisfying confirmation on `recorded`, a distinct warning on
  `duplicate`, live entries sliding into the dashboard.

## Component sources

- [ui-layouts](https://www.ui-layouts.com/components) — layout and interaction components
  (file upload, motion number, timeline animation, buttons).
- [Canvas UI](https://canvasui.dev/components) — canvas/WebGL effects. Use sparingly, for the tap
  confirmation moment or a single dashboard accent, never behind body text.
- [SuperDesign](https://github.com/superdesigndev/superdesign-skill) — explore several design
  directions as mockups before writing components; pick one and keep it consistent.

## Tech

- Vite + React + TypeScript + Tailwind CSS, in `frontend/`.
- `VITE_API_URL` in `frontend/.env` (see `.env.example`).
- Static build; it will be hosted on S3 + CloudFront, so routing must work as a SPA.
