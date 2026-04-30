import * as Tone from "tone";

import { midiToFrequency } from "@/lib/audio/noteUtils";

let oscillator: Tone.Oscillator | null = null;
/** User-facing drone level (0–1 linear, before ducking). */
let baseLinear = 0.2;
/**
 * Multiplier applied while pitch detection is listening.
 * 0.2 → about 80% quieter than base (matches “duck drone by 80%” spec).
 */
let duckMultiplier = 1;
/** Applied while an in-app scale demo plays so the melody reads over the held drone. */
let scaleDemoDroneMultiplier = 1;

function refreshDroneOutputVolume(): void {
  if (!oscillator) return;
  const effective = Math.max(
    0.0001,
    Math.min(1, baseLinear * duckMultiplier * scaleDemoDroneMultiplier),
  );
  oscillator.volume.value = Tone.gainToDb(effective);
}

/**
 * Starts a simple sine drone at the given frequency (Hz).
 * Call from a user gesture (tap) so the AudioContext unlocks.
 */
export async function startDrone(frequency: number, volume = 0.2): Promise<void> {
  await Tone.start();
  stopDrone();
  baseLinear = Math.max(0.0001, Math.min(1, volume));
  duckMultiplier = 1;
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
  if (oscillator) {
    oscillator.stop();
    oscillator.dispose();
    oscillator = null;
  }
  duckMultiplier = 1;
  scaleDemoDroneMultiplier = 1;
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

/**
 * While `true`, drone output is reduced so the mic path can hear the guitar.
 * Safe to call when no drone is playing (no-op).
 */
export function setDroneDucked(ducked: boolean): void {
  duckMultiplier = ducked ? 0.2 : 1;
  refreshDroneOutputVolume();
}
