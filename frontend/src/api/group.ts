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

export interface ReactionCount {
  type: 'GOOD' | 'METOO' | 'WATCH' | 'PASS';
  count: number;
  reactedByMe: boolean;
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
  reactions?: ReactionCount[];
  status: 'PENDING' | 'INVITED' | 'ACCEPTED' | 'REJECTED';
  joinedAt: string;
}

export interface GroupFeed {
  id: number;
  groupId: number;
  memberId: number;
  nickname: string;
  actionType: 'CREATE_GROUP' | 'JOIN_GROUP' | 'SHARE_PORTFOLIO' | 'UPDATE_PORTFOLIO' | 'LEAVE_GROUP';
  content: string;
  createdAt: string;
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

  leaveGroup: async (groupId: number): Promise<void> => {
    await apiClient.delete(`/groups/leave/${groupId}`);
  },

  sharePortfolio: async (groupId: number, portfolioId: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/share`, { portfolioId });
  },

  toggleReaction: async (membershipId: number, type: string): Promise<void> => {
    // Using Axios params option for safer query string handling
    await apiClient.post(`/groups/reactions/${membershipId}`, null, {
      params: { type }
    });
  },

  getGroupFeeds: async (groupId: number): Promise<GroupFeed[]> => {
    const response = await apiClient.get<{ data: GroupFeed[] }>(`/groups/${groupId}/feed`);
    return response.data.data;
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
