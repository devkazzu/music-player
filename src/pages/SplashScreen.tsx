import { useEffect, useState } from 'react';
import { Headphones, Play, Sparkles } from 'lucide-react';
import { DEMO_TRACKS, HERO_ART } from '@/data/catalog';
import { usePlayer } from '@/state/PlayerProvider';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onEnter: (withMusic: boolean) => void;
}

const PARTICLES = Array.from({ length: 18 }).map((_, index) => ({
  id: index,
  left: `${(index * 37) % 96 + 2}%`,
  size: `${1 + (index % 3)}px`,
  delay: `${(index % 9) * 1.1}s`,
  duration: `${9 + (index % 5) * 2}s`,
  opacity: 0.25 + (index % 4) * 0.15,
}));

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const { playQueue } = usePlayer();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => setReady(true), 700);
    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(timer);
    };
  }, []);

  const enter = (withMusic: boolean) => {
    // Start the queue inside the click gesture so browsers allow audio.
    if (withMusic) playQueue(DEMO_TRACKS, 0, 'HIRO SEGAWA · Original Score');
    setLeaving(true);
    window.setTimeout(() => onEnter(withMusic), 480);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] overflow-hidden bg-[#04050c] transition-all duration-500',
        leaving && 'pointer-events-none scale-[1.03] opacity-0 blur-sm',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to HIRO SEGAWA"
    >
      <img
        src={HERO_ART}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover opacity-70 [animation:float_18s_ease-in-out_infinite]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(4,5,12,0.35),rgba(4,5,12,0.92)_75%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04050c] via-[#04050c]/55 to-[#04050c]/80" />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="float-particle"
            style={{
              left: particle.left,
              bottom: '-10px',
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div className="safe-top relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="animate-[fade_1s_ease_both]">
          <p className="jp text-[10px] text-white/45 sm:text-[11px]">ヒロ・セガワ</p>
          <p className="eyebrow mt-3 text-white/40">A cinematic anime music experience</p>
        </div>

        <h1 className="display mt-5 text-[clamp(2.6rem,9vw,5.6rem)] text-gradient animate-[rise_1.1s_cubic-bezier(0.16,1,0.3,1)_both]">
          HIRO SEGAWA
        </h1>

        <div className="mt-4 flex items-center gap-3 text-white/40">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/30" aria-hidden />
          <Headphones className="size-3.5" aria-hidden />
          <span className="text-[10.5px] uppercase tracking-[0.28em]">Headphones recommended</span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/30" aria-hidden />
        </div>

        <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/55 sm:text-sm">
          Nine original scores, a rain-lit library and a real audio engine. Everything plays from this
          device — no accounts, no streaming required.
        </p>

        <div
          className={cn(
            'mt-9 flex w-full max-w-sm flex-col items-center gap-3 transition-all duration-700',
            ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          )}
        >
          <button
            type="button"
            onClick={() => enter(true)}
            className="btn btn-primary w-full !py-3.5 text-[13.5px]"
            autoFocus
          >
            <Play className="size-4 fill-current" aria-hidden />
            Enter with music
          </button>
          <button type="button" onClick={() => enter(false)} className="btn btn-glass w-full !py-3">
            <Sparkles className="size-4" aria-hidden />
            Just look around
          </button>
          <p className="mt-1 text-[10.5px] leading-relaxed text-white/30">
            Audio only starts after your tap — browsers require it. Volume starts at 80%.
          </p>
        </div>

        <p className="absolute bottom-6 left-0 right-0 px-6 text-[10px] uppercase tracking-[0.2em] text-white/25">
          Original score · Generated artwork · Offline ready
        </p>
      </div>
    </div>
  );
}
