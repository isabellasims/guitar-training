"use client";

import Link from "next/link";
import { useState } from "react";

import { startDrone, stopDrone } from "@/lib/audio/drone";
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

/** A4 reference for a quick drone test. */
const DEFAULT_HZ = 440;

export default function LibraryPage() {
  const [hz, setHz] = useState(String(DEFAULT_HZ));
  const [on, setOn] = useState(false);

  const toggle = async () => {
    if (on) {
      stopDrone();
      setOn(false);
      return;
    }
    const f = parseFloat(hz);
    if (!Number.isFinite(f) || f <= 0) return;
    await startDrone(f, 0.15);
    setOn(true);
  };

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Library
        </p>
        <h1 className="font-display text-3xl text-ink">Audio lab</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Drones, reference audio, and free play. Pre-rendered drone MP3s will
          replace this sine stub.
        </p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Test drone</CardTitle>
            <CardDescription>
              Sine wave via Tone.js — tap Start on your phone to unlock audio.
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
                disabled={on}
              />
            </div>
            <Button type="button" variant={on ? "outline" : "rust"} onClick={() => void toggle()}>
              {on ? "Stop" : "Start"}
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
            <CardTitle>Pitch lab</CardTitle>
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
