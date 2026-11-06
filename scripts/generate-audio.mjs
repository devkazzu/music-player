/**
 * HIRO SEGAWA — original demo score generator
 * ---------------------------------------------
 * Generates nine short, original instrumental pieces (no samples, no third-party
 * recordings) and encodes them to MP3 with the pure-JS LAME encoder.
 *
 * Everything here is deterministic: the same seeds always produce the same audio.
 * Run with:  npm run gen:audio
 */
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public/audio');
const SR = 44100;

/* ------------------------------------------------------------------ helpers */
const TAU = Math.PI * 2;
const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Smooth, band-limited-ish oscillator: additive partials for a warm tone. */
function addTone(buf, start, dur, freq, opts) {
  const {
    partials = [[1, 1]],
    gain = 0.1,
    attack = 0.02,
    decay = 0.2,
    sustain = 0.7,
    release = 0.4,
    detune = 0,
    vibrato = 0,
    vibratoRate = 5,
    pan = 0,
    filter = 0,
  } = opts;
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(start * SR);
  const lGain = gain * Math.cos(((pan + 1) / 2) * Math.PI * 0.5);
  const rGain = gain * Math.sin(((pan + 1) / 2) * Math.PI * 0.5);
  let lpL = 0;
  let lpR = 0;
  const f = freq * Math.pow(2, detune / 1200);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.L.length) break;
    const t = i / SR;
    // envelope
    let env;
    if (t < attack) env = t / attack;
    else if (t < attack + decay) env = 1 - (1 - sustain) * ((t - attack) / decay);
    else env = sustain;
    if (t > dur - release) env *= Math.max(0, (dur - t) / release);
    if (env <= 0) continue;
    const vib = vibrato ? 1 + (vibrato / 100) * Math.sin(TAU * vibratoRate * t) : 1;
    const phase = TAU * f * vib * t;
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += partials[p][1] * Math.sin(phase * partials[p][0]);
    }
    let v = s * env;
    if (filter > 0) {
      const a = Math.exp(-2 * Math.PI * filter / SR);
      lpL = (1 - a) * v + a * lpL;
      lpR = lpL;
      v = lpL;
    }
    buf.L[idx] += v * lGain;
    buf.R[idx] += v * rGain;
  }
  return lpR;
}

function addNoise(buf, start, dur, opts) {
  const { gain = 0.05, attack = 0.005, decay = dur, highpass = 0, lowpass = 1, pan = 0, seed = 1 } = opts;
  const r = rnd(seed);
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(start * SR);
  const lGain = gain * Math.cos(((pan + 1) / 2) * Math.PI * 0.5);
  const rGain = gain * Math.sin(((pan + 1) / 2) * Math.PI * 0.5);
  let prev = 0;
  let lp = 0;
  const lpCoef = Math.exp(-2 * Math.PI * lowpass * 4 / SR);
  const hpCoef = highpass > 0 ? Math.exp(-2 * Math.PI * highpass / SR) : 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.L.length) break;
    const t = i / SR;
    let env = t < attack ? t / attack : Math.exp(-(t - attack) / (decay * 0.35));
    if (env < 0.0001) continue;
    let w = r() * 2 - 1;
    if (hpCoef) {
      lp = (1 - hpCoef) * w + hpCoef * lp;
      w = w - lp;
    }
    let sx = (1 - lpCoef) * w + lpCoef * prev;
    prev = sx;
    buf.L[idx] += sx * env * lGain;
    buf.R[idx] += sx * env * rGain;
  }
}

function addKick(buf, start, gain = 0.5) {
  const i0 = Math.floor(start * SR);
  const n = Math.floor(0.42 * SR);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.L.length) break;
    const t = i / SR;
    const env = Math.exp(-t * 9);
    const freq = 44 + 105 * Math.exp(-t * 34);
    const s = Math.sin(TAU * freq * t) * env * gain;
    buf.L[idx] += s;
    buf.R[idx] += s;
  }
}

