'use server'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

type UploadResult = {
  key: string
  url: string
}

async function uploadVoiceSample(userId: string, file: File, buffer: Buffer): Promise<UploadResult> {
  const endpoint = process.env.R2_ENDPOINT_URL
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicBase = process.env.R2_PUBLIC_BASE_URL

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error('Missing Cloudflare R2 configuration. Check R2 endpoint, credentials, bucket, and public base URL.')
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const sanitizedName = file.name ? file.name.replace(/\s+/g, '_') : 'voice-sample'
  const key = `voice-samples/${userId}/${Date.now()}-${sanitizedName}`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    })
  )

  const url = `${publicBase.replace(/\/$/, '')}/${key}`
  return { key, url }
}

async function registerElevenLabsVoice(
  buffer: Buffer,
  file: File,
  userId: string
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.warn('ELEVENLABS_API_KEY missing; skipping voice clone.')
    return null
  }

  try {
    const payload = new FormData()
    payload.append('name', `LifeLoop-${userId}`)
    const blob = new Blob([buffer], { type: file.type || 'audio/mpeg' })
    payload.append('files', blob, file.name || 'voice-sample')

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: payload,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs voice creation failed:', errorText)
      return null
    }

    const body = (await response.json()) as { voice_id?: string }
    return body.voice_id ?? null
  } catch (error) {
    console.error('Error calling ElevenLabs:', error)
    return null
  }
}

async function sendParentEmail(options: {
  parentEmail: string
  parentName?: string | null
  instagramUsername: string
  confirmationLink: string
}) {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const fromEmail = process.env.MAILGUN_FROM_EMAIL

  if (!apiKey || !domain || !fromEmail) {
    throw new Error('Missing Mailgun configuration. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM_EMAIL.')
  }

  const form = new FormData()
  form.append('from', fromEmail)
  form.append('to', options.parentEmail)
  form.append(
    'subject',
    `LifeLoop consent request for ${options.instagramUsername}`
  )

  const textBody = [
    `Hi there,`,
    ``,
    `${options.instagramUsername} has invited you to join LifeLoop so your family can relive highlights together.`,
    `Please confirm that you’re happy for us to sync their Instagram posts and share narrated updates.`,
    ``,
    `Confirm consent: ${options.confirmationLink}`,
    ``,
    `Thanks for helping us preserve your family’s legacy!`,
  ].join('\n')

  const htmlBody = `
    <p>Hi there,</p>
    <p><strong>${options.instagramUsername}</strong> has invited you to join LifeLoop so your family can relive highlights together.</p>
    <p>Please confirm that you’re happy for us to sync their Instagram posts and share narrated updates.</p>
    <p style="margin: 24px 0;">
      <a href="${options.confirmationLink}" style="background: #1d4ed8; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Confirm consent</a>
    </p>
    <p>If the button isn’t working, paste this link into your browser:<br />${options.confirmationLink}</p>
    <p>Thanks for helping us preserve your family’s legacy!</p>
  `

  form.append('text', textBody)
  form.append('html', htmlBody)

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
    body: form,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mailgun error: ${errorText}`)
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const instagramUsername = formData.get('instagramUsername')
  const parentEmail = formData.get('parentEmail')
  const consentGranted = formData.get('consentGranted')
  const voiceSample = formData.get('voiceSample')

  if (!instagramUsername || typeof instagramUsername !== 'string') {
    return NextResponse.json({ error: 'Instagram username is required.' }, { status: 400 })
  }

  if (!parentEmail || typeof parentEmail !== 'string') {
    return NextResponse.json({ error: 'Parent email is required.' }, { status: 400 })
  }

  if (consentGranted !== 'true') {
    return NextResponse.json({ error: 'Consent must be granted before requesting parent confirmation.' }, { status: 400 })
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('voice_sample_url, voice_profile_id')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  let voiceSampleUrl = existingProfile?.voice_sample_url ?? null
  let voiceProfileId = existingProfile?.voice_profile_id ?? null

  if (voiceSample instanceof File) {
    const voiceBuffer = Buffer.from(await voiceSample.arrayBuffer())
    try {
      const uploadResult = await uploadVoiceSample(user.id, voiceSample, voiceBuffer)
      voiceSampleUrl = uploadResult.url

      const createdVoiceId = await registerElevenLabsVoice(voiceBuffer, voiceSample, user.id)
      if (createdVoiceId) {
        voiceProfileId = createdVoiceId
      }
    } catch (error) {
      console.error('Failed to process voice sample:', error)
      return NextResponse.json({ error: 'Voice sample upload failed.' }, { status: 500 })
    }
  }

  const updates: Record<string, unknown> = {
    id: user.id,
    ig_username: instagramUsername.trim(),
    parent_email: parentEmail.trim(),
    is_parent_confirmed: false,
  }

  if (voiceSampleUrl) {
    updates.voice_sample_url = voiceSampleUrl
  }

  if (voiceProfileId) {
    updates.voice_profile_id = voiceProfileId
  }

  const { error: upsertError } = await supabase.from('user_profiles').upsert(updates)

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) // 3 days

  const { error: insertError } = await adminClient.from('parent_confirmations').insert({
    user_id: user.id,
    parent_email: parentEmail.trim(),
    token,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const appBaseUrl = process.env.APP_BASE_URL
  if (!appBaseUrl) {
    return NextResponse.json({ error: 'APP_BASE_URL is not configured.' }, { status: 500 })
  }

  const confirmationLink = `${appBaseUrl.replace(/\/$/, '')}/api/parent-request/confirm?token=${encodeURIComponent(token)}`

  try {
    await sendParentEmail({
      parentEmail: parentEmail.trim(),
      instagramUsername: instagramUsername.trim(),
      confirmationLink,
    })
  } catch (error) {
    console.error('Mailgun send failed:', error)
    return NextResponse.json({ error: 'Failed to send parent notification email.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      message: 'Parent confirmation request recorded and email sent.',
      voiceSampleUrl: voiceSampleUrl ?? null,
      voiceProfileId: voiceProfileId ?? null,
      confirmationExpiresAt: expiresAt.toISOString(),
    },
    { status: 200 }
  )
}
