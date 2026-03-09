import { create } from 'zustand';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (title: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (title, tone = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((state) => ({ items: [...state.items, { id, title, tone }] }));
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, 2800);
  },
  dismiss: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));