function addSnare(buf, start, gain = 0.22, seed = 7) {
  addNoise(buf, start, 0.3, { gain, decay: 0.16, highpass: 1200, lowpass: 0.5, seed });
  addTone(buf, start, 0.16, 190, { partials: [[1, 1], [1.5, 0.3]], gain: gain * 0.5, attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.04 });
}

function addHat(buf, start, gain = 0.05, seed = 3) {
  addNoise(buf, start, 0.09, { gain, decay: 0.03, highpass: 6000, lowpass: 0.95, seed });
}

/** Schroeder reverb — four combs into two all-passes, per channel. */
function reverb(buf, { wet = 0.28, decay = 0.79, offset = 0 } = {}) {
  const combs = [
    [1116, 1188], [1277, 1277], [1422, 1356], [1561, 1491],
  ];
  const n = buf.L.length;
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  for (const [dl, dr] of combs) {
    const a = Math.floor((dl + offset) % 1300) + 200;
    const b = Math.floor((dr + offset) % 1370) + 240;
    const cl = new Float32Array(n);
    const cr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const il = i >= a ? cl[i - a] : 0;
      const ir = i >= b ? cr[i - b] : 0;
      cl[i] = buf.L[i] + il * decay;
      cr[i] = buf.R[i] + ir * decay;
      outL[i] += cl[i];
      outR[i] += cr[i];
    }
  }
  for (const d of [225, 556]) {
    for (let i = 0; i < n; i++) {
      const j = i >= d ? i - d : 0;
      const bl = outL[j];
      const br = outR[j];
      outL[i] = outL[i] * 0.5 + bl * 0.5;
      outR[i] = outR[i] * 0.5 + br * 0.5;
    }
  }
  for (let i = 0; i < n; i++) {
    buf.L[i] += outL[i] * wet * 0.25;
    buf.R[i] += outR[i] * wet * 0.25;
  }
}

/* ------------------------------------------------------------- compositions */
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MODES = { minor: MINOR, major: MAJOR };

// Chord progression degrees (0-indexed scale degree) — bass note + voicing.
const scaleNote = (root, mode, degree) => {
  const scale = MODES[mode];
  const oct = Math.floor(degree / scale.length);
  const deg = ((degree % scale.length) + scale.length) % scale.length;
  return root + scale[deg] + 12 * oct;
};

const chordVoicing = (root, mode, degree, size = 3) => {
  const beats = mode === 'minor' ? [0, 2, 4] : [0, 2, 4];
  return beats.slice(0, size).map((step) => scaleNote(root, mode, degree + step));
};

/**
 * Track blueprint
 *   tempo, root, mode, bars, chords (scale degrees), melody:[[degree, beats]],
 *   instruments, textures
 */
