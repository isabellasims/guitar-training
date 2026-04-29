import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKS } from "@/lib/tracks/tracks";

export default function TracksPage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Tracks
        </p>
        <h1 className="font-display text-3xl text-ink">Skill paths</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Four tracks for this build (A–D). Hero solo and song vocabulary
          tracks are deferred.
        </p>
      </header>

      <ul className="space-y-4">
        {TRACKS.map((track) => (
          <li key={track.id}>
            <Card>
              <CardHeader>
                <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
                  Track {track.id}
                </p>
                <CardTitle>{track.name}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                  {track.nodes.map((n) => (
                    <li key={n.id}>
                      <span className="font-medium text-ink">{n.title}</span>
                      <span className="block text-ink-mute">{n.summary}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  <Link href="/guitar-practice-plan.html" className="text-rust">
                    Expand nodes from manual →
                  </Link>
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
