import { Component, Suspense, useState, type ReactNode } from 'react'

function supportsWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

class EffectBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

// Canvas effects are decorative: without WebGL2, or if they fail, the page simply renders without them.
export function CanvasEffect({ children }: { children: ReactNode }) {
  const [supported] = useState(supportsWebGL2)
  if (!supported) return null

  return (
    <EffectBoundary>
      <Suspense fallback={null}>{children}</Suspense>
    </EffectBoundary>
  )
}
