import type { RepeatMode } from '@/types';

export interface NextIndexOptions {
  length: number;
  index: number;
  repeat: RepeatMode;
  shuffle: boolean;
  /** Recently played queue indices — shuffle avoids repeating them. */
  recentIndices?: number[];
  random?: () => number;
}

/**
 * Pure "what plays next?" decision, shared by auto-advance and the next button.
 * Returns null when playback should stop (end of queue with repeat off).
 */
export function computeNextIndex({
  length,
  index,
  repeat,
  shuffle,
  recentIndices = [],
  random = Math.random,
}: NextIndexOptions): number | null {
  if (length <= 0 || index < 0) return null;

  if (shuffle && length > 1) {
    const all = Array.from({ length }, (_, i) => i);
    const fresh = all.filter((i) => i !== index && !recentIndices.includes(i));
    const pool = fresh.length > 0 ? fresh : all.filter((i) => i !== index);
    if (pool.length === 0) return null;
    return pool[Math.floor(random() * pool.length)] ?? pool[0];
  }

  if (index + 1 < length) return index + 1;
  return repeat === 'all' ? 0 : null;
}

/** Keeps the current-track pointer sensible after removing a queue item. */
export function adjustIndexAfterRemoval(
  currentIndex: number,
  removedIndex: number,
  nextLength: number,
): number {
  if (nextLength <= 0) return -1;
  if (removedIndex < currentIndex) return currentIndex - 1;
  if (removedIndex === currentIndex) return Math.min(currentIndex, nextLength - 1);
  return currentIndex;
}

/** Keeps the current-track pointer sensible after reordering the queue. */
export function adjustIndexAfterMove(currentIndex: number, from: number, to: number): number {
  if (from === to) return currentIndex;
  if (from === currentIndex) return to;
  if (from < currentIndex && to >= currentIndex) return currentIndex - 1;
  if (from > currentIndex && to <= currentIndex) return currentIndex + 1;
  return currentIndex;
}
