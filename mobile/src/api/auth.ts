import axios from 'axios';
import type { LoginRequest, SignupRequest, TokenResponse } from '@/types/api';

const authClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || '/api/v1'}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function loginApi(payload: LoginRequest) {
  const response = await authClient.post<TokenResponse>('/login', payload);
  return response.data;
}

export async function signupApi(payload: SignupRequest) {
  const response = await authClient.post('/signup', payload);
  return response.data;
}
