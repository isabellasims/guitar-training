"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, SkipForward } from "lucide-react";

import { ChordChangeIdentifyCard } from "@/components/cards/ChordChangeIdentifyCard";
import { ChordChangeMcCard } from "@/components/cards/ChordChangeMcCard";
import { ChordToneTargetingPlayCard } from "@/components/cards/ChordToneTargetingPlayCard";
import { ConceptExplainerCard } from "@/components/cards/ConceptExplainerCard";
import { DroneDegreeIdentifyCard } from "@/components/cards/DroneDegreeIdentifyCard";
import { DroneDegreePlayCard } from "@/components/cards/DroneDegreePlayCard";
import { DroneListenWarmupCard } from "@/components/cards/DroneListenWarmupCard";
import { FreeplayAfterglowCard } from "@/components/cards/FreeplayAfterglowCard";
import { FunctionalEarMcCard } from "@/components/cards/FunctionalEarMcCard";
import { IntervalIdentifyCard } from "@/components/cards/IntervalIdentifyCard";
import { IntervalPlayCard } from "@/components/cards/IntervalPlayCard";
import { NoteFindingPlayCard } from "@/components/cards/NoteFindingPlayCard";
import { ShapeRecallPlayCard } from "@/components/cards/ShapeRecallPlayCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CardTemplateId, CardTemplateParams } from "@/lib/cards/types";
import type { Session, SessionCard, TrackId } from "@/lib/domain/types";
import { syncReviewAfterCompletedSession } from "@/lib/db/reviewOps";
import {
  applySessionToTrackProgress,
  type SessionApplyOutcome,
} from "@/lib/db/trackProgressOps";
import {
  applyStreakForCompletedSession,
  saveCompletedSession,
} from "@/lib/db/sessionOps";
import { buildNewSession } from "@/lib/session-builder/buildSession";
import { getLevel } from "@/lib/curriculum/levels";

const TRACK_NAMES: Record<TrackId, string> = {
  A: "Track A · Scale Degrees",
  B: "Track B · Note Finding",
  C: "Track C · Fretboard & CAGED",
  D: "Track D · Hearing Chord Changes",
  E: "Track E · Intervals",
};

