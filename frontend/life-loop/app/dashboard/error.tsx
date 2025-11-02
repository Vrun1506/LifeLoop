'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B1720] px-6 text-center text-white">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
          LifeLoop Gallery
        </p>
        <h1 className="text-2xl font-semibold text-white">
          We couldn&apos;t load your family memories (yet).
        </h1>
        <p className="max-w-md text-sm text-white/70">
          The ingestion sprint is likely still wiring things together. Retry in
          a moment or continue with the sample gallery for design reviews.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-cyan-300/50 bg-cyan-500/10 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/20"
      >
        Try again
      </button>
    </div>
  )
}
