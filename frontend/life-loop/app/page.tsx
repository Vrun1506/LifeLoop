'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationHandled, setVerificationHandled] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const code = searchParams?.get('code')

  useEffect(() => {
    if (!code || verificationHandled) {
      return
    }

    const verifyEmail = async () => {
      const supabase = createClient()
      try {
        const { error } = await supabase.auth.exchangeCodeForSession({ code })
        if (error) {
          throw error
        }
        setVerificationHandled(true)
        window.alert('Your email has been verified! Log in to finish the parent consent setup.')
        router.push('/login')
      } catch (error) {
        console.error('Email verification failed', error)
        const message =
          error instanceof Error ? error.message : 'We could not verify your email. Please request a new link.'
        setVerificationError(message)
        setVerificationHandled(true)
      }
    }

    verifyEmail()
  }, [code, router, verificationHandled])

  return (
    <div className="font-sans text-white bg-[#5C91A9]">
      <nav className="sticky top-0 z-50 flex items-center border-b bg-white/25 px-4 py-5">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#FCF7F8]">LifeLoop</h1>
        </div>
        <div className="flex justify-center space-x-4">
          <a href="#why" className="text-[#FCF7F8] hover:text-black">
            Why LifeLoop
          </a>
          <a href="#how" className="text-[#FCF7F8] hover:text-black">
            How it Works
          </a>
          <a href="#future" className="text-[#FCF7F8] hover:text-black">
            Future Vision
          </a>
        </div>
        <div className="flex-1 flex justify-end gap-3">
          <a
            href="/login"
            className="inline-block rounded-md border border-black bg-white px-6 py-3 text-base font-medium text-black transition-colors hover:text-blue-500"
          >
            Login
          </a>

          <a
            href="/signup"
            className="inline-block rounded-md border border-black bg-black px-6 py-3 text-base font-medium text-white transition-colors hover:text-blue-500"
          >
            Join the Beta
          </a>
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center px-5 py-24 bg-gradient-to-b from-[#5C91A9] to-[#4A7A8F]">
        <div className="text-center max-w-4xl">
          {verificationError && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-500/20 px-4 py-3 text-sm text-red-50">
              {verificationError}
            </div>
          )}
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-[#FCF7F8]">
            Bridge your campus life back home
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-[#FCF7F8]/90">
            LifeLoop safeguards your student story by archiving public Instagram posts, generating Gemini-powered
            captions, and sharing ElevenLabs narrated highlights with the people who raised you.
          </p>
          <div className="mt-8">
            <a
              href="/signup"
              className="inline-block rounded-md border border-black bg-black px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white hover:text-black"
            >
              Start preserving your legacy
            </a>
          </div>
        </div>
      </section>

      {/* Why LifeLoop */}
      <section id="why" className="py-16 px-8 bg-[#4A7A8F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-[#FCF7F8] mb-12">Why LifeLoop?</h2>
          <div className="bg-white/10 p-10 rounded-2xl shadow-lg">
            <p className="text-xl text-[#FCF7F8] mb-6 text-center">
              University life is full of moments, but distance and busy schedules make it hard to share them. LifeLoop
              preserves your digital legacy, bridges you with your family, and keeps grandparents in the loop without
              needing another app.
            </p>
            <p className="text-xl text-[#FCF7F8] mb-6 text-center">
              We cache your public Instagram photos in a private Cloudflare R2 vault, auto-caption them with Google
              Gemini, and deliver narrated digests through ElevenLabs so every update feels personal—even when you
              cannot call home.
            </p>
            <p className="text-xl text-[#FCF7F8] text-center">It’s your story, retold with empathy, accessibility, and control.</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-24 px-8 bg-[#5C91A9]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-[#FCF7F8] mb-16">How LifeLoop Works</h2>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="bg-white/10 p-8 rounded-lg border border-white/20">
              <span className="text-sm uppercase tracking-widest text-[#FCF7F8]/70">Step 1</span>
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Capture & Preserve</h3>
              <p className="text-[#FCF7F8]/90">
                Sign up with your Instagram handle and parent email. Once they approve, we mirror your public posts into
                a secure, vendor-independent archive.
              </p>
            </div>
            <div className="bg-white/10 p-8 rounded-lg border border-white/20">
              <span className="text-sm uppercase tracking-widest text-[#FCF7F8]/70">Step 2</span>
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Explain & Narrate</h3>
              <p className="text-[#FCF7F8]/90">
                Google Gemini describes each image with friendly context, while ElevenLabs turns those captions into
                audio—optionally using your own cloned voice.
              </p>
            </div>
            <div className="bg-white/10 p-8 rounded-lg border border-white/20">
              <span className="text-sm uppercase tracking-widest text-[#FCF7F8]/70">Step 3</span>
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Deliver & Delight</h3>
              <p className="text-[#FCF7F8]/90">
                Families receive a beautiful gallery dashboard plus email digests that play back updates—perfect for
                parents on the go and grandparents who prefer audio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 px-8 bg-[#4A7A8F]">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">
          <div className="bg-white/10 p-8 rounded-xl shadow">
            <h3 className="text-2xl font-semibold text-[#FCF7F8] mb-3">Accessible galleries</h3>
            <p className="text-[#FCF7F8]/85">
              High-contrast layouts, screen-reader friendly captions, and optional autoplay audio make updates easy for
              grandparents to enjoy.
            </p>
          </div>
          <div className="bg-white/10 p-8 rounded-xl shadow">
            <h3 className="text-2xl font-semibold text-[#FCF7F8] mb-3">Ethical AI promise</h3>
            <p className="text-[#FCF7F8]/85">
              Parents confirm consent before ingestion, and we clearly communicate how data is cached, processed, and
              removable on request.
            </p>
          </div>
          <div className="bg-white/10 p-8 rounded-xl shadow">
            <h3 className="text-2xl font-semibold text-[#FCF7F8] mb-3">Vendor lock-in escape</h3>
            <p className="text-[#FCF7F8]/85">
              Because your memories live in your storage bucket, not just on Instagram, you stay in control of your
              legacy long after a platform changes course.
            </p>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section id="future" className="py-24 px-8 bg-[#5C91A9]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#FCF7F8]">Looking ahead</h2>
          <p className="text-xl text-[#FCF7F8]/90 mb-6">
            Next on our roadmap: Immich-inspired facial recognition to tag family members automatically, one-click
            photobook PDFs crafted in-house, and seamless Instagram archive imports so every memory—past, present,
            future—stays in the loop.
          </p>

          <a
            href="/signup"
            className="inline-block rounded-md bg-black px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
          >
            Become a LifeLoop trailblazer
          </a>
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
