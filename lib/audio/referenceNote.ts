import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

/**
 * Short synthesized reference pitch for “hear this note first” cards.
 * Uses a sine-like timbre; swap for samples later if you prefer.
 */
export async function playReferenceMidiNote(
  midi: number,
  options?: {
    durationSec?: number;
    /** Linear gain 0–1 before conversion to dB. */
    volumeLinear?: number;
  },
): Promise<void> {
  const durationSec = options?.durationSec ?? 0.85;
  const volumeLinear = Math.max(
    0.0001,
    Math.min(1, options?.volumeLinear ?? 0.22),
  );

  await Tone.start();
  const freq = midiToFrequency(midi);
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.015,
      decay: 0.08,
      sustain: 0.4,
      release: 0.4,
    },
  }).toDestination();
  synth.volume.value = Tone.gainToDb(volumeLinear);
  synth.triggerAttackRelease(freq, durationSec);

  const releaseMs = 450;
  await new Promise((r) =>
    setTimeout(r, durationSec * 1000 + releaseMs),
  );
  synth.dispose();
}
