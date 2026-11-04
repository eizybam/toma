import '@fontsource-variable/fraunces'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './index.css'

import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { TapPage } from '@/pages/TapPage'

// The tap page ships in the main bundle so it renders as fast as possible after an NFC tap.
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/demo" replace /> },
  { path: '/t/:tagId', Component: TapPage },
  {
    path: '/p/:patientId',
    lazy: async () => ({ Component: (await import('@/pages/PatientLayout')).PatientLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/pages/DashboardPage')).DashboardPage }) },
      { path: 'receta', lazy: async () => ({ Component: (await import('@/pages/PrescriptionPage')).PrescriptionPage }) },
    ],
  },
  { path: '/demo', lazy: async () => ({ Component: (await import('@/pages/DemoPage')).DemoPage }) },
  { path: '*', lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }) },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </StrictMode>,
)
