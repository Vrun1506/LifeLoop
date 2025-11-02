'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfile() {
  const [instagramUsername, setInstagramUsername] = useState('')
  const [isParent, setIsParent] = useState<boolean | null>(null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // Check if user already has a profile with Instagram username
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('ig_username')
          .eq('id', user.id)
          .single()
        
        const { data: flags } = await supabase
          .from('user_flags')
          .select('parent, owner')
          .eq('auth_user_id', user.id)
          .single()
        
        // If profile exists with username and parent status, redirect to home
        if (profile?.ig_username && flags?.parent !== null) {
          router.push('/')
        }
      }
    }
    
    getUser()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isParent === null) {
      alert('Please select whether you are a parent')
      return
    }

    // If not a parent, require owner email
    if (!isParent && !ownerEmail.trim()) {
      alert('Please provide your parent/guardian email address')
      return
    }
    
    setLoading(true)

    try {
      if (!user) throw new Error('No user found')

      let ownerId = null

      // If not a parent, look up the owner's UUID by email
      if (!isParent && ownerEmail.trim()) {
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', ownerEmail.trim())
          .single()

        if (ownerError || !ownerProfile) {
          alert('Parent/guardian email not found. Please make sure they have registered first.')
          setLoading(false)
          return
        }

        ownerId = ownerProfile.id
      }

      // Insert or update profile with Instagram username
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ig_username: instagramUsername,
          email: user.email,
        })

      if (profileError) throw profileError

      // Insert or update user_flags with parent status and owner
      const { error: flagsError } = await supabase
        .from('user_flags')
        .upsert({
          auth_user_id: user.id,
          parent: isParent,
          owner: ownerId, // null if parent, otherwise the parent's UUID
        })

      if (flagsError) throw flagsError

      alert('Profile completed successfully!')
      router.push('/')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
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
      </nav>

      <section className="min-h-[75vh] flex justify-center items-center px-8 py-12">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-8 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-4">
            Complete Your Profile
          </h1>
          <p className="text-center text-[#FCF7F8] mb-6">
            Please provide your information to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <p className="text-center text-[#FCF7F8] mb-3 text-lg">Are you a parent?</p>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setIsParent(true)}
                  className={`flex-1 px-6 py-3 rounded-md text-lg font-medium transition-colors ${
                    isParent === true
                      ? 'bg-white text-black'
                      : 'bg-transparent border-2 border-white text-white hover:bg-white/10'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsParent(false)}
                  className={`flex-1 px-6 py-3 rounded-md text-lg font-medium transition-colors ${
                    isParent === false
                      ? 'bg-white text-black'
                      : 'bg-transparent border-2 border-white text-white hover:bg-white/10'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Show owner email field only if user is not a parent */}
            {isParent === false && (
              <div>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                  placeholder="Enter your parent/guardian email"
                  required
                />
                <p className="text-center text-[#FCF7F8] text-sm mt-2">
                  Your parent/guardian must be registered first
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black px-6 py-3 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
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