import { useEffect, useState } from 'react';
import { Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverProps {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  rounded?: string;
  priority?: boolean;
  overlay?: boolean;
  sizes?: string;
}

/**
 * Artwork with a blur-up loading skeleton and a graceful gradient fallback.
 * Keeps layout stable so grids never jump while images stream in.
 */
export function Cover({
  src,
  alt,
  className,
  imgClassName,
  rounded = 'rounded-2xl',
  priority = false,
  overlay = false,
  sizes,
}: CoverProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div
      className={cn('cover-frame relative isolate', rounded, className)}
      data-overlay={overlay ? 'true' : 'false'}
    >
      {src && status !== 'error' ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'cover-img',
            status === 'loading' && 'scale-105 opacity-0',
            status === 'loaded' && 'opacity-100',
            imgClassName,
          )}
        />
      ) : null}

      {status === 'loading' ? (
        <div className="absolute inset-0 z-10 overflow-hidden bg-white/[0.04]">
          <div className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.08)_46%,transparent_72%)] bg-[length:200%_100%]" />
        </div>
      ) : null}

      {status === 'error' || !src ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.45),rgba(4,5,12,0.9))]">
          <Disc3 className="size-1/3 max-h-10 max-w-10 text-white/35" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}
