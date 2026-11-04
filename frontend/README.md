# Toma — frontend

Vite + React + TypeScript + Tailwind. Spanish (Mexico) UI for the NFC tap page, the caregiver
dashboard, prescription upload and the demo controls.

```bash
cp .env.example .env   # VITE_API_URL points to the deployed API
npm install
npm run dev
npm run build          # static output in dist/
```

## Routes

| Route | Screen |
|---|---|
| `/t/:tagId` | Tap result (opened by the NFC tag; `?c=` is forwarded as `ctr`) |
| `/p/:patientId` | Caregiver dashboard, polls every 5 s |
| `/p/:patientId/receta` | Prescription photo → review → save |
| `/demo` | Reset the demo patient and links for the pitch |

## Hosting on S3 + CloudFront

The app is a SPA, so every unknown path must serve `index.html`. In the CloudFront
distribution add custom error responses for `403` and `404` that return `/index.html` with
status `200`. Cache `assets/*` long term (file names are hashed) and `index.html` with no cache.

## Components

- `src/components/ui/timeline-animation.tsx` and `file-upload.tsx` come from
  [ui-layouts](https://www.ui-layouts.com/components) (file upload adapted to the design system).
- `src/components/canvasui/` comes from [Canvas UI](https://canvasui.dev) (Particle Object for the
  tap confirmation, Ink Object for the dashboard seal). They are lazy-loaded and skipped when
  WebGL2 is unavailable.
- Adherence numbers use [Number Flow](https://number-flow.barvian.me), as in ui-layouts' Motion Number.
