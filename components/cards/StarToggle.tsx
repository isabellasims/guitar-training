"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cardKey,
  getCustomCard,
  isStarred,
  putCustomCard,
  starCard,
  unstarCard,
} from "@/lib/db/index";

/**
 * Star/save toggle for a card. Persists to Dexie (`starredCards` table).
 * When the user stars a card, we also write a corresponding `customCards`
 * row keyed by the same `cardKey` so the starred card shows up in the
 * "saved" section of the flashcard library — they can review it as a
 * simple front/back card later, even if the level it came from gets
 * renumbered or its content changes.
 */
export function StarToggle({
  trackId,
  nodeId,
  templateId,
  title,
  summary,
  snapshot,
  className,
}: {
  trackId?: string;
  nodeId: string;
  templateId: string;
  /** Human-readable title to write into the saved flashcard. */
  title: string;
  /** Short description / answer copy for the flashcard back. */
  summary?: string;
  /** Optional opaque card-params snapshot stored alongside the star. */
  snapshot?: unknown;
  className?: string;
}) {
  const key = cardKey({ trackId, nodeId, templateId });
  const [starred, setStarred] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isStarred(key).then((b) => {
      if (!cancelled) setStarred(b);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (starred) {
        await unstarCard(key);
        setStarred(false);
      } else {
        const now = new Date().toISOString();
        await starCard({
          cardKey: key,
          trackId,
          nodeId,
          templateId,
          snapshot,
          starredAt: now,
        });
        const existing = await getCustomCard(`star:${key}`);
        if (!existing) {
          await putCustomCard({
            id: `star:${key}`,
            title,
            front: title,
            back: summary ?? `${trackId ?? "?"}·${nodeId} · ${templateId}`,
            tags: ["starred", trackId ?? "?", nodeId, templateId],
            createdAt: now,
            updatedAt: now,
          });
        }
        setStarred(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => void toggle()}
      disabled={starred === null || busy}
      aria-label={starred ? "Unstar this card" : "Star this card"}
      className={cn(
        starred ? "text-gold-soft" : "text-ink-mute",
        "hover:text-gold-soft",
        className,
      )}
    >
      <Star
        className="h-4 w-4"
        fill={starred ? "currentColor" : "none"}
        strokeWidth={starred ? 1.5 : 2}
      />
    </Button>
  );
}
