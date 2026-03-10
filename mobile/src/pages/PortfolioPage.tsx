import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Settings2, Sparkles, Trash2 } from 'lucide-react';
import {
  addPortfolioItem,
  createPortfolio,
  deletePortfolio,
  deletePortfolioItem,
  getMyPortfolios,
  setPrimaryPortfolio,
  updatePortfolio,
  updatePortfolioItem,
} from '@/api/portfolio';
import { getStocks } from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { EntryModeSelector, EntryModeTabs, type EntryMode } from '@/components/common/EntryModeSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useToastStore } from '@/stores/toastStore';

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemTargetId, setDeleteItemTargetId] = useState<number | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: '',
    isPublic: true,
  });
  const [itemForm, setItemForm] = useState({
    symbol: '',
    quantity: '1',
    averagePrice: '',
    currency: 'KRW',
  });
  const [stockSearch, setStockSearch] = useState('');
  const deferredSearch = useDeferredValue(stockSearch);

  const portfoliosQuery = useQuery({
    queryKey: ['portfolios'],
    queryFn: getMyPortfolios,
  });

  const stockSearchQuery = useQuery({
    queryKey: ['stock-search', deferredSearch],
    queryFn: () => getStocks({ query: deferredSearch, page: 0, size: 8 }),
    enabled: deferredSearch.trim().length > 0,
  });

  useEffect(() => {
    if (!selectedPortfolioId && portfoliosQuery.data?.length) {
      const primary = portfoliosQuery.data.find((portfolio) => portfolio.isPrimary);
      setSelectedPortfolioId(primary?.id ?? portfoliosQuery.data[0].id);
    }
  }, [portfoliosQuery.data, selectedPortfolioId]);

  const selectedPortfolio =
    portfoliosQuery.data?.find((portfolio) => portfolio.id === selectedPortfolioId) || null;

  const portfolioSummary = useMemo(() => {
    if (!selectedPortfolio) {
      return { totalItems: 0, totalValue: 0 };
    }

    return selectedPortfolio.items.reduce(
      (acc, item) => ({
        totalItems: acc.totalItems + item.quantity,
        totalValue: acc.totalValue + item.quantity * item.averagePrice,
      }),
      { totalItems: 0, totalValue: 0 },
    );
  }, [selectedPortfolio]);

  const createMutation = useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setPortfolioForm({ name: '', description: '', isPublic: true });
      pushToast('포트폴리오를 만들었어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('포트폴리오를 만들지 못했어요.', 'error');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: setPrimaryPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      pushToast('대표 포트폴리오를 바꿨어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('대표 포트폴리오를 바꾸지 못했어요.', 'error');
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: ({
      portfolioId,
      payload,
    }: {
      portfolioId: number;
      payload: {
        name: string;
        description: string;
        isPublic: boolean;
      };
    }) => updatePortfolio(portfolioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      pushToast('공개 설정을 바꿨어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('공개 설정을 바꾸지 못했어요.', 'error');
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: deletePortfolio,
    onSuccess: (_, deletedPortfolioId) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      if (selectedPortfolioId === deletedPortfolioId) {
        setSelectedPortfolioId(null);
      }
      pushToast('포트폴리오를 삭제했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('포트폴리오를 삭제하지 못했어요.', 'error');
    },
  });

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPortfolioId) {
        throw new Error('포트폴리오가 없습니다.');
      }

      const payload = {
        symbol: itemForm.symbol,
        quantity: Number(itemForm.quantity),
        averagePrice: Number(itemForm.averagePrice),
        currency: itemForm.currency,
      };

      if (editingItemId) {
        return updatePortfolioItem(selectedPortfolioId, editingItemId, payload);
      }

      return addPortfolioItem(selectedPortfolioId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      setItemForm({
        symbol: '',
        quantity: '1',
        averagePrice: '',
        currency: 'KRW',
      });
      setStockSearch('');
      setEditingItemId(null);
      pushToast(editingItemId ? '종목 정보를 바꿨어요.' : '종목을 담았어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast(editingItemId ? '종목 정보를 바꾸지 못했어요.' : '종목을 담지 못했어요.', 'error');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPortfolioId || !deleteItemTargetId) {
        throw new Error('삭제할 종목이 없습니다.');
      }

      return deletePortfolioItem(selectedPortfolioId, deleteItemTargetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      if (editingItemId === deleteItemTargetId) {
        setEditingItemId(null);
        setItemForm({
          symbol: '',
          quantity: '1',
          averagePrice: '',
          currency: 'KRW',
        });
        setStockSearch('');
      }
      pushToast('종목을 삭제했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('종목을 삭제하지 못했어요.', 'error');
    },
  });

  function handleCreatePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(portfolioForm);
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!itemForm.symbol) {
      pushToast('추가할 종목을 먼저 선택해 주세요.', 'error');
      return;
    }

    saveItemMutation.mutate();
  }

  function handleDeletePortfolio(portfolioId: number) {
    setDeleteTargetId(portfolioId);
  }

  function handleStartEditItem(item: {
    id: number;
    symbol: string;
    quantity: number;
    averagePrice: number;
    currency: string;
    nameKr?: string;
    nameEn?: string;
  }) {
    setEditingItemId(item.id);
    setItemForm({
      symbol: item.symbol,
      quantity: String(item.quantity),
      averagePrice: String(item.averagePrice),
      currency: item.currency,
    });
    setStockSearch(`${item.nameKr || item.nameEn || item.symbol} (${item.symbol})`);
  }

  function handleCancelEditItem() {
    setEditingItemId(null);
    setItemForm({
      symbol: '',
      quantity: '1',
      averagePrice: '',
      currency: 'KRW',
    });
    setStockSearch('');
  }

  function handleToggleVisibility() {
    if (!selectedPortfolio) {
      return;
    }

    updatePortfolioMutation.mutate({
      portfolioId: selectedPortfolio.id,
      payload: {
        name: selectedPortfolio.name,
        description: selectedPortfolio.description,
        isPublic: !selectedPortfolio.isPublic,
      },
    });
  }

  function confirmDeletePortfolio() {
    if (!deleteTargetId) {
      return;
    }

    deletePortfolioMutation.mutate(deleteTargetId, {
      onSettled: () => setDeleteTargetId(null),
    });
  }

  function confirmDeleteItem() {
    deleteItemMutation.mutate(undefined, {
      onSettled: () => setDeleteItemTargetId(null),
    });
  }

  function renderPortfolioChips() {
    return (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {portfoliosQuery.data?.map((portfolio) => {
          const isSelected = selectedPortfolioId === portfolio.id;

          return (
            <button
              key={portfolio.id}
              type="button"
              onClick={() => setSelectedPortfolioId(portfolio.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isSelected
                  ? 'mobile-chip-active'
                  : 'mobile-chip-idle'
              }`}
            >
              {portfolio.name}
            </button>
          );
        })}
      </div>
    );
  }

  function renderPortfolioSummaryCard(showManageAction: boolean) {
    if (!selectedPortfolio) {
      return null;
    }

    return (
      <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-lg font-bold text-[color:var(--text-main)]">{selectedPortfolio.name}</p>
              {selectedPortfolio.isPrimary && !showManageAction ? (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-sky-400/20 bg-sky-500/12 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-200">
                  대표
                </span>
              ) : null}
            </div>
          </div>

          {showManageAction ? (
            <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={updatePortfolioMutation.isPending}
                className={`whitespace-nowrap rounded-full border px-2.5 py-2 text-[11px] font-semibold ${
                  selectedPortfolio.isPublic
                    ? 'border-emerald-400/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'
                    : 'border-amber-400/20 bg-amber-500/12 text-amber-700 dark:text-amber-200'
                } disabled:opacity-60`}
              >
                {updatePortfolioMutation.isPending
                  ? '변경 중...'
                  : selectedPortfolio.isPublic
                    ? '공개 중'
                    : '비공개'}
              </button>
              <button
                type="button"
                onClick={() => setPrimaryMutation.mutate(selectedPortfolio.id)}
                disabled={selectedPortfolio.isPrimary || setPrimaryMutation.isPending}
                className="mobile-chip-idle whitespace-nowrap rounded-full border px-2.5 py-2 text-[11px] font-semibold disabled:opacity-50"
              >
                {selectedPortfolio.isPrimary ? '대표 설정됨' : '대표로 설정'}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePortfolio(selectedPortfolio.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-rose-700 dark:text-rose-200 ${
                  deleteTargetId === selectedPortfolio.id
                    ? 'border border-rose-300/70 bg-rose-500/18 text-rose-700 shadow-[0_8px_18px_rgba(244,63,94,0.12)] dark:border-rose-300/35 dark:bg-rose-500/20 dark:text-rose-200 dark:shadow-none'
                    : 'border border-rose-300/60 bg-rose-500/14 text-rose-700 shadow-[0_8px_18px_rgba(244,63,94,0.10)] dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:shadow-none'
                }`}
                aria-label="포트폴리오 삭제"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <div className="col-start-2 row-start-1 mobile-chip-idle shrink-0 self-start whitespace-nowrap rounded-full border px-2.5 py-2 text-[11px] font-semibold">
              {selectedPortfolio.items.length}개 종목
            </div>
          )}

          <p className="col-span-2 row-start-2 text-sm leading-6 text-[color:var(--text-sub)]">
            {selectedPortfolio.description || '설명이 없어도 종목 구성은 바로 확인할 수 있어요.'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="mobile-soft-card rounded-[18px] border px-3 py-3">
            <p className="text-xs text-[color:var(--text-sub)]">담긴 종목</p>
            <p className="mt-1 font-semibold text-[color:var(--text-main)]">{selectedPortfolio.items.length}개</p>
          </div>
          <div className="mobile-soft-card rounded-[18px] border px-3 py-3">
            <p className="text-xs text-[color:var(--text-sub)]">{showManageAction ? '공개 범위' : '평가 금액'}</p>
            <p className="mt-1 font-semibold text-[color:var(--text-main)]">
              {showManageAction
                ? selectedPortfolio.isPublic
                  ? '상세 공개'
                  : '비중만 공개'
                : formatCurrency(
                    portfolioSummary.totalValue,
                    selectedPortfolio.items[0]?.currency || 'KRW',
                  )}
            </p>
          </div>
        </div>

        {showManageAction ? (
          <div className="mobile-soft-card mt-3 rounded-[18px] border px-3 py-3 text-sm text-[color:var(--text-main)]/80">
            {selectedPortfolio.isPublic
              ? '현재 공개 상태예요. 그룹에서 비중과 상세 정보까지 보여줘요.'
              : '현재 비공개 상태예요. 그룹에서는 종목과 비중만 보여줘요.'}
          </div>
        ) : null}
      </div>
    );
  }

  function renderPortfolioItems(emptyDescription: string, showManageAction: boolean) {
    if (!selectedPortfolio) {
      return null;
    }

    return (
      <div className="space-y-2">
        {selectedPortfolio.items.length > 0 ? (
          selectedPortfolio.items.map((item) => (
            <div
              key={item.id}
              className="mobile-soft-card flex items-center justify-between rounded-[20px] border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-[color:var(--text-main)]">{item.nameKr || item.nameEn || item.symbol}</p>
                <p className="text-sm text-[color:var(--text-sub)]">
                  {item.symbol} · {formatNumber(item.quantity)}주
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <p className="text-sm font-semibold text-[color:var(--text-main)]">
                  {formatCurrency(item.averagePrice, item.currency)}
                </p>
                {showManageAction ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEditItem(item)}
                      className="mobile-icon-surface flex h-8 w-8 items-center justify-center rounded-full border"
                      aria-label="종목 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteItemTargetId(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/60 bg-rose-500/14 text-rose-700 shadow-[0_8px_18px_rgba(244,63,94,0.10)] dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:shadow-none"
                      aria-label="종목 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="아직 담긴 종목이 없어요"
            description={emptyDescription}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {entryMode === null ? (
        <EntryModeSelector
          eyebrow="Portfolio Entry"
          title="포트폴리오"
          description="지금 하려는 일에 맞춰 바로 들어가세요."
          onSelect={setEntryMode}
          options={[
            {
              mode: 'view',
              label: '조회',
              title: '둘러보기',
              description: '지금 가진 포트폴리오와 종목을 먼저 확인해요.',
              meta: '보유 자산 확인',
              icon: Eye,
              accentClassName: 'via-sky-300/70',
            },
            {
              mode: 'manage',
              label: '관리',
              title: '정리하기',
              description: '새로 만들고 대표를 바꾸고 종목을 담아요.',
              meta: '생성 · 설정 · 추가',
              icon: Settings2,
              accentClassName: 'via-emerald-300/70',
            },
          ]}
        />
      ) : (
        <>
          <EntryModeTabs activeMode={entryMode} onChange={setEntryMode} />

          <section className="mobile-hero-card overflow-hidden rounded-[32px] border px-5 py-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--brand-accent)]">포트폴리오</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--text-main)]">
                  {entryMode === 'view' ? '내 자산을 확인해 보세요' : '바로 정리해 보세요'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                  {entryMode === 'view'
                    ? '대표 포트폴리오와 담긴 종목을 빠르게 볼 수 있어요.'
                    : '포트폴리오를 만들고 대표를 바꾸고 종목을 관리할 수 있어요.'}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] text-[color:var(--brand-solid)]">
                <Sparkles size={18} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="mobile-soft-card rounded-[22px] border px-4 py-3">
                <p className="text-xs text-[color:var(--text-sub)]">전체 포트폴리오</p>
                <p className="mt-2 text-lg font-bold text-[color:var(--text-main)]">{portfoliosQuery.data?.length || 0}</p>
              </div>
              <div className="mobile-soft-card rounded-[22px] border px-4 py-3">
                <p className="text-xs text-[color:var(--text-sub)]">선택 종목 수</p>
                <p className="mt-2 text-lg font-bold text-[color:var(--text-main)]">{portfolioSummary.totalItems}</p>
              </div>
            </div>
          </section>

          {entryMode === 'manage' ? (
            <>
              <SectionCard title="새 포트폴리오" description="투자 목적이나 스타일에 맞게 자산 묶음을 나눠보세요.">
                <form className="space-y-3" onSubmit={handleCreatePortfolio}>
                  <input
                    required
                    value={portfolioForm.name}
                    onChange={(event) =>
                      setPortfolioForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                    placeholder="예: 배당 모아보기"
                  />
                  <textarea
                    value={portfolioForm.description}
                    onChange={(event) =>
                      setPortfolioForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="mobile-field h-24 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                    placeholder="이 포트폴리오를 어떤 기준으로 운영하는지 적어 주세요."
                  />
                  <label className="mobile-soft-card flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-[color:var(--text-sub)]">
                    <input
                      type="checkbox"
                      checked={portfolioForm.isPublic}
                      onChange={(event) =>
                        setPortfolioForm((current) => ({ ...current, isPublic: event.target.checked }))
                      }
                    />
                    그룹에서 함께 볼 수 있게 공개할게요
                  </label>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-[color:var(--text-main)]"
                  >
                    <Plus size={18} />
                    포트폴리오 만들기
                  </button>
                </form>
              </SectionCard>

              <SectionCard
                title="내 포트폴리오"
                description="보고 싶은 포트폴리오를 고르고 대표 설정과 공개 범위를 바로 바꿔 보세요."
              >
                {portfoliosQuery.data && portfoliosQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {renderPortfolioChips()}
                    {renderPortfolioSummaryCard(true)}

                    {selectedPortfolio ? (
                      <>
                        <form
                          className="mobile-soft-card space-y-3 rounded-[24px] border p-4"
                          onSubmit={handleAddItem}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[color:var(--text-main)]">
                              {editingItemId ? '종목 수정' : '종목 담기'}
                            </p>
                            {editingItemId ? (
                              <button
                                type="button"
                                onClick={handleCancelEditItem}
                                className="mobile-chip-idle whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold"
                              >
                                수정 취소
                              </button>
                            ) : null}
                          </div>
                          <input
                            value={stockSearch}
                            onChange={(event) => setStockSearch(event.target.value)}
                            className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                            placeholder="종목 이름이나 티커로 찾아보세요."
                          />

                          {stockSearchQuery.data?.content?.length ? (
                            <div className="space-y-2">
                              {stockSearchQuery.data.content.slice(0, 5).map((stock) => (
                                <button
                                  key={`${stock.market}-${stock.symbol}`}
                                  type="button"
                                  onClick={() => {
                                    setItemForm((current) => ({
                                      ...current,
                                      symbol: stock.symbol,
                                      currency:
                                        stock.market === 'KOSPI' || stock.market === 'KOSDAQ' ? 'KRW' : 'USD',
                                    }));
                                    setStockSearch(
                                      `${stock.nameKr || stock.nameEn || stock.symbol} (${stock.symbol})`,
                                    );
                                  }}
                                  className="mobile-soft-card flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left"
                                >
                                  <div className="min-w-0">
                                    <p className="font-bold text-[color:var(--text-main)]">
                                      {stock.nameKr || stock.nameEn || stock.symbol}
                                    </p>
                                    <p className="text-sm text-[color:var(--text-sub)]">{stock.symbol}</p>
                                  </div>
                                  <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[color:var(--text-sub)]">
                                    {stock.market}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              min="1"
                              value={itemForm.quantity}
                              onChange={(event) =>
                                setItemForm((current) => ({ ...current, quantity: event.target.value }))
                              }
                              className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                              placeholder="수량"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={itemForm.averagePrice}
                              onChange={(event) =>
                                setItemForm((current) => ({ ...current, averagePrice: event.target.value }))
                              }
                              className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                              placeholder="평균단가"
                            />
                          </div>

                          <select
                            value={itemForm.currency}
                            onChange={(event) =>
                              setItemForm((current) => ({ ...current, currency: event.target.value }))
                            }
                            className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none focus:border-sky-400/40"
                          >
                            <option value="KRW">KRW</option>
                            <option value="USD">USD</option>
                          </select>

                          <button
                            type="submit"
                            disabled={saveItemMutation.isPending}
                            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-[color:var(--text-main)] disabled:opacity-60"
                          >
                            <Plus size={18} />
                            {saveItemMutation.isPending
                              ? editingItemId
                                ? '수정 중...'
                                : '추가 중...'
                              : editingItemId
                                ? '종목 수정하기'
                                : '포트폴리오에 담기'}
                          </button>
                        </form>

                        {renderPortfolioItems('검색으로 종목을 고르고 수량과 평균단가를 넣으면 바로 추가돼요.', true)}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    title="포트폴리오가 아직 없어요"
                    description="첫 포트폴리오를 만들면 이 화면에서 바로 종목을 담고 관리할 수 있어요."
                  />
                )}
              </SectionCard>
            </>
          ) : (
            <SectionCard
              title="내 포트폴리오"
              description="보유 중인 포트폴리오를 고르고 대표 자산과 담긴 종목을 조회 중심으로 확인할 수 있어요."
            >
              {portfoliosQuery.data && portfoliosQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {renderPortfolioChips()}
                  {renderPortfolioSummaryCard(false)}
                  {renderPortfolioItems('관리 모드에서 종목을 추가하면 여기서 바로 자산 구성을 확인할 수 있어요.', false)}
                </div>
              ) : (
                <EmptyState
                  title="포트폴리오가 아직 없어요"
                  description="관리 모드에서 첫 포트폴리오를 만들면 여기서 자산 묶음을 조회할 수 있어요."
                />
              )}
            </SectionCard>
          )}
        </>
      )}

      {deleteTargetId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
          <div className="mobile-soft-card mx-auto w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
            <div className="border-b border-[color:var(--soft-panel-border)] px-5 py-5">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">포트폴리오 삭제</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text-main)]">
                이 포트폴리오를 삭제할까요?
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                담긴 종목과 설정이 함께 사라집니다. 삭제 후에는 되돌릴 수 없어요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-5 py-5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="mobile-chip-idle rounded-2xl border px-4 py-3 font-semibold"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={confirmDeletePortfolio}
                disabled={deletePortfolioMutation.isPending}
                className="rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-[color:var(--text-main)] disabled:opacity-60"
              >
                {deletePortfolioMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteItemTargetId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
          <div className="mobile-soft-card mx-auto w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
            <div className="border-b border-[color:var(--soft-panel-border)] px-5 py-5">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">종목 삭제</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text-main)]">
                이 종목을 삭제할까요?
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                포트폴리오에서만 제거되고, 삭제 후에는 바로 되돌릴 수 없어요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-5 py-5">
              <button
                type="button"
                onClick={() => setDeleteItemTargetId(null)}
                className="mobile-chip-idle rounded-2xl border px-4 py-3 font-semibold"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={deleteItemMutation.isPending}
                className="rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-[color:var(--text-main)] disabled:opacity-60"
              >
                {deleteItemMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
