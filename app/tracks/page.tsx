import { TracksWithProgress } from "@/components/tracks/TracksWithProgress";

export default function TracksPage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Tracks
        </p>
        <h1 className="font-display text-3xl text-ink">Skill paths</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Four tracks (A–D). Progress markers use your local save; hero solo and
          song tracks stay deferred.
        </p>
      </header>

      <TracksWithProgress />
    </main>
  );
}
