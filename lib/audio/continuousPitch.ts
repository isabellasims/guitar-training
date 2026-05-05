"use client";

import { useEffect, useRef, useState } from "react";

import {
  centsBetween,
  frequencyToMidi,
  midiToFrequency,
} from "@/lib/audio/noteUtils";
import { setDroneDucked } from "@/lib/audio/drone";
import type { PitchDetector as PitchDetectorClass } from "pitchy";

export type ContinuousPitchOptions = {
  /** Master toggle — when false, the mic is closed. */
  enabled: boolean;
  /** Current target MIDI; set null to pause matching while keeping mic open. */
  targetMidi: number | null;
  /** Fired exactly once per `targetMidi` value, when a stable match is heard. */
  onMatch: (heardMidi: number) => void;
  /**
   * Fired when a clean note is heard whose pitch class is *not* the target's
   * pitch class — i.e. the user hit a wrong note. Used by shape-recall to
   * restart on error. Debounced to once per attack.
   */
  onWrongPitch?: (heardMidi: number) => void;
  /** Default ±25 cents. */
  toleranceCents?: number;
  /** Default 0.7 — guitar pitches often sit a bit lower than vocal targets. */
  clarityMin?: number;
  /** Default 3 — frames in a row matching before we declare success. */
  consecutiveFramesNeeded?: number;
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
export function useContinuousPitchListener(
  opts: ContinuousPitchOptions,
): ContinuousPitchState {
  const tolerance = opts.toleranceCents ?? 25;
  const clarityMin = opts.clarityMin ?? 0.7;
  const framesNeeded = opts.consecutiveFramesNeeded ?? 3;

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

  useEffect(() => {
    targetRef.current = opts.targetMidi;
    // Reset stable-match counter when the target changes.
    matchedTargetRef.current = null;
    consecutiveRef.current = 0;
    wrongClassFiredRef.current = null;
  }, [opts.targetMidi]);

  useEffect(() => {
    onMatchRef.current = opts.onMatch;
  }, [opts.onMatch]);

  useEffect(() => {
    onWrongRef.current = opts.onWrongPitch;
  }, [opts.onWrongPitch]);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      setDroneDucked(false);
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
        analyser.fftSize = 2048;
        source.connect(analyser);
        const detector = Pitchy.PitchDetector.forFloat32Array(analyser.fftSize);
        detectorRef.current = detector;
        const data = new Float32Array(analyser.fftSize);

        setDroneDucked(true);
        setPhase("listening");

        const tick = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(data);
          const [pitch, clarity] = detector.findPitch(
            data,
            audioContext.sampleRate,
          );
          setLiveClarity(clarity);

          if (clarity >= clarityMin && pitch > 0 && Number.isFinite(pitch)) {
            const heardMidi = frequencyToMidi(pitch);
            const heardPc = ((heardMidi % 12) + 12) % 12;
            setLiveMidi(heardMidi);
            silenceFramesRef.current = 0;

            const target = targetRef.current;
            if (target != null && matchedTargetRef.current !== target) {
              const targetHz = midiToFrequency(target);
              const cents = Math.abs(centsBetween(pitch, targetHz));
              const targetPc = ((target % 12) + 12) % 12;
              if (cents <= tolerance) {
                consecutiveRef.current += 1;
                if (consecutiveRef.current >= framesNeeded) {
                  matchedTargetRef.current = target;
                  consecutiveRef.current = 0;
                  wrongClassFiredRef.current = null;
                  onMatchRef.current(heardMidi);
                }
              } else {
                consecutiveRef.current = 0;
                if (
                  onWrongRef.current &&
                  heardPc !== targetPc &&
                  wrongClassFiredRef.current !== heardPc
                ) {
                  wrongClassFiredRef.current = heardPc;
                  onWrongRef.current(heardMidi);
                }
              }
            }
          } else {
            setLiveMidi(null);
            silenceFramesRef.current += 1;
            // After ~10 frames (~150ms) of silence/noise, allow a new "attack"
            // to re-trigger an `onWrongPitch` even on the same pitch class.
            if (silenceFramesRef.current > 10) {
              wrongClassFiredRef.current = null;
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
