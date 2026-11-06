import { useId, type CSSProperties } from 'react';
import { cn, percent } from '@/lib/utils';

interface SliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  ariaLabel: string;
  step?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'lg';
  showThumbAlways?: boolean;
}

/** Styled native range input — accessible by default, themed via CSS variables. */
export function Slider({
  value,
  max,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
  ariaLabel,
  step = 0.01,
  disabled = false,
  className,
  size = 'sm',
  showThumbAlways = false,
}: SliderProps) {
  const id = useId();
  const progress = percent(value, max);
  const style = { '--range-progress': `${progress}%` } as CSSProperties;

  return (
    <input
      id={id}
      type="range"
      min={0}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-valuetext={`${Math.round(progress)} percent`}
      style={style}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerDown={onDragStart}
      onPointerUp={(event) => {
        onDragEnd?.();
        onCommit?.(Number(event.currentTarget.value));
      }}
      onKeyDown={onDragStart}
      onKeyUp={(event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
          onDragEnd?.();
          onCommit?.(Number(event.currentTarget.value));
        }
      }}
      onBlur={() => onDragEnd?.()}
      className={cn('range w-full', size === 'lg' && 'range-lg', showThumbAlways && 'thumb-always', className)}
    />
  );
}
