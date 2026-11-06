import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
  right?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="font-display text-[1.6rem] leading-tight text-white sm:text-[1.85rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-mist">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {action ? (
          action.to ? (
            <Link to={action.to} className="btn btn-ghost !px-3 !py-1.5 text-xs">
              {action.label}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className="btn btn-ghost !px-3 !py-1.5 text-xs">
              {action.label}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
