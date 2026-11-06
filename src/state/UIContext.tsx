import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastMessage } from '@/types';
import { cn, uid } from '@/lib/utils';

type ToastInput = Omit<ToastMessage, 'id'>;

interface UIContextValue {
  toasts: ToastMessage[];
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  notify: (title: string, description?: string) => void;
  notifyError: (title: string, description?: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

const ICONS = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  error: TriangleAlert,
} as const;

const TOAST_TONES = {
  default: 'text-snow',
  info: 'text-[var(--accent)]',
  success: 'text-emerald-300',
  error: 'text-rose-300',
} as const;

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = uid('toast');
      const message: ToastMessage = { ...input, id };
      setToasts((current) => [...current.slice(-3), message]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, 4200);
      timers.current.set(id, timer);
      return id;
    },
    [],
  );

  const notify = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: 'success' }),
    [toast],
  );

  const notifyError = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: 'error' }),
    [toast],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) window.clearTimeout(timer);
      map.clear();
    };
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({ toasts, toast, dismissToast, notify, notifyError }),
    [toasts, toast, dismissToast, notify, notifyError],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-28 md:right-6 md:left-auto md:items-end md:px-0"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/95 p-3.5 shadow-2xl backdrop-blur-xl',
                'animate-[rise_0.35s_cubic-bezier(0.16,1,0.3,1)_both]',
              )}
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', TOAST_TONES[item.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-mist">{item.description}</p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick();
                      dismissToast(item.id);
                    }}
                    className="mt-2 text-xs font-semibold underline decoration-dotted underline-offset-4 hover:text-white"
                    style={{ color: 'var(--accent)' }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(item.id)}
                className="icon-btn size-6 shrink-0"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside <UIProvider>');
  return context;
}
