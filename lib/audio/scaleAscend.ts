import type { KeyMode } from "@/lib/scale/degreeToMidi";
import { midiForScaleDegree } from "@/lib/scale/degreeToMidi";

import { playReferenceMidiNote } from "@/lib/audio/referenceNote";

/**
 * Play the eight notes C…C (or tonic through octave tonic): seven scale steps plus return to tonic up an octave.
 */
export async function playDiatonicScaleAscending(
  tonicMidi: number,
  mode: KeyMode,
  options?: {
    noteDurationSec?: number;
    gapMs?: number;
    volumeLinear?: number;
  },
): Promise<void> {
  const noteDurationSec = options?.noteDurationSec ?? 0.48;
  const gapMs = options?.gapMs ?? 40;
  const volumeLinear = options?.volumeLinear ?? 0.35;

  const root = Math.round(tonicMidi);
  const sequence: number[] = [];
  let prev = -Infinity;
  for (let degree = 1; degree <= 7; degree++) {
    let midi = midiForScaleDegree(tonicMidi, mode, degree);
    while (midi <= prev) midi += 12;
    sequence.push(midi);
    prev = midi;
  }
  const octaveTonic = root + 12;
  sequence.push(octaveTonic > prev ? octaveTonic : octaveTonic + 12);

  for (const midi of sequence) {
    await playReferenceMidiNote(midi, {
      durationSec: noteDurationSec,
      volumeLinear,
    });
    await new Promise((r) => setTimeout(r, gapMs));
  }
}
