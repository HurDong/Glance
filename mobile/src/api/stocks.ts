import { apiClient, unwrap } from '@/api/client';
import type {
  ChartResponse,
  InterestStock,
  MarketIndex,
  PageResponse,
  StockItem,
  StockPrice,
} from '@/types/api';

export async function getMarketIndices() {
  const response = await apiClient.get<MarketIndex[]>('/market/indices');
  return response.data;
}

export async function getStocks(params: {
  query?: string;
  market?: string;
  page?: number;
  size?: number;
}) {
  return unwrap<PageResponse<StockItem>>(
    apiClient.get('/stocks', {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        query: params.query || undefined,
        market: params.market && params.market !== 'ALL' ? params.market : undefined,
      },
    }),
  );
}

export async function getStockPrice(symbol: string) {
  return unwrap<StockPrice>(apiClient.get(`/stocks/${symbol}/price`));
}

export async function getStockChart(symbol: string, range = '1M') {
  return unwrap<ChartResponse>(
    apiClient.get(`/stocks/${symbol}/chart`, {
      params: { range },
    }),
  );
}

export async function getInterestStocks() {
  return unwrap<InterestStock[]>(apiClient.get('/stocks/interest'));
}

export async function addInterestStock(symbol: string, market: string) {
  return unwrap<void>(
    apiClient.post(`/stocks/interest/${symbol}`, null, {
      params: { market },
    }),
  );
}

export async function removeInterestStock(symbol: string) {
  return unwrap<void>(apiClient.delete(`/stocks/interest/${symbol}`));
}
