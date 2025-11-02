import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { RefreshInstagramButton } from './RefreshInstagramButton'
import { SignOutButton } from './SignOutButton'

type RawInstagramMediaRow = {
  id: string
  source_url: string | null
  storage_key: string | null
  caption: string | null
  caption_confidence: number | null
  audio_url: string | null
  processed_at: string | null
}

type DashboardMediaItem = {
  id: string
  imageUrl: string
  caption: string
  captionConfidence: number | null
  audioUrl: string | null
  processedAt: string | null
}

const MOCK_MEDIA: DashboardMediaItem[] = [
  {
    id: 'mock-1',
    imageUrl:
      'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Grandma teaching Maya how to bake the family cinnamon rolls on Saturday morning.',
    captionConfidence: 0.93,
    audioUrl: null,
    processedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'mock-2',
    imageUrl:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80',
    caption:
      'First robotics club showcase — the team cheered when the robot completed its loop.',
    captionConfidence: 0.88,
    audioUrl: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
    processedAt: '2024-06-03T18:30:00Z',
  },
  {
    id: 'mock-3',
    imageUrl:
      'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80',
    caption:
      'End-of-term art show: Olivia and her grandparents admiring the mural she painted together with her class.',
    captionConfidence: 0.97,
    audioUrl: null,
    processedAt: '2024-06-05T08:45:00Z',
  },
]

export const metadata: Metadata = {
  title: 'LifeLoop | Family Gallery',
  description:
    'Share narrated Instagram memories across generations with authentic consent and context.',
}

const mediaBaseUrl =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  ''

const preferMockData =
  process.env.NEXT_PUBLIC_USE_MOCK_DASHBOARD === 'true'

function resolveImageUrl(row: RawInstagramMediaRow) {
  if (row.storage_key) {
    if (row.storage_key.startsWith('http')) return row.storage_key
    if (mediaBaseUrl) {
      const base = mediaBaseUrl.endsWith('/')
        ? mediaBaseUrl.slice(0, -1)
        : mediaBaseUrl
      return `${base}/${row.storage_key}`
    }
  }

  if (row.source_url) {
    return row.source_url
  }

  return ''
}

function mapRowToMediaItem(row: RawInstagramMediaRow): DashboardMediaItem {
  return {
    id: row.id,
    imageUrl: resolveImageUrl(row),
    caption:
      row.caption ||
      'Gemini caption pending — ingestion pipeline is preparing this memory.',
    captionConfidence: row.caption_confidence,
    audioUrl: row.audio_url,
    processedAt: row.processed_at,
  }
}

function formatConfidence(confidence: number | null) {
  if (confidence === null) return null

  const isFraction = confidence > 0 && confidence <= 1
  const value = isFraction ? confidence * 100 : confidence

  return `${Math.round(value)}% confidence`
}

