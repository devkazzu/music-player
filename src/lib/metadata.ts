/**
 * Lightweight audio metadata reader.
 *
 * Supports ID3v2.3 / ID3v2.4 (MP3), ID3v1 (tag at end of file), and FLAC
 * VORBIS_COMMENT + PICTURE blocks. Anything it cannot read falls back to a
 * filename guess, so imported files never lose their identity.
 */

export interface ParsedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  trackNumber?: number;
  genre?: string;
  coverBlob?: Blob;
  titleFromTag: boolean;
}

const TAG_LIMIT = 12 * 1024 * 1024; // Reading 12 MB of tags is plenty, and keeps big files fast.

function cleanText(value: string): string {
  return value.replace(/\u0000+/g, '').replace(/\s+/g, ' ').trim();
}

function decodeText(bytes: Uint8Array, encoding: number): string {
  if (bytes.length === 0) return '';
  try {
    switch (encoding) {
      case 0:
        return cleanText(latin1Decode(bytes));
      case 1: {
        if (bytes.length >= 2) {
          const bom = (bytes[0] << 8) | bytes[1];
          if (bom === 0xfffe) return cleanText(new TextDecoder('utf-16le').decode(bytes.subarray(2)));
          if (bom === 0xfeff) return cleanText(new TextDecoder('utf-16be').decode(bytes.subarray(2)));
        }
        return cleanText(new TextDecoder('utf-16le').decode(bytes));
      }
      case 2:
        return cleanText(new TextDecoder('utf-16be').decode(bytes));
      case 3:
        return cleanText(new TextDecoder('utf-8').decode(bytes));
      default:
        return cleanText(latin1Decode(bytes));
    }
  } catch {
    return cleanText(latin1Decode(bytes));
  }
}

function latin1Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function syncSafeToInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function uint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
  ) >>> 0;
}

function findTerminator(bytes: Uint8Array, start: number, doubleByte: boolean): number {
  if (doubleByte) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    }
    return -1;
  }
  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) return i;
  }
  return -1;
}

interface Id3Result {
  metadata: Partial<ParsedMetadata>;
  consumed: number;
}

function parseId3(bytes: Uint8Array): Id3Result | null {
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"

  const version = bytes[3];
  const flags = bytes[5];
  const tagSize = syncSafeToInt(bytes, 6);
  const end = Math.min(bytes.length, 10 + tagSize);
  const metadata: Partial<ParsedMetadata> = {};

  let body = bytes.subarray(10, end);
  if (flags & 0x80) {
    // Unsynchronisation: 0xFF 0x00 → 0xFF
    const out = new Uint8Array(body.length);
    let o = 0;
    for (let i = 0; i < body.length; i += 1) {
      out[o++] = body[i];
      if (body[i] === 0xff && body[i + 1] === 0x00) i += 1;
    }
    body = out.subarray(0, o);
  }
  if (flags & 0x40) {
    // Extended header — skip it.
    if (version >= 4) {
      const extSize = syncSafeToInt(body, 0);
      body = body.subarray(extSize);
    } else if (version === 3) {
      const extSize = uint32(body, 0);
      body = body.subarray(extSize + 4);
    }
  }

  const idLength = version === 2 ? 3 : 4;
  const headerLength = version === 2 ? 6 : 10;
  let offset = 0;

  while (offset + headerLength <= body.length) {
    const id = latin1Decode(body.subarray(offset, offset + idLength));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;

    let frameSize: number;
    if (version === 2) {
      frameSize = (body[offset + 3] << 16) | (body[offset + 4] << 8) | body[offset + 5];
    } else if (version >= 4) {
      frameSize = syncSafeToInt(body, offset + 4);
    } else {
      frameSize = uint32(body, offset + 4);
    }
    if (frameSize <= 0 || offset + headerLength + frameSize > body.length) break;

    const frameFlags = version === 2 ? 0 : (body[offset + 8] << 8) | body[offset + 9];
    const contentStart = offset + headerLength;
    const content = body.subarray(contentStart, contentStart + frameSize);
    const compressed = version >= 3 && (frameFlags & 0x0080) !== 0;
    const encrypted = version >= 3 && (frameFlags & 0x0040) !== 0;

    if (!compressed && !encrypted && content.length > 0) {
      const key = id === 'TIT2' ? 'title' : id === 'TPE1' ? 'artist' : id === 'TALB' ? 'album' : id === 'TT2' ? 'title' : id === 'TP1' ? 'artist' : id === 'TAL' ? 'album' : id;
      if (key === 'title' || key === 'artist' || key === 'album') {
        const value = decodeText(content.subarray(1), content[0]);
        if (value) metadata[key] = value;
      } else if (id === 'TYER' || id === 'TDRC' || id === 'TYE') {
        const value = decodeText(content.subarray(1), content[0]);
        const year = Number.parseInt(value.slice(0, 4), 10);
        if (Number.isFinite(year) && year > 1000) metadata.year = year;
      } else if (id === 'TRCK' || id === 'TRK') {
        const value = decodeText(content.subarray(1), content[0]);
        const track = Number.parseInt(value.split('/')[0], 10);
        if (Number.isFinite(track)) metadata.trackNumber = track;
      } else if (id === 'TCON' || id === 'TCO') {
        const value = decodeText(content.subarray(1), content[0]);
        if (value) metadata.genre = value;
      } else if ((id === 'APIC' || id === 'PIC') && !metadata.coverBlob) {
        const picture = parseApic(content, version === 2);
        if (picture) metadata.coverBlob = picture;
      }
    }

    offset = contentStart + frameSize;
  }

  return { metadata, consumed: end };
}

