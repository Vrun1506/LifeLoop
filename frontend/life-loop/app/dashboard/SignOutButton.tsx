'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      router.push('/login')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign out failed.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white hover:text-[#0B1720] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Signing out…' : 'Sign out'}
      </button>
      {errorMessage && (
        <p className="text-xs text-rose-200/90">{errorMessage}</p>
      )}
    </div>
  )
}
