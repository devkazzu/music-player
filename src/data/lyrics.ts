/**
 * Original lyric fragments written for HIRO SEGAWA — one short verse per demo
 * score. Instrumental tracks use `instrumental: true` so the UI can say so
 * honestly instead of inventing lines.
 */
export interface LyricSheet {
  jp: string;
  lines: string[];
  instrumental?: boolean;
}

export const LYRICS: Record<string, LyricSheet> = {
  'neon-requiem': {
    jp: 'ネオンの鎮魂歌',
    lines: [
      'The last train exhales and the platform goes quiet',
      'Rain writes its letters across the glass',
      'I keep your echo in a pocket of neon',
      'And let the city sing me home',
      '蛍のように、光は落ちる',
      'Hold the night a little longer',
    ],
  },
  'ghost-in-the-rain': {
    jp: '雨の幽霊',
    lines: [
      'Somewhere between the umbrella and the sky',
      'I heard you laughing in a minor key',
      'Every drop a small goodbye',
      'Every street a memory',
      '雨音だけが、答えをくれる',
    ],
  },
  'paper-lanterns': {
    jp: '紙灯籠',
    lines: [
      'Paper lanterns lean into the river',
      'Gold on the water, gold in your hair',
      'We made a wish we never said aloud',
      'And let the current carry it',
      '灯りはゆれる、夜の中で',
    ],
  },
  hanabi: {
    jp: '花火',
    lines: ['One breath, then the whole sky blooms', 'A thousand colours falling slow', 'You trace the afterglow with your eyes', '夏の終わり、また会おう'],
  },
  'midnight-rail': {
    jp: '真夜中のレール',
    lines: [
      'Steel and starlight running parallel',
      'The window keeps the world at arm’s length',
      'I count the stations like a heartbeat',
      'Somewhere ahead the morning waits',
      '夜を越えて、走ってゆく',
    ],
  },
  'station-of-dreams': {
    jp: '夢の駅',
    lines: ['A station with no timetable', 'Where every door is a maybe', 'I bought a ticket made of quiet', 'And missed the train on purpose'],
  },
  'rainfall-sonata': {
    jp: '雨のソナタ',
    lines: [],
    instrumental: true,
  },
  'stellar-lullaby': {
    jp: '星の子守歌',
    lines: ['Sleep now, the stars are counting sheep', 'The moon has left a light on', 'Every worry folded small', 'Tucked beneath the pillow'],
  },
  'skyline-dreams': {
    jp: '摩天楼の夢',
    lines: ['Windows glowing like a hundred small suns', 'The city hums a promise it will keep', 'We are taller than the doubt', '摩天楼の夢、まだ途中'],
  },
};

export function lyricsFor(trackId: string): LyricSheet | null {
  return LYRICS[trackId] ?? null;
}
