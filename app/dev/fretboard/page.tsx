"use client";

import { useState } from "react";

import { Fretboard } from "@/components/fretboard/Fretboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { midiToHashPitchLabel, midiToOctave } from "@/lib/audio/noteUtils";
import {
  midiAtPosition,
  OPEN_STRING_LABELS,
  ordinalFretPhrase,
  type FretPosition,
} from "@/lib/fretboard/model";
import { useSettingsStore } from "@/lib/store/settingsStore";

export default function FretboardDevPage() {
  const { settings, hydrated, update } = useSettingsStore();
  const [labels, setLabels] = useState(false);
  const [picked, setPicked] = useState<{ s: number; f: number } | null>({
    s: 0,
    f: 5,
  });

  const leftHanded = hydrated && settings.leftHanded;

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Dev
        </p>
        <h1 className="font-display text-3xl text-ink">Fretboard</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Open strings are labeled at the nut. Toggle extra labels on fretted
          notes. Tap to select.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            High e at the top. Highlights follow Settings → left-handed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="labels"
                checked={labels}
                onCheckedChange={setLabels}
              />
              <label htmlFor="labels" className="text-sm text-ink-soft">
                Fretted note labels
              </label>
            </div>
            {hydrated ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="lh"
                  checked={settings.leftHanded}
                  onCheckedChange={(v) => void update({ leftHanded: v })}
                />
                <label htmlFor="lh" className="text-sm text-ink-soft">
                  Left-handed (mirror)
                </label>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPicked(null)}
            >
              Clear highlight
            </Button>
          </div>

          <Fretboard
            highlights={
              picked
                ? [
                    {
                      stringIndex: picked.s as FretPosition["stringIndex"],
                      fret: picked.f,
                    },
                  ]
                : []
            }
            showNoteLabels={labels}
            leftHanded={!!leftHanded}
            onFretTap={(s, f) => setPicked({ s, f })}
            className="max-h-[min(70vh,520px)]"
          />

          {picked ? (
            <SelectionLine s={picked.s} f={picked.f} />
          ) : (
            <p className="text-sm text-ink-mute">Tap the neck to select a fret.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function SelectionLine({ s, f }: { s: number; f: number }) {
  const openName = OPEN_STRING_LABELS[s];
  if (openName === undefined) return null;
  const midi = midiAtPosition(s, f);
  const pitch = midiToHashPitchLabel(midi);
  const oct = midiToOctave(midi);
  const fretPart = ordinalFretPhrase(f);

  return (
    <p className="text-sm text-ink-soft">
      <span className="text-ink">
        {openName} string, {fretPart}
      </span>
      {" — "}
      <strong className="font-semibold text-ink">{pitch}</strong>
      {` (octave ${oct})`}
    </p>
  );
}
