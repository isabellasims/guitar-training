"use client";

import { useEffect, useState } from "react";

import type { Streak } from "@/lib/domain/types";
import { getStreak } from "@/lib/db/index";
import { buildNewSession } from "@/lib/session-builder/buildSession";

export function TodayStrip() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [counts, setCounts] = useState<{ full: number; quick: number } | null>(
    null,
  );

  useEffect(() => {
    const load = () => void getStreak().then(setStreak);
    load();
    void Promise.all([
      buildNewSession({ quick: false }),
      buildNewSession({ quick: true }),
    ]).then(([full, q]) => {
      setCounts({ full: full.cards.length, quick: q.cards.length });
    });
    window.addEventListener("tonic-streak-updated", load);
    return () => window.removeEventListener("tonic-streak-updated", load);
  }, []);

  if (!streak && counts === null) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-4 border-t border-paper-deep pt-4 font-mono text-[11px] uppercase tracking-wider text-paper-deep">
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
          Full session: {counts.full} cards · Quick: {counts.quick} card
        </span>
      ) : null}
    </div>
  );
}
