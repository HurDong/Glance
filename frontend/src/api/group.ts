import { apiClient } from './axios';

export interface Group {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
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
  sharedPortfolioIsPublic?: boolean;
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

  deleteGroup: async (groupId: number): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}`);
  },

  sharePortfolio: async (groupId: number, portfolioId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/share`, { portfolioId });
  },

  joinGroup: async (groupId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/join`);
  },

  joinGroupByCode: async (code: string): Promise<void> => {
    await apiClient.post(`/groups/join-by-code?code=${code}`);
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
