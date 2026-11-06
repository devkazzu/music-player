import type { ReactNode } from 'react';
import { Cover } from './Cover';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  image?: string;
  imageAlt?: string;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}

/** Shared page banner used by Explore, Soundtracks, Lofi, Favourites, etc. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  image,
  imageAlt,
  compact = false,
  children,
  className,
}: PageHeaderProps) {
  if (!image) {
    return (
      <header className={cn('mb-7', className)}>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="display text-[clamp(2rem,5vw,3.2rem)] text-white">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist">{description}</p>
        ) : null}
        {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        {children}
      </header>
    );
  }

  return (
    <header
      className={cn(
        'relative mb-7 overflow-hidden rounded-3xl border border-white/10',
        compact ? 'min-h-[168px]' : 'min-h-[240px] sm:min-h-[280px]',
        className,
      )}
    >
      <Cover
        src={image}
        alt={imageAlt ?? ''}
        className="absolute inset-0 size-full"
        rounded="rounded-3xl"
        priority
        overlay={false}
        imgClassName="scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(4,5,12,0.94)_0%,rgba(4,5,12,0.78)_45%,rgba(4,5,12,0.35)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04050c] via-transparent to-transparent opacity-80" />
      <div className="relative flex h-full flex-col justify-end gap-3 p-5 sm:p-8">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display max-w-2xl text-[clamp(2rem,5.4vw,3.6rem)] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-[13px] leading-relaxed text-white/65 sm:text-sm">{description}</p>
        ) : null}
        {actions ? <div className="mt-2 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        {children}
      </div>
    </header>
  );
}
