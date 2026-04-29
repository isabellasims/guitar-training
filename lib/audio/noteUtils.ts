const A4_HZ = 440;

/** MIDI note number from frequency (float). */
export function frequencyToMidi(freq: number): number {
  return 12 * Math.log2(freq / A4_HZ) + 69;
}

/** Difference in cents between two frequencies. */
export function centsBetween(freq: number, referenceHz: number): number {
  return 1200 * Math.log2(freq / referenceHz);
}

/** Check within ±toleranceCents of target Hz. */
export function matchesPitch(
  detectedHz: number,
  targetHz: number,
  toleranceCents = 25,
): boolean {
  return Math.abs(centsBetween(detectedHz, targetHz)) <= toleranceCents;
}

/** Equal-temperament Hz for MIDI note (integer or float). */
export function midiToFrequency(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}
