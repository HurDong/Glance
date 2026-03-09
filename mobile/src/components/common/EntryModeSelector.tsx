import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EntryMode = 'view' | 'manage';

type EntryModeOption = {
  mode: EntryMode;
  label: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  accentClassName: string;
};

export function EntryModeSelector(props: {
  eyebrow: string;
  title: string;
  description: string;
  options: EntryModeOption[];
  onSelect: (mode: EntryMode) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92),rgba(30,41,59,0.96))] p-5 shadow-card">
      <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-2 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/82">
          {props.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{props.title}</h2>
        <p className="mt-2 max-w-[20rem] text-sm leading-6 text-slate-300">{props.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[...props.options].sort((a, b) => {
            if (a.mode === b.mode) {
              return 0;
            }

            return a.mode === 'manage' ? -1 : 1;
          }).map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => props.onSelect(option.mode)}
              className={cn(
                'group relative overflow-hidden rounded-[28px] border p-4 text-left transition hover:-translate-y-0.5',
                option.mode === 'view'
                  ? 'border-sky-300/20 bg-[linear-gradient(180deg,rgba(14,116,144,0.28),rgba(12,74,110,0.18),rgba(15,23,42,0.92))] hover:border-sky-200/40'
                  : 'border-rose-300/20 bg-[linear-gradient(180deg,rgba(190,24,93,0.24),rgba(136,19,55,0.16),rgba(15,23,42,0.92))] hover:border-rose-200/40',
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent',
                  option.accentClassName,
                )}
              />
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-white shadow-sm transition group-hover:scale-[1.03]',
                      option.mode === 'view'
                        ? 'border-sky-100/20 bg-sky-300/12'
                        : 'border-rose-100/20 bg-rose-300/12',
                    )}
                  >
                    <option.icon size={20} />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em]',
                      option.mode === 'view'
                        ? 'bg-sky-200/12 text-sky-100'
                        : 'bg-rose-200/12 text-rose-100',
                    )}
                  >
                    {option.label}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xl font-black tracking-tight text-white">{option.title}</p>
                  <p className="mt-2 text-sm leading-5 text-slate-200">{option.description}</p>
                  <p className="mt-4 text-xs font-semibold text-slate-300">{option.meta}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EntryModeTabs(props: {
  activeMode: EntryMode;
  onChange: (mode: EntryMode) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-2">
      <button
        type="button"
        onClick={() => props.onChange('manage')}
        className={cn(
          'flex-1 whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-semibold transition',
          props.activeMode === 'manage'
            ? 'bg-blue-500/18 text-blue-100'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
        )}
      >
        관리
      </button>
      <button
        type="button"
        onClick={() => props.onChange('view')}
        className={cn(
          'flex-1 whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-semibold transition',
          props.activeMode === 'view'
            ? 'bg-blue-500/18 text-blue-100'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
        )}
      >
        조회
      </button>
    </div>
  );
}
