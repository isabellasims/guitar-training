"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PitchDetector as PitchDetectorClass } from "pitchy";
import { Mic, MicOff } from "lucide-react";

import { setDroneDucked } from "@/lib/audio/drone";
import {
  frequencyToMidi,
  matchesPitch,
  midiToDiagramLabel,
  midiToFrequency,
  midiToPlainEnglishNote,
} from "@/lib/audio/noteUtils";

const LISTEN_MS = 4000;
const DELAY_MS = 200;
const TOLERANCE_CENTS = 25;
/** Guitar often sits below 0.85; too strict yields false negatives. */
const CLARITY_MIN = 0.68;
const RMS_SILENT = 0.002;

function rmsLevel(timeData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) {
    const s = timeData[i];
    sum += s * s;
  }
  return Math.sqrt(sum / timeData.length);
}

function pitchClass(midi: number): number {
  const rounded = Math.round(midi);
  return ((rounded % 12) + 12) % 12;
}

function allowedPitchClassesLabel(pcs: number[]): string {
  const uniq = Array.from(new Set(pcs)).sort((a, b) => a - b);
  return uniq.map((pc) => midiToDiagramLabel(pc + 48)).join(", ");
}

export function PitchMicPanel({
  targetMidi,
  allowedPitchClasses,
  label,
  onListenResult,
}: {
  /** Exact MIDI target (single pitch). Omit when using `allowedPitchClasses`. */
  targetMidi?: number;
  /** If set, any octave of these pitch classes counts as correct. */
  allowedPitchClasses?: number[];
  label: string;
  /** Fires once when the listen window ends (pitch correct or not). */
  onListenResult?: (correct: boolean) => void;
}) {
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "arming" | "listening" | "result"
  >("idle");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [liveHz, setLiveHz] = useState<number | null>(null);
  const [liveClarity, setLiveClarity] = useState<number | null>(null);
  const [inputRms, setInputRms] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastHeardSummary, setLastHeardSummary] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<PitchDetectorClass<Float32Array> | null>(null);

  const referenceMidi =
    targetMidi ??
    (allowedPitchClasses?.length
      ? allowedPitchClasses[0]! + 57
      : 69);
  const targetHz = midiToFrequency(referenceMidi);
  const classMatch =
    allowedPitchClasses != null && allowedPitchClasses.length > 0;

  const cleanupAudio = useCallback(() => {
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
  }, []);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  const runListen = async () => {
    setError(null);
    setResult(null);
    setLastHeardSummary(null);
    setPhase("requesting");
    setLiveHz(null);
    setLiveClarity(null);
    setInputRms(null);
    cleanupAudio();

    try {
      const Pitchy = await import("pitchy");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
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
      setPhase("arming");
      await new Promise((r) => setTimeout(r, DELAY_MS));
      setPhase("listening");

      const started = performance.now();
      let lastMatch = false;
      let bestHz: number | null = null;
      let bestClarity = 0;
      let quietFrames = 0;
      let totalFrames = 0;

      const tick = () => {
        const elapsed = performance.now() - started;
        if (elapsed >= LISTEN_MS) {
          setPhase("result");
          setResult(lastMatch ? "correct" : "incorrect");
          onListenResult?.(lastMatch);
          if (!lastMatch) {
            const parts: string[] = [];
            const expectedLabel = classMatch
              ? allowedPitchClassesLabel(allowedPitchClasses!)
              : midiToPlainEnglishNote(targetMidi!);
            if (bestHz != null && bestClarity >= CLARITY_MIN) {
              const heardMidi = frequencyToMidi(bestHz);
              const heardLabel = midiToPlainEnglishNote(heardMidi);
              if (
                classMatch &&
                allowedPitchClasses!.includes(pitchClass(heardMidi))
              ) {
                parts.push(
                  `We heard ${heardLabel}, but not steady enough to count. Hold a clear note.`,
                );
              } else if (!classMatch && heardLabel === expectedLabel) {
                parts.push(
                  `We heard something centered on ${heardLabel}, but not steady enough within ±${TOLERANCE_CENTS} cents. Try holding the note a little longer.`,
                );
              } else {
                parts.push(
                  `We heard ${heardLabel}. This exercise asked for ${classMatch ? `one of: ${expectedLabel}` : expectedLabel}.`,
                );
              }
            } else if (totalFrames > 0 && quietFrames / totalFrames > 0.7) {
              parts.push(
                "Input stayed very quiet — check mic permission, input device, and volume.",
              );
            } else if (bestHz != null) {
              const heardLabel = midiToPlainEnglishNote(frequencyToMidi(bestHz));
              parts.push(
                `Something like ${heardLabel} seemed closest, but the pitch was not clear enough to count. Try a cleaner, sustained note. You need ${classMatch ? `one of: ${expectedLabel}` : expectedLabel}.`,
              );
            } else {
              parts.push(
                `You need ${classMatch ? `one of: ${expectedLabel}` : expectedLabel}.`,
              );
            }
            setLastHeardSummary(parts.join(" ") || null);
          }
          cleanupAudio();
          return;
        }

        analyser.getFloatTimeDomainData(data);
        const rms = rmsLevel(data);
        setInputRms(rms);
        totalFrames++;
        if (rms < RMS_SILENT) quietFrames++;

        const [pitch, clarity] = detector.findPitch(
          data,
          audioContext.sampleRate,
        );
        setLiveClarity(clarity);

        if (clarity >= CLARITY_MIN && pitch > 0 && Number.isFinite(pitch)) {
          setLiveHz(pitch);
          if (clarity > bestClarity) {
            bestClarity = clarity;
            bestHz = pitch;
          }
          if (classMatch) {
            const pc = pitchClass(frequencyToMidi(pitch));
            if (allowedPitchClasses!.includes(pc)) {
              lastMatch = true;
            }
          } else if (matchesPitch(pitch, targetHz, TOLERANCE_CENTS)) {
            lastMatch = true;
          }
        } else {
          setLiveHz(null);
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Microphone access failed. Check permissions.";
      setError(msg);
      setPhase("idle");
      cleanupAudio();
    }
  };

  const micLive =
    phase === "arming" || phase === "listening" || phase === "requesting";
  const levelPct = inputRms != null ? Math.min(100, (inputRms / 0.08) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pitch check</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex items-center gap-3 rounded-md border border-rule bg-paper-soft px-3 py-2"
          role="status"
          aria-live="polite"
        >
          {micLive ? (
            <Mic
              className="h-5 w-5 shrink-0 text-rust"
              strokeWidth={1.75}
              aria-hidden
            />
          ) : (
            <MicOff
              className="h-5 w-5 shrink-0 text-ink-mute"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1 text-sm">
            {phase === "idle" && !error && (
              <span className="text-ink-soft">
                Microphone is off. Tap the button to allow access and listen.
              </span>
            )}
            {phase === "requesting" && (
              <span className="text-ink-soft">Requesting microphone…</span>
            )}
            {phase === "arming" && (
              <span className="text-gold">
                Microphone on — hold for a second, then play.
              </span>
            )}
            {phase === "listening" && (
              <span className="text-ink">
                Listening — play a clear, steady note.
                {inputRms != null && inputRms < RMS_SILENT && (
                  <span className="mt-1 block text-xs text-rust">
                    Almost no input yet — strum or sing louder, or check the mic
                    source.
                  </span>
                )}
              </span>
            )}
            {phase === "result" && (
              <span className="text-ink-mute">Microphone turned off.</span>
            )}
            {error && <span className="text-rust">{error}</span>}
          </div>
        </div>

        {phase === "listening" && (
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              <span>Input level</span>
              <span>{inputRms != null ? inputRms.toFixed(4) : "—"} RMS</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-paper-deep"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-rust transition-[width] duration-75"
                style={{ width: `${levelPct}%` }}
              />
            </div>
          </div>
        )}

        <p className="font-mono text-xs text-ink-mute">
          {classMatch ? (
            <>
              Target pitch classes: {allowedPitchClassesLabel(allowedPitchClasses!)}{" "}
              (any octave). Waits {DELAY_MS} ms after mic opens, then listens up
              to {LISTEN_MS / 1000} s.
            </>
          ) : (
            <>
              Target: {targetHz.toFixed(1)} Hz (±{TOLERANCE_CENTS} cents). Waits{" "}
              {DELAY_MS} ms after mic opens, then listens up to {LISTEN_MS / 1000}{" "}
              s.
            </>
          )}
        </p>

        {phase === "listening" ? (
          <p className="text-sm text-ink-soft">
            {liveHz != null
              ? `${midiToPlainEnglishNote(frequencyToMidi(liveHz))} · ${liveHz.toFixed(1)} Hz · clarity ${(liveClarity ?? 0).toFixed(2)}`
              : liveClarity != null
                ? `No pitch yet · clarity ${liveClarity.toFixed(2)} (need ≥${CLARITY_MIN})`
                : "Waiting for audio…"}
          </p>
        ) : null}

        {phase === "result" && result ? (
          <div className="space-y-2">
            <p
              className={
                result === "correct" ? "text-sm text-gold" : "text-sm text-rust"
              }
            >
              {result === "correct"
                ? "Heard the right pitch."
                : "Did not hear a stable match in time."}
            </p>
            {result === "incorrect" && lastHeardSummary ? (
              <p className="text-sm text-ink-soft">{lastHeardSummary}</p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          variant="rust"
          onClick={() => void runListen()}
          disabled={phase === "requesting" || phase === "arming" || phase === "listening"}
        >
          {phase === "requesting" || phase === "arming"
            ? "Starting…"
            : phase === "listening"
              ? "Listening…"
              : "Allow mic and listen"}
        </Button>
      </CardContent>
    </Card>
  );
}
