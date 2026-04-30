"use client";

import { useEffect, useState } from "react";

import type { Streak, TrackId } from "@/lib/domain/types";
import { getStreak, getTrackProgress } from "@/lib/db/index";
import { buildNewSession } from "@/lib/session-builder/buildSession";
import { getLevel } from "@/lib/curriculum/levels";
import {
  currentLevelIdForTrack,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";

type CurrentByTrack = Partial<Record<TrackId, string | null>>;

export function TodayStrip() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [counts, setCounts] = useState<{ full: number; quick: number } | null>(
    null,
  );
  const [current, setCurrent] = useState<CurrentByTrack>({});

  useEffect(() => {
    const loadStreak = () => void getStreak().then(setStreak);
    const loadCurrent = () => {
      void Promise.all([
        getTrackProgress("A"),
        getTrackProgress("B"),
        getTrackProgress("C"),
        getTrackProgress("D"),
        getTrackProgress("E"),
      ]).then(([a, b, c, d, e]) => {
        const byTrack: ProgressByTrack = { A: a, B: b, C: c, D: d, E: e };
        const ids: TrackId[] = ["A", "B", "C", "D", "E"];
        const next: CurrentByTrack = {};
        for (const t of ids) {
          if (!isTrackEntered(t, byTrack)) {
            next[t] = null;
            continue;
          }
          next[t] = currentLevelIdForTrack(t, byTrack);
        }
        setCurrent(next);
      });
    };
    loadStreak();
    loadCurrent();
    void Promise.all([
      buildNewSession({ quick: false }),
      buildNewSession({ quick: true }),
    ]).then(([full, q]) => {
      setCounts({ full: full.cards.length, quick: q.cards.length });
    });
    window.addEventListener("tonic-streak-updated", loadStreak);
    window.addEventListener("tonic-track-progress-updated", loadCurrent);
    return () => {
      window.removeEventListener("tonic-streak-updated", loadStreak);
      window.removeEventListener("tonic-track-progress-updated", loadCurrent);
    };
  }, []);

  const trackLine = (t: TrackId) => {
    const id = current[t];
    if (id === null) return null;
    if (!id) return null;
    const lvl = getLevel(id);
    if (!lvl) return null;
    return `${t}·${lvl.level} · ${lvl.name}`;
  };

  const lineA = trackLine("A");
  const lineB = trackLine("B");
  const lineC = trackLine("C");
  const lineD = trackLine("D");
  const lineE = trackLine("E");

  if (
    !streak &&
    counts === null &&
    !lineA &&
    !lineB &&
    !lineC &&
    !lineD &&
    !lineE
  ) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-paper-deep pt-4 font-mono text-[11px] uppercase tracking-wider text-paper-deep">
      {streak ? (
        <span>
          Streak:{" "}
          <span className="text-gold-soft">{streak.currentStreak}</span>
          {streak.longestStreak > 0 ? (
            <span className="text-paper-deep">
              {" "}
              · best {streak.longestStreak}
            </span>
          ) : null}
        </span>
      ) : null}
      {counts ? (
        <span>
          Full session: {counts.full} cards · Quick: {counts.quick}
        </span>
      ) : null}
      {lineA ? (
        <span>
          Now: <span className="text-gold-soft">{lineA}</span>
        </span>
      ) : null}
      {lineB ? <span>{lineB}</span> : null}
      {lineC ? <span>{lineC}</span> : null}
      {lineD ? <span>{lineD}</span> : null}
      {lineE ? <span>{lineE}</span> : null}
    </div>
  );
}
