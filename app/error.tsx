"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * App Router segment-level error fallback. Without this, any uncaught throw
 * renders Next.js's bare unstyled error page (the "raw HTML" look). This
 * preserves the global layout (fonts, theme tokens, padding) and gives the
 * user a path back to home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[tonic] route-level error", error);
  }, [error]);

  return (
    <main className="px-4 py-12">
      <Card>
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
            Something went sideways
          </p>
          <CardTitle>That didn&apos;t go to plan.</CardTitle>
          <CardDescription>
            We caught the error so the page doesn&apos;t bail. Your session
            data is saved up to the last completed card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error?.message ? (
            <pre className="overflow-auto rounded-md border border-rule bg-paper-soft p-3 font-mono text-[11px] text-ink-soft">
              {error.message}
            </pre>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="rust" onClick={() => reset()}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
