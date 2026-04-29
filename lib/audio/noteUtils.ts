const A4_HZ = 440;

const NOTE_NAMES_PLAIN = [
  "C",
  "C sharp",
  "D",
  "D sharp",
  "E",
  "F",
  "F sharp",
  "G",
  "G sharp",
  "A",
  "A sharp",
  "B",
] as const;

/** MIDI octave number matching scientific pitch (middle C = C4 = MIDI 60). */
export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/**
 * Spoken-style note name for UI (no Unicode sharp symbols).
 * Middle C is called out explicitly.
 */
export function midiToPlainEnglishNote(midi: number): string {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const name = NOTE_NAMES_PLAIN[pc];
  if (rounded === 60) return "middle C";
  const oct = midiToOctave(rounded);
  return `${name} in octave ${oct}`;
}

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
