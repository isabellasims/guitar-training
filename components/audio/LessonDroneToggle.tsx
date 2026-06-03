"use client";

import { useEffect, useState } from "react";

import {
  applyDroneDuckState,
  isPitchListenDucking,
  startDroneMidi,
  stopDrone,
} from "@/lib/audio/drone";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store/settingsStore";

type Props = {
  tonicMidi: number;
  /** Shown on the button, e.g. "C major" — no Hz. */
  keyLabel: string;
  /** Mic is open on a pitch card — drone output stays muted for detection. */
  micListening?: boolean;
};

/**
 * In-card tonic drone (sine) so learners never open Library or think in Hz.
 * Volume follows Settings → drone volume; ducks while pitch mic listens.
 */
export function LessonDroneToggle({
  tonicMidi,
  keyLabel,
  micListening = false,
}: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [playing, setPlaying] = useState(false);

  const vol = hydrated ? settings.droneVolume : 0.15;

  useEffect(() => {
    return () => {
      stopDrone();
    };
  }, []);

  const toggle = async () => {
    if (playing) {
      stopDrone();
      setPlaying(false);
      return;
    }
    await startDroneMidi(tonicMidi, vol);
    applyDroneDuckState();
    setPlaying(true);
  };

  if (!hydrated) return null;

  return (
    <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
      <p className="mb-2 text-xs text-ink-mute">
        Hear the tonic for this exercise — tap again to stop. Volume is in
        Settings.
        {micListening || isPitchListenDucking() ? (
          <span className="mt-1 block text-rust">
            Drone is muted while the mic is on so pitch detection hears your
            guitar, not the speaker.
          </span>
        ) : null}
      </p>
      <Button
        type="button"
        variant={playing ? "outline" : "rust"}
        onClick={() => void toggle()}
      >
        {playing ? "Stop drone" : `Play ${keyLabel} drone`}
      </Button>
    </div>
  );
}
