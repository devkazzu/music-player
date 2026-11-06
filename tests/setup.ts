import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// --- browser APIs jsdom does not implement -----------------------------------
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error – test stub
window.ResizeObserver = ResizeObserverStub;

if (!HTMLCanvasElement.prototype.getContext) {
  // @ts-expect-error – test stub
  HTMLCanvasElement.prototype.getContext = () => null;
} else {
  // @ts-expect-error – jsdom throws "not implemented" for canvas
  HTMLCanvasElement.prototype.getContext = () => null;
}

if (!URL.createObjectURL) {
  // @ts-expect-error – test stub
  URL.createObjectURL = () => 'blob:mock-url';
  // @ts-expect-error – test stub
  URL.revokeObjectURL = () => undefined;
}

// --- media element stubs ------------------------------------------------------
// jsdom implements neither playback nor the `paused` state transition, so we
// model just enough of the HTMLMediaElement contract for the engine to work.
const pausedState = new WeakMap<HTMLMediaElement, boolean>();

Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
  configurable: true,
  get(this: HTMLMediaElement) {
    return pausedState.get(this) ?? true;
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: function play(this: HTMLMediaElement) {
    pausedState.set(this, false);
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: function pause(this: HTMLMediaElement) {
    pausedState.set(this, true);
    this.dispatchEvent(new Event('pause'));
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, 'scrollTo', { writable: true, value: vi.fn() });

if (!navigator.storage) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: async () => ({ usage: 1024, quota: 1024 * 1024 }),
      persist: async () => true,
    },
  });
}
