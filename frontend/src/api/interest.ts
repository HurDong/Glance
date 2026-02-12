import { apiClient as api } from './axios';

export interface InterestStockResponse {
    id: number;
    symbol: string;
    market: string;
    nameKr?: string;
    nameEn?: string;
    securityType?: string;
}

export const interestApi = {
    getInterestStocks: async (): Promise<InterestStockResponse[]> => {
        const response = await api.get<ApiResponse<InterestStockResponse[]>>('/stocks/interest');
        return response.data.data;
    },

    addInterestStock: async (symbol: string, market: string = 'US'): Promise<void> => {
        await api.post(`/stocks/interest/${symbol}`, null, {
            params: { market }
        });
    },

    removeInterestStock: async (symbol: string): Promise<void> => {
        await api.delete(`/stocks/interest/${symbol}`);
    }
};

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}
