"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, SkipForward } from "lucide-react";

import { ChordChangeIdentifyCard } from "@/components/cards/ChordChangeIdentifyCard";
import { ChordChangeMcCard } from "@/components/cards/ChordChangeMcCard";
import { ChordToneTargetingPlayCard } from "@/components/cards/ChordToneTargetingPlayCard";
import { ConceptExplainerCard } from "@/components/cards/ConceptExplainerCard";
import { StarToggle } from "@/components/cards/StarToggle";
import { DroneDegreeIdentifyCard } from "@/components/cards/DroneDegreeIdentifyCard";
import { DroneDegreePlayCard } from "@/components/cards/DroneDegreePlayCard";
import { DroneListenWarmupCard } from "@/components/cards/DroneListenWarmupCard";
import { FreeplayAfterglowCard } from "@/components/cards/FreeplayAfterglowCard";
import { FunctionalEarMcCard } from "@/components/cards/FunctionalEarMcCard";
import { IntervalIdentifyCard } from "@/components/cards/IntervalIdentifyCard";
import { IntervalPlayCard } from "@/components/cards/IntervalPlayCard";
import { MelodicDictationCard } from "@/components/cards/MelodicDictationCard";
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
import { pushSkippedCard } from "@/lib/db/index";
import {
  buildNewSession,
  estimateSessionSeconds,
  formatSessionEstimate,
} from "@/lib/session-builder/buildSession";
import { pendingFoundationExplainers } from "@/lib/session-builder/explainerPreflight";
import type { PendingExplainer } from "@/lib/session-builder/explainerPreflight";
import { getLevel } from "@/lib/curriculum/levels";
import { explainerForLevel } from "@/lib/curriculum/cardsForLevel";
import type { ProgressByTrack } from "@/lib/curriculum/prerequisites";
import { getTrackProgress } from "@/lib/db/index";
import { markExplainerSeen } from "@/lib/db/trackProgressOps";

const TRACK_NAMES: Record<TrackId, string> = {
  A: "Track A · Scale Degrees",
  B: "Track B · Note Finding",
  C: "Track C · Fretboard & CAGED",
  D: "Track D · Hearing Chord Changes",
  E: "Track E · Intervals",
  F: "Track F · Improvisation",
};

/**
 * Card templates that count as practice (graded). The Skip / Mark complete
 * buttons only render on these — non-graded cards (concept-explainer,
 * drone-listen-warmup, freeplay-afterglow, scale-explore-play) have their
 * own Continue buttons embedded in the card.
 */
