import axios from 'axios';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 403은 개별 화면 권한 문제일 수 있으니 전역 로그아웃으로 처리하지 않는다.
    if (status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  const response = await promise;
  return response.data.data;
}
