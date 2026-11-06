import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ParticlesProps {
  count?: number;
  className?: string;
  seed?: number;
  tone?: 'light' | 'accent';
}

/** Lightweight CSS particles — no canvas, no rAF, reduced-motion friendly. */
export function Particles({ count = 18, className, seed = 1, tone = 'light' }: ParticlesProps) {
  const particles = useMemo(() => {
    let state = seed * 9301 + 49297;
    const random = () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
    return Array.from({ length: count }).map((_, index) => ({
      id: index,
      left: `${random() * 100}%`,
      size: `${1 + random() * 2.5}px`,
      delay: `${random() * 12}s`,
      duration: `${10 + random() * 14}s`,
      opacity: 0.2 + random() * 0.5,
    }));
  }, [count, seed]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="float-particle"
          style={{
            left: particle.left,
            bottom: '-6px',
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            background: tone === 'accent' ? 'var(--accent)' : 'rgba(255,255,255,0.8)',
          }}
        />
      ))}
    </div>
  );
}
