import { useParams, useSearchParams } from 'react-router'
import { DuplicateState, EarlyState, ErrorState, LoadingState, RecordedState } from '@/components/tap/TapStates'
import { useTap } from '@/hooks/useTap'

export function TapPage() {
  const { tagId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { state, retry } = useTap(tagId, searchParams.get('c') ?? undefined)

  if (state.phase === 'loading') return <LoadingState />
  if (state.phase === 'failed') return <ErrorState error={state.error} onRetry={retry} />

  const { result } = state
  switch (result.status) {
    case 'recorded':
      return <RecordedState result={result} />
    case 'duplicate':
      return <DuplicateState result={result} />
    case 'early':
      return <EarlyState result={result} />
  }
}
