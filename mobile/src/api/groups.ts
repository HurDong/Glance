import { apiClient, unwrap } from '@/api/client';
import type { Group, GroupFeed } from '@/types/api';

export async function getMyGroups() {
  return unwrap<Group[]>(apiClient.get('/groups'));
}

export async function createGroup(payload: { name: string; description: string }) {
  return unwrap<number>(apiClient.post('/groups', payload));
}

export async function joinGroupByCode(code: string) {
  return unwrap<void>(apiClient.post('/groups/join-by-code', null, { params: { code } }));
}

export async function getGroupFeed(groupId: number) {
  return unwrap<GroupFeed[]>(apiClient.get(`/groups/${groupId}/feed`));
}

export async function sharePortfolio(groupId: number, portfolioId: number) {
  return unwrap<void>(apiClient.post(`/groups/${groupId}/share`, { portfolioId }));
}
