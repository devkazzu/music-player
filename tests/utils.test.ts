import { describe, expect, it } from 'vitest';
import {
  clamp,
  formatBytes,
  formatDuration,
  formatNumber,
  formatTime,
  greetingForHour,
  percent,
  shuffleArray,
  slugify,
} from '@/lib/utils';

describe('time formatting', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9.9)).toBe('0:09');
    expect(formatTime(154)).toBe('2:34');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it('formats human durations', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(125)).toBe('2 min');
    expect(formatDuration(5400)).toBe('1 h 30 min');
  });
});

describe('number formatting', () => {
  it('abbreviates listeners', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(12_400)).toBe('12.4K');
    expect(formatNumber(2_015_000)).toBe('2M');
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('misc helpers', () => {
  it('clamps and computes progress', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(percent(30, 120)).toBe(25);
    expect(percent(30, 0)).toBe(0);
  });

  it('shuffles deterministically with a seeded rng and keeps all items', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    let seed = 42;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const first = shuffleArray(input, rng);
    expect([...first].sort((a, b) => a - b)).toEqual(input);
    expect(first).not.toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('greets by hour', () => {
    expect(greetingForHour(3)).toBe('Still awake');
    expect(greetingForHour(9)).toBe('Good morning');
    expect(greetingForHour(14)).toBe('Good afternoon');
    expect(greetingForHour(20)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Late night');
  });

  it('slugifies playlist names', () => {
    expect(slugify('Rainy Night Drive!')).toBe('rainy-night-drive');
    expect(slugify('   ')).toBe('untitled');
  });
});
