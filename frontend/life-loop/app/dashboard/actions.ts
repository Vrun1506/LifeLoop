'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type RefreshResult =
  | { ok: true; message: string; ingested: number; processed: number }
  | { ok: false; error: string }

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ||
    ''
  ).trim()
}

export async function refreshInstagramMedia(): Promise<RefreshResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { ok: false, error: userError.message }
  }

  if (!user) {
    return { ok: false, error: 'You need to be signed in to sync Instagram memories.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('ig_username, is_parent_confirmed')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  if (!profile?.ig_username) {
    return { ok: false, error: 'Instagram handle missing. Update your profile first.' }
  }

  if (!profile.is_parent_confirmed) {
    return { ok: false, error: 'Parent consent pending. Ask them to confirm the LifeLoop invite.' }
  }

  const backendBaseUrl = getBackendBaseUrl()

  if (!backendBaseUrl) {
    return { ok: false, error: 'BACKEND_API_BASE_URL not configured. Set it in your environment.' }
  }

  const baseUrl = backendBaseUrl.replace(/\/$/, '')

  const ingestResponse = await fetch(`${baseUrl}/ingest/instagram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: user.id,
      instagram_username: profile.ig_username,
      limit: 12,
    }),
  })

  if (!ingestResponse.ok) {
    let reason = ingestResponse.statusText
    try {
      const data = await ingestResponse.json()
      reason = data?.error || reason
    } catch {
      // ignore JSON parse errors
    }
    return { ok: false, error: `Ingestion failed: ${reason}` }
  }

  let ingestedCount = 0
  try {
    const ingestBody = await ingestResponse.json()
    ingestedCount = ingestBody?.inserted ?? 0
  } catch {
    ingestedCount = 0
  }

  const processResponse = await fetch(`${baseUrl}/process/instagram-media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 12,
    }),
  })

  if (!processResponse.ok) {
    let reason = processResponse.statusText
    try {
      const data = await processResponse.json()
      reason = data?.error || reason
    } catch {
      // ignore JSON parse errors
    }
    return { ok: false, error: `Processing failed: ${reason}` }
  }

  let processedCount = 0
  try {
    const processBody = await processResponse.json()
    processedCount = processBody?.processed?.length ?? 0
  } catch {
    processedCount = 0
  }

  revalidatePath('/dashboard')

  return {
    ok: true,
    message: 'Instagram memories refreshed successfully.',
    ingested: ingestedCount,
    processed: processedCount,
  }
}
