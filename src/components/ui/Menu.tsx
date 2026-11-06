import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  trigger: (props: {
    onClick: (event: React.MouseEvent) => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  }) => ReactNode;
  align?: 'left' | 'right';
  label?: string;
  className?: string;
}

/** A small, accessible popover menu with click-outside + Escape support. */
export function Menu({ items, trigger, align = 'right', label = 'Actions', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        containerRef.current?.querySelector<HTMLElement>('[data-menu-trigger]')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => buttonRefs.current[0]?.focus(), 40);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const current = buttonRefs.current.findIndex((button) => button === document.activeElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (current + delta + items.length) % items.length;
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({
        onClick: (event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        },
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })}

      {open ? (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute top-[calc(100%+6px)] z-50 min-w-52 animate-[rise_0.22s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-2xl border border-white/12 bg-[#0a0f1f]/97 p-1.5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.95)] backdrop-blur-2xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, itemIndex) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.separatorBefore ? <div className="my-1 h-px bg-white/8" /> : null}
                <button
                  ref={(node) => {
                    buttonRefs.current[itemIndex] = node;
                  }}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-white/82 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40',
                    item.danger && 'text-rose-300 hover:bg-rose-500/12 hover:text-rose-200',
                  )}
                >
                  {Icon ? <Icon className="size-4 shrink-0 opacity-80" aria-hidden /> : null}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