const TRACKS = [
  {
    file: 'neon-requiem',
    tempo: 84,
    root: 45, // A2
    mode: 'minor',
    chords: [0, 5, 3, 4, 0, 5, 6, 4],
    seed: 1101,
    drums: 'half',
    padGain: 0.075,
    arp: { pattern: [0, 2, 4, 2, 3, 4, 6, 4], gain: 0.085, octave: 2 },
    melody: [[7, 2], [6, 1], [4, 1], [3, 2], [4, 1], [2, 1], [0, 2], [2, 2], [3, 2], [4, 2], [7, 2], [6, 1], [4, 1], [3, 4]],
    melodyGain: 0.075,
    textures: ['wind'],
    mood: 'night-drive',
  },
  {
    file: 'ghost-in-the-rain',
    tempo: 92,
    root: 43,
    mode: 'minor',
    chords: [0, 3, 5, 4, 0, 3, 6, 4],
    seed: 2207,
    drums: 'trip',
    padGain: 0.065,
    arp: { pattern: [0, 3, 2, 4, 2, 5, 4, 2], gain: 0.07, octave: 2 },
    melody: [[4, 1.5], [3, 0.5], [2, 2], [4, 2], [5, 1], [4, 1], [2, 2], [0, 3], [2, 1], [3, 2], [4, 2], [6, 3], [4, 1]],
    melodyGain: 0.06,
    textures: ['rain', 'vinyl'],
    mood: 'rain',
  },
  {
    file: 'paper-lanterns',
    tempo: 76,
    root: 48,
    mode: 'major',
    chords: [0, 4, 5, 3, 0, 4, 5, 4],
    seed: 3301,
    drums: 'soft',
    padGain: 0.06,
    pluck: { gain: 0.12, pattern: [0, 4, 2, 5, 4, 2, 6, 4], octave: 2 },
    melody: [[7, 3], [6, 1], [4, 2], [2, 2], [0, 3], [2, 1], [4, 2], [5, 2], [4, 2], [2, 2], [0, 4]],
    melodyGain: 0.055,
    textures: ['birds'],
    mood: 'golden-hour',
  },
  {
    file: 'hanabi',
    tempo: 88,
    root: 50,
    mode: 'major',
    chords: [0, 5, 3, 4, 0, 5, 3, 4],
    seed: 4409,
    drums: 'soft',
    padGain: 0.055,
    pluck: { gain: 0.1, pattern: [0, 2, 4, 5, 4, 2, 7, 5], octave: 1 },
    melody: [[4, 2], [5, 2], [7, 2], [6, 2], [5, 2], [4, 2], [2, 2], [0, 2], [4, 2], [5, 2], [7, 3], [9, 1], [7, 2], [4, 2]],
    melodyGain: 0.06,
    textures: ['wind'],
    mood: 'golden-hour',
  },
  {
    file: 'midnight-rail',
    tempo: 70,
    root: 41,
    mode: 'minor',
    chords: [0, 6, 5, 3, 0, 6, 4, 3],
    seed: 5501,
    drums: 'half',
    padGain: 0.085,
    arp: { pattern: [0, 2, 4, 5, 4, 2, 0, 6], gain: 0.05, octave: 3 },
    melody: [[2, 4], [4, 2], [2, 2], [0, 4], [3, 2], [2, 2], [1, 4], [4, 2], [2, 2], [0, 6]],
    melodyGain: 0.05,
    textures: ['wind', 'rail'],
    mood: 'night',
  },
  {
    file: 'station-of-dreams',
    tempo: 64,
    root: 46,
    mode: 'minor',
    chords: [0, 5, 3, 6, 0, 5, 4, 3],
    seed: 6607,
    drums: 'none',
    padGain: 0.09,
    arp: { pattern: [0, 4, 2, 6, 4, 2, 5, 4], gain: 0.045, octave: 3 },
    melody: [[0, 2], [2, 2], [3, 2], [4, 2], [6, 2], [4, 2], [2, 2], [3, 2], [4, 4], [2, 2], [0, 4]],
    melodyGain: 0.048,
    textures: ['rail'],
    mood: 'night',
  },
  {
    file: 'rainfall-sonata',
    tempo: 68,
    root: 44,
    mode: 'minor',
    chords: [0, 5, 2, 6, 0, 5, 3, 4],
    seed: 7703,
    drums: 'none',
    padGain: 0.048,
    pluck: { gain: 0.13, pattern: [0, 2, 4, 2, 5, 4, 2, 0], octave: 2, soft: true },
    melody: [[4, 3], [2, 1], [0, 2], [2, 2], [3, 3], [4, 1], [2, 2], [0, 2], [1, 2], [3, 2], [4, 4], [2, 2], [0, 2]],
    melodyGain: 0.06,
    textures: ['rain', 'vinyl'],
    mood: 'rain',
  },
  {
    file: 'stellar-lullaby',
    tempo: 60,
    root: 43,
    mode: 'minor',
    chords: [0, 5, 6, 4, 0, 5, 3, 4],
    seed: 8809,
    drums: 'none',
    padGain: 0.1,
    melody: [[2, 4], [4, 2], [2, 2], [0, 4], [4, 2], [2, 2], [1, 4], [3, 2], [2, 2], [0, 8]],
    melodyGain: 0.045,
    textures: ['wind', 'stars'],
    mood: 'sleep',
  },
  {
    file: 'skyline-dreams',
    tempo: 80,
    root: 47,
    mode: 'minor',
    chords: [0, 5, 3, 4, 0, 5, 2, 4],
    seed: 9901,
    drums: 'trip',
    padGain: 0.07,
    arp: { pattern: [0, 4, 3, 5, 4, 6, 4, 2], gain: 0.075, octave: 2 },
    melody: [[4, 2], [2, 1], [4, 1], [5, 2], [4, 2], [2, 2], [0, 2], [3, 2], [4, 2], [5, 2], [7, 4], [4, 2]],
    melodyGain: 0.055,
    textures: ['wind'],
    mood: 'city',
  },
];

