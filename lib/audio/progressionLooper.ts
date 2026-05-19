"use client";

import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

/**
 * Looping chord-progression engine for the Chord Explorer.
 *
 * Differences from `playChordSequence` (used by the Track D drill cards):
 *   - Tempo-driven: each chord lasts `beatsPerChord × (60 / bpm)` seconds.
 *   - Loops by default, with an optional one-shot mode.
 *   - Fires `onStep(index)` whenever a new chord starts so the UI can
 *     highlight the currently-sounding chord in the sequence view.
 *   - Optional metronome click on every beat.
 *   - Richer voice: FM-based polysynth + lowpass + reverb, plus a
 *     dedicated bass synth one octave below the chord root.
 *   - Voice leading: upper triad chooses the inversion closest to the
 *     previous chord so the progression flows smoothly.
 *   - Sample-accurate scheduling: chord starts are placed on the Web
 *     Audio clock via `Tone.Transport.scheduleRepeat` so the loop wraps
 *     without any audible JS-thread jitter.
 */
export type ProgressionLooperOptions = {
  /** Each entry is a root-position triad `[root, third, fifth]` in MIDI. */
  chords: number[][];
  bpm: number;
  beatsPerChord: number;
  loop?: boolean;
  metronome?: boolean;
  /** Linear gain for chord triads. Default 0.22. */
  volumeLinear?: number;
  /** Linear gain for the metronome click. Default 0.35. */
  metronomeVolumeLinear?: number;
  /** Strum offset between adjacent voices in ms. Default 8. */
  strumMs?: number;
  /** Fires when a new chord starts, with its zero-based index. */
  onStep?: (chordIndex: number) => void;
};

export type ProgressionLooperHandle = {
  /** Stop playback and release audio resources. */
  cancel: () => void;
  /** Resolves when the engine stops (only one-shot mode resolves naturally). */
  promise: Promise<void>;
};

/**
 * Voice-lead `triad` so its upper-three voicing is as close as possible
 * to `prev`. The first chord in a progression has no `prev`, so it is
 * placed in root position near middle C.
 */
