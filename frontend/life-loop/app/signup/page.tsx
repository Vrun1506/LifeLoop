'use client'

import Image from "next/image";
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Sign up the user with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Create profile entry with Instagram username
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            { 
              id: data.user.id, 
              ig_username: instagramUsername,
              email: email 
            },
          ])

        if (profileError) console.error('Profile creation error:', profileError)
      }

      alert('Check your email for the confirmation link!')
      router.push('/login')
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
            <a href="" className="text-[#FCF7F8] hover:text-black">Home</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">About</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Demo 1</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Demo 2</a>
        </div>
        <div className="flex-1 flex justify-end"></div>
      </nav>

      <section className="min-h-[50vh] flex justify-center px-8 py-16">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Sign up for an Account   
          </h1>

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
                {loading ? 'Loading...' : 'Sign Up'}
              </button>
               <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full rounded-md bg-white px-6 py-2.5 flex items-center justify-center gap-3 text-lg font-medium text-black transition-colors hover:bg-white hover:text-black cursor-pointer"
              >

                Sign Up using Google 
                <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google logo" className="w-4 h-4"/>

              </button>
            </div>

            <div className="space-y-2 mt-6 justify-center text-center">
             <p className="mt-6 text-base  text-[#FCF7F8]">
                Already have an account? <a href="/login" className="underline hover:text-black">Log in</a>        
            </p>
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