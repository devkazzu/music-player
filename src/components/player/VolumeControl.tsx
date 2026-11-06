import { useEffect, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { usePlayer } from '@/state/PlayerProvider';
import { cn } from '@/lib/utils';

interface VolumeControlProps {
  className?: string;
  showSlider?: boolean;
  compact?: boolean;
}

export function VolumeControl({ className, showSlider = true, compact = false }: VolumeControlProps) {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const [lastVolume, setLastVolume] = useState(volume || 0.8);

  useEffect(() => {
    if (!muted && volume > 0) setLastVolume(volume);
  }, [muted, volume]);

  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 0.5 ? Volume1 : Volume2;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => {
          if (muted || volume === 0) {
            if (volume === 0) setVolume(lastVolume || 0.8);
            if (muted) toggleMute();
          } else {
            toggleMute();
          }
        }}
        aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        className={cn('icon-btn shrink-0', compact ? 'size-8' : 'size-9')}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <Icon className={compact ? 'size-4' : 'size-[18px]'} aria-hidden />
      </button>
      {showSlider ? (
        <Slider
          value={effective}
          max={1}
          step={0.01}
          ariaLabel="Volume"
          showThumbAlways
          onChange={(value) => {
            if (value === 0) {
              setVolume(0);
              return;
            }
            setVolume(value);
          }}
          className="w-20 lg:w-24"
        />
      ) : null}
    </div>
  );
}
