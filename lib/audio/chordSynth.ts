"use client";

import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

/**
 * Light-weight chord-progression synthesizer for Track D recognition cards.
 * V1 uses a polyphonic sine-triangle blend so progressions are clearly audible
 * without sampled instruments. Each chord is a short polyphonic strum.
 */
export type ChordSynthHandle = {
  cancel: () => void;
  /** Resolves once the full progression has finished (or was cancelled). */
  promise: Promise<void>;
};

export function playChordSequence(
  chords: number[][],
  options?: {
    /** Seconds per chord (note attack to release). Default 1.4s. */
    chordDurationSec?: number;
    /** Gap between chords. Default 80ms. */
    gapMs?: number;
    /** Linear gain. Default 0.18. */
    volumeLinear?: number;
    /** Strum offset between adjacent voices. Default 12ms. */
    strumMs?: number;
  },
): ChordSynthHandle {
  const chordDurationSec = options?.chordDurationSec ?? 1.4;
  const gapMs = options?.gapMs ?? 80;
  const volumeLinear = Math.max(
    0.0001,
    Math.min(1, options?.volumeLinear ?? 0.18),
  );
  const strumMs = Math.max(0, options?.strumMs ?? 12);

  let cancelled = false;
  const polySynths: Tone.PolySynth[] = [];

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      // best-effort cancel: rely on cancelled flag in the loop
      void t;
    });

  const promise = (async () => {
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.45 },
    }).toDestination();
    synth.volume.value = Tone.gainToDb(volumeLinear);
    polySynths.push(synth);

    for (const chord of chords) {
      if (cancelled) break;
      const sortedAsc = [...chord].sort((a, b) => a - b);
      sortedAsc.forEach((midi, i) => {
        if (cancelled) return;
        const f = midiToFrequency(midi);
        synth.triggerAttackRelease(
          f,
          chordDurationSec,
          Tone.now() + (i * strumMs) / 1000,
        );
      });
      await sleep(chordDurationSec * 1000 + gapMs);
    }

    synth.releaseAll();
    await sleep(450);
    synth.dispose();
  })();

  return {
    cancel: () => {
      cancelled = true;
      polySynths.forEach((s) => {
        try {
          s.releaseAll();
          s.dispose();
        } catch {
          // ignore disposal errors
        }
      });
    },
    promise,
  };
}

/** Standard CAGED-style triad voicings (close position, rooted near middle C). */
export function majorTriadVoicing(rootMidi: number): number[] {
  return [rootMidi, rootMidi + 4, rootMidi + 7];
}
export function minorTriadVoicing(rootMidi: number): number[] {
  return [rootMidi, rootMidi + 3, rootMidi + 7];
}
