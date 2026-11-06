import { describe, expect, it } from 'vitest';
import { guessFromFileName, isSupportedAudioFile, parseAudioMetadata } from '@/lib/metadata';

const ascii = (value: string): number[] => Array.from(value).map((char) => char.charCodeAt(0));

function id3v23Frame(id: string, text: string): number[] {
  const content = [0x03, ...new TextEncoder().encode(text)]; // UTF-8 text frame
  const size = content.length;
  return [
    ...ascii(id),
    (size >>> 24) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 8) & 0xff,
    size & 0xff,
    0,
    0,
    ...content,
  ];
}

function id3v23Tag(frames: number[]): ArrayBuffer {
  const size = frames.length;
  const syncSafe = [(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f];
  const bytes = [0x49, 0x44, 0x33, 3, 0, 0, ...syncSafe, ...frames];
  return new Uint8Array(bytes).buffer;
}

describe('ID3 parsing', () => {
  it('reads title, artist, album, year and track number', () => {
    const frames = [
      ...id3v23Frame('TIT2', 'Neon Requiem'),
      ...id3v23Frame('TPE1', 'Kaori Amane'),
      ...id3v23Frame('TALB', 'Night Scores'),
      ...id3v23Frame('TYER', '2024'),
      ...id3v23Frame('TRCK', '3/9'),
    ];
    const result = parseAudioMetadata(id3v23Tag(frames), 'whatever.mp3');
    expect(result.title).toBe('Neon Requiem');
    expect(result.artist).toBe('Kaori Amane');
    expect(result.album).toBe('Night Scores');
    expect(result.year).toBe(2024);
    expect(result.trackNumber).toBe(3);
    expect(result.titleFromTag).toBe(true);
  });

  it('falls back to the filename when no tags exist', () => {
    const result = parseAudioMetadata(new Uint8Array([1, 2, 3, 4]).buffer, '02 - Kaori Amane - Ghost in the Rain.mp3');
    expect(result.title).toBe('Ghost in the Rain');
    expect(result.artist).toBe('Kaori Amane');
    expect(result.titleFromTag).toBe(false);
  });

  it('extracts embedded APIC artwork', () => {
    const image = new Uint8Array(200).fill(0xab);
    const mime = [...new TextEncoder().encode('image/jpeg'), 0];
    const content = [0x00, ...mime, 0x03, 0x00, ...image];
    const frame = [
      ...ascii('APIC'),
      (content.length >>> 24) & 0xff,
      (content.length >>> 16) & 0xff,
      (content.length >>> 8) & 0xff,
      content.length & 0xff,
      0,
      0,
      ...content,
    ];
    const result = parseAudioMetadata(id3v23Tag(frame), 'cover.mp3');
    expect(result.coverBlob).toBeInstanceOf(Blob);
    expect(result.coverBlob?.type).toBe('image/jpeg');
    expect(result.coverBlob?.size).toBe(image.length);
  });
});

describe('filename helpers', () => {
  it('guesses artist and title from common patterns', () => {
    expect(guessFromFileName('Yuki Hoshino - Hanabi.mp3')).toEqual({
      artist: 'Yuki Hoshino',
      title: 'Hanabi',
    });
    expect(guessFromFileName('07.rainfall_sonata.wav').title).toBe('rainfall sonata');
  });

  it('validates supported extensions', () => {
    const file = (name: string) => new File([new Uint8Array([1])], name);
    expect(isSupportedAudioFile(file('track.mp3'))).toBe(true);
    expect(isSupportedAudioFile(file('track.flac'))).toBe(true);
    expect(isSupportedAudioFile(file('notes.txt'))).toBe(false);
  });
});
