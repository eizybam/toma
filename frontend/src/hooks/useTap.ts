import { useCallback, useEffect, useState } from 'react'
import { api, toApiError, type ApiError } from '@/lib/api'
import type { TapResult } from '@/lib/types'

type TapState =
  | { phase: 'loading' }
  | { phase: 'done'; result: TapResult }
  | { phase: 'failed'; error: ApiError }

// A tap must reach the API exactly once per page load: re-sending it would be logged as a duplicate dose.
const inflight = new Map<string, Promise<TapResult>>()

function tapOnce(tagId: string, ctr: string | undefined): Promise<TapResult> {
  const key = `${tagId}|${ctr ?? ''}`
  let request = inflight.get(key)
  if (!request) {
    request = api.tap(tagId, ctr)
    inflight.set(key, request)
  }
  return request
}

export function useTap(tagId: string, ctr: string | undefined) {
  const [state, setState] = useState<TapState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    tapOnce(tagId, ctr).then(
      (result) => active && setState({ phase: 'done', result }),
      (error: unknown) => active && setState({ phase: 'failed', error: toApiError(error) }),
    )
    return () => {
      active = false
    }
  }, [tagId, ctr, attempt])

  const retry = useCallback(() => {
    inflight.delete(`${tagId}|${ctr ?? ''}`)
    setState({ phase: 'loading' })
    setAttempt((n) => n + 1)
  }, [tagId, ctr])

  return { state, retry }
}
