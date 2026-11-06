import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-soft flex flex-col items-center justify-center rounded-3xl border-dashed px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <div
          className="absolute inset-0 rounded-2xl opacity-60 blur-xl"
          style={{ background: 'radial-gradient(circle, var(--accent-soft), transparent 70%)' }}
          aria-hidden
        />
        <Icon className="relative size-6 text-white/70" aria-hidden />
      </div>
      <h3 className="font-display text-xl text-white">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-mist">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
