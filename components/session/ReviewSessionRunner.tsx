"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SessionRunner } from "@/components/session/SessionRunner";
import { Button } from "@/components/ui/button";
import {
  buildReviewSession,
  estimateSessionSeconds,
  formatSessionEstimate,
} from "@/lib/session-builder/buildSession";
import type { Session } from "@/lib/domain/types";

/**
 * Thin wrapper: builds an SRS-only session then reuses SessionRunner's card UI
 * via a pre-built session prop — we export a minimal inline runner instead.
 */
export function ReviewSessionRunner({
  sessionMinutes,
}: {
  sessionMinutes: 5 | 15 | 30;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"preflight" | "running">("preflight");
  const [session, setSession] = useState<Session | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void buildReviewSession({ minutes: sessionMinutes }).then((s) => {
      if (cancelled) return;
      setSession(s);
      setEstimate(
        formatSessionEstimate(estimateSessionSeconds(s.cards)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [sessionMinutes]);

  const start = useCallback(() => {
    if (!session || session.cards.length === 0) return;
    setPhase("running");
  }, [session]);

  if (phase === "running" && session) {
    return (
      <ReviewSessionInner
        session={session}
        onExit={() => router.push("/")}
      />
    );
  }

  const cardCount = session?.cards.length ?? 0;

  return (
    <div className="space-y-4">
      {session === null ? (
        <p className="text-sm text-ink-mute">Loading review queue…</p>
      ) : cardCount === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing due right now. Check back after your next practice session.
        </p>
      ) : (
        <>
          <p className="font-mono text-sm text-ink">
            {cardCount} card{cardCount === 1 ? "" : "s"}
            {estimate ? ` · ${estimate}` : ""}
          </p>
          <Button type="button" variant="rust" onClick={start}>
            Start review
          </Button>
        </>
      )}
      <Button type="button" variant="ghost" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Home
      </Button>
    </div>
  );
}

/** Runs a fixed session without rebuilding (reviews-only). */
function ReviewSessionInner({
  session: initial,
  onExit,
}: {
  session: Session;
  onExit: () => void;
}) {
  return (
    <SessionRunner
      sessionMinutes={5}
      prebuiltSession={initial}
      onSessionFinished={onExit}
    />
  );
}
