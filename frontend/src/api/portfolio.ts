import { apiClient } from './axios';

export interface Portfolio {
  id: number;
  userId: number;
  name: string;
  description: string;
  isPublic: boolean;
  items: PortfolioItem[];
  createdAt: string;
}

export interface PortfolioItem {
  id: number;
  stockSymbol: {
    id: number;
    symbol: string;
    nameKr: string;
    nameEn: string;
    market: string;
  };
  quantity: number;
  averagePrice: number;
  currency: string;
  currentPrice?: number; // Optional for UI display if fetched separately
  value?: number; // quantity * currentPrice
  gainLoss?: number; // value - (quantity * averagePrice)
  gainLossPercent?: number;
}

export interface PortfolioRequest {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface PortfolioItemRequest {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currency: string;
}

export const portfolioApi = {
  getMyPortfolios: async (): Promise<Portfolio[]> => {
    const response = await apiClient.get<{ data: Portfolio[] }>('/portfolios');
    return response.data.data;
  },

  getPortfolio: async (id: number): Promise<Portfolio> => {
    const response = await apiClient.get<{ data: Portfolio }>(`/portfolios/${id}`);
    return response.data.data;
  },

  createPortfolio: async (data: PortfolioRequest): Promise<Portfolio> => {
    const response = await apiClient.post<{ data: Portfolio }>('/portfolios', data);
    return response.data.data;
  },

  addPortfolioItem: async (portfolioId: number, data: PortfolioItemRequest): Promise<void> => {
    await apiClient.post(`/portfolios/${portfolioId}/items`, data);
  },

  updatePortfolioItem: async (portfolioId: number, itemId: number, data: PortfolioItemRequest): Promise<void> => {
    await apiClient.put(`/portfolios/${portfolioId}/items/${itemId}`, data);
  },

  deletePortfolioItem: async (portfolioId: number, itemId: number): Promise<void> => {
    await apiClient.delete(`/portfolios/${portfolioId}/items/${itemId}`);
  },
};
