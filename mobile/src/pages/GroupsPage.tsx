import { type FormEvent, type TouchEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Copy,
  Eye,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createGroup,
  getGroupFeed,
  getMyGroups,
  joinGroupByCode,
  sharePortfolio,
  toggleReaction,
} from '@/api/groups';
import { getMyPortfolios } from '@/api/portfolio';
import { getMarketIndices } from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { EntryModeSelector, EntryModeTabs, type EntryMode } from '@/components/common/EntryModeSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { useStockWebSocket } from '@/hooks/useStockWebSocket';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useStockStore } from '@/stores/useStockStore';
import { useToastStore } from '@/stores/toastStore';
import type { GroupMember, PortfolioItem, ReactionCount, ReactionType } from '@/types/api';

const ALLOCATION_COLORS = [
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-rose-400 to-red-500',
  'from-lime-400 to-green-500',
];

const REACTION_OPTIONS: Array<{
  type: ReactionType;
  emoji: string;
  label: string;
  activeClassName: string;
}> = [
  {
    type: 'GOOD',
    emoji: '👍',
    label: '잘 샀다',
    activeClassName: 'border-amber-400 bg-amber-500 text-white shadow-[0_14px_30px_rgba(245,158,11,0.28)]',
  },
  {
    type: 'METOO',
    emoji: '🙋',
    label: '나도 관심',
    activeClassName: 'border-rose-400 bg-rose-500 text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)]',
  },
  {
    type: 'WATCH',
    emoji: '👀',
    label: '관망중',
    activeClassName: 'border-sky-400 bg-sky-500 text-white shadow-[0_14px_30px_rgba(14,165,233,0.28)]',
  },
  {
    type: 'PASS',
    emoji: '😅',
    label: '패스',
    activeClassName: 'border-slate-400 bg-slate-500 text-white shadow-[0_14px_30px_rgba(71,85,105,0.28)]',
  },
];

type AllocationItem = {
  item: PortfolioItem;
  value: number;
  weight: number;
};

type LivePriceMap = Record<string, { price?: string }>;

const USD_TO_KRW_RATE_FALLBACK = 1_350;

function getPortfolioTitle(item: PortfolioItem) {
  return item.nameKr || item.nameEn || item.symbol;
}

function isCashAsset(item: Pick<PortfolioItem, 'symbol' | 'market'>) {
  return item.market === 'CASH' || item.symbol === 'KRW' || item.symbol === 'USD';
}

