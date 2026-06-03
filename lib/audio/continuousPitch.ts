"use client";

import { useEffect, useRef, useState } from "react";

import { frequencyToMidi } from "@/lib/audio/noteUtils";
import {
  DRONE_DUCK_LINEAR_DEFAULT,
  DRONE_DUCK_LINEAR_VS_TONIC,
  beginPitchMicDuck,
  endPitchMicDuck,
  updatePitchMicDuckLevel,
} from "@/lib/audio/drone";
import type { PitchDetector as PitchDetectorClass } from "pitchy";

export type ContinuousPitchOptions = {
  /** Master toggle — when false, the mic is closed. */
  enabled: boolean;
  /**
   * Current target MIDI; set null to pause matching while keeping mic open.
   * Only the *pitch class* (target % 12) is compared — the user can play any
   * octave of the target on any string and it will register as correct.
   */
  targetMidi: number | null;
  /**
   * Bump whenever the logical prompt advances even if `targetMidi` is
   * unchanged (e.g. two consecutive steps that both ask for the same pitch
   * class). Drives internal debounce resets.
   */
  targetGeneration?: number;
  /** Fired exactly once per `targetMidi` value, when a stable match is heard. */
  onMatch: (heardMidi: number) => void;
  /**
   * Fired when a clean note is heard whose pitch class is *not* the target's
   * pitch class — i.e. the user hit a wrong note. Used by shape-recall to
   * restart on error. Debounced to once per attack.
   */
  onWrongPitch?: (heardMidi: number) => void;
  /**
   * Default 0.72 — clean guitar attacks score 0.9+, ambient noise scores
   * lower. Higher values reject room noise, fans, sympathetic ringing.
   * Fretted notes (especially mid-fret positions like F# at fret 4) ring
   * less cleanly than open strings and routinely drop into the 0.75-0.85
   * band; some quieter / muted attacks land even lower. We trade a small
   * amount of false-positive risk for fewer "had to play it three times
   * before it registered" complaints during scale practice.
   */
  clarityMin?: number;
  /**
   * Default ±35 cents from the nearest equal-tempered note. Clean notes
   * sit within a few cents of the grid; noise/partials tend to land
   * mid-semitone (≈50 cents fractional). Real guitars have intonation
   * drift of 15-30 cents at higher frets, so 20 was rejecting in-tune
   * playing — bumped to 35 to accommodate normal fretted tuning while
   * still filtering true mid-semitone garbage.
   */
  toleranceCents?: number;
  /**
   * Default 0.01 — minimum input RMS (linear amplitude). Below this we
   * treat it as silence regardless of what Pitchy reports, so room tone
   * can't trip a match. Set 0 to disable.
   */
  rmsMin?: number;
  /**
   * Default 1 — one clean frame is enough so scale runs feel immediate.
   * Wrong-partial frames rarely sustain a full 4096-sample window as both
   * in-tune and correct pitch class.
   */
  consecutiveFramesNeeded?: number;
  /**
   * "same-pc" (default) — only require a fresh release when the next target
   * shares a pitch class with the previous (otherwise sustain re-triggers).
   *
   * "always" — every target change requires a release before matching. Use
   * this on cards where a drone tonic (or sympathetic ringing) could
   * provide constant evidence of the next target *before the user plays*.
   * Drone-degree-play and any scale-step prompt where the next target =
   * drone pitch class falls in this bucket; without it, the listener
   * registers the drone itself and the prompt "passes" instantly.
   */
  requireFreshAttack?: "same-pc" | "always";
  /**
   * Delay in ms before the listener starts evaluating frames after the
   * target changes. Gives the mic/audio graph a moment to settle and stops
   * the very-first-frame from latching onto residual sound from the
   * previous prompt. Default 0.
   */
  armingDelayMs?: number;
  /**
   * When set, duck the drone extra hard whenever the target shares this pitch
   * class (playing the tonic over a tonic drone otherwise false-positives).
   */
  droneTonicPitchClass?: number;
};

export type ContinuousPitchState = {
  phase: "idle" | "requesting" | "listening" | "error";
  error: string | null;
  /** Most recent detected midi (for display). */
  liveMidi: number | null;
  liveClarity: number | null;
};

/**
 * Open the mic ONCE for the lifetime of the card (while `enabled`),
 * and continuously fire `onMatch` whenever a target pitch is held cleanly.
 *
 * `targetMidi` can change between rounds: matching state resets each time
 * the target changes, so the user just plays the next note without
 * touching any control.
 */
function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / buf.length);
}

