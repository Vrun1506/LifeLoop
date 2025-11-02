export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1720] text-white">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/60 border-t-transparent" />
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            LifeLoop Gallery
          </p>
          <p className="text-lg font-medium text-white/80">
            Gathering family memories…
          </p>
        </div>
      </div>
    </div>
  )
}
