import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { searchParams?: { quick?: string } };

export default function SessionPage({ searchParams }: Props) {
  const quick = searchParams?.quick === "1";

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Session
        </p>
        <h1 className="font-display text-3xl text-ink">
          {quick ? "Drop-day (stub)" : "Daily session"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {quick
            ? "One card per track — wiring comes with the session builder."
            : "Full-screen card flow, drone toggle, and mic indicator will live here."}
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Placeholder card</CardTitle>
          <CardDescription>
            Card types (note finding, drone degree, MC, shape recall, etc.) plug
            in here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="rust" type="button" disabled>
            Submit (soon)
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
