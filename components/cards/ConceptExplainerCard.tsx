"use client";

import { useState } from "react";

import type { ConceptExplainerParams } from "@/lib/cards/types";
import { playDiatonicScaleAscending } from "@/lib/audio/scaleAscend";
import { withQuieterDroneForScaleDemo } from "@/lib/audio/drone";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
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
  const vol = useSettingsStore((s) => s.settings.droneVolume);
  const [scaleBusy, setScaleBusy] = useState(false);

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

        <div className="space-y-3 text-base leading-relaxed text-ink-soft">
          {params.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <Button type="button" variant="rust" onClick={onContinue}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
