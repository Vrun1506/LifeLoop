import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if profile exists with Instagram username
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('ig_username')
          .eq('id', user.id)
          .single()
        
        // If no profile or no Instagram username, redirect to complete profile
        if (!profile || !profile.ig_username) {
          return NextResponse.redirect(`${origin}/complete-profile`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}