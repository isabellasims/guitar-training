import * as Tone from "tone";

let oscillator: Tone.Oscillator | null = null;

/**
 * Starts a simple sine drone at the given frequency (Hz).
 * Call from a user gesture (tap) so the AudioContext unlocks.
 */
export async function startDrone(frequency: number, volume = 0.2): Promise<void> {
  await Tone.start();
  stopDrone();
  oscillator = new Tone.Oscillator(frequency, "sine").toDestination();
  oscillator.volume.value = Tone.gainToDb(volume);
  oscillator.start();
}

export function stopDrone(): void {
  if (oscillator) {
    oscillator.stop();
    oscillator.dispose();
    oscillator = null;
  }
}

export function setDroneVolumeLinear(linear: number): void {
  if (!oscillator) return;
  const v = Math.max(0.001, Math.min(1, linear));
  oscillator.volume.value = Tone.gainToDb(v);
}
