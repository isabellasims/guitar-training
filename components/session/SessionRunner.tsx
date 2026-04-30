"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChordChangeMcCard } from "@/components/cards/ChordChangeMcCard";
import { ChordToneTargetingPlayCard } from "@/components/cards/ChordToneTargetingPlayCard";
import { ConceptExplainerCard } from "@/components/cards/ConceptExplainerCard";
import { DroneDegreePlayCard } from "@/components/cards/DroneDegreePlayCard";
import { FunctionalEarMcCard } from "@/components/cards/FunctionalEarMcCard";
import { NoteFindingPlayCard } from "@/components/cards/NoteFindingPlayCard";
import { ShapeRecallPlayCard } from "@/components/cards/ShapeRecallPlayCard";
import type {
  CardTemplateId,
  CardTemplateParams,
} from "@/lib/cards/types";
import type { Session, SessionCard } from "@/lib/domain/types";
import { syncReviewAfterCompletedSession } from "@/lib/db/reviewOps";
import {
  applyStreakForCompletedSession,
  saveCompletedSession,
} from "@/lib/db/sessionOps";
import { buildNewSession } from "@/lib/session-builder/buildSession";

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
    default:
      return (
        <p className="text-sm text-rust">Unknown card type: {card.cardTemplateId}</p>
      );
  }
}

export function SessionRunner({ quick }: { quick: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

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
    const ids = Array.from(
      new Set(session.cards.map((c) => c.trackId)),
    ).sort();
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
        try {
          const finished: Session = { ...base, completedAt: now };
          await saveCompletedSession(finished);
          await syncReviewAfterCompletedSession(finished);
          await applyStreakForCompletedSession();
          window.dispatchEvent(new Event("tonic-streak-updated"));
        } finally {
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

  if (!session) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Building your session…</p>
      </main>
    );
  }

  if (!card) {
    return (
      <p className="px-4 py-8 text-sm text-ink-mute">No cards in this session.</p>
    );
  }

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Session
        </p>
        <p className="text-sm text-ink-soft">
          Card {pos} of {n}
        </p>
        <h1 className="font-display text-2xl text-ink">{trackLabel}</h1>
      </header>

      <div key={card.id} className="space-y-6">
        {renderActiveCard(card, onDone)}
      </div>
    </main>
  );
}
