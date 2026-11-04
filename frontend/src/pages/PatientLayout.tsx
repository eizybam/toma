import { Outlet } from 'react-router'
import { Toaster } from 'sonner'

export function PatientLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-center" toastOptions={{ className: 'font-sans text-base' }} />
    </>
  )
}
