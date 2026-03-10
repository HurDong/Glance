export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AuthUser {
  email: string;
  nickname: string;
}

export interface TokenResponse {
  grantType: string;
  accessToken: string;
  tokenExpiresIn: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface MarketIndex {
  name: string;
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  type?: string;
}

export interface StockItem {
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: string;
  status: string;
}

export interface StockPrice {
  symbol: string;
  price: string;
  change: string;
  changeRate: string;
  volume?: string;
  time: string;
  marketStatus?: string;
}

export interface ChartPoint {
  date: string;
  price: number;
  volume: number;
}

export interface ChartResponse {
  symbol: string;
  range: string;
  data: ChartPoint[];
}

export interface InterestStock {
  id: number;
  symbol: string;
  market: string;
  nameKr?: string;
  nameEn?: string;
  securityType?: string;
}

export interface PortfolioItem {
  id: number;
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: string;
  quantity: number;
  averagePrice: number;
  currency: string;
}

export interface Portfolio {
  id: number;
  userId: number;
  name: string;
  description: string;
  isPublic: boolean;
  isPrimary?: boolean;
  createdAt: string;
  items: PortfolioItem[];
}

export interface PortfolioRequest {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface PortfolioItemRequest {
  symbol: string;
  market?: string;
  quantity: number;
  averagePrice: number;
  currency: string;
}

export interface GroupOwner {
  email: string;
  nickname: string;
}

export interface GroupMember {
  id: number;
  member: GroupOwner;
  sharedPortfolioId?: number | null;
  sharedPortfolioName?: string | null;
  sharedPortfolioIsPublic?: boolean | null;
  sharedPortfolioItems?: PortfolioItem[] | null;
  status: string;
  joinedAt: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  owner: GroupOwner;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupFeed {
  id: number;
  groupId: number;
  memberId: number;
  nickname: string;
  actionType: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  type: string;
  content: string;
  targetId: string | null;
  isRead: boolean;
  senderNickname: string;
  createdAt: string;
}
