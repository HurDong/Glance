import { create } from 'zustand';

interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  resolvePromise: ((value: boolean) => void) | null;
  showAlert: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'showAlert' | 'showConfirm' | 'closeAlert' | 'resolvePromise'>>) => Promise<boolean>;
  showConfirm: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'showAlert' | 'showConfirm' | 'closeAlert' | 'resolvePromise'>>) => Promise<boolean>;
  closeAlert: (result: boolean) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  isOpen: false,
  message: '',
  type: 'info',
  confirmText: '확인',
  cancelText: '취소',
  resolvePromise: null,

  showAlert: (message, options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        message,
        type: 'info',
        confirmText: '확인',
        ...options,
        resolvePromise: resolve,
      });
    });
  },

  showConfirm: (message, options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        message,
        type: 'confirm',
        confirmText: '확인',
        cancelText: '취소',
        ...options,
        resolvePromise: resolve,
      });
    });
  },

  closeAlert: (result) => {
    const { resolvePromise } = get();
    set({ isOpen: false });
    if (resolvePromise) {
      resolvePromise(result);
      set({ resolvePromise: null });
    }
  },
}));
