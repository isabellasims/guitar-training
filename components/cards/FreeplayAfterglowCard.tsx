"use client";

import type { FreeplayAfterglowParams } from "@/lib/cards/types";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FreeplayAfterglowCard({
  params,
  onContinue,
}: {
  params: FreeplayAfterglowParams;
  onContinue: () => void;
}) {
  const seconds = params.durationSec ?? 90;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Afterglow — freeplay</CardTitle>
        <CardDescription>
          ~{seconds} seconds of drone-only freeplay. Not graded — just play.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.prompt ? (
          <p className="text-sm leading-relaxed text-ink-soft">
            {params.prompt}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">
            Phrase whatever feels good over the drone. Land on home a few times
            before you stop.
          </p>
        )}
        <LessonDroneToggle
          tonicMidi={params.tonicMidi}
          keyLabel={params.keyLabel}
        />
        <Button type="button" variant="rust" onClick={onContinue}>
          Done — finish session
        </Button>
      </CardContent>
    </Card>
  );
}