const PRACTICE_TEMPLATES: ReadonlySet<CardTemplateId> = new Set<CardTemplateId>([
  "functional-ear-mc",
  "chord-change-mc",
  "drone-degree-play",
  "drone-degree-identify",
  "chord-change-identify",
  "interval-identify",
  "note-finding-play",
  "shape-recall-play",
  "chord-tone-targeting-play",
  "interval-play",
  "melodic-dictation",
]);

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
          onContinue={(ok, opts) =>
            onDone(
              ok
                ? opts?.usedHelp
                  ? "correct-with-help"
                  : "correct"
                : "incorrect",
            )
          }
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
          onContinue={(ok, opts) =>
            onDone(
              ok
                ? opts?.usedHelp
                  ? "correct-with-help"
                  : "correct"
                : "incorrect",
            )
          }
        />
      );
    }
    case "shape-recall-play": {
      const params = card.parameters as CardTemplateParams["shape-recall-play"];
      return (
        <ShapeRecallPlayCard
          params={params}
          onContinue={(ok, opts) =>
            onDone(
              ok
                ? opts?.usedHelp
                  ? "correct-with-help"
                  : "correct"
                : "incorrect",
            )
          }
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
    case "melodic-dictation": {
      const params =
        card.parameters as CardTemplateParams["melodic-dictation"];
      return (
        <MelodicDictationCard
          params={params}
          onContinue={(ok, opts) =>
            onDone(
              ok
                ? opts?.usedHelp
                  ? "correct-with-help"
                  : "correct"
                : "incorrect",
            )
          }
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
          {outcome.newlyCompleted.some((c) => c.levelId === "A-11") ? (
            <p className="rounded-md border border-gold/40 bg-paper-soft px-3 py-3 text-sm text-ink">
              You unlocked <strong>Track D</strong> (chord changes) and can
              keep going on <strong>Track E</strong> (intervals) in parallel.
            </p>
          ) : null}
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

function SessionCompleteScreen({
  cardCount,
  onClose,
}: {
  cardCount: number;
  onClose: () => void;
}) {
  return (
    <main className="px-4 py-12">
      <Card>
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
            Session complete
          </p>
          <CardTitle>Nice work.</CardTitle>
          <CardDescription>
            {cardCount} card{cardCount === 1 ? "" : "s"} finished. Reviews are
            in the Review queue when you want them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="rust" onClick={onClose}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

async function loadAllTrackProgress(): Promise<ProgressByTrack> {
  const [a, b, c, d, e, f] = await Promise.all([
    getTrackProgress("A"),
    getTrackProgress("B"),
    getTrackProgress("C"),
    getTrackProgress("D"),
    getTrackProgress("E"),
    getTrackProgress("F"),
  ]);
  return { A: a, B: b, C: c, D: d, E: e, F: f };
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
  "track-F": "Practice",
  review: "Review",
  afterglow: "Afterglow",
};

type SessionPhase =
  | "loading"
  | "explainers"
  | "preflight"
  | "running"
  | "complete"
  | "levelup";

export function SessionRunner({
  sessionMinutes,
  prebuiltSession = null,
  onSessionFinished,
}: {
  sessionMinutes: 5 | 15 | 30;
  prebuiltSession?: Session | null;
  onSessionFinished?: () => void;
}) {
  const router = useRouter();
  const finish = onSessionFinished ?? (() => router.push("/"));
  const [phase, setPhase] = useState<SessionPhase>(
    prebuiltSession ? "running" : "loading",
  );
  const [session, setSession] = useState<Session | null>(prebuiltSession);
  const [preflightEstimate, setPreflightEstimate] = useState<string | null>(
    null,
  );
  const [pendingExplainers, setPendingExplainers] = useState<PendingExplainer[]>(
    [],
  );
  const [explainerIndex, setExplainerIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SessionApplyOutcome | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    if (prebuiltSession) {
      setSession(prebuiltSession);
      setPhase("running");
      return;
    }
    let cancelled = false;
    void (async () => {
      const byTrack = await loadAllTrackProgress();
      const pending = pendingFoundationExplainers(byTrack);
      if (cancelled) return;
      if (pending.length > 0) {
        setPendingExplainers(pending);
        setPhase("explainers");
        return;
      }
      const s = await buildNewSession({ minutes: sessionMinutes });
      if (cancelled) return;
      setPreflightEstimate(
        formatSessionEstimate(estimateSessionSeconds(s.cards)),
      );
      setSession(s);
      setPhase("preflight");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionMinutes, prebuiltSession]);

  const advanceAfterExplainers = useCallback(async () => {
    const s = await buildNewSession({ minutes: sessionMinutes });
    setPreflightEstimate(
      formatSessionEstimate(estimateSessionSeconds(s.cards)),
    );
    setSession(s);
    setPendingExplainers([]);
    setPhase("preflight");
  }, [sessionMinutes]);

  const onExplainerContinue = useCallback(async () => {
    const current = pendingExplainers[explainerIndex];
    if (!current) return;
    setBusy(true);
    try {
      await markExplainerSeen(current.levelId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[session] markExplainerSeen failed", err);
    }
    const next = explainerIndex + 1;
    if (next >= pendingExplainers.length) {
      await advanceAfterExplainers();
    } else {
      setExplainerIndex(next);
    }
    setBusy(false);
  }, [
    advanceAfterExplainers,
    explainerIndex,
    pendingExplainers,
  ]);

  const card = session?.cards[index];
  const n = session?.cards.length ?? 0;
  const pos = index + 1;

  const goBack = useCallback(() => {
    if (busy || index === 0) return;
    setShowExplainer(false);
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

      // "Skipped" is an explicit signal that the user wants to come back to
      // this card. Queue it for resurface in the next session. We persist
      // immediately rather than batching at session end so a crash mid-
      // session doesn't lose the queued skip.
      if (grading === "skipped") {
        try {
          await pushSkippedCard({
            id: card.id,
            trackId: card.trackId,
            nodeId: card.nodeId,
            templateId: card.cardTemplateId,
            parameters: card.parameters,
            skippedAt: now,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[session] pushSkippedCard failed", err);
        }
      }

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
          setPhase("levelup");
        } else {
          setPhase("complete");
        }
        return;
      }

      setSession(base);
      setIndex((i) => i + 1);
      setShowExplainer(false);
      setBusy(false);
    },
    [card, busy, session, index, n],
  );

  if (phase === "levelup" && outcome) {
    return <LevelUpScreen outcome={outcome} onClose={finish} />;
  }

  if (phase === "complete" && session) {
    return (
      <SessionCompleteScreen
        cardCount={session.cards.length}
        onClose={finish}
      />
    );
  }

  if (phase === "explainers" && pendingExplainers.length > 0) {
    const pe = pendingExplainers[explainerIndex]!;
    const params = pe.explainer
      .parameters as CardTemplateParams["concept-explainer"];
    const lvl = getLevel(pe.levelId);
    return (
      <main className="px-4 py-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-rust">
          New concept · {pe.trackId}·{lvl?.level ?? "?"}
        </p>
        <ConceptExplainerCard
          params={params}
          onContinue={() => void onExplainerContinue()}
        />
        <p className="mt-4 text-xs text-ink-mute">
          {explainerIndex + 1} of {pendingExplainers.length} before practice
        </p>
      </main>
    );
  }

  if (phase === "preflight" && session) {
    const nCards = session.cards.length;
    return (
      <main className="px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s session</CardTitle>
            <CardDescription>
              {sessionMinutes} minutes · practice focus (reviews optional on the
              Review page)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono text-sm text-ink">
              {nCards} card{nCards === 1 ? "" : "s"}
              {preflightEstimate ? ` · ${preflightEstimate}` : ""}
            </p>
            {nCards === 0 ? (
              <p className="text-sm text-ink-soft">
                No practice cards right now — check Tracks or try Review.
              </p>
            ) : (
              <Button
                type="button"
                variant="rust"
                onClick={() => setPhase("running")}
              >
                Start
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={finish}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === "loading" || !session) {
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
  const isPractice = PRACTICE_TEMPLATES.has(
    card.cardTemplateId as CardTemplateId,
  );
  // "See how it works" is offered when this card has a corresponding
  // explainer authored for its level AND the user is currently on a
  // graded practice card (no point showing it on the explainer itself).
  const explainer = explainerForLevel(card.nodeId);
  const canShowExplainer =
    explainer != null && card.cardTemplateId !== "concept-explainer";

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
          <div className="flex items-center gap-1">
            {canShowExplainer ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowExplainer((v) => !v)}
                className="text-xs text-ink-mute hover:text-rust"
                title="Show the original lesson for this level"
              >
                {showExplainer ? "Hide explainer" : "See how it works"}
              </Button>
            ) : null}
            <StarToggle
              trackId={card.trackId}
              nodeId={card.nodeId}
              templateId={card.cardTemplateId}
              title={levelTag ?? `${card.trackId}·${card.nodeId}`}
              summary={lvl?.name}
              snapshot={card.parameters}
            />
          </div>
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
        {showExplainer && explainer ? (
          <ConceptExplainerCard
            params={
              explainer.parameters as CardTemplateParams["concept-explainer"]
            }
            onContinue={() => setShowExplainer(false)}
          />
        ) : (
          renderActiveCard(card, onDone)
        )}
        {isPractice && !showExplainer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule pt-4">
            <p className="mr-auto text-xs text-ink-mute">
              Pitch detection misfiring? Use Mark complete to override.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onDone("skipped")}
              disabled={busy}
              aria-label="Skip this card; it will surface again next session"
              title="Skip — does not count toward accuracy, and will appear again in your next session"
            >
              <SkipForward className="mr-1 h-4 w-4" strokeWidth={1.75} />
              Skip
            </Button>
            <Button
              type="button"
              variant="rust"
              size="sm"
              onClick={() => void onDone("correct")}
              disabled={busy}
              aria-label="Mark this card complete and grade as 100%"
              title="Mark complete — grades the card as 100% correct"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" strokeWidth={1.75} />
              Mark complete
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
