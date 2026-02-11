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
    nickname: string;
    email: string;
  };
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  id: number;
  member: {
    nickname: string;
    email: string;
  };
  sharedPortfolioId?: number;
  sharedPortfolioName?: string;
  sharedPortfolioItems?: SharedPortfolioItem[];
  status: 'PENDING' | 'INVITED' | 'ACCEPTED' | 'REJECTED';
  joinedAt: string;
}

export interface SharedPortfolioItem {
  id: number;
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: string;
  quantity: number;
  averagePrice: number;
  currency: string;
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

  joinGroup: async (groupId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/join`);
  },

  inviteMember: async (groupId: number, memberId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/invite?memberId=${memberId}`);
  },

  handleJoinRequest: async (groupId: number, membershipId: number, accept: boolean): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/requests/${membershipId}?accept=${accept}`);
  },

  handleInvitation: async (membershipId: number, accept: boolean): Promise<void> => {
    await apiClient.post(`/groups/invitations/${membershipId}?accept=${accept}`);
  }
};
