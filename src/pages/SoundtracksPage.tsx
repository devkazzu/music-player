import { useMemo } from 'react';
import { Clapperboard, Play, Sparkles } from 'lucide-react';
import { ALBUMS, ART, ARTISTS } from '@/data/catalog';
import { AlbumCard, ArtistCard } from '@/components/cards/Cards';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, pluralize } from '@/lib/utils';

export function SoundtracksPage() {
  usePageTitle('Anime Soundtracks');
  const { tracks } = useLibrary();
  const { playQueue } = usePlayer();

  const cinematic = useMemo(
    () => tracks.filter((track) => track.genres.includes('cinematic') || track.genres.includes('synthwave')),
    [tracks],
  );
  const piano = useMemo(
    () => tracks.filter((track) => track.genres.includes('piano') || track.genres.includes('ambient')),
    [tracks],
  );
  const night = useMemo(
    () => tracks.filter((track) => track.moods.includes('night-drive') || track.moods.includes('city-lights')),
    [tracks],
  );

  const total = tracks.reduce((sum, track) => sum + track.duration, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Anime soundtracks"
        title="Scores for scenes that never happened"
        description="Widescreen strings, neon arpeggios and piano themes written for the moment a train disappears into the rain. Every track is an original composition."
        image={ART.hero}
        imageAlt="Anime rooftop overlooking a neon city at night"
        actions={
          <>
            <PlayButton
              tracks={cinematic}
              label="Anime Soundtracks"
              showText="Play the score"
              variant="solid"
              size="sm"
            />
            <button
              type="button"
              onClick={() => playQueue(tracks, 0, 'Complete soundtrack catalogue')}
              className="btn btn-glass"
            >
              <Clapperboard className="size-4" aria-hidden />
              Entire catalogue · {formatDuration(total)}
            </button>
          </>
        }
      >
        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
          <Sparkles className="size-3" aria-hidden />
          {pluralize(ALBUMS.length, 'release')} · {pluralize(tracks.length, 'track')} · composed for HIRO SEGAWA
        </p>
      </PageHeader>

      <section className="mb-9">
        <SectionHeader
          eyebrow="Main themes"
          title="Opening sequences"
          description="The big, wide-screen pieces — cinematic and synthwave."
          action={{ label: 'Explore genre', to: '/explore?genre=cinematic' }}
        />
        <div className="glass rounded-2xl p-2 sm:p-3">
          <TrackList tracks={cinematic} label="Anime Soundtracks · Opening themes" />
        </div>
      </section>

      <section className="mb-9 grid gap-5 lg:grid-cols-2">
        <div>
          <SectionHeader eyebrow="Quiet cues" title="Piano interludes" />
          <div className="glass rounded-2xl p-2 sm:p-3">
            <TrackList tracks={piano} label="Anime Soundtracks · Piano interludes" showAlbum={false} />
          </div>
        </div>
        <div>
          <SectionHeader eyebrow="After dark" title="Night sequences" />
          <div className="glass rounded-2xl p-2 sm:p-3">
            <TrackList tracks={night} label="Anime Soundtracks · Night sequences" showAlbum={false} />
          </div>
        </div>
      </section>

      <section className="mb-9">
        <SectionHeader
          eyebrow="Releases"
          title="Soundtrack albums"
          action={{ label: 'All albums', to: '/explore' }}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {ALBUMS.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader eyebrow="Composers" title="The artists behind the score" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {ARTISTS.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </section>

      <div className="glass-soft flex flex-col items-start gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-white">Need a different atmosphere?</p>
          <p className="mt-0.5 text-[12px] text-mist">
            The Lofi Collection pairs these moods with a working focus timer.
          </p>
        </div>
        <PlayButton
          tracks={piano}
          label="Piano interludes"
          showText="Play interludes"
          size="sm"
          className="!px-4 !py-2 text-[12px]"
        />
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[10.5px] text-white/25">
        <Play className="size-3" aria-hidden />
        Queue playback continues while you browse every other screen.
      </p>
    </div>
  );
}
