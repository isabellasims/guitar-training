"use client";

import Link from "next/link";
import { useState } from "react";

import { startDrone, startDroneMidi, stopDrone } from "@/lib/audio/drone";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import {
  midiToHashPitchLabel,
  midiToPlainEnglishNote,
} from "@/lib/audio/noteUtils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { cn } from "@/lib/utils";

/** Pitch classes 0–11 starting at C (same MIDI mapping as middle-C octave). */
const TONIC_PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/** A4 reference for a quick drone test. */
const DEFAULT_HZ = 440;
const DEMO_REF_MIDI = 69;

export default function LibraryPage() {
  const settings = useSettingsStore((s) => s.settings);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const [hz, setHz] = useState(String(DEFAULT_HZ));
  const [hzOn, setHzOn] = useState(false);
  const [tonicPc, setTonicPc] = useState<number>(0);
  const [keyMode, setKeyMode] = useState<"major" | "minor">("major");
  const [keyDroneOn, setKeyDroneOn] = useState(false);
  const [playingRef, setPlayingRef] = useState(false);

  const vol = hydrated ? settings.droneVolume : 0.15;

  const tonicMidi = 60 + ((tonicPc % 12) + 12) % 12;
  const tonicLabel = midiToHashPitchLabel(tonicMidi);
  const keyDroneLabel =
    keyMode === "major" ? `${tonicLabel} major` : `${tonicLabel} minor`;

  const toggleKeyDrone = async () => {
    if (keyDroneOn) {
      stopDrone();
      setKeyDroneOn(false);
      setHzOn(false);
      return;
    }
    await startDroneMidi(tonicMidi, vol);
    setKeyDroneOn(true);
    setHzOn(false);
  };

  const toggleHzDrone = async () => {
    if (hzOn) {
      stopDrone();
      setHzOn(false);
      setKeyDroneOn(false);
      return;
    }
    const f = parseFloat(hz);
    if (!Number.isFinite(f) || f <= 0) return;
    await startDrone(f, vol);
    setHzOn(true);
    setKeyDroneOn(false);
  };

  const hearReference = async () => {
    setPlayingRef(true);
    try {
      await playReferenceMidiNote(DEMO_REF_MIDI, { volumeLinear: vol });
    } finally {
      setPlayingRef(false);
    }
  };

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Library
        </p>
        <h1 className="font-display text-3xl text-ink">Audio lab</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Drones, reference audio, and free play. Pre-rendered drone MP3s can
          land in <span className="font-mono text-ink">public/audio/drones/</span>{" "}
          later without changing card APIs.
        </p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Key drone</CardTitle>
            <CardDescription>
              Tonic sine pedal — pick a key, no Hz math. Same engine as lesson
              cards; volume follows Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TONIC_PCS.map((pc) => {
                const midi = 60 + pc;
                const label = midiToHashPitchLabel(midi);
                const sel = tonicPc === pc;
                return (
                  <Button
                    key={pc}
                    type="button"
                    size="sm"
                    variant={sel ? "rust" : "outline"}
                    disabled={keyDroneOn}
                    className={cn("min-w-[2.75rem] font-mono", sel && "ring-2 ring-gold-soft")}
                    onClick={() => setTonicPc(pc)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={keyMode === "major" ? "default" : "outline"}
                disabled={keyDroneOn}
                onClick={() => setKeyMode("major")}
              >
                Major
              </Button>
              <Button
                type="button"
                size="sm"
                variant={keyMode === "minor" ? "default" : "outline"}
                disabled={keyDroneOn}
                onClick={() => setKeyMode("minor")}
              >
                Minor
              </Button>
            </div>
            <p className="text-xs text-ink-mute">
              Mode labels the practice context; the drone is still the tonic pitch
              ({midiToPlainEnglishNote(tonicMidi)}).
            </p>
            <Button
              type="button"
              variant={keyDroneOn ? "outline" : "rust"}
              onClick={() => void toggleKeyDrone()}
            >
              {keyDroneOn ? "Stop drone" : `Play ${keyDroneLabel} drone`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced — frequency (Hz)</CardTitle>
            <CardDescription>
              For experiments or matching an external tuner. Stops the key drone
              when started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hz">Frequency (Hz)</Label>
              <Input
                id="hz"
                inputMode="decimal"
                value={hz}
                onChange={(e) => setHz(e.target.value)}
                disabled={hzOn}
              />
            </div>
            <Button
              type="button"
              variant={hzOn ? "outline" : "rust"}
              onClick={() => void toggleHzDrone()}
            >
              {hzOn ? "Stop" : "Start Hz drone"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference note</CardTitle>
            <CardDescription>
              {midiToPlainEnglishNote(DEMO_REF_MIDI)} — same target as the pitch
              lab. Use for “listen, then play” card flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              disabled={playingRef}
              onClick={() => void hearReference()}
            >
              {playingRef ? "Playing…" : "Play reference"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual</CardTitle>
            <CardDescription>Full written practice plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/guitar-practice-plan.html" target="_blank" rel="noreferrer">
                Open manual
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fretboard</CardTitle>
            <CardDescription>
              Interactive neck preview — tap frets, optional labels, respects
              left-handed in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="px-0 text-rust">
              <Link href="/dev/fretboard">Open fretboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pitch lab</CardTitle>
            <CardDescription>
              Try with the drone running — it ducks while listening.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="px-0 text-rust">
              <Link href="/dev/pitch-test">Open pitch lab</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
