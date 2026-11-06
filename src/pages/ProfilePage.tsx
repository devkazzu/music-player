import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  Disc3,
  Heart,
  Headphones,
  ListMusic,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { ART, ARTISTS, GENRE_BY_ID } from '@/data/catalog';
import type { UserProfile } from '@/types';
import { Cover } from '@/components/ui/Cover';
import { Modal } from '@/components/ui/Modal';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useLibrary } from '@/state/LibraryProvider';
import { asset } from '@/lib/assets';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDate, formatDuration, formatNumber, formatRelativeTime, pluralize } from '@/lib/utils';

const AVATAR_OPTIONS = [
  ART.portrait,
  ART.neon,
  ART.lanterns,
  ART.rail,
  ART.rain,
  ART.stellar,
  ART.skyline,
  ART.hero,
];

export function ProfilePage() {
  usePageTitle('Profile');
  const {
    profile,
    updateProfile,
    stats,
    favouriteTracks,
    playlists,
    recent,
    recentTracks,
    localTracks,
    tracks,
  } = useLibrary();
  const [editing, setEditing] = useState(false);

  const topArtists = useMemo(() => {
    const counts = new Map<string, { plays: number; name: string }>();
    for (const entry of recent) {
      const track = tracks.find((item) => item.id === entry.trackId);
      if (!track) continue;
      const current = counts.get(track.artistId) ?? { plays: 0, name: track.artist };
      counts.set(track.artistId, { plays: current.plays + entry.playCount, name: track.artist });
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1].plays - a[1].plays)
      .slice(0, 4)
      .map(([id, value]) => ({ id, ...value }));
    if (ranked.length > 0) return ranked;
    return ARTISTS.slice(0, 4).map((artist) => ({ id: artist.id, name: artist.name, plays: 0 }));
  }, [recent, tracks]);

  const minutes = stats.minutes;

  return (
    <div>
      <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/10">
        <img src={ART.street} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04050c] via-[#04050c]/85 to-[#04050c]/50" />
        <div className="relative flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center sm:p-8">
          <div className="relative">
            <Cover
              src={asset(profile.avatar)}
              alt={`${profile.name} avatar`}
              className="size-28 sm:size-32"
              rounded="rounded-full ring-glow"
              priority
            />
            <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border border-white/15 bg-[#0a0f1f]">
              <Headphones className="size-4 text-[var(--accent)]" aria-hidden />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Listener profile</p>
            <h1 className="display mt-1.5 text-[clamp(2rem,5vw,3.4rem)] text-white">{profile.name}</h1>
            <p className="mt-1.5 text-[13px] text-white/60">{profile.tagline}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" aria-hidden />
                Listening since {formatDate(profile.joinedAt)}
              </span>
              <span aria-hidden>·</span>
              <span>{stats.topGenre ? `${GENRE_BY_ID[stats.topGenre]?.label ?? stats.topGenre} is your mood` : 'No genre history yet'}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing(true)} className="btn btn-primary">
                <Pencil className="size-4" aria-hidden />
                Edit profile
              </button>
              <PlayButton
                tracks={recentTracks.length > 0 ? recentTracks : tracks}
                label="Profile · recently played"
                showText="Play my history"
                size="sm"
              />
              <Link to="/settings" className="btn btn-glass">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Minutes listened', value: Math.round(minutes).toString(), hint: formatDuration(minutes), icon: Clock3 },
          { label: 'Tracks in library', value: String(stats.tracks), hint: `${localTracks.length} local`, icon: Disc3 },
          { label: 'Favourites', value: String(favouriteTracks.length), hint: 'saved on device', icon: Heart },
          { label: 'Playlists', value: String(playlists.length), hint: 'custom collections', icon: ListMusic },
        ].map((item) => (
          <div key={item.label} className="glass-soft rounded-2xl p-4">
            <item.icon className="size-4 text-[var(--accent)]" aria-hidden />
            <p className="mt-2.5 font-display text-3xl text-white">{item.value}</p>
            <p className="text-[11.5px] text-white/60">{item.label}</p>
            <p className="mt-0.5 text-[10.5px] text-white/30">{item.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section>
            <SectionHeader
              eyebrow="Most played"
              title="Your top artists"
              action={{ label: 'Explore artists', to: '/explore' }}
            />
            <div className="space-y-1.5">
              {topArtists.map((artist, index) => {
                const artistInfo = ARTISTS.find((item) => item.id === artist.id);
                return (
                  <Link
                    key={artist.id}
                    to={`/artist/${artist.id}`}
                    className="track-row flex items-center gap-3 rounded-xl px-3 py-2"
                  >
                    <span className="w-4 text-[11px] tabular-nums text-white/30">{index + 1}</span>
                    <Cover
                      src={artistInfo?.image ?? ART.portrait}
                      alt=""
                      className="size-10"
                      rounded="rounded-full"
                      overlay={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">{artist.name}</span>
                      <span className="block truncate text-[11px] text-mist">
                        {artistInfo ? formatNumber(artistInfo.monthlyListeners) : 0} monthly listeners
                      </span>
                    </span>
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-white/30">
                      {artist.plays > 0 ? `${artist.plays} plays` : 'recommended'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="History"
              title="Recently played"
              action={{ label: 'Full history', to: '/recent' }}
            />
            {recentTracks.length === 0 ? (
              <p className="glass-soft rounded-2xl p-4 text-[12.5px] text-mist">
                Nothing played yet. Your first listen will appear here.
              </p>
            ) : (
              <div className="space-y-1">
                {recent.slice(0, 4).map((entry) => {
                  const track = recentTracks.find((item) => item.id === entry.trackId);
                  if (!track) return null;
                  return (
                    <Link
                      key={entry.trackId}
                      to={`/album/${track.albumId}`}
                      className="track-row flex items-center gap-3 rounded-xl px-3 py-2"
                    >
                      <Cover src={track.cover} alt="" className="size-10" rounded="rounded-lg" overlay={false} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-white">{track.title}</span>
                        <span className="block truncate text-[11px] text-mist">{track.artist}</span>
                      </span>
                      <span className="text-[10.5px] text-white/35">{formatRelativeTime(entry.playedAt)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="glass relative overflow-hidden rounded-3xl p-5">
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
              aria-hidden
            />
            <p className="eyebrow flex items-center gap-1.5">
              <TrendingUp className="size-3" aria-hidden />
              Top artist
            </p>
            <p className="mt-2 font-display text-2xl text-white">
              {stats.topArtist?.name ?? topArtists[0]?.name ?? 'Not enough data'}
            </p>
            <p className="mt-1 text-[11.5px] text-mist">
              {stats.topArtist
                ? `${pluralize(stats.topArtist.plays, 'play')} recorded`
                : 'Play a few tracks to unlock your statistics.'}
            </p>
            {stats.topGenre ? (
              <Link
                to={`/explore?genre=${stats.topGenre}`}
                className="chip mt-3 !normal-case"
              >
                <Sparkles className="size-3" aria-hidden />
                {GENRE_BY_ID[stats.topGenre]?.label}
              </Link>
            ) : null}
          </div>

          <div className="glass-soft rounded-2xl p-5">
            <p className="eyebrow flex items-center gap-1.5">
              <UserRound className="size-3" aria-hidden />
              Local profile
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-mist">
              HIRO SEGAWA has no accounts and no servers. Your name, avatar, history and files live in this
              browser only.
            </p>
            <button
              type="button"
              onClick={() =>
                updateProfile({
                  name: 'Hiro Segawa',
                  tagline: 'Night-drive listener · Tokyo',
                  avatar: ART.portrait,
                })
              }
              className="btn btn-ghost mt-3 !px-2.5 !py-1.5 text-[11.5px]"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset profile
            </button>
          </div>

          <div className="glass-soft rounded-2xl p-5">
            <p className="eyebrow">Favourite playlists</p>
            {playlists.length === 0 ? (
              <p className="mt-2 text-[12px] text-mist">No playlists yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {playlists.slice(0, 3).map((playlist) => (
                  <li key={playlist.id}>
                    <Link
                      to={`/playlists/${playlist.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-[12px] text-white/75 hover:text-white"
                    >
                      <span className="truncate">{playlist.name}</span>
                      <span className="text-[10px] text-white/30">{playlist.trackIds.length}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <EditProfileModal
        open={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSave={(values) => {
          updateProfile(values);
          setEditing(false);
        }}
      />
    </div>
  );
}

interface EditProfileModalProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (values: Partial<UserProfile>) => void;
}

function EditProfileModal({ open, profile, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline);
  const [avatar, setAvatar] = useState(profile.avatar);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setTagline(profile.tagline);
    setAvatar(profile.avatar);
  }, [open, profile]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="Cosmetic only — everything stays on this device."
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-glass" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim().slice(0, 48), tagline: tagline.trim().slice(0, 80), avatar })}
          >
            <Save className="size-4" aria-hidden />
            Save profile
          </button>
        </>
      }
    >
      <div className="space-y-4 pb-1">
        <label className="block">
          <span className="eyebrow mb-2 block">Display name</span>
          <input
            className="field"
            value={name}
            maxLength={48}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block">Tagline</span>
          <input
            className="field"
            value={tagline}
            maxLength={80}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="e.g. Rainy-night listener"
          />
        </label>
        <div>
          <span className="eyebrow mb-2 block">Avatar</span>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAvatar(option)}
                aria-label={`Use avatar ${option}`}
                aria-pressed={avatar === option}
                className="overflow-hidden rounded-xl border-2 transition"
                style={{ borderColor: avatar === option ? 'var(--accent)' : 'transparent' }}
              >
                <Cover src={option} alt="" className="aspect-square w-full" rounded="rounded-lg" overlay={false} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
