"use client";

import type { DroneListenWarmupParams } from "@/lib/cards/types";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DroneListenWarmupCard({
  params,
  onContinue,
}: {
  params: DroneListenWarmupParams;
  onContinue: () => void;
}) {
  const seconds = params.durationSec ?? 30;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Warm up — sit with the tonic</CardTitle>
        <CardDescription>
          About {seconds} seconds of just listening before you play. Re-anchor
          home before the session starts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LessonDroneToggle
          tonicMidi={params.tonicMidi}
          keyLabel={params.keyLabel}
        />
        <p className="text-sm leading-relaxed text-ink-soft">
          No pitch tracking, no grading. Hum along quietly if it helps.
        </p>
        <Button type="button" variant="rust" onClick={onContinue}>
          I’m warm — continue
        </Button>
      </CardContent>
    </Card>
  );
}
