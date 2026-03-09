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
import { createGroup, getGroupFeed, getMyGroups, joinGroupByCode, sharePortfolio } from '@/api/groups';
import { getMyPortfolios } from '@/api/portfolio';
import { EmptyState } from '@/components/common/EmptyState';
import { EntryModeSelector, EntryModeTabs, type EntryMode } from '@/components/common/EntryModeSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import type { GroupMember, PortfolioItem } from '@/types/api';

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

type AllocationItem = {
  item: PortfolioItem;
  value: number;
  weight: number;
};

function getPortfolioTitle(item: PortfolioItem) {
  return item.nameKr || item.nameEn || item.symbol;
}

function getPortfolioValue(items: PortfolioItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.averagePrice, 0);
}

function getAllocation(items: PortfolioItem[]) {
  const totalValue = getPortfolioValue(items);

  return [...items]
    .map((item) => {
      const value = item.quantity * item.averagePrice;
      const weight = totalValue <= 0 ? 0 : (value * 100) / totalValue;

      return { item, value, weight };
    })
    .sort((a, b) => b.value - a.value);
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
    <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
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

function SharedBoardCard(props: {
  member: GroupMember;
  current: number;
  total: number;
  onOpenDetail: () => void;
}) {
  const items = props.member.sharedPortfolioItems ?? [];
  const allocation = getAllocation(items);
  const totalValue = getPortfolioValue(items);
  const topThreeWeight = allocation.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const isPrivate = isPrivateSharedPortfolio(props.member);
  const remainingWeight = Math.max(
    0,
    100 - allocation.slice(0, 5).reduce((sum, item) => sum + item.weight, 0),
  );

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(2,6,23,0.98),rgba(15,23,42,0.97),rgba(30,41,59,0.97))] p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-200/80">{props.member.member.nickname}</p>
          <h3 className="mt-2 truncate text-2xl font-black tracking-tight text-white">
            {props.member.sharedPortfolioName}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            어떤 종목에 얼마만큼 실었는지 비중으로 바로 볼 수 있어요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPrivate ? (
            <span className="whitespace-nowrap rounded-full border border-amber-200/20 bg-amber-400/12 px-3 py-1 text-[10px] font-semibold text-amber-100">
              비공개
            </span>
          ) : null}
          <span className="whitespace-nowrap rounded-full border border-blue-200/20 bg-blue-400/12 px-3 py-1 text-[10px] font-semibold text-blue-100">
            {props.current} / {props.total}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
          <p className="text-[11px] text-slate-400">총 평가금액</p>
          <p className="mt-1 text-sm font-bold text-white">
            {isPrivate ? '비중만 공개' : formatCurrency(totalValue, allocation[0]?.item.currency || 'KRW')}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
          <p className="text-[11px] text-slate-400">보유 종목</p>
          <p className="mt-1 text-sm font-bold text-white">{allocation.length}개</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
          <p className="text-[11px] text-slate-400">상위 3개</p>
          <p className="mt-1 text-sm font-bold text-white">{topThreeWeight.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              allocation map
            </p>
            <p className="mt-2 text-lg font-bold text-white">{getConcentrationLabel(allocation)}</p>
            <p className="mt-1 text-sm text-slate-400">
              구성 비율이 큰 순서대로 흐름을 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onOpenDetail}
            className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
          >
            전체 구성 보기
          </button>
        </div>

        <div className="mt-4">
          <AllocationBar items={allocation} />
        </div>

        {isPrivate ? (
          <div className="mt-3 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
            비중과 종목만 공개돼요. 금액, 수량, 평단가는 숨겨집니다.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {allocation.slice(0, 5).map((allocationItem, index) => (
            <div
              key={allocationItem.item.id}
              className="rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                    />
                    <p className="truncate font-semibold text-white">
                      {getPortfolioTitle(allocationItem.item)}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {allocationItem.item.market} · {allocationItem.item.symbol}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-white">{allocationItem.weight.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-slate-400">
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
              className="flex w-full items-center justify-between rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.05]"
            >
              <div>
                <p className="font-semibold text-white">나머지 종목 더 보기</p>
                <p className="mt-1 text-xs text-slate-400">
                  {allocation.length - 5}개 종목 · {remainingWeight.toFixed(1)}%
                </p>
              </div>
              <BarChart3 size={18} className="text-blue-200" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PortfolioDetailSheet(props: {
  member: GroupMember;
  onClose: () => void;
}) {
  const items = props.member.sharedPortfolioItems ?? [];
  const allocation = getAllocation(items);
  const totalValue = getPortfolioValue(items);
  const topThreeWeight = allocation.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const isPrivate = isPrivateSharedPortfolio(props.member);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
      <div className="mx-auto max-h-full w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/95 shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-200/90">{props.member.member.nickname}</p>
            <h3 className="mt-2 truncate text-xl font-black tracking-tight text-white">
              {props.member.sharedPortfolioName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              비중 중심으로 전체 구성을 자세히 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
            aria-label="상세 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
              <p className="text-[11px] text-slate-400">총 평가금액</p>
              <p className="mt-1 text-sm font-bold text-white">
                {isPrivate ? '비중만 공개' : formatCurrency(totalValue, allocation[0]?.item.currency || 'KRW')}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
              <p className="text-[11px] text-slate-400">보유 종목</p>
              <p className="mt-1 text-sm font-bold text-white">{allocation.length}개</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3">
              <p className="text-[11px] text-slate-400">상위 3개</p>
              <p className="mt-1 text-sm font-bold text-white">{topThreeWeight.toFixed(1)}%</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">전체 비중</p>
                <p className="mt-1 text-xs text-slate-400">종목별 자산 비중을 한 번에 봅니다.</p>
              </div>
              <BarChart3 size={18} className="text-blue-200" />
            </div>
            <div className="mt-4">
              <AllocationBar items={allocation} />
            </div>
            {isPrivate ? (
              <div className="mt-3 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
                비중과 종목만 공개돼요. 금액, 수량, 평단가는 숨겨집니다.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {allocation.map((allocationItem, index) => (
              <div
                key={allocationItem.item.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                      />
                      <p className="truncate font-bold text-white">
                        {getPortfolioTitle(allocationItem.item)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {allocationItem.item.market} · {allocationItem.item.symbol}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-white">
                      {allocationItem.weight.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isPrivate ? '금액 비공개' : formatCurrency(allocationItem.value, allocationItem.item.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}`}
                    style={{ width: `${Math.max(allocationItem.weight, 4)}%` }}
                  />
                </div>

                {isPrivate ? null : (
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
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

  useEffect(() => {
    if (!selectedGroupId && groupsQuery.data?.length) {
      setSelectedGroupId(groupsQuery.data[0].id);
    }
  }, [groupsQuery.data, selectedGroupId]);

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
                ? 'border-blue-400/30 bg-blue-500/15 text-blue-100'
                : 'border-white/10 bg-white/[0.04] text-slate-400'
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
    <div className="space-y-5">
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

          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(155deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96),rgba(30,41,59,0.96))] px-5 py-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-200/80">그룹</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {entryMode === 'view' ? '참여 중인 그룹을 둘러보세요' : '바로 관리해 보세요'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {entryMode === 'view'
                    ? '같은 그룹 안에서 누가 어떤 비중으로 투자하는지 한눈에 볼 수 있어요.'
                    : '새 그룹을 만들고 참여하고 내 포트폴리오를 바로 공유할 수 있어요.'}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-100">
                <Sparkles size={18} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-3 py-3">
                <p className="text-[11px] text-slate-400">내 그룹</p>
                <p className="mt-1 text-sm font-bold text-white">{groupsQuery.data?.length || 0}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-3 py-3">
                <p className="text-[11px] text-slate-400">공유 보드</p>
                <p className="mt-1 text-sm font-bold text-white">{sharedMembers.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-3 py-3">
                <p className="text-[11px] text-slate-400">최근 활동</p>
                <p className="mt-1 text-sm font-bold text-white">{feedQuery.data?.length || 0}</p>
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
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400/30"
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
                      className="h-24 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400/30"
                      placeholder="이 그룹에서 어떤 포트폴리오를 보게 될지 적어 주세요."
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400"
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
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400/30"
                      placeholder="초대 코드 입력"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-semibold text-white transition hover:bg-white/[0.1]"
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
                    action={<Sparkles size={18} className="text-blue-300" />}
                  >
                    <div className="space-y-2">
                      {portfoliosQuery.data?.map((portfolio) => (
                        <button
                          key={portfolio.id}
                          type="button"
                          onClick={() => setSelectedPortfolioId(portfolio.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
                            selectedPortfolioId === portfolio.id
                              ? 'border-blue-400/20 bg-blue-500/10'
                              : mySharedPortfolioId === portfolio.id
                                ? 'border-emerald-400/20 bg-emerald-500/10'
                                : 'border-white/10 bg-white/[0.04]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white">{portfolio.name}</p>
                            <p className="text-sm text-slate-400">{portfolio.items.length}개 자산</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {mySharedPortfolioId === portfolio.id ? (
                              <span className="whitespace-nowrap rounded-full bg-emerald-400/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                                현재 공유 중
                              </span>
                            ) : null}
                            {selectedPortfolioId === portfolio.id ? (
                              <span className="whitespace-nowrap text-xs font-semibold text-blue-200">
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
                      className="mt-3 w-full whitespace-nowrap rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
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
                  <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-white">{selectedGroup.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {selectedGroup.description || '포트폴리오 구성을 같이 보는 그룹이에요.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  {currentBoard ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">포트폴리오 보드</p>
                          <p className="text-sm text-slate-400">
                            누가 어떤 종목에 비중을 실었는지 좌우로 넘겨 보세요.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={showPreviousBoard}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={showNextBoard}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
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
                              index === selectedBoardIndex ? 'w-8 bg-blue-400' : 'w-2.5 bg-white/20'
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
                            className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-white">{feed.nickname}</p>
                              <span className="text-xs font-semibold text-slate-400">
                                {formatRelativeTime(feed.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
                              {feed.actionType}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{feed.content}</p>
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
        <PortfolioDetailSheet member={detailMember} onClose={() => setDetailMemberId(null)} />
      ) : null}
    </div>
  );
}