export function useContinuousPitchListener(
  opts: ContinuousPitchOptions,
): ContinuousPitchState {
  const clarityMin = opts.clarityMin ?? 0.72;
  const toleranceCents = opts.toleranceCents ?? 35;
  const rmsMin = opts.rmsMin ?? 0.01;
  const framesNeeded = opts.consecutiveFramesNeeded ?? 1;
  const requireFreshAttackMode = opts.requireFreshAttack ?? "same-pc";
  const armingDelayMs = opts.armingDelayMs ?? 0;

  const [phase, setPhase] = useState<ContinuousPitchState["phase"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [liveClarity, setLiveClarity] = useState<number | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<PitchDetectorClass<Float32Array> | null>(null);

  // Latest values exposed to the rAF loop without forcing reopens.
  const targetRef = useRef<number | null>(opts.targetMidi);
  const onMatchRef = useRef(opts.onMatch);
  const onWrongRef = useRef(opts.onWrongPitch);
  const matchedTargetRef = useRef<number | null>(null);
  const consecutiveRef = useRef(0);
  /** Pitch class we already counted as "wrong" for the current note attack. */
  const wrongClassFiredRef = useRef<number | null>(null);
  /** Frames of silence/noise needed before we'll register a fresh attack. */
  const silenceFramesRef = useRef(0);
  /**
   * After every match (and on every target change), we require the user to
   * stop playing — at least `freshAttackSilenceFrames` of true silence —
   * before we'll start counting toward the next match. Without this, the
   * sustain/ringing of the previous note can carry through the round
   * boundary and instantly trip the next target.
   */
  const requireFreshAttackRef = useRef(true);
  /** Pitch class of the previous target — used to decide if we need a silence gap. */
  const prevTargetPcRef = useRef<number | null>(null);
  /** When > 0, frames are sampled but never matched until the clock passes this. */
  const armedAtRef = useRef<number>(0);
  // Short silence window (~33ms) — only *required* when the next target has
  // the same pitch class as the previous (sustain would otherwise re-trigger).
  const freshAttackSilenceFrames = 2;

  useEffect(() => {
    targetRef.current = opts.targetMidi;
    matchedTargetRef.current = null;
    consecutiveRef.current = 0;
    wrongClassFiredRef.current = null;
    silenceFramesRef.current = 0;

    const newPc =
      opts.targetMidi == null
        ? null
        : (((Math.round(opts.targetMidi) % 12) + 12) % 12);
    const prevPc = prevTargetPcRef.current;
    // "always" — every target change requires a release. Used by drone-based
    // cards where a sustained drone (especially when its pitch class = the
    // next target) would otherwise trigger an instant false match.
    // "same-pc" (default) — only force a release when the next target shares
    // a pitch class with the previous, so legato scale lines register without
    // a forced pause.
    requireFreshAttackRef.current =
      requireFreshAttackMode === "always"
        ? true
        : newPc != null && prevPc != null && newPc === prevPc;
    prevTargetPcRef.current = newPc;
    armedAtRef.current =
      armingDelayMs > 0 ? performance.now() + armingDelayMs : 0;

    if (opts.enabled && newPc != null) {
      const tonicPc =
        opts.droneTonicPitchClass == null
          ? null
          : (((opts.droneTonicPitchClass % 12) + 12) % 12);
      const duckLinear =
        tonicPc != null && newPc === tonicPc
          ? DRONE_DUCK_LINEAR_VS_TONIC
          : DRONE_DUCK_LINEAR_DEFAULT;
      updatePitchMicDuckLevel(duckLinear);
    }
  }, [
    opts.targetMidi,
    opts.targetGeneration ?? 0,
    requireFreshAttackMode,
    armingDelayMs,
    opts.droneTonicPitchClass,
    opts.enabled,
  ]);

  useEffect(() => {
    onMatchRef.current = opts.onMatch;
  }, [opts.onMatch]);

  useEffect(() => {
    onWrongRef.current = opts.onWrongPitch;
  }, [opts.onWrongPitch]);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      endPitchMicDuck();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
      detectorRef.current = null;
    };

    if (!opts.enabled) {
      setPhase("idle");
      cleanup();
      return cleanup;
    }

    const start = async () => {
      setPhase("requesting");
      setError(null);
      try {
        const Pitchy = await import("pitchy");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioContext = new AudioContext();
        ctxRef.current = audioContext;
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        // 4096-sample window (~93 ms @ 44.1 kHz). Larger windows give Pitchy
        // enough cycles to lock onto the *fundamental* on low-pitched strings
        // (low E ≈ 82 Hz; G2 ≈ 98 Hz; C3 ≈ 130 Hz). With 2048 samples we'd
        // sometimes lock onto the 3rd harmonic instead, which has a different
        // pitch class and would fail the match.
        analyser.fftSize = 4096;
        source.connect(analyser);
        const detector = Pitchy.PitchDetector.forFloat32Array(analyser.fftSize);
        detectorRef.current = detector;
        const data = new Float32Array(analyser.fftSize);

        const targetPc =
          targetRef.current == null
            ? null
            : (((Math.round(targetRef.current) % 12) + 12) % 12);
        const tonicPc =
          opts.droneTonicPitchClass == null
            ? null
            : (((opts.droneTonicPitchClass % 12) + 12) % 12);
        const duckLinear =
          targetPc != null &&
          tonicPc != null &&
          targetPc === tonicPc
            ? DRONE_DUCK_LINEAR_VS_TONIC
            : DRONE_DUCK_LINEAR_DEFAULT;
        beginPitchMicDuck(duckLinear);
        setPhase("listening");

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(data);
          const [pitch, clarity] = detector.findPitch(
            data,
            audioContext.sampleRate,
          );
          setLiveClarity(clarity);
          const inputRms = rms(data);

          // Treat the frame as "audible note" only when the mic actually has
          // signal (RMS gate), Pitchy is confident (clarity gate), and we got
          // a real frequency back. Anything below these thresholds counts as
          // silence — used both for fresh-attack debouncing and for resetting
          // the consecutive-match counter when the user lifts off.
          const isAudibleNote =
            inputRms >= rmsMin &&
            clarity >= clarityMin &&
            pitch > 0 &&
            Number.isFinite(pitch);

          if (!isAudibleNote) {
            setLiveMidi(null);
            silenceFramesRef.current += 1;
            // Reset wrong-pitch debounce after ~150ms of silence so a new
            // attack of the same wrong class can re-fire.
            if (silenceFramesRef.current > 10) {
              wrongClassFiredRef.current = null;
            }
            // Once we've seen enough true silence, the user is "between
            // notes" — clear the fresh-attack gate so the next note will
            // count, and also clear the per-target match lock. The lock
            // exists to stop a sustained held note from firing onMatch
            // every frame; once the user has released, the same target
            // value should be matchable again (covers the case where two
            // consecutive rounds in note-finding randomly land on the
            // same pitch class).
            if (silenceFramesRef.current >= freshAttackSilenceFrames) {
              requireFreshAttackRef.current = false;
              matchedTargetRef.current = null;
            }
            // Sustained sound that didn't qualify (e.g. low clarity) should
            // still abort an in-progress consecutive count.
            consecutiveRef.current = 0;
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          const heardMidiRaw = frequencyToMidi(pitch);
          const heardMidi = Math.round(heardMidiRaw);
          const heardPc = ((heardMidi % 12) + 12) % 12;
          setLiveMidi(heardMidi);
          silenceFramesRef.current = 0;

          // Don't count anything until the per-target arming delay passes —
          // gives the mic + audio graph a moment to settle after a prompt
          // transition so we don't latch onto leftover sound.
          if (armedAtRef.current > 0 && performance.now() < armedAtRef.current) {
            consecutiveRef.current = 0;
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          // Refuse to count anything until the user has released the
          // previous note (or initial silence at card start).
          if (requireFreshAttackRef.current) {
            consecutiveRef.current = 0;
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          const target = targetRef.current;
          if (target != null && matchedTargetRef.current !== target) {
            const targetPc = ((target % 12) + 12) % 12;
            // Pure pitch-class match — any octave on any string counts.
            const pcMatches = heardPc === targetPc;
            // Reject detections that fall between equal-tempered semitones:
            // a clean played note rounds to within a few cents of the grid;
            // ambient noise / partial overlap tends to land mid-semitone
            // (fractional ≈ 0.3–0.5).
            const fractional = Math.abs(heardMidiRaw - heardMidi);
            const inTune = fractional * 100 <= toleranceCents;

            if (pcMatches && inTune) {
              consecutiveRef.current += 1;
              if (consecutiveRef.current >= framesNeeded) {
                matchedTargetRef.current = target;
                consecutiveRef.current = 0;
                wrongClassFiredRef.current = null;
                requireFreshAttackRef.current = true;
                silenceFramesRef.current = 0;
                onMatchRef.current(heardMidi);
              }
            } else {
              consecutiveRef.current = 0;
              if (
                onWrongRef.current &&
                pcMatches === false &&
                inTune &&
                wrongClassFiredRef.current !== heardPc
              ) {
                wrongClassFiredRef.current = heardPc;
                onWrongRef.current(heardMidi);
              }
            }
          }

          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Microphone access failed. Check permissions.",
        );
        setPhase("error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      cleanup();
    };
    // Reopen the mic only when the toggle flips; per-target updates are handled via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);

  return { phase, error, liveMidi, liveClarity };
}
