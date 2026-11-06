import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/storage';

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  reducedMotion: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accent;
    const resolved =
      settings.motion === 'reduced' ? 'true' : settings.motion === 'full' ? 'false' : 'system';
    if (resolved === 'true') root.dataset.reduceMotion = 'true';
    else if (resolved === 'false') root.dataset.reduceMotion = 'false';
    else delete root.dataset.reduceMotion;

    const themeColor = root.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute(
        'content',
        settings.accent === 'cyan'
          ? '#05060f'
          : settings.accent === 'violet'
            ? '#0a0716'
            : settings.accent === 'sakura'
              ? '#12060f'
              : '#0f0b06',
      );
    }
  }, [settings.accent, settings.motion]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const reducedMotion =
    settings.motion === 'reduced' ? true : settings.motion === 'full' ? false : systemReducedMotion;

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, reducedMotion }),
    [settings, update, reset, reducedMotion],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}
