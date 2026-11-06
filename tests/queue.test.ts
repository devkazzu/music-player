import { describe, expect, it } from 'vitest';
import {
  adjustIndexAfterMove,
  adjustIndexAfterRemoval,
  computeNextIndex,
} from '@/lib/queue';

describe('computeNextIndex', () => {
  it('advances sequentially', () => {
    expect(computeNextIndex({ length: 4, index: 0, repeat: 'off', shuffle: false })).toBe(1);
    expect(computeNextIndex({ length: 4, index: 2, repeat: 'all', shuffle: false })).toBe(3);
  });

  it('stops at the end when repeat is off', () => {
    expect(computeNextIndex({ length: 4, index: 3, repeat: 'off', shuffle: false })).toBeNull();
  });

  it('wraps when repeat is all', () => {
    expect(computeNextIndex({ length: 4, index: 3, repeat: 'all', shuffle: false })).toBe(0);
  });

  it('never picks the current index in shuffle mode', () => {
    for (let i = 0; i < 30; i += 1) {
      const index = computeNextIndex({ length: 4, index: 2, repeat: 'all', shuffle: true });
      expect(index).not.toBe(2);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });

  it('avoids recently played indices when possible', () => {
    const index = computeNextIndex({
      length: 5,
      index: 0,
      repeat: 'all',
      shuffle: true,
      recentIndices: [1, 2, 3],
      random: () => 0,
    });
    expect(index).toBe(4);
  });

  it('falls back to any other track when everything was recent', () => {
    const index = computeNextIndex({
      length: 3,
      index: 0,
      repeat: 'all',
      shuffle: true,
      recentIndices: [1, 2],
      random: () => 0.9,
    });
    expect([1, 2]).toContain(index);
  });

  it('handles a single-track queue and empty queues', () => {
    expect(computeNextIndex({ length: 1, index: 0, repeat: 'all', shuffle: true })).toBe(0);
    expect(computeNextIndex({ length: 1, index: 0, repeat: 'off', shuffle: false })).toBeNull();
    expect(computeNextIndex({ length: 0, index: 0, repeat: 'all', shuffle: false })).toBeNull();
    expect(computeNextIndex({ length: 3, index: -1, repeat: 'all', shuffle: false })).toBeNull();
  });
});

describe('adjustIndexAfterRemoval', () => {
  it('shifts the pointer when a preceding item is removed', () => {
    expect(adjustIndexAfterRemoval(3, 1, 4)).toBe(2);
  });

  it('moves to the next item when the current item is removed', () => {
    expect(adjustIndexAfterRemoval(2, 2, 4)).toBe(2);
    expect(adjustIndexAfterRemoval(3, 3, 3)).toBe(2);
  });

  it('leaves the pointer alone for later removals', () => {
    expect(adjustIndexAfterRemoval(1, 3, 4)).toBe(1);
  });

  it('returns -1 for an emptied queue', () => {
    expect(adjustIndexAfterRemoval(0, 0, 0)).toBe(-1);
  });
});

describe('adjustIndexAfterMove', () => {
  it('follows the moved current track', () => {
    expect(adjustIndexAfterMove(1, 1, 3)).toBe(3);
  });

  it('shifts when another track crosses the pointer', () => {
    expect(adjustIndexAfterMove(2, 0, 3)).toBe(1);
    expect(adjustIndexAfterMove(2, 4, 1)).toBe(3);
  });

  it('ignores unrelated moves', () => {
    expect(adjustIndexAfterMove(2, 0, 1)).toBe(2);
    expect(adjustIndexAfterMove(2, 3, 4)).toBe(2);
  });
});
