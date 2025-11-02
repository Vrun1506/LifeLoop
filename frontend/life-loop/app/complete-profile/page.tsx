'use client'

import { createClient } from '@/lib/supabase/client'
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProfile() {
  const [instagramUsername, setInstagramUsername] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [hasConsent, setHasConsent] = useState(false)
  const [voiceSample, setVoiceSample] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [recorderSupported, setRecorderSupported] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const shouldSaveRecordingRef = useRef(true)
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ig_username, parent_email, is_parent_confirmed, voice_sample_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.ig_username) {
        setInstagramUsername(profile.ig_username)
      }

      if (profile?.parent_email) {
        setParentEmail(profile.parent_email)
      }

      if (profile?.is_parent_confirmed) {
        setHasConsent(true)
      }

      if (profile?.voice_sample_url) {
        setStatusMessage('Voice sample already on file; you can replace it below.')
      }
    }

    const isSupported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia

    setRecorderSupported(isSupported)

    bootstrap()

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        shouldSaveRecordingRef.current = false
        try {
          mediaRecorderRef.current.stop()
        } catch (err) {
          console.error('Error stopping recorder during cleanup', err)
        }
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [supabase, router])

  const clearRecordingTimers = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  const finalizeRecording = (shouldSave: boolean, mimeType?: string) => {
    clearRecordingTimers()
    setIsRecording(false)
    setSecondsRemaining(null)

    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
    }

    if (shouldSave && recordingChunksRef.current.length > 0) {
      const blob = new Blob(recordingChunksRef.current, {
        type: mimeType && mimeType !== '' ? mimeType : 'audio/webm',
      })
      const extension = blob.type.split('/')[1] || 'webm'
      const filename = `lifeloop-voice-${Date.now()}.${extension}`
      const recordedFile = new File([blob], filename, { type: blob.type })
      setVoiceSample(recordedFile)
      setStatusMessage('Voice sample captured! You can re-record or replace it with another file.')
    } else if (shouldSave) {
      setStatusMessage('We could not capture audio. Please try recording again or upload a file manually.')
    } else {
      setStatusMessage('Recording cancelled. You can start a new take whenever you’re ready.')
    }

    recordingChunksRef.current = []
    shouldSaveRecordingRef.current = true
    mediaRecorderRef.current = null
  }

  const stopRecording = (shouldSave: boolean) => {
    shouldSaveRecordingRef.current = shouldSave
    clearRecordingTimers()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        console.error('Failed to stop recorder', error)
        finalizeRecording(false)
      }
    } else {
      finalizeRecording(false)
    }
  }

  const startRecording = async () => {
    if (isRecording || !recorderSupported) {
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatusMessage('Your browser does not support voice recording. Please upload an audio file instead.')
      setRecorderSupported(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      recordingChunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      shouldSaveRecordingRef.current = true

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        finalizeRecording(shouldSaveRecordingRef.current, recorder.mimeType)
      }

      recorder.start()
      setIsRecording(true)
      setSecondsRemaining(10)
      setStatusMessage('Recording started. Speak clearly for 10 seconds.')

      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null) return prev
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording(true)
      }, 10000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setStatusMessage(
        'We could not access your microphone. Please allow microphone permissions or upload an audio file manually.'
      )
      setIsRecording(false)
      setSecondsRemaining(null)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setVoiceSample(file)
    if (file) {
      setStatusMessage(`Voice sample selected: ${file.name}`)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!instagramUsername.trim()) {
      setStatusMessage('Please provide your Instagram username.')
      return
    }

    if (!parentEmail.trim()) {
      setStatusMessage('Please enter a parent or guardian email.')
      return
    }

    if (!hasConsent) {
      setStatusMessage('Consent is required before we reach out to your parent.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('instagramUsername', instagramUsername.trim())
      formData.append('parentEmail', parentEmail.trim())
      formData.append('consentGranted', hasConsent ? 'true' : 'false')
      if (voiceSample) {
        formData.append('voiceSample', voiceSample)
      }

      const response = await fetch('/api/parent-request', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to submit parent request.')
      }

      setStatusMessage('We’ve emailed your parent with next steps. Welcome to LifeLoop!')
      router.push('/main-screen')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Something went wrong submitting your details.')
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
            {statusMessage && (
              <div className="rounded-md border border-white/40 bg-white/10 px-4 py-3 text-sm text-[#FCF7F8]">
                {statusMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#FCF7F8] uppercase tracking-wide">
                Instagram username
              </label>
              <input
                type="text"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="@lifeloopstudent"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#FCF7F8] uppercase tracking-wide">
                Parent or guardian email
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="parent@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#FCF7F8] uppercase tracking-wide">
                Voice sample (optional)
              </label>
              <div className="flex flex-col gap-3 rounded-md border-2 border-dashed border-white/60 bg-white/5 px-4 py-6 text-center">
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="w-full text-sm text-[#FCF7F8] file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
                  />
                  <p className="text-xs text-[#FCF7F8]/80">
                    Upload at least 10 seconds for our ElevenLabs narration. Or record a fresh sample right here.
                  </p>
                </div>

                {recorderSupported ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isRecording}
                      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-60"
                    >
                      {isRecording ? 'Recording…' : 'Record 10-second sample'}
                    </button>
                    {isRecording && (
                      <button
                        type="button"
                        onClick={() => stopRecording(false)}
                        className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                      >
                        Cancel recording
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#FCF7F8]/80">
                    Browser recording isn’t supported here. Please upload an audio file manually.
                  </p>
                )}

                {isRecording && secondsRemaining !== null && (
                  <p className="text-sm text-[#FCF7F8]">
                    Recording… {secondsRemaining}s remaining
                  </p>
                )}

                {voiceSample && (
                  <p className="text-sm text-[#FCF7F8]">
                    Selected: {voiceSample.name}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-white/20 bg-white/10 px-4 py-3 text-left text-sm text-[#FCF7F8]">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/60 bg-transparent"
              />
              <span>
                I confirm that LifeLoop can contact my parent/guardian, store highlights from my Instagram posts, and share narrated updates for our family.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black px-6 py-3 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Parent Request'}
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