function parseApic(content: Uint8Array, isV22: boolean): Blob | undefined {
  if (content.length < 8) return undefined;
  const encoding = content[0];
  const doubleByte = encoding === 1 || encoding === 2;
  let cursor = 1;

  let mime = 'image/jpeg';
  if (isV22) {
    // 3-character image format ("JPG" / "PNG")
    const format = latin1Decode(content.subarray(1, 4)).toUpperCase();
    mime = format.includes('PNG') ? 'image/png' : 'image/jpeg';
    cursor = 4;
  } else {
    const mimeEnd = findTerminator(content, cursor, false);
    if (mimeEnd < 0) return undefined;
    const parsed = latin1Decode(content.subarray(cursor, mimeEnd)).trim().toLowerCase();
    if (parsed && parsed !== 'image/') mime = parsed;
    cursor = mimeEnd + 1;
  }

  cursor += 1; // picture type
  const descEnd = findTerminator(content, cursor, doubleByte);
  if (descEnd < 0) return undefined;
  cursor = descEnd + (doubleByte ? 2 : 1);
  if (cursor >= content.length) return undefined;

  const data = content.subarray(cursor);
  if (data.length < 64) return undefined;

  // Copy into a fresh ArrayBuffer — avoids holding on to the whole file.
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return new Blob([copy], { type: mime.startsWith('image/') ? mime : 'image/jpeg' });
}

/* ---------------------------------------------------------------------- FLAC */
function parseFlac(bytes: Uint8Array): Partial<ParsedMetadata> | null {
  if (bytes.length < 4) return null;
  if (latin1Decode(bytes.subarray(0, 4)) !== 'fLaC') return null;

  const metadata: Partial<ParsedMetadata> = {};
  let offset = 4;
  let guard = 0;

  while (offsetsSafe(offset, bytes) && guard < 64) {
    guard += 1;
    const header = bytes[offset];
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const length = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const start = offset + 4;
    const end = start + length;
    if (end > bytes.length) break;

    if (type === 4) {
      const block = bytes.subarray(start, end);
      // vendor length (LE uint32) + vendor string, then comment count (LE uint32)
      let cursor = 0;
      if (block.length < 8) break;
      const vendorLength = block[0] | (block[1] << 8) | (block[2] << 16) | (block[3] << 24);
      cursor = 4 + vendorLength;
      if (cursor + 4 > block.length) break;
      const count =
        block[cursor] | (block[cursor + 1] << 8) | (block[cursor + 2] << 16) | (block[cursor + 3] << 24);
      cursor += 4;
      for (let i = 0; i < count && cursor + 4 <= block.length; i += 1) {
        const len =
          block[cursor] | (block[cursor + 1] << 8) | (block[cursor + 2] << 16) | (block[cursor + 3] << 24);
        cursor += 4;
        if (len <= 0 || cursor + len > block.length) break;
        const entry = new TextDecoder('utf-8').decode(block.subarray(cursor, cursor + len));
        cursor += len;
        const eq = entry.indexOf('=');
        if (eq < 0) continue;
        const key = entry.slice(0, eq).toUpperCase();
        const value = cleanText(entry.slice(eq + 1));
        if (!value) continue;
        if (key === 'TITLE') metadata.title = value;
        else if (key === 'ARTIST') metadata.artist = value;
        else if (key === 'ALBUM') metadata.album = value;
        else if (key === 'DATE' || key === 'YEAR') {
          const year = Number.parseInt(value.slice(0, 4), 10);
          if (Number.isFinite(year) && year > 1000) metadata.year = year;
        } else if (key === 'TRACKNUMBER') {
          const track = Number.parseInt(value.split('/')[0], 10);
          if (Number.isFinite(track)) metadata.trackNumber = track;
        } else if (key === 'GENRE') {
          metadata.genre = value;
        }
      }
    } else if (type === 6 && !metadata.coverBlob) {
      const block = bytes.subarray(start, end);
      let cursor = 0;
      const mimeLength = (block[cursor] << 24) | (block[cursor + 1] << 16) | (block[cursor + 2] << 8) | block[cursor + 3];
      cursor += 4;
      if (mimeLength <= 0 || cursor + mimeLength + 4 > block.length) break;
      const mime = latin1Decode(block.subarray(cursor, cursor + mimeLength));
      cursor += mimeLength;
      const descLength =
        (block[cursor] << 24) | (block[cursor + 1] << 16) | (block[cursor + 2] << 8) | block[cursor + 3];
      cursor += 4 + descLength + 16; // description + width/height/depth/colors
      if (cursor + 4 > block.length) break;
      const dataLength =
        (block[cursor] << 24) | (block[cursor + 1] << 16) | (block[cursor + 2] << 8) | block[cursor + 3];
      cursor += 4;
      if (dataLength > 0 && cursor + dataLength <= block.length) {
        const copy = new Uint8Array(block.subarray(cursor, cursor + dataLength));
        metadata.coverBlob = new Blob([copy], { type: mime || 'image/jpeg' });
      }
    }

    if (isLast) break;
    offset = end;
  }

  return metadata;
}

