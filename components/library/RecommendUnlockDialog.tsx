"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Confirmation dialog shown when the user opens a library entry that hasn't
 * been unlocked through the curriculum yet. They can dismiss or proceed —
 * the library is for free practice, the lock is just a recommendation.
 */
export function RecommendUnlockDialog({
  open,
  title,
  recommendation,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  /** e.g. "We recommend finishing Track A · Level 5 first." */
  recommendation: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    // Prevent the page behind the modal from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommend-unlock-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-rule bg-paper p-6 shadow-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
          Not unlocked yet
        </p>
        <h2
          id="recommend-unlock-title"
          className="mt-1 font-display text-2xl text-ink"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm text-ink-soft">{recommendation}</p>
        <p className="mt-2 text-sm text-ink-soft">
          The library is open practice — you can drill this anyway if you want.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Go back
          </Button>
          <Button
            type="button"
            variant="rust"
            ref={confirmRef}
            onClick={onConfirm}
          >
            Practice anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
