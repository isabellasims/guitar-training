"use client";

import { useState } from "react";

import type { ConceptExplainerParams } from "@/lib/cards/types";
import { playDiatonicScaleAscending } from "@/lib/audio/scaleAscend";
import { withQuieterDroneForScaleDemo } from "@/lib/audio/drone";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import { playChordSequence } from "@/lib/audio/chordSynth";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function ConceptExplainerCard({
  params,
  onContinue,
}: {
  params: ConceptExplainerParams;
  onContinue: () => void;
}) {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const leftHanded = useSettingsStore((s) => s.settings.leftHanded);
  const vol = useSettingsStore((s) => s.settings.droneVolume);
  const [scaleBusy, setScaleBusy] = useState(false);
  const [customBusy, setCustomBusy] = useState(false);
  const [progBusy, setProgBusy] = useState(false);

  const hearCustom = params.customListen
    ? async () => {
        const seq = params.customListen!;
        setCustomBusy(true);
        try {
          const noteDur = seq.noteDurationSec ?? 0.6;
          const gap = seq.gapMs ?? 100;
          await withQuieterDroneForScaleDemo(0.26, async () => {
            for (const m of seq.sequence) {
              await playReferenceMidiNote(m, {
                durationSec: noteDur,
                volumeLinear: 0.45,
              });
              await new Promise((r) => setTimeout(r, gap));
            }
          });
        } finally {
          setCustomBusy(false);
        }
      }
    : null;

  const hearProgression = params.chordProgressionListen
    ? async () => {
        const cfg = params.chordProgressionListen!;
        setProgBusy(true);
        try {
          await withQuieterDroneForScaleDemo(0.18, async () => {
            const handle = playChordSequence(cfg.chords, {
              chordDurationSec: cfg.chordDurationSec ?? 1.4,
            });
            await handle.promise;
          });
        } finally {
          setProgBusy(false);
        }
      }
    : null;

  const hearScale =
    params.scaleListen != null
      ? async () => {
          setScaleBusy(true);
          try {
            const droneLin = Math.max(0.08, vol);
            const scaleLin = Math.min(
              0.96,
              Math.max(droneLin + 0.34, droneLin * 2.15),
            );
            await withQuieterDroneForScaleDemo(0.26, async () => {
              await playDiatonicScaleAscending(
                params.scaleListen!.tonicMidi,
                params.scaleListen!.mode,
                { volumeLinear: scaleLin },
              );
            });
          } finally {
            setScaleBusy(false);
          }
        }
      : null;

  const hasExtras =
    (params.terms?.length ?? 0) > 0 ||
    (params.droneTonicMidi != null && params.droneKeyLabel != null) ||
    hearScale != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.title}</CardTitle>
        <CardDescription>
          {hasExtras
            ? "Listen, read definitions, then continue."
            : "Read, then continue."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.terms?.length ? (
          <dl className="space-y-3 rounded-md border border-rule bg-paper-soft px-3 py-3">
            {params.terms.map((t) => (
              <div key={t.term}>
                <dt className="font-medium text-ink">{t.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {t.definition}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {params.fretboardShape ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            {params.fretboardShape.title ? (
              <p className="mb-2 text-xs text-ink-mute">
                {params.fretboardShape.title}
              </p>
            ) : null}
            <Fretboard
              maxFret={params.fretboardShape.maxFret ?? 8}
              highlights={params.fretboardShape.steps}
              showNoteLabels
              leftHanded={leftHanded}
              aria-label="Shape diagram"
            />
          </div>
        ) : null}

        {params.droneTonicMidi != null && params.droneKeyLabel != null ? (
          <LessonDroneToggle
            tonicMidi={params.droneTonicMidi}
            keyLabel={params.droneKeyLabel}
          />
        ) : null}

        {hearScale && hydrated ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <p className="mb-2 text-xs text-ink-mute">
              Eight notes: up the scale to the next tonic. If the drone is on, it
              dips so the scale reads louder.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={scaleBusy}
              onClick={() => void hearScale()}
            >
              {scaleBusy ? "Playing…" : "Hear the scale"}
            </Button>
          </div>
        ) : null}

        {hearCustom ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={customBusy}
              onClick={() => void hearCustom()}
            >
              {customBusy ? "Playing…" : params.customListen!.label}
            </Button>
          </div>
        ) : null}

        {hearProgression ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={progBusy}
              onClick={() => void hearProgression()}
            >
              {progBusy
                ? "Playing…"
                : params.chordProgressionListen!.label}
            </Button>
          </div>
        ) : null}

        <div className="space-y-3 text-base leading-relaxed text-ink-soft">
          {params.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <Button type="button" variant="rust" onClick={onContinue}>
          {params.continueLabel ?? "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