function formatProcessedAt(timestamp: string | null) {
  if (!timestamp) return 'Processing soon'

  try {
    const date = new Date(timestamp)
    return `Processed ${date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return 'Processed recently'
  }
}

function ConsentWarning({
  parentEmail,
}: {
  parentEmail?: string | null
}) {
  return (
    <section className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-5 text-sm text-amber-100">
      <h2 className="text-base font-semibold text-amber-200">
        Parent & grandparent consent matters
      </h2>
      <p className="mt-2 leading-relaxed">
        We only surface memories once parents confirm their invitation. Until
        then, LifeLoop shows curated examples so you can experience how we
        bridge student, parent, and grandparent worlds while keeping everyone
        aligned on privacy.
      </p>
      {parentEmail && (
        <p className="mt-3 text-xs text-amber-100/80">
          Invite sent to <span className="font-medium text-amber-50">{parentEmail}</span>. Ask them
          to check their inbox (and spam folder) for the LifeLoop consent email.
        </p>
      )}
    </section>
  )
}

function MockDataNotice() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-white/80">
      <h3 className="text-base font-semibold text-white">
        Previewing sample gallery
      </h3>
      <p className="mt-2 leading-relaxed">
        Instagram ingestion is finishing setup in the backend sprint. These
        Lifeloop memories use mock data so design, accessibility, and narration
        review can proceed in parallel. Set
        {' '}
        <code>NEXT_PUBLIC_USE_MOCK_DASHBOARD=true</code>
        {' '}
        in <code>.env.local</code> when you want to showcase curated samples;
        leave it unset or <code>false</code> for live Instagram ingestion.
      </p>
    </section>
  )
}

function GalleryGrid({ items }: { items: DashboardMediaItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/20 p-12 text-center text-white/60">
        No Instagram memories yet. Once consent is confirmed and ingestion
        runs, new keepsakes will bloom here automatically.
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#162433]/80 shadow-lg shadow-black/20 backdrop-blur"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0E1A23]">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.caption}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/40">
                Image fetch pending
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-5">
            <p className="text-sm leading-relaxed text-white/90">
              {item.caption}
            </p>

            <div className="flex flex-wrap items-center justify-between text-xs uppercase tracking-wide text-white/50">
              <span>{formatProcessedAt(item.processedAt)}</span>
              {formatConfidence(item.captionConfidence) && (
                <span>{formatConfidence(item.captionConfidence)}</span>
              )}
            </div>

            <div className="mt-auto">
              {item.audioUrl ? (
                <audio
                  className="mt-1 w-full"
                  controls
                  preload="none"
                  src={item.audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <button
                  disabled
                  className="flex w-full items-center justify-center rounded-md border border-dashed border-white/20 bg-white/5 px-4 py-2 text-sm text-white/50"
                >
                  Narrated highlight coming soon
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function DashboardNav({
  instagramHandle,
}: {
  instagramHandle?: string | null
}) {
  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0D1C27]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl font-semibold tracking-tight">
            LifeLoop
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.25em] text-cyan-200/80">
            Legacy
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/70">
          <a href="#gallery" className="transition hover:text-white">
            Gallery
          </a>
          <a href="#digest" className="transition hover:text-white">
            Digest Preview
          </a>
          <a href="#future-roadmap" className="transition hover:text-white">
            Roadmap
          </a>
          {instagramHandle && (
            <span className="hidden text-xs text-white/50 sm:inline">
              @{instagramHandle}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          <RefreshInstagramButton />
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('ig_username, parent_email, is_parent_confirmed')
    .eq('id', user.id)
    .maybeSingle()

  let fetchedMedia: DashboardMediaItem[] = []
  let fetchError: string | null = null

  if (!preferMockData) {
    const { data, error } = await supabase
      .from('instagram_media')
      .select(
        'id, source_url, storage_key, caption, caption_confidence, audio_url, processed_at'
      )
      .eq('user_id', user.id)
      .order('processed_at', { ascending: false })
      .limit(24)

    if (error) {
      fetchError = error.message
    } else if (data) {
      fetchedMedia = data.map(mapRowToMediaItem)
    }
  }

  const usingMockData = preferMockData || !fetchedMedia.length
  const itemsToRender = usingMockData ? MOCK_MEDIA : fetchedMedia
  const parentPending = profile?.is_parent_confirmed === false

  const instagramHandle =
    profile?.ig_username || user.user_metadata?.instagram_username || null

  return (
    <div className="min-h-screen bg-[#0B1720] text-white">
      <DashboardNav instagramHandle={instagramHandle} />

      <header className="border-b border-white/10 bg-[#101F2C]/80 px-6 py-6 shadow-lg shadow-black/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                LifeLoop Legacy Gallery
              </p>
              <h1 className="text-3xl font-semibold">
                Bridging student, parent, and grandparent worlds
              </h1>
            </div>
            <div className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-cyan-200">
              Signed in as {user.email ?? 'family member'}
            </div>
          </div>
          <p className="max-w-3xl text-sm text-white/70">
            Today&apos;s sprint stitches Instagram updates into narrated keepsakes.
            Review captions and audio cues below, then share them with family to
            keep everyone emotionally aligned across generations.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        {profileError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p className="font-medium text-rose-200">
              Could not load your profile record.
            </p>
            <p className="mt-1 text-rose-100/80">{profileError.message}</p>
          </div>
        )}

        {parentPending && (
          <ConsentWarning parentEmail={profile?.parent_email} />
        )}

        {fetchError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p className="font-medium text-rose-200">
              We hit a snag fetching live Instagram media.
            </p>
            <p className="mt-1 text-rose-100/80">
              {fetchError}. Showing curated samples so reviewers can stay on track.
            </p>
          </div>
        )}

        {usingMockData && <MockDataNotice />}

        <section id="gallery" className="space-y-6">
          <GalleryGrid items={itemsToRender} />
        </section>

        <section
          id="digest"
          className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/80"
        >
          <h2 className="text-lg font-semibold text-white">
            Email digest preview
          </h2>
          <p className="mt-3">
            Our Resend-powered digest bundles the latest narrated posts into a
            single email for parents and grandparents. Once ingestion runs, hit
            “Sync Instagram” above and we&apos;ll show fresh highlights here for
            review and QA.
          </p>
        </section>

        <section
          id="future-roadmap"
          className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/80"
        >
          <h2 className="text-lg font-semibold text-white">
            Roadmap snapshots
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium text-white">Immich-inspired tagging:</span>{' '}
              auto-label family members once we integrate face recognition with
              explicit consent.
            </li>
            <li>
              <span className="font-medium text-white">Photobook generator:</span>{' '}
              export your gallery into printable PDF keepsakes with one click.
            </li>
            <li>
              <span className="font-medium text-white">Instagram archive import:</span>{' '}
              backfill years of memories using the official data export.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