function renderActiveCard(
  card: SessionCard,
  onDone: (grading: SessionCard["grading"]) => void,
) {
  const tid = card.cardTemplateId as CardTemplateId;

  switch (tid) {
    case "concept-explainer": {
      const params = card.parameters as CardTemplateParams["concept-explainer"];
      return (
        <ConceptExplainerCard
          params={params}
          onContinue={() => onDone("correct")}
        />
      );
    }
    case "functional-ear-mc": {
      const params = card.parameters as CardTemplateParams["functional-ear-mc"];
      return (
        <FunctionalEarMcCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "chord-change-mc": {
      const params = card.parameters as CardTemplateParams["chord-change-mc"];
      return (
        <ChordChangeMcCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "drone-degree-play": {
      const params = card.parameters as CardTemplateParams["drone-degree-play"];
      return (
        <DroneDegreePlayCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "drone-degree-identify": {
      const params =
        card.parameters as CardTemplateParams["drone-degree-identify"];
      return (
        <DroneDegreeIdentifyCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "chord-change-identify": {
      const params =
        card.parameters as CardTemplateParams["chord-change-identify"];
      return (
        <ChordChangeIdentifyCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "interval-identify": {
      const params =
        card.parameters as CardTemplateParams["interval-identify"];
      return (
        <IntervalIdentifyCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "note-finding-play": {
      const params = card.parameters as CardTemplateParams["note-finding-play"];
      return (
        <NoteFindingPlayCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "shape-recall-play": {
      const params = card.parameters as CardTemplateParams["shape-recall-play"];
      return (
        <ShapeRecallPlayCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "chord-tone-targeting-play": {
      const params =
        card.parameters as CardTemplateParams["chord-tone-targeting-play"];
      return (
        <ChordToneTargetingPlayCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    case "scale-explore-play": {
      const p = card.parameters as CardTemplateParams["scale-explore-play"];
      const body = [p.uiDescription, p.prompt].filter(
        (s): s is string => Boolean(s && s.trim()),
      );
      return (
        <ConceptExplainerCard
          params={{
            title: p.uiTitle ?? "Explore over the drone",
            body:
              body.length > 0
                ? body
                : ["Explore with the drone, then continue."],
            droneTonicMidi: p.droneTonicMidi,
            droneKeyLabel: p.droneKeyLabel,
          }}
          onContinue={() => onDone("correct")}
        />
      );
    }
    case "drone-listen-warmup": {
      const params =
        card.parameters as CardTemplateParams["drone-listen-warmup"];
      return (
        <DroneListenWarmupCard
          params={params}
          onContinue={() => onDone("correct")}
        />
      );
    }
    case "freeplay-afterglow": {
      const params =
        card.parameters as CardTemplateParams["freeplay-afterglow"];
      return (
        <FreeplayAfterglowCard
          params={params}
          onContinue={() => onDone("correct")}
        />
      );
    }
    case "interval-play": {
      const params = card.parameters as CardTemplateParams["interval-play"];
      return (
        <IntervalPlayCard
          params={params}
          onContinue={(ok) => onDone(ok ? "correct" : "incorrect")}
        />
      );
    }
    default:
      return (
        <p className="text-sm text-rust">
          Unknown card type: {card.cardTemplateId}
        </p>
      );
  }
}

function LevelUpScreen({
  outcome,
  onClose,
}: {
  outcome: SessionApplyOutcome;
  onClose: () => void;
}) {
  // If nothing new completed, close on the next tick rather than during render
  // (calling a router push during render trips React's "update during render"
  // guard and can flash an error overlay before navigating).
  useEffect(() => {
    if (outcome.newlyCompleted.length === 0) {
      onClose();
    }
  }, [outcome, onClose]);

  if (outcome.newlyCompleted.length === 0) {
    return null;
  }
  return (
    <main className="px-4 py-12">
      <Card>
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
            Level up
          </p>
          <CardTitle>
            {outcome.newlyCompleted.length === 1
              ? "Level complete."
              : `${outcome.newlyCompleted.length} levels complete.`}
          </CardTitle>
          <CardDescription>
            Tap continue when you’re ready to head back to the home screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-3">
            {outcome.newlyCompleted.map((c) => (
              <li
                key={c.levelId}
                className="rounded-md border border-rule bg-paper-soft px-3 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Track {c.trackId} · Level {getLevel(c.levelId)?.level ?? "?"}
                </p>
                <p className="text-base font-medium text-ink">{c.levelName}</p>
                {c.nextLevelId ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    Next: {c.nextLevelId} · {c.nextLevelName}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">
                    Track {c.trackId} complete — maintenance only.
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Button type="button" variant="rust" onClick={onClose}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

const SLOT_LABEL: Record<string, string> = {
  warmup: "Warmup",
  "track-intro": "Track introduction",
  "foundation-gate": "New concept",
  "track-A": "Practice",
  "track-B": "Practice",
  "track-C": "Practice",
  "track-D": "Practice",
  "track-E": "Practice",
  review: "Review",
  afterglow: "Afterglow",
};

export function SessionRunner({ quick }: { quick: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SessionApplyOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    void buildNewSession({ quick }).then((s) => {
      if (!cancelled) {
        setSession(s);
        setIndex(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [quick]);

  const card = session?.cards[index];
  const n = session?.cards.length ?? 0;
  const pos = index + 1;

  const goBack = useCallback(() => {
    if (busy || index === 0) return;
    // Reset the prior card's grading so the user can redo their answer.
    setSession((prev) => {
      if (!prev) return prev;
      const targetIdx = index - 1;
      const nextCards = prev.cards.map((c, i) =>
        i === targetIdx
          ? { ...c, grading: "pending" as const, completedAt: null }
          : c,
      );
      return { ...prev, cards: nextCards };
    });
    setIndex((i) => Math.max(0, i - 1));
  }, [busy, index]);

  const onDone = useCallback(
    async (grading: SessionCard["grading"]) => {
      if (!session || !card || busy) return;
      setBusy(true);
      const now = new Date().toISOString();
      const nextCards = session.cards.map((c, i) =>
        i === index
          ? {
              ...c,
              grading,
              completedAt: now,
              startedAt: c.startedAt ?? now,
            }
          : c,
      );
      const base: Session = { ...session, cards: nextCards };

      if (index + 1 >= n) {
        const finished: Session = { ...base, completedAt: now };
        let result: SessionApplyOutcome = { newlyCompleted: [] };
        try {
          await saveCompletedSession(finished);
        } catch (err) {
          // Persist failure shouldn't crash the app; keep going.
          // eslint-disable-next-line no-console
          console.error("[session] saveCompletedSession failed", err);
        }
        try {
          await syncReviewAfterCompletedSession(finished);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[session] syncReviewAfterCompletedSession failed", err);
        }
        try {
          result = await applySessionToTrackProgress(finished);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[session] applySessionToTrackProgress failed", err);
        }
        try {
          await applyStreakForCompletedSession();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[session] applyStreakForCompletedSession failed", err);
        }
        try {
          window.dispatchEvent(new Event("tonic-streak-updated"));
          window.dispatchEvent(new Event("tonic-track-progress-updated"));
        } catch {
          /* benign in non-browser env */
        }

        setSession(finished);
        setBusy(false);
        if (result.newlyCompleted.length > 0) {
          setOutcome(result);
        } else {
          router.push("/");
        }
        return;
      }

      setSession(base);
      setIndex((i) => i + 1);
      setBusy(false);
    },
    [card, busy, session, index, n, router],
  );

  if (outcome) {
    return <LevelUpScreen outcome={outcome} onClose={() => router.push("/")} />;
  }

  if (!session) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Building your session…</p>
      </main>
    );
  }

  if (!card) {
    return (
      <p className="px-4 py-8 text-sm text-ink-mute">
        No cards in this session.
      </p>
    );
  }

  const lvl = getLevel(card.nodeId);
  const trackHeader = TRACK_NAMES[card.trackId] ?? `Track ${card.trackId}`;
  const slotLabel = card.slot ? SLOT_LABEL[card.slot] ?? "Session" : "Session";
  const levelTag =
    lvl != null ? `${lvl.trackId}·${lvl.level} · ${lvl.name}` : null;

  return (
    <main className="px-4 py-8">
      <header className="mb-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={index === 0 || busy}
            aria-label="Previous card"
          >
            <ArrowLeft className="mr-1 h-4 w-4" strokeWidth={1.75} />
            Back
          </Button>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            Card {pos} of {n} · {slotLabel}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onDone("correct")}
            disabled={busy}
            aria-label="Skip card and mark complete"
          >
            Skip
            <SkipForward
              className="ml-1 h-4 w-4"
              strokeWidth={1.75}
            />
          </Button>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-rust">
            {trackHeader}
          </p>
          {levelTag ? (
            <h1 className="font-display text-2xl text-ink">{levelTag}</h1>
          ) : null}
        </div>
      </header>

      <div key={card.id} className="space-y-6">
        {renderActiveCard(card, onDone)}
      </div>
    </main>
  );
}
