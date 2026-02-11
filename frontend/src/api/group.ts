import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface Group {
  id: number;
  name: string;
  description: string;
  owner: {
    id: number;
    nickname: string;
    email: string;
  };
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  id: number;
  member: {
    id: number;
    nickname: string;
    email: string;
  };
  sharedPortfolio?: {
    id: number;
    name: string;
    items: any[];
  };
  joinedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface SharePortfolioRequest {
  portfolioId: number;
}

export const groupApi = {
  getMyGroups: async (): Promise<Group[]> => {
    const response = await apiClient.get<{ data: Group[] }>('/groups');
    return response.data.data;
  },

  createGroup: async (data: CreateGroupRequest): Promise<number> => {
    const response = await apiClient.post<{ data: number }>('/groups', data);
    return response.data.data;
  },

  sharePortfolio: async (groupId: number, portfolioId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/share`, { portfolioId });
  },

  addMember: async (groupId: number, memberId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/members?memberId=${memberId}`);
  }
};