function renderTrack(cfg) {
  const beat = 60 / cfg.tempo;
  const barLen = beat * 4;
  const bars = cfg.chords.length;
  const tail = 3.2;
  const total = bars * barLen + tail;
  const n = Math.ceil(total * SR);
  const buf = { L: new Float32Array(n), R: new Float32Array(n) };
  const random = rnd(cfg.seed);
  const mode = cfg.mode;

  // Fade-in / fade-out ramps applied at the end.
  for (let b = 0; b < bars; b++) {
    const t0 = b * barLen;
    const deg = cfg.chords[b];

    // --- Pad: sustained chord over the whole bar, two detuned voices.
    const voicing = chordVoicing(cfg.root, mode, deg, 3);
    for (let v = 0; v < voicing.length; v++) {
      const f = midiToFreq(voicing[v] + 12);
      addTone(buf, t0, barLen + 0.9, f, {
        partials: [[1, 1], [2, 0.22], [3, 0.09], [4, 0.035]],
        gain: cfg.padGain,
        attack: 0.5,
        decay: 0.9,
        sustain: 0.65,
        release: 1.1,
        detune: -6,
        pan: -0.35,
        vibrato: 0.18,
        vibratoRate: 0.35,
        filter: 2200,
      });
      addTone(buf, t0, barLen + 0.9, f, {
        partials: [[1, 1], [2, 0.18], [3, 0.07]],
        gain: cfg.padGain * 0.9,
        attack: 0.7,
        decay: 0.9,
        sustain: 0.6,
        release: 1.2,
        detune: 7,
        pan: 0.35,
        vibrato: 0.15,
        vibratoRate: 0.28,
        filter: 1800,
      });
    }

    // --- Bass
    const bassNote = midiToFreq(cfg.root - 12 + (deg === 0 ? 0 : 0));
    const pattern = cfg.drums === 'none' ? [0] : [0, 1.5, 2, 3];
    for (const p of pattern) {
      addTone(buf, t0 + p * beat, beat * (cfg.drums === 'none' ? 3.8 : 1.7), bassNote, {
        partials: [[1, 1], [2, 0.3], [3, 0.1]],
        gain: 0.16,
        attack: 0.02,
        decay: 0.4,
        sustain: 0.55,
        release: 0.5,
        filter: 320,
      });
    }

    // --- Arpeggio / pluck layer (eighth notes)
    if (cfg.arp || cfg.pluck) {
      const layer = cfg.arp ?? cfg.pluck;
      const gain = layer.gain;
      const octave = layer.octave ?? 2;
      const soft = Boolean(cfg.pluck?.soft);
      const steps = layer.pattern;
      for (let s = 0; s < 8; s++) {
        if (random() < (soft ? 0.12 : 0.05)) continue;
        const degree = deg + steps[s % steps.length];
        const note = scaleNote(cfg.root, mode, degree) + 12 * octave;
        addTone(buf, t0 + s * beat * 0.5, beat * (soft ? 2.4 : 1.6), midiToFreq(note), {
          partials: soft
            ? [[1, 1], [2, 0.5], [3, 0.18], [5, 0.06]]
            : [[1, 1], [2, 0.35], [3, 0.12], [4, 0.06]],
          gain: gain * (s % 4 === 0 ? 1 : 0.72),
          attack: 0.006,
          decay: 0.5,
          sustain: soft ? 0.22 : 0.3,
          release: 1.2,
          pan: s % 2 ? 0.28 : -0.28,
          filter: soft ? 3200 : 4200,
        });
      }
    }

    // --- Drums
    if (cfg.drums !== 'none') {
      const kickSteps = cfg.drums === 'trip' ? [0, 2.5] : [0, 2];
      for (const k of kickSteps) addKick(buf, t0 + k * beat, 0.34);
      const snareStep = cfg.drums === 'trip' ? 2 : 2;
      addSnare(buf, t0 + snareStep * beat, 0.13, cfg.seed + b);
      const hats = cfg.drums === 'trip' ? 8 : 8;
      for (let h = 0; h < hats; h++) {
        if (h % 2 === 1 && random() < 0.4) continue;
        addHat(buf, t0 + (h * beat) / 2, 0.028, cfg.seed + h + b);
      }
    }

    // --- Sparkles
    if (random() < 0.5) {
      const deg2 = deg + 7;
      const note = scaleNote(cfg.root, mode, deg2) + 24;
      addTone(buf, t0 + random() * barLen, beat * 0.8, midiToFreq(note), {
        partials: [[1, 1], [3, 0.1]],
        gain: 0.018,
        attack: 0.01,
        decay: 0.4,
        sustain: 0.05,
        release: 0.9,
        pan: random() * 1.6 - 0.8,
      });
    }

    // --- Melody (voice-led, quantised to the bar grid)
    if (cfg.melody && b < cfg.melody.length) {
      const [degree, len] = cfg.melody[b];
      const note = scaleNote(cfg.root, mode, degree) + 12;
      addTone(buf, t0, len * beat + 0.4, midiToFreq(note), {
        partials: [[1, 1], [2, 0.2], [3, 0.08]],
        gain: cfg.melodyGain,
        attack: 0.055,
        decay: 0.5,
        sustain: 0.7,
        release: 0.8,
        vibrato: 0.35,
        vibratoRate: 5.2,
        pan: 0.06,
        filter: 3600,
      });
      // octave shimmer
      addTone(buf, t0, len * beat + 0.3, midiToFreq(note + 12), {
        partials: [[1, 1], [2, 0.12]],
        gain: cfg.melodyGain * 0.22,
        attack: 0.12,
        decay: 0.6,
        sustain: 0.4,
        release: 0.7,
        pan: -0.4,
      });
    }
  }

  // --- Ambient textures
  for (const tex of cfg.textures ?? []) {
    if (tex === 'rain') {
      addNoise(buf, 0, total, { gain: 0.05, attack: 1.2, decay: total, highpass: 1800, lowpass: 0.6, seed: 41 });
      // Individual raindrops
      for (let i = 0; i < 220; i++) {
        addNoise(buf, random() * total, 0.05, {
          gain: 0.02 + random() * 0.03,
          decay: 0.02,
          highpass: 3000,
          lowpass: 0.7,
          pan: random() * 2 - 1,
          seed: 400 + i,
        });
      }
    }
    if (tex === 'wind') {
      addNoise(buf, 0, total, { gain: 0.018, attack: 2, decay: total, highpass: 200, lowpass: 0.12, seed: 51 });
    }
    if (tex === 'vinyl') {
      for (let i = 0; i < 150; i++) {
        addNoise(buf, random() * total, 0.02, {
          gain: 0.012 + random() * 0.016,
          decay: 0.008,
          highpass: 2500,
          lowpass: 0.8,
          pan: random() * 2 - 1,
          seed: 600 + i,
        });
      }
    }
    if (tex === 'rail') {
      for (let i = 0; i < 9; i++) {
        const t = 1 + i * (total / 11);
        addNoise(buf, t, 0.6, { gain: 0.022, decay: 0.35, highpass: 400, lowpass: 0.25, seed: 700 + i });
      }
    }
    if (tex === 'stars') {
      for (let i = 0; i < 90; i++) {
        const f = 1800 + random() * 3800;
        addTone(buf, random() * total, 0.9, f, {
          partials: [[1, 1]],
          gain: 0.008 + random() * 0.01,
          attack: 0.2,
          decay: 0.5,
          sustain: 0.1,
          release: 0.7,
          pan: random() * 2 - 1,
        });
      }
    }
    if (tex === 'birds') {
      for (let i = 0; i < 22; i++) {
        const t = random() * total;
        const base = 2600 + random() * 1400;
        addTone(buf, t, 0.12, base, { partials: [[1, 1], [2, 0.2]], gain: 0.018, attack: 0.006, decay: 0.06, sustain: 0.02, release: 0.06, pan: random() * 1.4 - 0.7 });
        addTone(buf, t + 0.1, 0.1, base * 1.18, { partials: [[1, 1]], gain: 0.014, attack: 0.005, decay: 0.05, sustain: 0.02, release: 0.06, pan: random() * 1.4 - 0.7 });
      }
    }
  }

  reverb(buf, { wet: 0.42, decay: 0.82, offset: cfg.seed % 200 });

  // --- Master: gentle lowpass, soft saturation, fade in/out, normalise
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fadeIn = Math.min(1, t / 1.4);
    const fadeOut = Math.min(1, Math.max(0, (total - t) / 2.6));
    const g = fadeIn * fadeOut;
    buf.L[i] = Math.tanh(buf.L[i] * g * 1.1);
    buf.R[i] = Math.tanh(buf.R[i] * g * 1.1);
    peak = Math.max(peak, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  }
  const norm = peak > 0 ? 0.92 / peak : 1;
  for (let i = 0; i < n; i++) {
    buf.L[i] *= norm;
    buf.R[i] *= norm;
  }
  return { buf, duration: total };
}

