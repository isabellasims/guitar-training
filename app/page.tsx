import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-10 border-b border-rule pb-8">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
          Personal practice
        </p>
        <h1 className="font-display text-4xl font-normal tracking-tight text-ink">
          Tonic
        </h1>
        <p className="mt-3 max-w-md text-ink-soft">
          Today&apos;s session is composed from your tracks and review queue.
          Pitch detection is the default grader when you play.
        </p>
      </header>

      <div className="space-y-4">
        <Card className="border-rust/30 bg-ink text-paper-soft">
          <CardHeader>
            <CardTitle className="text-paper">Today</CardTitle>
            <CardDescription className="text-paper-deep">
              Session builder and streak UI ship in the next milestones. For
              now, use the pitch lab and manual to stay oriented.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="rust" className="bg-gold-soft text-ink hover:bg-gold">
              <Link href="/session">Start session</Link>
            </Button>
            <Button asChild variant="outline" className="border-paper-deep text-paper hover:bg-ink-soft">
              <Link href="/session?quick=1">5 minutes today</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice manual</CardTitle>
            <CardDescription>
              Sixteen-week pedagogy and track definitions (source of truth).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/guitar-practice-plan.html" target="_blank" rel="noreferrer">
                Open manual
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developers</CardTitle>
            <CardDescription>
              Mic + Pitchy smoke test (requires HTTPS or localhost).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="px-0 text-rust">
              <Link href="/dev/pitch-test">Pitch lab</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
