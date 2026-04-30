"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChordChangeMcCard } from "@/components/cards/ChordChangeMcCard";
import { ChordToneTargetingPlayCard } from "@/components/cards/ChordToneTargetingPlayCard";
import { ConceptExplainerCard } from "@/components/cards/ConceptExplainerCard";
import { DroneDegreePlayCard } from "@/components/cards/DroneDegreePlayCard";
import { DroneListenWarmupCard } from "@/components/cards/DroneListenWarmupCard";
import { FreeplayAfterglowCard } from "@/components/cards/FreeplayAfterglowCard";
import { FunctionalEarMcCard } from "@/components/cards/FunctionalEarMcCard";
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
import type { Session, SessionCard } from "@/lib/domain/types";
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
  if (outcome.newlyCompleted.length === 0) {
    onClose();
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

  const trackLabel = useMemo(() => {
    if (!session?.cards.length) return "…";
    const ids = Array.from(new Set(session.cards.map((c) => c.trackId))).sort();
    if (ids.length === 1) return `Track ${ids[0]}`;
    return "Mixed tracks";
  }, [session]);

  const card = session?.cards[index];
  const n = session?.cards.length ?? 0;
  const pos = index + 1;

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
          await syncReviewAfterCompletedSession(finished);
          result = await applySessionToTrackProgress(finished);
          await applyStreakForCompletedSession();
          window.dispatchEvent(new Event("tonic-streak-updated"));
          window.dispatchEvent(new Event("tonic-track-progress-updated"));
        } finally {
          setSession(finished);
          setBusy(false);
          if (result.newlyCompleted.length > 0) {
            setOutcome(result);
          } else {
            router.push("/");
          }
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
  const slotLabel: Record<string, string> = {
    warmup: "Warmup",
    "foundation-gate": "New concept",
    "track-A": "Track A",
    "track-B": "Track B",
    "track-C": "Track C",
    "track-D": "Track D",
    "track-E": "Track E",
    review: "Review",
    afterglow: "Afterglow",
  };
  const subtitle =
    lvl != null
      ? `${lvl.trackId}·${lvl.level} · ${lvl.name}`
      : trackLabel;

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {card.slot ? slotLabel[card.slot] ?? "Session" : "Session"}
        </p>
        <p className="text-sm text-ink-soft">
          Card {pos} of {n}
        </p>
        <h1 className="font-display text-2xl text-ink">{subtitle}</h1>
      </header>

      <div key={card.id} className="space-y-6">
        {renderActiveCard(card, onDone)}
      </div>
    </main>
  );
}
