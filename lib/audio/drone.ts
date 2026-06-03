import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

let oscillator: Tone.Oscillator | null = null;
/** Shared output bus — ducking adjusts this gain, not only the oscillator. */
let droneBus: Tone.Gain | null = null;
/** User-facing drone level (0–1 linear) when not pitch-ducked. */
let baseLinear = 0.2;
/**
 * While the pitch mic is open, we silence the drone bus. Laptop speakers bleed
 * enough at "4% volume" that Pitchy still locks onto the tonic; muting the bus
 * is the reliable fix. State persists across `startDrone` so starting the drone
 * after the mic opens does not restore full volume.
 */
let pitchListenDuckLinear: number | null = null;
let pitchMicDuckRefCount = 0;
let pitchMicDuckLevel = 0.04;
/** Applied while an in-app scale demo plays so the melody reads over the held drone. */
let scaleDemoDroneMultiplier = 1;

function ensureDroneBus(): Tone.Gain {
  if (!droneBus) {
    droneBus = new Tone.Gain(baseLinear).toDestination();
  }
  return droneBus;
}

function isPitchMicDuckActive(): boolean {
  return pitchMicDuckRefCount > 0 || pitchListenDuckLinear != null;
}

/**
 * Effective linear gain on the drone bus. While pitch-mic ducking is active we
 * output near-zero from the app so the mic hears the guitar, not the speaker.
 */
function busLinearGain(): number {
  if (isPitchMicDuckActive()) {
    return 0;
  }
  return Math.max(
    0.0001,
    Math.min(1, baseLinear * scaleDemoDroneMultiplier),
  );
}

export function applyDroneDuckState(): void {
  if (!droneBus) return;
  const g = busLinearGain();
  const now = Tone.now();
  droneBus.gain.cancelScheduledValues(now);
  droneBus.gain.setValueAtTime(g, now);
}

function refreshDroneOutputVolume(): void {
  applyDroneDuckState();
}

function disposeOscillator(): void {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator.dispose();
    oscillator = null;
  }
}

/**
 * Starts a simple sine drone at the given frequency (Hz).
 * Call from a user gesture (tap) so the AudioContext unlocks.
 */
export async function startDrone(frequency: number, volume = 0.2): Promise<void> {
  await Tone.start();
  disposeOscillator();
  baseLinear = Math.max(0.0001, Math.min(1, volume));
  scaleDemoDroneMultiplier = 1;
  const bus = ensureDroneBus();
  oscillator = new Tone.Oscillator(frequency, "sine");
  oscillator.volume.value = 0;
  oscillator.connect(bus);
  refreshDroneOutputVolume();
  oscillator.start();
}

/** Convenience: drone at MIDI pitch. */
export async function startDroneMidi(midi: number, volume = 0.2): Promise<void> {
  await startDrone(midiToFrequency(midi), volume);
}

export function stopDrone(): void {
  disposeOscillator();
  scaleDemoDroneMultiplier = 1;
  refreshDroneOutputVolume();
}

/**
 * Temporarily lowers drone output (linear multiplier) so scale / melody demos sound clearer.
 * Restores previous multiplier when `fn` completes or throws.
 */
export async function withQuieterDroneForScaleDemo(
  droneOutputMultiplier: number,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = scaleDemoDroneMultiplier;
  scaleDemoDroneMultiplier = Math.max(
    0.04,
    Math.min(1, droneOutputMultiplier),
  );
  refreshDroneOutputVolume();
  try {
    await fn();
  } finally {
    scaleDemoDroneMultiplier = prev;
    refreshDroneOutputVolume();
  }
}

export function setDroneVolumeLinear(linear: number): void {
  baseLinear = Math.max(0.0001, Math.min(1, linear));
  refreshDroneOutputVolume();
}

/** True while a Tone drone is running. */
export function isDroneActive(): boolean {
  return oscillator != null;
}

/** Default duck while the pitch mic listens. */
export const DRONE_DUCK_LINEAR_DEFAULT = 0.04;
/** Extra attenuation when the target pitch class equals the drone tonic. */
export const DRONE_DUCK_LINEAR_VS_TONIC = 0.008;

/** Call when a continuous pitch listener opens the mic. Ref-counted for Strict Mode. */
export function beginPitchMicDuck(
  linearMultiplier = DRONE_DUCK_LINEAR_DEFAULT,
): void {
  pitchMicDuckRefCount += 1;
  pitchMicDuckLevel = Math.max(0.0001, Math.min(1, linearMultiplier));
  pitchListenDuckLinear = pitchMicDuckLevel;
  refreshDroneOutputVolume();
}

/** Update duck strength while the mic stays open (e.g. target = tonic). */
export function updatePitchMicDuckLevel(
  linearMultiplier: number,
): void {
  if (pitchMicDuckRefCount <= 0 && pitchListenDuckLinear == null) return;
  pitchMicDuckLevel = Math.max(0.0001, Math.min(1, linearMultiplier));
  pitchListenDuckLinear = pitchMicDuckLevel;
  refreshDroneOutputVolume();
}

/** Pair with `beginPitchMicDuck` when the listener closes. */
export function endPitchMicDuck(): void {
  pitchMicDuckRefCount = Math.max(0, pitchMicDuckRefCount - 1);
  if (pitchMicDuckRefCount === 0) {
    pitchListenDuckLinear = null;
  }
  refreshDroneOutputVolume();
}

/**
 * Legacy API — prefer begin/end for long-lived listeners.
 * `ducked: true` is ref-counted; `false` clears all duck refs.
 */
export function setDroneDucked(
  ducked: boolean,
  linearMultiplier = DRONE_DUCK_LINEAR_DEFAULT,
): void {
  if (ducked) {
    beginPitchMicDuck(linearMultiplier);
  } else {
    endPitchMicDuck();
  }
}

/** Whether pitch-listen ducking is active (drone bus muted). */
export function isPitchListenDucking(): boolean {
  return isPitchMicDuckActive();
}
