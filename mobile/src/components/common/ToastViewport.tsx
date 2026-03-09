import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore } from '@/stores/toastStore';

export function ToastViewport() {
  const { items, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-3xl border px-4 py-3 text-sm font-semibold shadow-card backdrop-blur-xl',
            item.tone === 'success' && 'border-emerald-400/30 bg-emerald-500/90 text-white',
            item.tone === 'error' && 'border-rose-300/35 bg-rose-500/90 text-white',
            item.tone === 'info' && 'border-[color:var(--card-border)] bg-[color:var(--toast-info-bg)] text-[color:var(--text-main)]',
          )}
        >
          <span>{item.title}</span>
          <button type="button" onClick={() => dismiss(item.id)} className="opacity-80">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
