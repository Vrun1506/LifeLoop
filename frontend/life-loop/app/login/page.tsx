'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
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
      alert(error.message)
    }
  }



  return (
    <div className="font-sans text-white bg-[#5C91A9]">
      <nav className="sticky top-0 z-50 flex items-center border-b bg-white/25 px-4 py-5">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#FCF7F8]">
            LifeLoop
          </h1>
        </div>
        <div className="flex justify-center space-x-4">
          <a href="#" className="text-[#FCF7F8] hover:text-black">Home</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">About</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Contact Us</a>
        </div>
        <div className="flex-1 flex justify-end"></div>
      </nav>

      <section className="min-h-[75vh] flex justify-center px-8 py-12">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Login to your Account  
          </h1>

          <form onSubmit={handleEmailAuth} className="space-y-4">
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
                placeholder="Enter your password"
                required
              />
            </div> 
            <div className="space-y-2 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Login'}
              </button>
              
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login with Google  
              </button>
            </div>
            <div className="space-y-2 mt-6">
              <a
                href="/register"
                className="block w-full text-center rounded-md bg-transparent border-2 border-white px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Don't have an account? Sign up  
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 bg-[#3D5E6D] border-t border-white/20">
        <div className="max-w-6xl mx-auto text-center text-[#FCF7F8]">
          <p>&copy; 2024 LifeLoop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}