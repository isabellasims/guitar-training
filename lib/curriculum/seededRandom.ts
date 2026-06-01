/**
 * Deterministic pseudo-random helpers for curriculum card generation.
 * Same level + seed string → same prompts across sessions (stable SRS ids).
 */

export function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

export function pickSeeded<T>(pool: readonly T[], seed: string): T {
  return pool[Math.floor(seededUnit(seed) * pool.length)]!;
}

export function seededChance(seed: string, probability = 0.5): boolean {
  return seededUnit(seed) < probability;
}

export function seededIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  return Math.floor(seededUnit(seed) * length);
}