function parsePriceValue(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(String(rawValue).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseUsdKrwRate(indices: { symbol: string; name: string; price: string; type?: string }[] | undefined) {
  const exchangeRate = indices?.find(
    (index) =>
      index.symbol?.includes('USD_KRW') ||
      index.symbol === 'OANDA:USD_KRW' ||
      index.name?.includes('환율') ||
      index.type === 'FOREX',
  );

  const parsed = Number(exchangeRate?.price?.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : USD_TO_KRW_RATE_FALLBACK;
}

function getCurrentUnitPrice(item: PortfolioItem, livePrices?: LivePriceMap) {
  if (isCashAsset(item)) {
    return item.averagePrice;
  }

  return parsePriceValue(livePrices?.[item.symbol]?.price, item.averagePrice);
}

function getEstimatedValue(item: PortfolioItem, livePrices?: LivePriceMap, usdToKrwRate = USD_TO_KRW_RATE_FALLBACK) {
  const baseValue = isCashAsset(item)
    ? item.quantity * item.averagePrice
    : item.quantity * getCurrentUnitPrice(item, livePrices);

  return item.currency === 'USD' ? baseValue * usdToKrwRate : baseValue;
}

function getPortfolioValue(items: PortfolioItem[], livePrices?: LivePriceMap, usdToKrwRate = USD_TO_KRW_RATE_FALLBACK) {
  return items.reduce((sum, item) => sum + getEstimatedValue(item, livePrices, usdToKrwRate), 0);
}

function getAllocation(items: PortfolioItem[], livePrices?: LivePriceMap, usdToKrwRate = USD_TO_KRW_RATE_FALLBACK) {
  const totalValue = getPortfolioValue(items, livePrices, usdToKrwRate);

  return [...items]
    .map((item) => {
      const value = getEstimatedValue(item, livePrices, usdToKrwRate);
      const weight = totalValue <= 0 ? 0 : (value * 100) / totalValue;

      return { item, value, weight };
    })
    .sort((a, b) => b.value - a.value);
}

function formatCompactKrw(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_0000_0000_0000) {
    return `₩${(value / 1_0000_0000_0000).toFixed(1)}조`;
  }

  if (abs >= 1_0000_0000) {
    return `₩${(value / 1_0000_0000).toFixed(1)}억`;
  }

  if (abs >= 1_0000) {
    return `₩${(value / 1_0000).toFixed(1)}만`;
  }

  return formatCurrency(value, 'KRW');
}

function getPortfolioPerformance(
  items: PortfolioItem[],
  livePrices?: LivePriceMap,
  usdToKrwRate = USD_TO_KRW_RATE_FALLBACK,
) {
  return items.reduce(
    (acc, item) => {
      if (isCashAsset(item)) {
        return {
          ...acc,
          totalValue: acc.totalValue + getEstimatedValue(item, livePrices, usdToKrwRate),
          totalCost: acc.totalCost + getEstimatedValue(item),
        };
      }

      const currentValue = getEstimatedValue(item, livePrices, usdToKrwRate);
      const costBasis = getEstimatedValue(item);

      return {
        totalValue: acc.totalValue + currentValue,
        totalCost: acc.totalCost + costBasis,
      };
    },
    { totalValue: 0, totalCost: 0 },
  );
}

function getConcentrationLabel(items: AllocationItem[]) {
  const topThreeWeight = items.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);

  if (topThreeWeight >= 75) {
    return '상위 종목 중심';
  }

  if (topThreeWeight >= 55) {
    return '핵심 종목이 뚜렷해요';
  }

  return '분산 구성이에요';
}

function AllocationBar(props: { items: AllocationItem[] }) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-[color:var(--soft-panel-border)]">
      {props.items.map((allocation, index) => (
        <div
          key={allocation.item.id}
          className={`h-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
          style={{ width: `${Math.max(allocation.weight, 4)}%` }}
        />
      ))}
    </div>
  );
}

function isPrivateSharedPortfolio(member: GroupMember) {
  return member.sharedPortfolioIsPublic === false;
}

function normalizeReactions(reactions?: ReactionCount[] | null) {
  return REACTION_OPTIONS.map((option) => {
    const matched = reactions?.find((reaction) => reaction.type === option.type);

    return {
      type: option.type,
      count: matched?.count ?? 0,
      reactedByMe: matched?.reactedByMe ?? false,
    };
  });
}

function ReactionButtons(props: {
  membershipId: number;
  initialReactions?: ReactionCount[] | null;
}) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const [reactions, setReactions] = useState(() => normalizeReactions(props.initialReactions));
  const [pendingType, setPendingType] = useState<ReactionType | null>(null);

  useEffect(() => {
    setReactions(normalizeReactions(props.initialReactions));
  }, [props.initialReactions]);

  async function handleToggle(type: ReactionType) {
    if (pendingType) {
      return;
    }

    const previousReactions = reactions;
    const nextReactions = reactions.map((reaction) => {
      if (reaction.type !== type) {
        return reaction;
      }

      const reactedByMe = !reaction.reactedByMe;
      return {
        ...reaction,
        reactedByMe,
        count: Math.max(0, reaction.count + (reactedByMe ? 1 : -1)),
      };
    });

    setReactions(nextReactions);
    setPendingType(type);

    try {
      await toggleReaction(props.membershipId, type);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (error) {
      console.error(error);
      setReactions(previousReactions);
      pushToast('반응을 반영하지 못했어요.', 'error');
    } finally {
      setPendingType(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[color:var(--text-main)]">한마디 반응</p>
          <p className="mt-1 text-xs text-[color:var(--text-sub)]">보드를 보면서 바로 감상을 남겨보세요.</p>
        </div>
        <span className="rounded-full border border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-sub)]">
          탭해서 반응
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {REACTION_OPTIONS.map((option) => {
          const reaction = reactions.find((item) => item.type === option.type);
          const isActive = reaction?.reactedByMe;
          const isPending = pendingType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => void handleToggle(option.type)}
              disabled={pendingType !== null}
              className={`rounded-[20px] border px-3 py-3 text-left transition ${
                isActive
                  ? option.activeClassName
                  : 'mobile-soft-card text-[color:var(--text-main)] hover:bg-[color:var(--nav-hover-bg)]'
              } ${isPending ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-lg leading-none">{option.emoji}</span>
                  <span className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-[color:var(--text-main)]'}`}>
                    {option.label}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[color:var(--soft-panel-bg)] text-[color:var(--text-sub)]'
                  }`}
                >
                  {reaction?.count ?? 0}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SharedBoardCard(props: {
  member: GroupMember;
  current: number;
  total: number;
  livePrices: LivePriceMap;
  usdToKrwRate: number;
  onOpenDetail: () => void;
}) {
  const items = props.member.sharedPortfolioItems ?? [];
  const allocation = getAllocation(items, props.livePrices, props.usdToKrwRate);
  const totalValue = getPortfolioValue(items, props.livePrices, props.usdToKrwRate);
  const topThreeWeight = allocation.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const performance = getPortfolioPerformance(items, props.livePrices, props.usdToKrwRate);
  const profitLoss = performance.totalValue - performance.totalCost;
  const profitRate = performance.totalCost > 0 ? (profitLoss / performance.totalCost) * 100 : 0;
  const isPrivate = isPrivateSharedPortfolio(props.member);
  const remainingWeight = Math.max(
    0,
    100 - allocation.slice(0, 5).reduce((sum, item) => sum + item.weight, 0),
  );

  return (
    <div className="mobile-hero-card overflow-hidden rounded-[32px] border p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--brand-accent)]">{props.member.member.nickname}</p>
          <h3 className="mt-2 truncate text-2xl font-black tracking-tight text-[color:var(--text-main)]">
            {props.member.sharedPortfolioName}
          </h3>
          <p className="mt-2 text-sm text-[color:var(--text-sub)]">
            어떤 종목에 얼마만큼 실었는지 비중으로 바로 볼 수 있어요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPrivate ? (
            <span className="whitespace-nowrap rounded-full border border-amber-200/20 bg-amber-400/12 px-3 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-100">
              비공개
            </span>
          ) : null}
          <span className="whitespace-nowrap rounded-full border border-blue-200/20 bg-blue-400/12 px-3 py-1 text-[10px] font-semibold text-[color:var(--brand-solid)]">
            {props.current} / {props.total}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
          <p className="text-[11px] text-[color:var(--text-sub)]">총 평가금액</p>
          <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">
            {isPrivate ? '비중만 공개' : formatCompactKrw(totalValue)}
          </p>
        </div>
        <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
          <p className="text-[11px] text-[color:var(--text-sub)]">보유 종목</p>
          <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{allocation.length}개</p>
        </div>
        <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
          <p className="text-[11px] text-[color:var(--text-sub)]">상위 3개</p>
          <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{topThreeWeight.toFixed(1)}%</p>
        </div>
      </div>

      {!isPrivate ? (
        <div className="mobile-soft-card mt-3 rounded-[24px] border px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-sub)]">
                수익률
              </p>
              <p
                className={`mt-2 text-xl font-black ${
                  profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[color:var(--text-sub)]">평가손익</p>
              <p
                className={`mt-1 text-sm font-bold ${
                  profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatCurrency(profitLoss, 'KRW')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mobile-soft-card mt-4 rounded-[26px] border px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-sub)]">
              allocation map
            </p>
            <p className="mt-2 text-lg font-bold text-[color:var(--text-main)]">{getConcentrationLabel(allocation)}</p>
            <p className="mt-1 text-sm text-[color:var(--text-sub)]">
              구성 비율이 큰 순서대로 흐름을 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onOpenDetail}
            className="mobile-chip-idle shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition hover:bg-[color:var(--nav-hover-bg)]"
          >
            전체 구성 보기
          </button>
        </div>

        <div className="mt-4">
          <AllocationBar items={allocation} />
        </div>

        {isPrivate ? (
          <div className="mt-3 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-3 py-3 text-sm text-amber-700 dark:text-amber-100">
            비중과 종목만 공개돼요. 금액, 수량, 평단가는 숨겨집니다.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {allocation.slice(0, 5).map((allocationItem, index) => (
            <div
              key={allocationItem.item.id}
              className="mobile-soft-card rounded-[20px] border px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                    />
                    <p className="truncate font-semibold text-[color:var(--text-main)]">
                      {getPortfolioTitle(allocationItem.item)}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-sub)]">
                    {allocationItem.item.market} · {allocationItem.item.symbol}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[color:var(--text-main)]">{allocationItem.weight.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                    {isPrivate ? '금액 비공개' : formatCurrency(allocationItem.value, allocationItem.item.currency)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {allocation.length > 5 ? (
            <button
              type="button"
              onClick={props.onOpenDetail}
              className="mobile-soft-card flex w-full items-center justify-between rounded-[20px] border border-dashed px-4 py-3 text-left transition hover:bg-[color:var(--nav-hover-bg)]"
            >
              <div>
                <p className="font-semibold text-[color:var(--text-main)]">나머지 종목 더 보기</p>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  {allocation.length - 5}개 종목 · {remainingWeight.toFixed(1)}%
                </p>
              </div>
              <BarChart3 size={18} className="text-[color:var(--brand-solid)]" />
            </button>
          ) : null}
        </div>

        <ReactionButtons membershipId={props.member.id} initialReactions={props.member.reactions} />
      </div>
    </div>
  );
}

function PortfolioDetailSheet(props: {
  member: GroupMember;
  livePrices: LivePriceMap;
  usdToKrwRate: number;
  onClose: () => void;
}) {
  const items = props.member.sharedPortfolioItems ?? [];
  const allocation = getAllocation(items, props.livePrices, props.usdToKrwRate);
  const totalValue = getPortfolioValue(items, props.livePrices, props.usdToKrwRate);
  const topThreeWeight = allocation.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const performance = getPortfolioPerformance(items, props.livePrices, props.usdToKrwRate);
  const profitLoss = performance.totalValue - performance.totalCost;
  const profitRate = performance.totalCost > 0 ? (profitLoss / performance.totalCost) * 100 : 0;
  const isPrivate = isPrivateSharedPortfolio(props.member);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
      <div className="mobile-soft-card mx-auto max-h-full w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--soft-panel-border)] px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[color:var(--brand-accent)]">{props.member.member.nickname}</p>
            <h3 className="mt-2 truncate text-xl font-black tracking-tight text-[color:var(--text-main)]">
              {props.member.sharedPortfolioName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
              비중 중심으로 전체 구성을 자세히 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="mobile-icon-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
            aria-label="상세 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
              <p className="text-[11px] text-[color:var(--text-sub)]">총 평가금액</p>
              <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">
                {isPrivate ? '비중만 공개' : formatCompactKrw(totalValue)}
              </p>
            </div>
            <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
              <p className="text-[11px] text-[color:var(--text-sub)]">보유 종목</p>
              <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{allocation.length}개</p>
            </div>
            <div className="mobile-soft-card rounded-[22px] border px-3 py-3">
              <p className="text-[11px] text-[color:var(--text-sub)]">상위 3개</p>
              <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{topThreeWeight.toFixed(1)}%</p>
            </div>
          </div>

          {!isPrivate ? (
            <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[color:var(--text-main)]">실시간 수익률</p>
                  <p
                    className={`mt-1 text-2xl font-black ${
                      profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[color:var(--text-sub)]">평가손익</p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {formatCurrency(profitLoss, 'KRW')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[color:var(--text-main)]">전체 비중</p>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">종목별 자산 비중을 한 번에 봅니다.</p>
              </div>
              <BarChart3 size={18} className="text-[color:var(--brand-solid)]" />
            </div>
            <div className="mt-4">
              <AllocationBar items={allocation} />
            </div>
            {isPrivate ? (
              <div className="mt-3 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-3 py-3 text-sm text-amber-700 dark:text-amber-100">
                비중과 종목만 공개돼요. 금액, 수량, 평단가는 숨겨집니다.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {allocation.map((allocationItem, index) => (
              <div
                key={allocationItem.item.id}
                className="mobile-soft-card rounded-[24px] border px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                      />
                      <p className="truncate font-bold text-[color:var(--text-main)]">
                        {getPortfolioTitle(allocationItem.item)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--text-sub)]">
                      {allocationItem.item.market} · {allocationItem.item.symbol}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-[color:var(--text-main)]">
                      {allocationItem.weight.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                      {isPrivate ? '금액 비공개' : formatCurrency(allocationItem.value, allocationItem.item.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[color:var(--soft-panel-border)]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                    style={{ width: `${Math.max(allocationItem.weight, 4)}%` }}
                  />
                </div>

                {isPrivate ? null : (
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[color:var(--text-sub)]">
                    <span>보유 수량 {allocationItem.item.quantity.toLocaleString()}</span>
                    <span>
                      평균단가 {formatCurrency(allocationItem.item.averagePrice, allocationItem.item.currency)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GroupsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const user = useAuthStore((state) => state.user);
  const { subscribe } = useStockWebSocket();
  const livePrices = useStockStore((state) => state.prices);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<number | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: getMyGroups,
  });

  const portfoliosQuery = useQuery({
    queryKey: ['portfolios-for-share'],
    queryFn: async () => {
      try {
        return await getMyPortfolios();
      } catch (error) {
        return [];
      }
    },
  });

  const feedQuery = useQuery({
    queryKey: ['group-feed', selectedGroupId],
    queryFn: () => getGroupFeed(selectedGroupId as number),
    enabled: selectedGroupId !== null,
  });

  const marketIndicesQuery = useQuery({
    queryKey: ['market-indices'],
    queryFn: getMarketIndices,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const usdToKrwRate = useMemo(
    () => parseUsdKrwRate(marketIndicesQuery.data),
    [marketIndicesQuery.data],
  );

  useEffect(() => {
    if (!selectedGroupId && groupsQuery.data?.length) {
      setSelectedGroupId(groupsQuery.data[0].id);
    }
  }, [groupsQuery.data, selectedGroupId]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (entryMode !== null) {
      return;
    }

    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const prevHtmlOverflow = htmlStyle.overflow;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevBodyTouchAction = bodyStyle.touchAction;
    const prevBodyOverscroll = bodyStyle.overscrollBehavior;

    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.touchAction = 'none';
    bodyStyle.overscrollBehavior = 'none';

    return () => {
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overflow = prevBodyOverflow;
      bodyStyle.touchAction = prevBodyTouchAction;
      bodyStyle.overscrollBehavior = prevBodyOverscroll;
    };
  }, [entryMode]);

  useEffect(() => {
    setSelectedBoardIndex(0);
    setDetailMemberId(null);
  }, [selectedGroupId]);

  const selectedGroup = useMemo(
    () => groupsQuery.data?.find((group) => group.id === selectedGroupId) || null,
    [groupsQuery.data, selectedGroupId],
  );

  const mySharedPortfolioId = useMemo(() => {
    if (!selectedGroup || !user) {
      return null;
    }

    const me = selectedGroup.members.find(
      (member) => member.member.email === user.email || member.member.nickname === user.nickname,
    );

    return me?.sharedPortfolioId ?? null;
  }, [selectedGroup, user]);

  const sharedMembers = useMemo(
    () =>
      selectedGroup?.members.filter(
        (member) =>
          member.sharedPortfolioId &&
          member.sharedPortfolioName &&
          member.sharedPortfolioItems &&
          member.sharedPortfolioItems.length > 0,
      ) ?? [],
    [selectedGroup],
  );

  const groupSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          sharedMembers.flatMap((member) =>
            member.sharedPortfolioIsPublic === false
              ? []
              : (member.sharedPortfolioItems ?? [])
                  .filter((item) => !isCashAsset(item))
                  .map((item) => item.symbol),
          ),
        ),
      ),
    [sharedMembers],
  );

  const currentBoard = sharedMembers[selectedBoardIndex] ?? null;
  const detailMember = sharedMembers.find((member) => member.id === detailMemberId) ?? null;

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups-summary'] });
      setCreateForm({ name: '', description: '' });
      pushToast('그룹을 만들었어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('그룹을 만들지 못했어요.', 'error');
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinGroupByCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups-summary'] });
      setJoinCode('');
      pushToast('그룹에 참여했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('초대 코드를 다시 확인해 주세요.', 'error');
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId || !selectedPortfolioId) {
        throw new Error('선택 정보가 없습니다.');
      }

      return sharePortfolio(selectedGroupId, selectedPortfolioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-feed', selectedGroupId] });
      pushToast('포트폴리오를 공유했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('포트폴리오를 공유하지 못했어요.', 'error');
    },
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(createForm);
  }

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    joinMutation.mutate(joinCode);
  }

  async function handleCopyInviteCode() {
    if (!selectedGroup) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${selectedGroup.name} 초대 코드`,
          text: `Glance 그룹 초대 코드: ${selectedGroup.inviteCode}`,
        });
        pushToast('공유 창을 열었어요.', 'success');
        return;
      }

      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedGroup.inviteCode);
        pushToast('초대 코드를 복사했어요.', 'success');
        return;
      }

      pushToast(`초대 코드: ${selectedGroup.inviteCode}`, 'info');
    } catch (error) {
      console.error(error);
      pushToast(`초대 코드: ${selectedGroup.inviteCode}`, 'info');
    }
  }

  useEffect(() => {
    if (entryMode !== 'view') {
      return;
    }

    groupSymbols.forEach((symbol) => subscribe(symbol));
  }, [entryMode, groupSymbols, subscribe]);

  function renderGroupChips() {
    return (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {groupsQuery.data?.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelectedGroupId(group.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedGroupId === group.id
                ? 'border-blue-500 bg-blue-600 text-white shadow-[0_16px_30px_rgba(37,99,235,0.28)] dark:border-blue-400/30 dark:bg-blue-500 dark:text-white dark:shadow-none'
                : 'mobile-chip-idle'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>
    );
  }

  function showPreviousBoard() {
    setSelectedBoardIndex((current) => (current === 0 ? sharedMembers.length - 1 : current - 1));
  }

  function showNextBoard() {
    setSelectedBoardIndex((current) =>
      current === sharedMembers.length - 1 ? 0 : current + 1,
    );
  }

  function handleBoardTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    setSwipeStart({ x: touch.clientX, y: touch.clientY });
  }

  function handleBoardTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!swipeStart) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    setSwipeStart(null);

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNextBoard();
      return;
    }

    showPreviousBoard();
  }

  return (
    <div
      className={
        entryMode === null
          ? 'flex h-[calc(100dvh-11.5rem)] flex-col overflow-hidden'
          : 'space-y-5'
      }
    >
      {entryMode === null ? (
        <EntryModeSelector
          eyebrow="Group Entry"
          title="그룹"
          description="지금 하려는 일에 맞춰 바로 들어가세요."
          onSelect={setEntryMode}
          options={[
            {
              mode: 'view',
              label: '조회',
              title: '둘러보기',
              description: '그룹 보드와 최근 활동을 빠르게 확인해요.',
              meta: '보드 · 활동 확인',
              icon: Eye,
              accentClassName: 'via-sky-300/70',
            },
            {
              mode: 'manage',
              label: '관리',
              title: '정리하기',
              description: '그룹을 만들고 참여하고 공유까지 이어가요.',
              meta: '생성 · 참여 · 공유',
              icon: Settings2,
              accentClassName: 'via-rose-300/70',
            },
          ]}
        />
      ) : (
        <>
          <EntryModeTabs activeMode={entryMode} onChange={setEntryMode} />

          <section className="mobile-hero-card overflow-hidden rounded-[32px] border px-5 py-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--brand-accent)]">그룹</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--text-main)]">
                  {entryMode === 'view' ? '참여 중인 그룹을 둘러보세요' : '바로 관리해 보세요'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                  {entryMode === 'view'
                    ? '같은 그룹 안에서 누가 어떤 비중으로 투자하는지 한눈에 볼 수 있어요.'
                    : '새 그룹을 만들고 참여하고 내 포트폴리오를 바로 공유할 수 있어요.'}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] text-[color:var(--brand-solid)]">
                <Sparkles size={18} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="mobile-soft-card rounded-[20px] border px-3 py-3">
                <p className="text-[11px] text-[color:var(--text-sub)]">내 그룹</p>
                <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{groupsQuery.data?.length || 0}</p>
              </div>
              <div className="mobile-soft-card rounded-[20px] border px-3 py-3">
                <p className="text-[11px] text-[color:var(--text-sub)]">공유 보드</p>
                <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{sharedMembers.length}</p>
              </div>
              <div className="mobile-soft-card rounded-[20px] border px-3 py-3">
                <p className="text-[11px] text-[color:var(--text-sub)]">최근 활동</p>
                <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{feedQuery.data?.length || 0}</p>
              </div>
            </div>
          </section>

          {entryMode === 'manage' ? (
            <>
              <div className="grid gap-3">
                <SectionCard title="새 그룹" description="함께 볼 투자 스타일 그룹을 만들어 보세요.">
                  <form className="space-y-3" onSubmit={handleCreate}>
                    <input
                      required
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-[color:var(--text-sub)] focus:border-blue-400/30"
                      placeholder="그룹 이름"
                    />
                    <textarea
                      value={createForm.description}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="mobile-field h-24 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-[color:var(--text-sub)] focus:border-blue-400/30"
                      placeholder="이 그룹에서 어떤 포트폴리오를 보게 될지 적어 주세요."
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-[color:var(--text-main)] transition hover:bg-blue-400"
                    >
                      그룹 만들기
                    </button>
                  </form>
                </SectionCard>

                <SectionCard title="그룹 참여" description="초대 코드만 있으면 바로 들어올 수 있어요.">
                  <form className="space-y-3" onSubmit={handleJoin}>
                    <input
                      required
                      value={joinCode}
                      onChange={(event) => setJoinCode(event.target.value)}
                      className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-[color:var(--text-sub)] focus:border-blue-400/30"
                      placeholder="초대 코드 입력"
                    />
                    <button
                      type="submit"
                      className="mobile-chip-idle w-full rounded-2xl border px-4 py-3 font-semibold transition hover:bg-[color:var(--nav-hover-bg)]"
                    >
                      참여하기
                    </button>
                  </form>
                </SectionCard>
              </div>

              {groupsQuery.data && groupsQuery.data.length > 0 ? (
                <>
                  {renderGroupChips()}

                  <SectionCard
                    title="내 포트폴리오 공유"
                    description="그룹 보드에 올릴 포트폴리오를 골라 바로 공유해 보세요."
                    action={<Sparkles size={18} className="text-[color:var(--brand-solid)]" />}
                  >
                    <div className="space-y-2">
                      {portfoliosQuery.data?.map((portfolio) => (
                        <button
                          key={portfolio.id}
                          type="button"
                          onClick={() => setSelectedPortfolioId(portfolio.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
                            selectedPortfolioId === portfolio.id
                              ? 'border-blue-500 bg-blue-600 text-white shadow-[0_16px_30px_rgba(37,99,235,0.28)] dark:border-blue-400/30 dark:bg-blue-500 dark:text-white dark:shadow-none'
                              : mySharedPortfolioId === portfolio.id
                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                                : 'mobile-chip-idle'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`font-bold ${selectedPortfolioId === portfolio.id ? 'text-white' : 'text-[color:var(--text-main)]'}`}>{portfolio.name}</p>
                            <p className={`text-sm ${selectedPortfolioId === portfolio.id ? 'text-blue-50/90' : 'text-[color:var(--text-sub)]'}`}>{portfolio.items.length}개 자산</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {mySharedPortfolioId === portfolio.id ? (
                              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedPortfolioId === portfolio.id ? 'bg-white/18 text-white' : 'bg-emerald-400/12 text-emerald-700 dark:text-emerald-200'}`}>
                                현재 공유 중
                              </span>
                            ) : null}
                            {selectedPortfolioId === portfolio.id ? (
                              <span className="whitespace-nowrap rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-semibold text-white">
                                선택됨
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => shareMutation.mutate()}
                      disabled={!selectedPortfolioId}
                      className="mt-3 w-full whitespace-nowrap rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-[color:var(--text-main)] disabled:opacity-40"
                    >
                      선택한 포트폴리오 공유
                    </button>
                  </SectionCard>
                </>
              ) : (
                <EmptyState
                  title="아직 참여한 그룹이 없어요"
                  description="새 그룹을 만들거나 초대 코드로 들어오면 여기서 바로 공유 작업을 이어갈 수 있어요."
                />
              )}
            </>
          ) : groupsQuery.data && groupsQuery.data.length > 0 ? (
            <div className="space-y-4">
              {renderGroupChips()}

              {selectedGroup ? (
                <>
                  <div className="mobile-soft-card flex items-center justify-between rounded-[24px] border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-[color:var(--text-main)]">{selectedGroup.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--text-sub)]">
                        {selectedGroup.description || '포트폴리오 구성을 같이 보는 그룹이에요.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="mobile-icon-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  {currentBoard ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[color:var(--text-main)]">포트폴리오 보드</p>
                          <p className="text-sm text-[color:var(--text-sub)]">
                            누가 어떤 종목에 비중을 실었는지 좌우로 넘겨 보세요.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={showPreviousBoard}
                            className="mobile-icon-surface flex h-10 w-10 items-center justify-center rounded-2xl border"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={showNextBoard}
                            className="mobile-icon-surface flex h-10 w-10 items-center justify-center rounded-2xl border"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>

                      <div onTouchStart={handleBoardTouchStart} onTouchEnd={handleBoardTouchEnd}>
                        <SharedBoardCard
                          member={currentBoard}
                          current={selectedBoardIndex + 1}
                          total={sharedMembers.length}
                          livePrices={livePrices}
                          usdToKrwRate={usdToKrwRate}
                          onOpenDetail={() => setDetailMemberId(currentBoard.id)}
                        />
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        {sharedMembers.map((member, index) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => setSelectedBoardIndex(index)}
                            className={`h-2.5 rounded-full transition ${
                              index === selectedBoardIndex ? 'w-8 bg-[color:var(--brand-solid)]' : 'w-2.5 bg-[color:var(--soft-panel-border)]'
                            }`}
                            aria-label={`${member.member.nickname} 포트폴리오 보기`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="아직 공유된 포트폴리오가 없어요"
                      description="관리 모드에서 포트폴리오를 공유하면 그룹 보드가 바로 채워져요."
                    />
                  )}

                  <SectionCard
                    title="최근 활동"
                    description="그룹 안에서 생긴 흐름을 가볍게 볼 수 있어요."
                    action={<Activity size={18} className="text-blue-300" />}
                  >
                    {feedQuery.data && feedQuery.data.length > 0 ? (
                      <div className="space-y-2">
                        {feedQuery.data.map((feed) => (
                          <div
                            key={feed.id}
                            className="mobile-soft-card rounded-[20px] border px-4 py-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-[color:var(--text-main)]">{feed.nickname}</p>
                              <span className="text-xs font-semibold text-[color:var(--text-sub)]">
                                {formatRelativeTime(feed.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-solid)]">
                              {feed.actionType}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">{feed.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="아직 최근 활동이 없어요"
                        description="공유와 참여가 생기면 여기서 바로 흐름을 볼 수 있어요."
                      />
                    )}
                  </SectionCard>
                </>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="아직 참여한 그룹이 없어요"
              description="관리 모드에서 새 그룹을 만들거나 초대 코드로 들어오면 바로 볼 수 있어요."
            />
          )}
        </>
      )}

      {detailMember ? (
        <PortfolioDetailSheet
          member={detailMember}
          livePrices={livePrices}
          usdToKrwRate={usdToKrwRate}
          onClose={() => setDetailMemberId(null)}
        />
      ) : null}
    </div>
  );
}
