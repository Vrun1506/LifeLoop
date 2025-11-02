'use client'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'form' | 'verifyEmail'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [stage, setStage] = useState<Stage>('form')
  const [status, setStatus] = useState<{ message: string; tone: 'info' | 'error' } | null>(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase.from('user_profiles').upsert([
          {
            id: data.user.id,
            ig_username: instagramUsername,
            email,
            parent_email: null,
            is_parent_confirmed: false,
            voice_sample_url: null,
          },
        ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      if (data.session) {
        setStatus({
          tone: 'info',
          message: 'Account created! Please complete your family consent details next.',
        })
        router.push('/complete-profile')
        return
      }

      setPendingEmail(email)
      setStage('verifyEmail')
      setStatus({
        tone: 'info',
        message: 'We just sent you a confirmation email. Verify your address to unlock the parent consent setup.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setStatus({ tone: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!pendingEmail) return

    setResendLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
      })

      if (error) throw error

      setStatus({
        tone: 'info',
        message: `We’ve resent the confirmation email to ${pendingEmail}. Check your inbox or spam folder.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email.'
      setStatus({ tone: 'error', message })
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setStatus({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="font-sans text-white bg-[#5C91A9]">
      <nav className="sticky top-0 z-50 flex items-center border-b bg-white/25 px-4 py-5">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#FCF7F8]">LifeLoop</h1>
        </div>
        <div className="flex justify-center space-x-4">
          <a href="#" className="text-[#FCF7F8] hover:text-black">
            Home
          </a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">
            About
          </a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">
            Demo 1
          </a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">
            Demo 2
          </a>
        </div>
        <div className="flex-1 flex justify-end" />
      </nav>

      <section className="min-h-[50vh] flex justify-center px-8 py-16">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Sign up for an Account
          </h1>

          {status && (
            <div
              className={`mb-6 rounded-md border px-4 py-3 text-sm ${
                status.tone === 'error'
                  ? 'border-red-200 bg-red-500/20 text-red-50'
                  : 'border-white/40 bg-white/10 text-[#FCF7F8]'
              }`}
            >
              {status.message}
            </div>
          )}

          {stage === 'form' ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                  placeholder="Enter your Instagram username"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                  placeholder="Enter a password"
                  required
                />
              </div>

              <div className="space-y-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full rounded-md bg-white px-6 py-2.5 flex items-center justify-center gap-3 text-lg font-medium text-black transition-colors hover:bg-white hover:text-black cursor-pointer"
                >
                  Sign Up using Google
                  <Image
                    src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                    alt="Google logo"
                    width={16}
                    height={16}
                    className="h-4 w-4"
                  />
                </button>
              </div>

              <div className="space-y-2 mt-6 text-center">
                <p className="mt-6 text-base text-[#FCF7F8]">
                  Already have an account?{' '}
                  <a href="/login" className="underline hover:text-black">
                    Log in
                  </a>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center text-[#FCF7F8]">
              <p>
                Confirm the link we sent to{' '}
                <strong className="block font-semibold">{pendingEmail}</strong>
                Once verified, log in to finish your family consent setup.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  Go to login
                </button>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full rounded-md border border-white/40 px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-60"
                >
                  {resendLoading ? 'Resending…' : 'Resend verification email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="py-12 px-8 bg-[#3D5E6D] border-t border-white/20">
        <div className="max-w-6xl mx-auto text-center text-[#FCF7F8]">
          <p>&copy; 2024 LifeLoop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
