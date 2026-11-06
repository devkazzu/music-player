import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Database,
  Download,
  Gauge,
  HardDrive,
  Keyboard,
  Monitor,
  Music4,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  MotionPreference,
  PerformanceMode,
  RepeatMode,
  SakuraIntensity,
  VisualizerStyle,
} from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Slider } from '@/components/ui/Slider';
import { Visualizer } from '@/components/player/Visualizer';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePageTitle } from '@/hooks/usePageTitle';
import { dbPersistStorage } from '@/lib/db';
import { THEMES } from '@/lib/themes';
import { clearEntered } from '@/lib/storage';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useUI } from '@/state/UIContext';
import { cn, formatBytes, formatNumber, pluralize } from '@/lib/utils';

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play / pause'],
  ['← / →', 'Seek 5 seconds'],
  ['↑ / ↓', 'Volume up / down'],
  ['N / P', 'Next / previous track'],
  ['M', 'Mute / unmute'],
  ['S', 'Shuffle'],
  ['R', 'Cycle repeat mode'],
  ['F', 'Favourite current track'],
  ['Q', 'Toggle queue'],
  ['/', 'Open search'],
  ['Esc', 'Close full-screen player'],
];

export function SettingsPage() {
  usePageTitle('Settings');
  const { settings, update, reset } = useSettings();
  const { volume, muted, setVolume } = usePlayer();
  const {
    clearRecent,
    clearFavourites,
    clearPlaylists,
    eraseLibrary,
    getStorageEstimate,
    localTracks,
    playlists,
    favourites,
    stats,
    profile,
  } = useLibrary();
  const { toast } = useUI();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [confirm, setConfirm] = useState<null | 'history' | 'favourites' | 'playlists' | 'library' | 'settings'>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [persisted, setPersisted] = useState(false);

  const runConfirmedAction = async () => {
    if (!confirm) return;
    if (confirm === 'history') await clearRecent();
    if (confirm === 'favourites') await clearFavourites();
    if (confirm === 'playlists') await clearPlaylists();
    if (confirm === 'library') await eraseLibrary();
    if (confirm === 'settings') {
      reset();
      toast({ title: 'Settings restored to defaults', tone: 'default' });
    }
    setConfirm(null);
  };

  useEffect(() => {
    void getStorageEstimate().then(setStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTracks.length, favourites.length, playlists.length]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const exportData = () => {
    const payload = {
      app: 'HIRO SEGAWA',
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      favourites,
      playlists,
      localTracks: localTracks.map((track) => ({
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        fileName: track.fileName,
        size: track.size,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hiro-segawa-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast({ title: 'Library exported', description: 'A JSON snapshot was downloaded.', tone: 'success' });
  };

  const replayIntro = () => {
    clearEntered();
    window.dispatchEvent(new CustomEvent('hiro:replay-intro'));
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Audio, appearance, data and privacy — every switch here changes the app immediately and persists on this device."
      />

      {/* ------------------------------------------------------------ appearance */}
      <section className="mb-6">
        <SectionTitle
          icon={Palette}
          title="Appearance"
          description="Sakura Dream themes, glow and motion."
        />
        <div className="glass divide-y divide-white/6 rounded-2xl">
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] text-white">Theme</p>
              <p className="text-[11px] text-white/40">
                Recolours the night scene, petals, glows and controls.
              </p>
            </div>
            <div className="theme-grid mt-3">
              {THEMES.map((theme) => {
                const active = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => update({ theme: theme.id })}
                    aria-pressed={active}
                    data-active={active}
                    className="theme-card bg-white/[0.03]"
                  >
                    <span
                      className="theme-card-preview block"
                      style={{
                        background: `linear-gradient(160deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 58%, ${theme.swatch[2]} 100%)`,
                      }}
                      aria-hidden
                    >
                      <span
                        className="absolute right-2 top-2 size-3 rounded-full"
                        style={{ background: theme.swatch[2], boxShadow: `0 0 12px ${theme.swatch[2]}` }}
                      />
                    </span>
                    <span className="flex items-center justify-between gap-1.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[11.5px] font-medium text-white">
                          {theme.label}
                        </span>
                        <span className="jp mt-0.5 block truncate text-[9px] tracking-[0.2em] text-white/45">
                          {theme.jp}
                        </span>
                      </span>
                      {active ? <Check className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <SettingRow
            label="Glow intensity"
            description="Strength of the neon halos on controls, artwork and petals."
          >
            <div className="flex w-full items-center gap-3 sm:w-56">
              <Slider
                value={settings.glow}
                max={1.6}
                step={0.05}
                ariaLabel="Glow intensity"
                onChange={(value) => update({ glow: Math.max(0.4, value) })}
              />
              <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-white/50">
                {Math.round(settings.glow * 100)}%
              </span>
            </div>
          </SettingRow>

          <SettingRow
            label="Motion"
            description="Respect reduced-motion settings, or force calmer transitions."
          >
            <SegmentedControl<MotionPreference>
              options={[
                { value: 'system', label: 'System' },
                { value: 'full', label: 'Full' },
                { value: 'reduced', label: 'Reduced' },
              ]}
              value={settings.motion}
              onChange={(value) => update({ motion: value })}
              ariaLabel="Motion preference"
            />
          </SettingRow>

          <SettingRow
            label="Visualizer"
            description="Audio-reactive canvas on the full-screen player."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Toggle
                checked={settings.visualizer}
                onChange={(checked) => update({ visualizer: checked })}
                label="Enable visualizer"
              />
              <SegmentedControl<VisualizerStyle>
                options={[
                  { value: 'bars', label: 'Bars' },
                  { value: 'wave', label: 'Wave' },
                  { value: 'aura', label: 'Aura' },
                ]}
                value={settings.visualizerStyle}
                onChange={(value) => update({ visualizerStyle: value })}
                ariaLabel="Visualizer style"
                disabled={!settings.visualizer}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* ------------------------------------------------------------ atmosphere */}
      <section className="mb-6">
        <SectionTitle
          icon={Sparkles}
          title="Sakura atmosphere"
          description="Petals, night-scene motion and performance."
        />
        <div className="glass divide-y divide-white/6 rounded-2xl">
          <SettingRow
            label="Sakura petals"
            description="Continuous falling petals, light motes and sparkles on every screen."
          >
            <Toggle
              checked={settings.sakura}
              onChange={(checked) => update({ sakura: checked })}
              label="Sakura petals"
            />
          </SettingRow>

          <SettingRow
            label="Petal intensity"
            description="Density of the petal field. Auto-adapts on slower devices."
          >
            <SegmentedControl<SakuraIntensity>
              options={[
                { value: 'gentle', label: 'Gentle' },
                { value: 'normal', label: 'Normal' },
                { value: 'heavy', label: 'Heavy' },
              ]}
              value={settings.sakuraIntensity}
              onChange={(value) => update({ sakuraIntensity: value })}
              ariaLabel="Petal intensity"
              disabled={!settings.sakura}
            />
          </SettingRow>

          <SettingRow
            label="Background animation"
            description="Slow moon drift, fog and blossom swaying."
          >
            <Toggle
              checked={settings.backgroundAnimation}
              onChange={(checked) => update({ backgroundAnimation: checked })}
              label="Background animation"
            />
          </SettingRow>

          <SettingRow
            label="Performance mode"
            description="Auto trims the petal budget if the frame rate drops."
          >
            <SegmentedControl<PerformanceMode>
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'quality', label: 'Quality' },
                { value: 'battery', label: 'Battery' },
              ]}
              value={settings.performanceMode}
              onChange={(value) => update({ performanceMode: value })}
              ariaLabel="Performance mode"
            />
          </SettingRow>
        </div>
      </section>

      {/* -------------------------------------------------------------- playback */}
      <section className="mb-6">
        <SectionTitle icon={SlidersHorizontal} title="Playback" description="Defaults applied across sessions." />
        <div className="glass divide-y divide-white/6 rounded-2xl">
          <SettingRow label="Volume" description="Saved automatically and applied on launch.">
            <div className="flex items-center gap-3">
              <Volume2 className="size-4 shrink-0 text-white/45" aria-hidden />
              <Slider
                value={muted ? 0 : volume}
                max={1}
                step={0.01}
                ariaLabel="Default volume"
                showThumbAlways
                onChange={(value) => setVolume(value)}
                className="w-40"
              />
              <span className="w-9 text-right text-[11px] tabular-nums text-white/50">
                {Math.round((muted ? 0 : volume) * 100)}%
              </span>
            </div>
          </SettingRow>

          <SettingRow label="Playback speed" description="Applies immediately, including the current track.">
            <div className="flex flex-wrap gap-1.5">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => update({ rate })}
                  className="chip"
                  data-selected={settings.rate === rate}
                >
                  {rate}×
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Repeat mode" description="Default repeat behaviour for new queues.">
            <SegmentedControl<RepeatMode>
              options={[
                { value: 'off', label: 'Off' },
                { value: 'all', label: 'All' },
                { value: 'one', label: 'One' },
              ]}
              value={settings.repeat}
              onChange={(value) => update({ repeat: value })}
              ariaLabel="Repeat mode"
            />
          </SettingRow>

          <SettingRow label="Shuffle" description="Start queues in a random order.">
            <Toggle
              checked={settings.shuffle}
              onChange={(checked) => update({ shuffle: checked })}
              label="Shuffle by default"
            />
          </SettingRow>

          <SettingRow
            label="Resume last track"
            description="Restore your queue and position when the app reopens (paused)."
          >
            <Toggle
              checked={settings.resumeLastTrack}
              onChange={(checked) => update({ resumeLastTrack: checked })}
              label="Resume last track"
            />
          </SettingRow>

          <SettingRow label="Desktop queue panel" description="Show the queue beside the content on large screens.">
            <Toggle
              checked={settings.showQueue}
              onChange={(checked) => update({ showQueue: checked })}
              label="Show queue panel"
            />
          </SettingRow>

          <div className="p-4 sm:p-5">
            <p className="eyebrow mb-2">Visualizer preview</p>
            {settings.visualizer ? (
              <Visualizer variant={settings.visualizerStyle} className="h-16 w-full rounded-xl bg-black/25" compact />
            ) : (
              <p className="text-[12px] text-white/40">Visualizer disabled — enable it above to see a preview.</p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ data */}
      <section className="mb-6">
        <SectionTitle icon={Database} title="Data & storage" description="Everything is stored locally in IndexedDB." />
        <div className="glass divide-y divide-white/6 rounded-2xl">
          <SettingRow label="Storage used" description={`${pluralize(localTracks.length, 'imported track')} · ${pluralize(playlists.length, 'playlist')} · ${pluralize(favourites.length, 'favourite')}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12px] tabular-nums text-white/70">
                {formatBytes(storage.usage)}
                {storage.quota > 0 ? <span className="text-white/35"> / {formatBytes(storage.quota)}</span> : null}
              </span>
              <button
                type="button"
                className="btn btn-glass !px-3 !py-1.5 text-[11px]"
                onClick={async () => {
                  const ok = await dbPersistStorage();
                  setPersisted(ok);
                  toast({
                    title: ok ? 'Persistent storage granted' : 'Persistent storage not granted',
                    description: ok
                      ? 'Your browser will try to keep your imported music.'
                      : 'The browser may evict data under heavy storage pressure.',
                    tone: ok ? 'success' : 'info',
                  });
                }}
              >
                <HardDrive className="size-3.5" aria-hidden />
                {persisted ? 'Protected' : 'Request persistence'}
              </button>
            </div>
          </SettingRow>

          <SettingRow label="Offline status" description="Local playback works without a connection.">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]',
                online
                  ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/12 bg-white/[0.04] text-white/60',
              )}
            >
              {online ? <Wifi className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
              {online ? 'Online — offline caching active' : 'Offline — local audio available'}
            </span>
          </SettingRow>

          <SettingRow label="Export library snapshot" description="Playlists, favourites and metadata as JSON (audio is not included).">
            <button type="button" onClick={exportData} className="btn btn-glass !px-3 !py-1.5 text-[11.5px]">
              <Download className="size-3.5" aria-hidden />
              Export JSON
            </button>
          </SettingRow>

          <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
            <DangerButton icon={Activity} label="Clear listening history" onClick={() => setConfirm('history')} />
            <DangerButton icon={Sparkles} label="Clear favourites" onClick={() => setConfirm('favourites')} />
            <DangerButton icon={Music4} label="Delete all playlists" onClick={() => setConfirm('playlists')} />
            <DangerButton icon={Trash2} label="Erase local library" onClick={() => setConfirm('library')} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- app */}
      <section className="mb-6">
        <SectionTitle icon={Monitor} title="App" description="Installation, intro and about." />
        <div className="glass divide-y divide-white/6 rounded-2xl">
          <SettingRow label="Install HIRO SEGAWA" description="Add the app to your home screen for offline playback.">
            {isInstalled ? (
              <span className="chip !normal-case" data-selected="true">
                <Check className="size-3" aria-hidden />
                Installed
              </span>
            ) : canInstall ? (
              <button
                type="button"
                className="btn btn-primary !px-3.5 !py-2 text-[12px]"
                onClick={async () => {
                  const ok = await promptInstall();
                  toast({
                    title: ok ? 'Installing…' : 'Installation dismissed',
                    tone: ok ? 'success' : 'info',
                  });
                }}
              >
                <Download className="size-3.5" aria-hidden />
                Install app
              </button>
            ) : (
              <span className="text-[11.5px] text-white/45">
                Use your browser menu → “Install app” or “Add to Home screen”.
              </span>
            )}
          </SettingRow>

          <SettingRow label="Replay the intro" description="Watch the cinematic splash screen again.">
            <button type="button" onClick={replayIntro} className="btn btn-glass !px-3 !py-1.5 text-[11.5px]">
              <Sparkles className="size-3.5" aria-hidden />
              Replay intro
            </button>
          </SettingRow>

          <SettingRow label="Keyboard shortcuts" description="Works anywhere except while typing.">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
              {SHORTCUTS.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-white/45">{label}</span>
                  <kbd className="rounded border border-white/12 bg-white/[0.05] px-1.5 py-0.5 font-sans text-[10px] text-white/60">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Restore defaults" description="Resets appearance and playback preferences.">
            <button type="button" onClick={() => setConfirm('settings')} className="btn btn-glass !px-3 !py-1.5 text-[11.5px]">
              <RotateCcw className="size-3.5" aria-hidden />
              Reset settings
            </button>
          </SettingRow>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-[11px] text-white/35 sm:p-5">
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="size-3.5" aria-hidden />
              HIRO SEGAWA v1.0.0 · React + TypeScript · Web Audio API
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden />
              {formatNumber(stats.tracks)} tracks · {Math.round(stats.minutes)} minutes listened
            </span>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title={
          confirm === 'history'
            ? 'Clear listening history?'
            : confirm === 'favourites'
              ? 'Clear all favourites?'
              : confirm === 'playlists'
                ? 'Delete all playlists?'
                : confirm === 'library'
                  ? 'Erase the local library?'
                  : 'Restore default settings?'
        }
        description={
          confirm === 'history'
            ? 'Your recent plays will be removed. Tracks and playlists stay untouched.'
            : confirm === 'favourites'
              ? 'Every hearted track will be un-favourited. Tracks stay in the library.'
              : confirm === 'playlists'
                ? 'All playlists, including curated starters you edited, will be deleted. Tracks stay.'
                : confirm === 'library'
                  ? 'Imported audio files, playlists, favourites and history will be permanently deleted from this browser.'
                  : 'Accent colour, motion, visualizer and playback defaults return to their original values.'
        }
        confirmLabel="Confirm"
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirmedAction()}
      />
    </div>
  );
}

/* --------------------------------------------------------------- sub-components */

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Palette;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Icon className="size-3.5 text-[var(--accent)]" aria-hidden />
      </span>
      <div>
        <h2 className="text-[14px] font-medium text-white">{title}</h2>
        <p className="text-[11.5px] text-white/40">{description}</p>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 sm:max-w-[46%]">
        <p className="text-[13px] text-white">{label}</p>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{description}</p> : null}
      </div>
      <div className="sm:flex sm:justify-end">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5', disabled && 'opacity-50')}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-[11.5px] transition',
            value === option.value ? 'bg-white text-[#04060f]' : 'text-white/60 hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        checked
          ? 'border-transparent bg-[var(--accent)]'
          : 'border-white/15 bg-white/[0.08]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[1.35rem]' : 'translate-x-0.5',
        )}
        style={{ width: '1.125rem', height: '1.125rem' }}
        aria-hidden
      />
    </button>
  );
}

function DangerButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Palette;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left text-[12px] text-white/65 transition hover:border-rose-400/25 hover:bg-rose-500/[0.08] hover:text-rose-200"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
