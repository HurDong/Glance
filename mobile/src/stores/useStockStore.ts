import { create } from 'zustand';
import type { StockPrice } from '@/types/api';

interface StockState {
  prices: Record<string, StockPrice>;
  setPrice: (symbol: string, priceData: StockPrice) => void;
  getPrice: (symbol: string) => StockPrice | undefined;
}

export const useStockStore = create<StockState>((set, get) => ({
  prices: {},
  setPrice: (symbol, priceData) =>
    set((state) => ({
      prices: {
        ...state.prices,
        [symbol]: priceData,
      },
    })),
  getPrice: (symbol) => get().prices[symbol],
}));