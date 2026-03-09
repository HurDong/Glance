import { apiClient, unwrap } from '@/api/client';
import type {
  Portfolio,
  PortfolioItemRequest,
  PortfolioRequest,
} from '@/types/api';

export async function getMyPortfolios() {
  return unwrap<Portfolio[]>(apiClient.get('/portfolios'));
}

export async function getPrimaryPortfolio() {
  return unwrap<Portfolio>(apiClient.get('/portfolios/primary'));
}

export async function createPortfolio(payload: PortfolioRequest) {
  return unwrap<Portfolio>(apiClient.post('/portfolios', payload));
}

export async function updatePortfolio(portfolioId: number, payload: PortfolioRequest) {
  return unwrap<Portfolio>(apiClient.put(`/portfolios/${portfolioId}`, payload));
}

export async function setPrimaryPortfolio(portfolioId: number) {
  return unwrap<Portfolio>(apiClient.patch(`/portfolios/${portfolioId}/primary`));
}

export async function deletePortfolio(portfolioId: number) {
  return unwrap<void>(apiClient.delete(`/portfolios/${portfolioId}`));
}

export async function addPortfolioItem(
  portfolioId: number,
  payload: PortfolioItemRequest,
) {
  return unwrap<void>(apiClient.post(`/portfolios/${portfolioId}/items`, payload));
}

export async function updatePortfolioItem(
  portfolioId: number,
  itemId: number,
  payload: PortfolioItemRequest,
) {
  return unwrap<void>(apiClient.put(`/portfolios/${portfolioId}/items/${itemId}`, payload));
}

export async function deletePortfolioItem(portfolioId: number, itemId: number) {
  return unwrap<void>(apiClient.delete(`/portfolios/${portfolioId}/items/${itemId}`));
}
