import { useCallback, useEffect, useState } from 'react'
import { api, toApiError, type ApiError } from '@/lib/api'
import type { PatientDashboard } from '@/lib/types'

const POLL_MS = 5_000

type PatientState = { patientId: string; data?: PatientDashboard; error?: ApiError }

export function usePatient(patientId: string) {
  const [state, setState] = useState<PatientState>({ patientId })

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPatient(patientId)
      setState({ patientId, data })
    } catch (error) {
      setState((prev) => ({
        patientId,
        data: prev.patientId === patientId ? prev.data : undefined,
        error: toApiError(error),
      }))
    }
  }, [patientId])

  useEffect(() => {
    const poll = () => {
      if (!document.hidden) void refresh()
    }
    poll()
    const timer = setInterval(poll, POLL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [refresh])

  const current: PatientState = state.patientId === patientId ? state : { patientId }
  return { data: current.data, error: current.error, refresh }
}
