import Link from "next/link";

import { ReviewSessionRunner } from "@/components/session/ReviewSessionRunner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  searchParams?: { minutes?: string };
};

function parseMinutes(minutes: string | undefined): 5 | 15 | 30 {
  const n = minutes ? parseInt(minutes, 10) : 15;
  if (n <= 5) return 5;
  if (n <= 15) return 15;
  return 30;
}

export default function ReviewsPage({ searchParams }: Props) {
  const sessionMinutes = parseMinutes(searchParams?.minutes);

  return (
    <main className="px-4 py-8">
      <header className="mb-8 border-b border-rule pb-6">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
          Spaced repetition
        </p>
        <h1 className="font-display text-3xl text-ink">Review queue</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Due cards only — no new level material. Practice sessions focus on
          what you&apos;re learning now; use this when you want to clear SRS
          debt.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Length</CardTitle>
          <CardDescription>Pick how long you want to review.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant={sessionMinutes === 5 ? "rust" : "outline"}>
            <Link href="/reviews?minutes=5">5 min</Link>
          </Button>
          <Button asChild variant={sessionMinutes === 15 ? "rust" : "outline"}>
            <Link href="/reviews?minutes=15">15 min</Link>
          </Button>
          <Button asChild variant={sessionMinutes === 30 ? "rust" : "outline"}>
            <Link href="/reviews?minutes=30">30 min</Link>
          </Button>
        </CardContent>
      </Card>

      <ReviewSessionRunner sessionMinutes={sessionMinutes} />
    </main>
  );
}