function encodeMp3(buf, kbps = 96) {
  const enc = new Mp3Encoder(2, SR, kbps);
  const blockSize = 1152;
  const chunks = [];
  const l = new Int16Array(blockSize);
  const r = new Int16Array(blockSize);
  const n = buf.L.length;
  for (let i = 0; i < n; i += blockSize) {
    const len = Math.min(blockSize, n - i);
    for (let j = 0; j < len; j++) {
      l[j] = clamp(Math.round(buf.L[i + j] * 32767), -32768, 32767);
      r[j] = clamp(Math.round(buf.R[i + j] * 32767), -32768, 32767);
    }
    const chunk = enc.encodeBuffer(
      len === blockSize ? l : l.subarray(0, len),
      len === blockSize ? r : r.subarray(0, len),
    );
    if (chunk.length > 0) chunks.push(Buffer.from(chunk));
  }
  const end = enc.flush();
  if (end.length > 0) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {};
  for (const cfg of TRACKS) {
    const started = Date.now();
    const { buf, duration } = renderTrack(cfg);
    const mp3 = encodeMp3(buf);
    await writeFile(resolve(OUT_DIR, `${cfg.file}.mp3`), mp3);
    manifest[cfg.file] = {
      file: `${cfg.file}.mp3`,
      duration: Number(duration.toFixed(2)),
      bytes: mp3.byteLength,
      tempo: cfg.tempo,
      mood: cfg.mood,
    };
    console.log(
      `✓ ${cfg.file}.mp3  ${duration.toFixed(1)}s  ${(mp3.byteLength / 1024).toFixed(0)} KB  (${Date.now() - started} ms)`,
    );
  }
  await writeFile(resolve(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nManifest written to public/audio/manifest.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