function offsetsSafe(offset: number, bytes: Uint8Array): boolean {
  return offset + 4 <= bytes.length;
}

/* ------------------------------------------------------------------ fallbacks */
export function guessFromFileName(fileName: string): { title: string; artist?: string } {
  const base = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/_/g, ' ')
    .trim();
  const split = base.split(/\s+-\s+/);
  if (split.length >= 2 && split[0].trim() && split[1].trim()) {
    return { artist: cleanText(split[0]), title: cleanText(split.slice(1).join(' - ')) };
  }
  return { title: base || 'Untitled track' };
}

export function parseAudioMetadata(buffer: ArrayBuffer, fileName: string): ParsedMetadata {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, TAG_LIMIT));
  const guessed = guessFromFileName(fileName);

  let parsed: Partial<ParsedMetadata> = {};
  try {
    if (latin1Decode(bytes.subarray(0, 4)) === 'fLaC') {
      parsed = parseFlac(bytes) ?? {};
    } else {
      const id3 = parseId3(bytes);
      if (id3) parsed = id3.metadata;
      if (!parsed.title || !parsed.artist || !parsed.album) {
        const v1 = parseId3v1(buffer);
        parsed = {
          title: parsed.title ?? v1.title,
          artist: parsed.artist ?? v1.artist,
          album: parsed.album ?? v1.album,
          year: parsed.year ?? v1.year,
          coverBlob: parsed.coverBlob,
          trackNumber: parsed.trackNumber,
          genre: parsed.genre,
        };
      }
    }
  } catch {
    parsed = {};
  }

  const title = parsed.title?.trim() || guessed.title;
  return {
    title,
    artist: parsed.artist?.trim() || guessed.artist,
    album: parsed.album?.trim(),
    year: parsed.year,
    trackNumber: parsed.trackNumber,
    genre: parsed.genre,
    coverBlob: parsed.coverBlob,
    titleFromTag: Boolean(parsed.title?.trim()),
  };
}

function parseId3v1(buffer: ArrayBuffer): {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
} {
  if (buffer.byteLength < 128) return {};
  const bytes = new Uint8Array(buffer, buffer.byteLength - 128, 128);
  if (latin1Decode(bytes.subarray(0, 3)) !== 'TAG') return {};
  const read = (start: number, length: number) =>
    cleanText(latin1Decode(bytes.subarray(start, start + length)));
  const yearText = read(93, 4);
  const year = Number.parseInt(yearText, 10);
  return {
    title: read(3, 30) || undefined,
    artist: read(33, 30) || undefined,
    album: read(63, 30) || undefined,
    year: Number.isFinite(year) && year > 1000 ? year : undefined,
  };
}

/** Uses a short-lived HTMLAudioElement to read the real duration of a file. */
export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    let settled = false;

    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() => resolve(0));
    }, 20_000);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      finish(() => resolve(duration));
    };
    audio.onerror = () => {
      finish(() => reject(new Error('This audio format is not supported by your browser.')));
    };
    audio.src = url;
  });
}

export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.opus',
  '.m4a',
  '.aac',
  '.flac',
  '.webm',
];

export function isSupportedAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  const lower = file.name.toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