function voiceLead(triad: number[], prev: number[] | null): number[] {
  const sorted = [...triad].sort((a, b) => a - b);
  if (!prev) {
    let v = [...sorted];
    while (v[0]! < 57) v = v.map((n) => n + 12);
    while (v[0]! > 67) v = v.map((n) => n - 12);
    return v;
  }
  const [r, t, f] = sorted as [number, number, number];
  const candidates: number[][] = [];
  for (let shift = -24; shift <= 24; shift += 12) {
    candidates.push([r + shift, t + shift, f + shift]);
    candidates.push([t + shift, f + shift, r + 12 + shift]);
    candidates.push([f + shift, r + 12 + shift, t + 12 + shift]);
  }
  let best = candidates[0]!;
  let bestScore = Infinity;
  for (const cand of candidates) {
    const c = [...cand].sort((a, b) => a - b);
    if (c[0]! < 48 || c[2]! > 79) continue;
    let score = 0;
    for (let i = 0; i < 3; i++) score += Math.abs(c[i]! - prev[i]!);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** Bass note for a chord — root pitch-class, low octave. */
function bassNoteFor(triad: number[]): number {
  const root = Math.min(...triad);
  let b = root - 12;
  while (b < 36) b += 12;
  while (b > 52) b -= 12;
  return b;
}

/**
 * Start looping the given chord progression. Returns a handle whose
 * `cancel()` stops playback. The returned `promise` only resolves
 * naturally when `loop` is false.
 */
export function startProgressionLooper(
  options: ProgressionLooperOptions,
): ProgressionLooperHandle {
  const {
    chords,
    bpm,
    beatsPerChord,
    loop = true,
    metronome = false,
    volumeLinear = 0.22,
    metronomeVolumeLinear = 0.35,
    strumMs = 8,
    onStep,
  } = options;

  const safeChords = chords.filter((c) => c && c.length > 0);
  const secPerBeat = 60 / Math.max(40, Math.min(240, bpm));
  const beatsPer = Math.max(1, Math.min(16, beatsPerChord));
  const secPerChord = secPerBeat * beatsPer;
  const cycleSec = safeChords.length * secPerChord;

  let cancelled = false;
  let chordSynth: Tone.PolySynth | null = null;
  let bassSynth: Tone.PolySynth | null = null;
  let clickSynth: Tone.Synth | null = null;
  let filter: Tone.Filter | null = null;
  let reverb: Tone.Reverb | null = null;
  let masterGain: Tone.Gain | null = null;
  const transportEventIds: number[] = [];

  // Precompute voice-led voicings for the full progression so wrap-around
  // is identical on every loop.
  const voicings: number[][] = [];
  let prev: number[] | null = null;
  for (const c of safeChords) {
    const v = voiceLead(c, prev);
    voicings.push(v);
    prev = v;
  }

  // Track when the (one-shot) engine should naturally finish so we can
  // resolve the returned promise. Looping never resolves naturally.
  let resolveDone: ((value: void) => void) | null = null;
  const donePromise = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const resolveOnce = () => {
    resolveDone?.();
    resolveDone = null;
  };

  const cleanup = (immediate = false) => {
    if (transportEventIds.length > 0) {
      for (const id of transportEventIds) {
        try {
          Tone.Transport.clear(id);
        } catch {
          /* ignore */
        }
      }
      transportEventIds.length = 0;
    }
    try {
      chordSynth?.releaseAll();
      bassSynth?.releaseAll();
    } catch {
      /* ignore */
    }
    const dispose = () => {
      try {
        chordSynth?.dispose();
        bassSynth?.dispose();
        clickSynth?.dispose();
        filter?.dispose();
        reverb?.dispose();
        masterGain?.dispose();
      } catch {
        /* ignore */
      }
      chordSynth = null;
      bassSynth = null;
      clickSynth = null;
      filter = null;
      reverb = null;
      masterGain = null;
      resolveOnce();
    };
    if (immediate) dispose();
    else window.setTimeout(dispose, 800);
  };

  const promise = (async () => {
    if (safeChords.length === 0) {
      resolveOnce();
      return donePromise;
    }

    await Tone.start();
    if (cancelled) {
      resolveOnce();
      return donePromise;
    }

    masterGain = new Tone.Gain(
      Math.max(0.0001, Math.min(1, volumeLinear)),
    ).toDestination();

    reverb = new Tone.Reverb({ decay: 2.2, wet: 0.22 }).connect(masterGain);
    await reverb.generate();
    if (cancelled) {
      cleanup(true);
      return donePromise;
    }

    filter = new Tone.Filter({
      frequency: 2400,
      type: "lowpass",
      Q: 0.6,
      rolloff: -12,
    }).connect(reverb);

    chordSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.5,
      modulationIndex: 3,
      oscillator: { type: "sine" },
      modulation: { type: "triangle" },
      envelope: { attack: 0.04, decay: 0.35, sustain: 0.55, release: 0.9 },
      modulationEnvelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.3,
        release: 0.5,
      },
    });
    chordSynth.connect(filter);
    chordSynth.volume.value = -4;

    bassSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.03, decay: 0.4, sustain: 0.65, release: 0.7 },
    });
    bassSynth.connect(filter);
    bassSynth.volume.value = -8;

    if (metronome) {
      clickSynth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
      }).toDestination();
      clickSynth.volume.value = Tone.gainToDb(
        Math.max(0.0001, Math.min(1, metronomeVolumeLinear)),
      );
    }

    // Audible window for each chord — stop just shy of the next attack so
    // envelope tails overlap a touch (smooth transition) without piling up.
    const audibleSec = Math.max(0.25, secPerChord - 0.04);

    // Place a single cycle of chords + clicks starting at `cycleStartTime`
    // (a Web Audio clock time). Everything is scheduled ahead, so chord
    // transitions happen with sample accuracy.
    const scheduleCycleAt = (cycleStartTime: number) => {
      for (let i = 0; i < safeChords.length; i++) {
        const t = cycleStartTime + i * secPerChord;
        const upper = voicings[i]!;
        const bass = bassNoteFor(safeChords[i]!);

        upper.forEach((midi, j) => {
          if (!chordSynth) return;
          chordSynth.triggerAttackRelease(
            midiToFrequency(midi),
            audibleSec,
            t + (j * strumMs) / 1000,
          );
        });
        if (bassSynth) {
          bassSynth.triggerAttackRelease(
            midiToFrequency(bass),
            audibleSec,
            t,
          );
        }
        if (clickSynth) {
          for (let b = 0; b < beatsPer; b++) {
            clickSynth.triggerAttackRelease(
              b === 0 ? 1500 : 1100,
              0.03,
              t + b * secPerBeat,
            );
          }
        }
        const idx = i;
        Tone.Draw.schedule(() => {
          if (!cancelled) onStep?.(idx);
        }, t);
      }
    };

    // We use the global Tone.Transport as our master clock but only
    // touch the event IDs we create, never `.cancel()` globally.
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
    // Anchor everything to a slight look-ahead from "now" so the first
    // chord doesn't fight with the audio context warm-up.
    const startSec = Tone.Transport.seconds + 0.12;

    transportEventIds.push(
      Tone.Transport.schedule((time) => {
        scheduleCycleAt(time);
      }, startSec),
    );

    if (loop) {
      transportEventIds.push(
        Tone.Transport.scheduleRepeat(
          (time) => {
            scheduleCycleAt(time);
          },
          cycleSec,
          startSec + cycleSec,
        ),
      );
    } else {
      // For one-shot playback, resolve the promise after the last chord's
      // audible window finishes.
      transportEventIds.push(
        Tone.Transport.schedule(() => {
          if (!cancelled) cleanup();
        }, startSec + cycleSec),
      );
    }

    return donePromise;
  })();

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cleanup();
    },
    promise,
  };
}
