import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

let oscillator: Tone.Oscillator | null = null;
/** User-facing drone level (0–1 linear, before ducking). */
let baseLinear = 0.2;
/**
 * While the pitch mic is open on drone cards, linear gain applied to the drone
 * output (in addition to `baseLinear`). Persists across `startDrone` / `stopDrone`
 * so tapping "Play drone" after the mic opens does not blast the tonic back to
 * full volume.
 */
let pitchListenDuckLinear: number | null = null;
/** Applied while an in-app scale demo plays so the melody reads over the held drone. */
let scaleDemoDroneMultiplier = 1;

function listenDuckMultiplier(): number {
  return pitchListenDuckLinear ?? 1;
}

function refreshDroneOutputVolume(): void {
  if (!oscillator) return;
  const effective = Math.max(
    0.0001,
    Math.min(1, baseLinear * listenDuckMultiplier() * scaleDemoDroneMultiplier),
  );
  oscillator.volume.value = Tone.gainToDb(effective);
}

function disposeOscillator(): void {
  if (oscillator) {
    oscillator.stop();
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
  oscillator = new Tone.Oscillator(frequency, "sine").toDestination();
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
  // Keep `pitchListenDuckLinear` — the mic may still be listening on drone cards.
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

/** Default duck while the pitch mic listens (see module comment in continuousPitch). */
export const DRONE_DUCK_LINEAR_DEFAULT = 0.04;
/** Extra attenuation when the target pitch class equals the drone tonic. */
export const DRONE_DUCK_LINEAR_VS_TONIC = 0.008;

/**
 * While `true`, drone output is reduced so the mic path can hear the guitar.
 * Safe to call when no drone is playing (remembered until cleared).
 */
export function setDroneDucked(
  ducked: boolean,
  linearMultiplier = DRONE_DUCK_LINEAR_DEFAULT,
): void {
  pitchListenDuckLinear = ducked
    ? Math.max(0.0001, Math.min(1, linearMultiplier))
    : null;
  refreshDroneOutputVolume();
}

/** Whether pitch-listen ducking is active (for diagnostics). */
export function isPitchListenDucking(): boolean {
  return pitchListenDuckLinear != null;
}
