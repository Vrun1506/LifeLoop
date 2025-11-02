'use server'

import { createAdminClient } from '@/lib/supabase/admin'

function renderHtml(message: string, success: boolean) {
  const statusColor = success ? '#16a34a' : '#dc2626'

  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LifeLoop Consent</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; }
          .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12); }
          h1 { margin-bottom: 16px; color: ${statusColor}; }
          p { line-height: 1.6; }
          .footer { margin-top: 24px; font-size: 12px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${success ? 'Consent confirmed!' : 'We hit a snag'}</h1>
          <p>${message}</p>
          <div class="footer">
            LifeLoop — preserving the moments that matter most.
          </div>
        </div>
      </body>
    </html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: success ? 200 : 400,
    }
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return renderHtml('Missing confirmation token. Please use the link provided in your email.', false)
  }

  const adminClient = createAdminClient()

  const { data: record, error } = await adminClient
    .from('parent_confirmations')
    .select('id, user_id, status, expires_at, parent_email')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('Failed to load confirmation record:', error)
    return renderHtml('Something went wrong on our side. Please reach out to the LifeLoop team.', false)
  }

  if (!record) {
    return renderHtml('We could not find this confirmation request. It may have already been completed.', false)
  }

  if (record.status === 'confirmed') {
    return renderHtml('Thanks again! You have already confirmed and the family dashboard is ready to sync memories.', true)
  }

  const expiresAt = record.expires_at ? new Date(record.expires_at) : null
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return renderHtml('This confirmation link has expired. Ask your student to resend the LifeLoop request.', false)
  }

  const { error: updateProfileError } = await adminClient
    .from('user_profiles')
    .update({ is_parent_confirmed: true })
    .eq('id', record.user_id)

  if (updateProfileError) {
    console.error('Failed to set parent confirmed:', updateProfileError)
    return renderHtml('We could not mark this confirmation. Please try again later.', false)
  }

  const { error: updateConfirmationError } = await adminClient
    .from('parent_confirmations')
    .update({
      status: 'confirmed',
      responded_at: new Date().toISOString(),
    })
    .eq('id', record.id)

  if (updateConfirmationError) {
    console.error('Failed to update confirmation record:', updateConfirmationError)
    return renderHtml('We could not finalise this confirmation. Please try again later.', false)
  }

  return renderHtml(
    'Thanks for confirming! We will start building narrated Instagram highlights so your family can stay connected.',
    true
  )
}
