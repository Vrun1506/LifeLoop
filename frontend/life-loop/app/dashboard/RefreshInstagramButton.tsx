'use client'

import { useState, useTransition } from 'react'
import { refreshInstagramMedia } from './actions'

export function RefreshInstagramButton() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setStatus(null)
    setError(null)

    startTransition(async () => {
      const result = await refreshInstagramMedia()
      if (result.ok) {
        const summary = `Synced ${result.ingested} posts, processed ${result.processed}.`
        setStatus(result.message + (summary ? ` ${summary}` : ''))
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#0B1720] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Syncing…' : 'Sync Instagram'}
      </button>
      {status && (
        <p className="text-xs text-cyan-200/80">{status}</p>
      )}
      {error && (
        <p className="text-xs text-rose-200/90">{error}</p>
      )}
    </div>
  )
}
