import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, PieChart, Plus, Settings2, Sparkles, Trash2 } from 'lucide-react';
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
import { getMarketIndices, getStockPrice, getStocks } from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { EntryModeSelector, EntryModeTabs, type EntryMode } from '@/components/common/EntryModeSelector';
import { SectionCard } from '@/components/common/SectionCard';
import { useStockWebSocket } from '@/hooks/useStockWebSocket';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useStockStore } from '@/stores/useStockStore';
import { useToastStore } from '@/stores/toastStore';
import type { PortfolioItem, PortfolioItemRequest, StockItem } from '@/types/api';

type ItemFormState = {
  symbol: string;
  quantity: string;
  averagePrice: string;
  currency: string;
};

type SelectedPriceState = {
  symbol: string;
  price: string;
};

type CashFormState = {
  amount: string;
  currency: 'KRW' | 'USD';
};

const EMPTY_ITEM_FORM: ItemFormState = {
  symbol: '',
  quantity: '1',
  averagePrice: '',
  currency: 'KRW',
};

const QUICK_ADJUST_STEPS = [-100, -10, -1, 1, 10, 100] as const;
const usdToKrwRate_FALLBACK = 1_350;
const PORTFOLIO_ALLOCATION_COLORS = [
  '#2563eb',
  '#0f766e',
  '#ea580c',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
] as const;
const CASH_AMOUNT_BUTTONS = {
  KRW: [
    { label: '-100만', value: -1_000_000 },
    { label: '-10만', value: -100_000 },
    { label: '-1만', value: -10_000 },
    { label: '+1만', value: 10_000 },
    { label: '+10만', value: 100_000 },
    { label: '+100만', value: 1_000_000 },
  ],
  USD: [
    { label: '-$100', value: -100 },
    { label: '-$10', value: -10 },
    { label: '-$1', value: -1 },
    { label: '+$1', value: 1 },
    { label: '+$10', value: 10 },
    { label: '+$100', value: 100 },
  ],
} as const;

function formatAdjustLabel(step: number) {
  return step > 0 ? `+${step}` : `${step}`;
}

function parseNumericInput(rawValue: string, fallback = 0) {
  const parsed = Number(rawValue.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adjustNumericValue(rawValue: string, step: number, minimum: number, integerOnly: boolean) {
  const baseValue = parseNumericInput(rawValue, minimum);
  const nextValue = Math.max(minimum, baseValue + step);

  if (integerOnly) {
    return String(Math.round(nextValue));
  }

  const roundedValue = Math.round(nextValue * 100) / 100;
  return Number.isInteger(roundedValue) ? String(roundedValue) : String(roundedValue);
}

function createEmptyItemForm(): ItemFormState {
  return { ...EMPTY_ITEM_FORM };
}

function createEmptyCashForm(): CashFormState {
  return { amount: '', currency: 'KRW' };
}

function getCurrencyByMarket(market: string) {
  return market === 'KOSPI' || market === 'KOSDAQ' ? 'KRW' : 'USD';
}

function normalizePriceInput(price: string) {
  const parsed = Number(price.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    return '';
  }

  const roundedValue = Math.round(parsed * 100) / 100;
  return Number.isInteger(roundedValue) ? String(roundedValue) : String(roundedValue);
}

function formatCurrentPriceLabel(price: string | undefined, currency: string) {
  if (!price) {
    return '-';
  }

  const normalizedPrice = normalizePriceInput(price);
  if (!normalizedPrice) {
    return '-';
  }

  return formatCurrency(Number(normalizedPrice), currency);
}

function getStockSearchLabel(stock: {
  symbol: string;
  nameKr?: string;
  nameEn?: string;
}) {
  return `${stock.nameKr || stock.nameEn || stock.symbol} (${stock.symbol})`;
}

function isCashAsset(item: Pick<PortfolioItem, 'symbol' | 'market'>) {
  return item.market === 'CASH' || item.symbol === 'KRW' || item.symbol === 'USD';
}

function getPortfolioItemBaseValue(item: Pick<PortfolioItem, 'quantity' | 'averagePrice'>) {
  return item.quantity * item.averagePrice;
}

function getCashAssetAmount(item: Pick<PortfolioItem, 'quantity' | 'averagePrice'>) {
  return Math.round(getPortfolioItemBaseValue(item) * 100) / 100;
}

function getPortfolioItemCostBasis(item: Pick<PortfolioItem, 'quantity' | 'averagePrice'>) {
  return getPortfolioItemBaseValue(item);
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

function parseUsdKrwRate(indices: { symbol: string; name: string; price: string; type?: string }[] | undefined) {
  const exchangeRate = indices?.find(
    (index) =>
      index.symbol?.includes('USD_KRW') ||
      index.symbol === 'OANDA:USD_KRW' ||
      index.name?.includes('환율') ||
      index.type === 'FOREX',
  );

  const parsed = Number(exchangeRate?.price?.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : usdToKrwRate_FALLBACK;
}

function getPortfolioItemDisplayName(item: Pick<PortfolioItem, 'symbol' | 'market' | 'nameKr' | 'nameEn'>) {
  if (isCashAsset(item)) {
    return item.symbol === 'USD' ? '달러 현금' : '원화 현금';
  }

  return item.nameKr || item.nameEn || item.symbol;
}

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const { subscribe } = useStockWebSocket();
  const livePrices = useStockStore((state) => state.prices);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteItemTargetId, setDeleteItemTargetId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);
  const [isAddCashSheetOpen, setIsAddCashSheetOpen] = useState(false);
  const [selectedAddStock, setSelectedAddStock] = useState<StockItem | null>(null);
  const [selectedAddPrice, setSelectedAddPrice] = useState<SelectedPriceState | null>(null);
  const [loadingAddPriceSymbol, setLoadingAddPriceSymbol] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: '',
    isPublic: true,
  });
  const [addItemForm, setAddItemForm] = useState<ItemFormState>(createEmptyItemForm);
  const [cashForm, setCashForm] = useState<CashFormState>(createEmptyCashForm);
  const [editItemForm, setEditItemForm] = useState<ItemFormState>(createEmptyItemForm);
  const [stockSearch, setStockSearch] = useState('');
  const deferredSearch = useDeferredValue(stockSearch);

  const portfoliosQuery = useQuery({
    queryKey: ['portfolios'],
    queryFn: getMyPortfolios,
  });

  const stockSearchQuery = useQuery({
    queryKey: ['stock-search', deferredSearch],
    queryFn: () => getStocks({ query: deferredSearch, page: 0, size: 8 }),
    enabled: isAddItemSheetOpen && deferredSearch.trim().length > 0,
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

  const sortedPortfolios = useMemo(
    () =>
      [...(portfoliosQuery.data ?? [])].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return leftTime - rightTime;
        }

        return left.id - right.id;
      }),
    [portfoliosQuery.data],
  );

  useEffect(() => {
    if (!selectedPortfolioId && sortedPortfolios.length > 0) {
      const primary = sortedPortfolios.find((portfolio) => portfolio.isPrimary);
      setSelectedPortfolioId(primary?.id ?? sortedPortfolios[0].id);
    }
  }, [selectedPortfolioId, sortedPortfolios]);

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

  const selectedPortfolio = useMemo(
    () => sortedPortfolios.find((item) => item.id === selectedPortfolioId) || null,
    [selectedPortfolioId, sortedPortfolios],
  );
  const isEditingCash = editingItem ? isCashAsset(editingItem) : false;
  const isViewMode = entryMode === 'view';

  function getPortfolioItemDisplayUnitPrice(item: PortfolioItem) {
    if (isCashAsset(item) || !isViewMode) {
      return item.averagePrice;
    }

    const livePrice = livePrices[item.symbol]?.price;
    const parsedLivePrice = livePrice ? parseNumericInput(livePrice, item.averagePrice) : item.averagePrice;
    return Number.isFinite(parsedLivePrice) ? parsedLivePrice : item.averagePrice;
  }

  function getPortfolioItemDisplayValue(item: PortfolioItem) {
    if (isCashAsset(item)) {
      return getCashAssetAmount(item);
    }

    return item.quantity * getPortfolioItemDisplayUnitPrice(item);
  }

  function getPortfolioItemDisplayEstimatedValue(item: PortfolioItem) {
    const displayValue = getPortfolioItemDisplayValue(item);
    return item.currency === 'USD' ? displayValue * usdToKrwRate : displayValue;
  }

  const portfolioSymbols = useMemo(
    () => selectedPortfolio?.items.filter((item) => !isCashAsset(item)).map((item) => item.symbol) ?? [],
    [selectedPortfolio],
  );

  useEffect(() => {
    if (!isViewMode) {
      return;
    }

    portfolioSymbols.forEach((symbol) => subscribe(symbol));
  }, [isViewMode, portfolioSymbols, subscribe]);

  const displayedPortfolioItems = useMemo(() => {
    if (!selectedPortfolio) {
      return [];
    }

    return [...selectedPortfolio.items].sort((left, right) => {
      const valueDiff = getPortfolioItemDisplayEstimatedValue(right) - getPortfolioItemDisplayEstimatedValue(left);
      if (valueDiff !== 0) {
        return valueDiff;
      }

      return right.id - left.id;
    });
  }, [selectedPortfolio, isViewMode, livePrices]);
 
  const portfolioSummary = useMemo(() => {
    if (!selectedPortfolio) {
      return { totalItems: 0, totalValue: 0, totalCost: 0, totalProfitLoss: 0, totalProfitRate: 0 };
    }

    const summary = displayedPortfolioItems.reduce(
      (acc, item) => {
        const displayValue = getPortfolioItemDisplayEstimatedValue(item);
        const costBasis = item.currency === 'USD'
          ? getPortfolioItemCostBasis(item) * usdToKrwRate
          : getPortfolioItemCostBasis(item);

        return {
          totalItems: acc.totalItems + item.quantity,
          totalValue: acc.totalValue + displayValue,
          totalCost: acc.totalCost + costBasis,
        };
      },
      { totalItems: 0, totalValue: 0, totalCost: 0 },
    );

    const totalProfitLoss = summary.totalValue - summary.totalCost;
    const totalProfitRate = summary.totalCost > 0 ? (totalProfitLoss / summary.totalCost) * 100 : 0;

    return {
      ...summary,
      totalProfitLoss,
      totalProfitRate,
    };
  }, [displayedPortfolioItems, selectedPortfolio, isViewMode, livePrices]);

  const portfolioAllocation = useMemo(() => {
    if (!selectedPortfolio) {
      return [];
    }

    const items = displayedPortfolioItems
      .map((item) => ({
        id: item.id,
        label: getPortfolioItemDisplayName(item),
        symbol: item.symbol,
        currency: item.currency,
        displayValue: getPortfolioItemDisplayValue(item),
        estimatedValue: getPortfolioItemDisplayEstimatedValue(item),
      }))
      .filter((item) => item.estimatedValue > 0);

    const totalEstimatedValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);

    return items.map((item) => ({
      ...item,
      weight: totalEstimatedValue <= 0 ? 0 : (item.estimatedValue * 100) / totalEstimatedValue,
    }));
  }, [displayedPortfolioItems, selectedPortfolio, isViewMode, livePrices]);

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

  const addItemMutation = useMutation({
    mutationFn: (payload: PortfolioItemRequest) => {
      if (!selectedPortfolioId) {
        throw new Error('포트폴리오가 없습니다.');
      }

      return addPortfolioItem(selectedPortfolioId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      handleCloseAddItemSheet();
      handleCloseAddCashSheet();
      pushToast('종목을 담았어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('종목을 담지 못했어요.', 'error');
    },
  });

  const editItemMutation = useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: PortfolioItemRequest;
    }) => {
      if (!selectedPortfolioId) {
        throw new Error('포트폴리오가 없습니다.');
      }

      return updatePortfolioItem(selectedPortfolioId, itemId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      handleCloseEditItemSheet();
      pushToast('종목 정보를 바꿨어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('종목 정보를 바꾸지 못했어요.', 'error');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => {
      if (!selectedPortfolioId) {
        throw new Error('삭제할 종목이 없습니다.');
      }

      return deletePortfolioItem(selectedPortfolioId, itemId);
    },
    onSuccess: (_, deletedItemId) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-portfolio'] });
      if (editingItem?.id === deletedItemId) {
        handleCloseEditItemSheet();
      }
      pushToast('종목을 삭제했어요.', 'success');
    },
    onError: (error) => {
      console.error(error);
      pushToast('종목을 삭제하지 못했어요.', 'error');
    },
  });

  function buildItemPayload(form: ItemFormState, requireSymbol = true) {
    if (requireSymbol && !form.symbol.trim()) {
      pushToast('종목을 먼저 골라 주세요.', 'error');
      return null;
    }

    const quantity = parseNumericInput(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      pushToast('수량은 1 이상으로 입력해 주세요.', 'error');
      return null;
    }

    const averagePrice = parseNumericInput(form.averagePrice);
    if (!Number.isFinite(averagePrice) || averagePrice < 0) {
      pushToast('평균단가는 0 이상으로 입력해 주세요.', 'error');
      return null;
    }

    return {
      symbol: form.symbol,
      quantity,
      averagePrice,
      currency: form.currency,
    } satisfies PortfolioItemRequest;
  }

  function handleOpenAddItemSheet() {
    handleCloseEditItemSheet();
    handleCloseAddCashSheet();
    setIsAddItemSheetOpen(true);
    setSelectedAddStock(null);
    setSelectedAddPrice(null);
    setLoadingAddPriceSymbol(null);
    setAddItemForm(createEmptyItemForm());
    setStockSearch('');
  }

  function handleCloseAddItemSheet() {
    setIsAddItemSheetOpen(false);
    setSelectedAddStock(null);
    setSelectedAddPrice(null);
    setLoadingAddPriceSymbol(null);
    setAddItemForm(createEmptyItemForm());
    setStockSearch('');
  }

  function handleOpenAddCashSheet() {
    handleCloseEditItemSheet();
    handleCloseAddItemSheet();
    setIsAddCashSheetOpen(true);
    setCashForm(createEmptyCashForm());
  }

  function handleCloseAddCashSheet() {
    setIsAddCashSheetOpen(false);
    setCashForm(createEmptyCashForm());
  }

  async function handleSelectAddStock(stock: StockItem) {
    const currency = getCurrencyByMarket(stock.market);

    setSelectedAddStock(stock);
    setSelectedAddPrice(null);
    setLoadingAddPriceSymbol(stock.symbol);
    setAddItemForm({
      symbol: stock.symbol,
      quantity: '1',
      averagePrice: '',
      currency,
    });
    setStockSearch(getStockSearchLabel(stock));

    try {
      const priceData = await queryClient.fetchQuery({
        queryKey: ['stock-price', stock.symbol],
        queryFn: () => getStockPrice(stock.symbol),
        staleTime: 15_000,
      });

      const initialAveragePrice = normalizePriceInput(priceData.price);
      setSelectedAddPrice({
        symbol: stock.symbol,
        price: priceData.price,
      });
      setAddItemForm((current) =>
        current.symbol !== stock.symbol
          ? current
          : {
              ...current,
              averagePrice: initialAveragePrice || current.averagePrice,
              currency,
            },
      );
    } catch (error) {
      console.error(error);
      pushToast('현재가를 불러오지 못했어요. 평균단가를 직접 입력해 주세요.', 'error');
    } finally {
      setLoadingAddPriceSymbol((current) => (current === stock.symbol ? null : current));
    }
  }

  function handleCreatePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(portfolioForm);
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildItemPayload(addItemForm);
    if (!payload) {
      return;
    }

    addItemMutation.mutate(payload);
  }

  function handleAddCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseNumericInput(cashForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushToast('현금 금액을 먼저 입력해 주세요.', 'error');
      return;
    }

    const payload = {
      symbol: cashForm.currency,
      market: 'CASH' as const,
      quantity: 1,
      averagePrice: amount,
      currency: cashForm.currency,
    } satisfies PortfolioItemRequest;

    addItemMutation.mutate(payload);
  }

  function handleSaveEditedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingItem) {
      return;
    }

    if (isCashAsset(editingItem)) {
      const amount = parseNumericInput(editItemForm.averagePrice);
      if (!Number.isFinite(amount) || amount < 0) {
        pushToast('현금 금액은 0 이상으로 입력해 주세요.', 'error');
        return;
      }

      editItemMutation.mutate({
        itemId: editingItem.id,
        payload: {
          symbol: editingItem.symbol,
          market: 'CASH',
          quantity: 1,
          averagePrice: amount,
          currency: editItemForm.currency,
        },
      });
      return;
    }

    const payload = buildItemPayload(editItemForm, false);
    if (!payload) {
      return;
    }

    editItemMutation.mutate({
      itemId: editingItem.id,
      payload,
    });
  }

  function handleDeletePortfolio(portfolioId: number) {
    setDeleteTargetId(portfolioId);
  }

  function handleStartEditItem(item: PortfolioItem) {
    handleCloseAddItemSheet();
    handleCloseAddCashSheet();

    const initialAveragePrice = isCashAsset(item)
      ? normalizePriceInput(String(getCashAssetAmount(item)))
      : String(item.averagePrice);

    setEditingItem(item);
    setEditItemForm({
      symbol: item.symbol,
      quantity: isCashAsset(item) ? '1' : String(item.quantity),
      averagePrice: initialAveragePrice,
      currency: item.currency,
    });
  }

  function handleCloseEditItemSheet() {
    setEditingItem(null);
    setEditItemForm(createEmptyItemForm());
  }

  function handleAdjustCashAmount(step: number) {
    setCashForm((current) => ({
      ...current,
      amount: adjustNumericValue(current.amount, step, 0, false),
    }));
  }

  function handleAdjustEditCashAmount(step: number) {
    setEditItemForm((current) => ({
      ...current,
      quantity: '1',
      averagePrice: adjustNumericValue(current.averagePrice, step, 0, false),
    }));
  }

  function handleAdjustAddItem(field: 'quantity' | 'averagePrice', step: number) {
    setAddItemForm((current) => ({
      ...current,
      [field]: adjustNumericValue(current[field], step, field === 'quantity' ? 1 : 0, field === 'quantity'),
    }));
  }

  function handleAdjustEditItem(field: 'quantity' | 'averagePrice', step: number) {
    setEditItemForm((current) => ({
      ...current,
      [field]: adjustNumericValue(current[field], step, field === 'quantity' ? 1 : 0, field === 'quantity'),
    }));
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
    if (!deleteItemTargetId) {
      return;
    }

    deleteItemMutation.mutate(deleteItemTargetId, {
      onSettled: () => setDeleteItemTargetId(null),
    });
  }

  function renderPortfolioChips() {
  return (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {sortedPortfolios.map((portfolio) => {
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

    const donutSize = 168;
    const donutStrokeWidth = 18;
    const donutRadius = (donutSize - donutStrokeWidth) / 2;
    const donutCircumference = 2 * Math.PI * donutRadius;
    let accumulatedLength = 0;

    const donutSegments = portfolioAllocation.map((item, index) => {
      const dashLength = donutCircumference * (item.weight / 100);
      const segment = {
        ...item,
        color: PORTFOLIO_ALLOCATION_COLORS[index % PORTFOLIO_ALLOCATION_COLORS.length],
        dashArray: `${dashLength} ${Math.max(donutCircumference - dashLength, 0)}`,
        dashOffset: -accumulatedLength,
      };

      accumulatedLength += dashLength;
      return segment;
    });

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
                : formatCurrency(portfolioSummary.totalValue, 'KRW')}
            </p>
          </div>
        </div>

        {!showManageAction ? (
          <div className="mobile-soft-card mt-3 rounded-[18px] border px-3 py-3">
            <p className="text-xs text-[color:var(--text-sub)]">평가 손익</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p
                className={`text-sm font-bold ${
                  portfolioSummary.totalProfitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatCurrency(portfolioSummary.totalProfitLoss, 'KRW')}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  portfolioSummary.totalProfitLoss < 0
                    ? 'bg-emerald-500/12 text-emerald-600'
                    : 'bg-rose-500/12 text-rose-500'
                }`}
              >
                {portfolioSummary.totalProfitRate >= 0 ? '+' : ''}
                {portfolioSummary.totalProfitRate.toFixed(2)}%
              </span>
            </div>
          </div>
        ) : null}

        {showManageAction ? (
          <div className="mobile-soft-card mt-3 rounded-[18px] border px-3 py-3 text-sm text-[color:var(--text-main)]/80">
            {selectedPortfolio.isPublic
              ? '현재 공개 상태예요. 그룹에서 비중과 상세 정보까지 보여줘요.'
              : '현재 비공개 상태예요. 그룹에서는 종목과 비중만 보여줘요.'}
          </div>
        ) : (
          <div className="mobile-soft-card mt-3 rounded-[22px] border px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/12 text-sky-700 dark:text-sky-200">
                <PieChart size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-[color:var(--text-main)]">자산 비중</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">
                  보유대금 기준으로 큰 자산부터 비중을 바로 볼 수 있어요.
                </p>
                {!selectedPortfolio.isPublic ? (
                  <p className="mt-2 text-[11px] font-semibold text-[color:var(--brand-solid)]">
                    내 조회 화면이라 전체 비중을 그대로 보여줘요.
                  </p>
                ) : null}
              </div>
            </div>

            {portfolioAllocation.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="flex justify-center">
                  <div className="relative h-44 w-44">
                    <svg viewBox={`0 0 ${donutSize} ${donutSize}`} className="h-full w-full -rotate-90">
                      <circle
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={donutRadius}
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.20)"
                        strokeWidth={donutStrokeWidth}
                      />
                      {donutSegments.map((segment) => (
                        <circle
                          key={segment.id}
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={donutRadius}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth={donutStrokeWidth}
                          strokeDasharray={segment.dashArray}
                          strokeDashoffset={segment.dashOffset}
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      <p className="text-[11px] font-semibold text-[color:var(--text-sub)]">총 평가금액</p>
                      <p className="mt-1 text-base font-black text-[color:var(--text-main)]">
                        {formatCompactKrw(portfolioSummary.totalValue)}
                      </p>
                      <p className="mt-1 text-[11px] text-[color:var(--text-sub)]">{portfolioAllocation.length}개 자산</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {portfolioAllocation.map((allocation, index) => (
                    <div
                      key={allocation.id}
                      className="mobile-soft-card flex items-center justify-between rounded-[18px] border px-3 py-3"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: PORTFOLIO_ALLOCATION_COLORS[index % PORTFOLIO_ALLOCATION_COLORS.length] }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[color:var(--text-main)]">{allocation.label}</p>
                          <p className="mt-1 truncate text-xs text-[color:var(--text-sub)]">
                            {allocation.symbol} · {formatCurrency(allocation.displayValue, allocation.currency)}
                          </p>
                        </div>
                      </div>
                      <p className="ml-3 shrink-0 text-sm font-bold text-[color:var(--text-main)]">
                        {allocation.weight.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mobile-soft-card mt-4 rounded-[18px] border px-4 py-4 text-sm leading-6 text-[color:var(--text-sub)]">
                아직 비중을 계산할 자산이 없어요.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPortfolioItems(emptyDescription: string, showManageAction: boolean) {
    if (!selectedPortfolio) {
      return null;
    }

    return (
      <div className="space-y-2">
        {displayedPortfolioItems.length > 0 ? (
          displayedPortfolioItems.map((item) => {
            const isCash = isCashAsset(item);
            const priceCaption = isCash ? '보유 금액' : showManageAction ? '평균단가' : '현재가';
            const priceValue = isCash
              ? getCashAssetAmount(item)
              : showManageAction
                ? item.averagePrice
                : getPortfolioItemDisplayUnitPrice(item);
            const currentValue = getPortfolioItemDisplayValue(item);
            const costBasis = getPortfolioItemCostBasis(item);
            const profitLoss = isCash ? 0 : currentValue - costBasis;
            const profitRate = !isCash && costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

            return (
              <div
                key={item.id}
                className="mobile-soft-card flex items-center justify-between rounded-[20px] border px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[color:var(--text-main)]">{getPortfolioItemDisplayName(item)}</p>
                    {isCash ? (
                      <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-200">
                        현금
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-[color:var(--text-sub)]">
                    {isCash ? `현금 자산 · ${item.symbol}` : `${item.symbol} · ${formatNumber(item.quantity)}주`}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-[11px] text-[color:var(--text-sub)]">{priceCaption}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--text-main)]">
                      {formatCurrency(priceValue, item.currency)}
                    </p>
                    {!showManageAction && !isCash ? (
                      <div className="mt-1 space-y-1">
                        <p
                          className={`text-[11px] font-semibold ${
                            profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          손익 {formatCurrency(profitLoss, item.currency)}
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            profitLoss < 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          수익률 {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                        </p>
                      </div>
                    ) : null}
                  </div>
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
            );
          })
        ) : (
          <EmptyState title="아직 담긴 종목이 없어요" description={emptyDescription} />
        )}
      </div>
    );
  }

  function renderQuickAdjustButtons(
    field: 'quantity' | 'averagePrice',
    onAdjust: (field: 'quantity' | 'averagePrice', step: number) => void,
  ) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_ADJUST_STEPS.map((step) => (
          <button
            key={`${field}-${step}`}
            type="button"
            onClick={() => onAdjust(field, step)}
            className="mobile-chip-idle rounded-xl border px-3 py-2 text-xs font-semibold"
          >
            {formatAdjustLabel(step)}
          </button>
        ))}
      </div>
    );
  }

  function renderCashAdjustButtons(currency: string, onAdjust: (step: number) => void) {
    const cashCurrency = currency === 'USD' ? 'USD' : 'KRW';

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {CASH_AMOUNT_BUTTONS[cashCurrency].map((button) => (
          <button
            key={`${cashCurrency}-${button.label}`}
            type="button"
            onClick={() => onAdjust(button.value)}
            className="mobile-chip-idle rounded-xl border px-3 py-2 text-xs font-semibold"
          >
            {button.label}
          </button>
        ))}
      </div>
    );
  }

  const selectedAddPriceLabel =
    selectedAddPrice?.symbol === selectedAddStock?.symbol
      ? formatCurrentPriceLabel(selectedAddPrice?.price, addItemForm.currency)
      : '-';

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
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={handleOpenAddItemSheet}
                            className="mobile-soft-card flex w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition hover:border-sky-400/30"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[color:var(--text-main)]">종목 담기</p>
                              <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">
                                검색 후 현재가를 평균단가로 먼저 채워 드려요.
                              </p>
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-[color:var(--text-main)] shadow-sm">
                              <Plus size={18} />
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenAddCashSheet}
                            className="mobile-soft-card flex w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition hover:border-emerald-400/30"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[color:var(--text-main)]">현금 담기</p>
                              <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">
                                KRW 또는 USD 현금을 바로 추가할 수 있어요.
                              </p>
                            </div>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-[color:var(--text-main)] shadow-sm">
                              <Plus size={18} />
                            </div>
                          </button>
                        </div>

                        {renderPortfolioItems(
                          '종목 또는 현금을 추가하면 여기서 바로 자산 구성을 확인할 수 있어요.',
                          true,
                        )}
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

      {isAddCashSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
          <div className="mobile-soft-card mx-auto w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
            <div className="border-b border-[color:var(--soft-panel-border)] px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--brand-accent)]">현금 담기</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text-main)]">
                보유 현금을 추가해 주세요
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                KRW 또는 USD 현금을 바로 담을 수 있어요.
              </p>
            </div>

            <form className="space-y-4 px-5 py-5" onSubmit={handleAddCash}>
              <div className="grid grid-cols-2 gap-3">
                {(['KRW', 'USD'] as const).map((currency) => {
                  const isSelected = cashForm.currency === currency;

                  return (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setCashForm((current) => ({ ...current, currency }))}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isSelected ? 'mobile-chip-active' : 'mobile-chip-idle'
                      }`}
                    >
                      {currency === 'KRW' ? '원화 (KRW)' : '달러 (USD)'}
                    </button>
                  );
                })}
              </div>

              <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
                <p className="text-xs text-[color:var(--text-sub)]">추가 금액</p>
                <input
                  type="number"
                  min="0"
                  step={cashForm.currency === 'KRW' ? '10000' : '10'}
                  value={cashForm.amount}
                  onChange={(event) => setCashForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mobile-field mt-3 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                  placeholder={cashForm.currency === 'KRW' ? '예: 5000000' : '예: 3000'}
                />
                {renderCashAdjustButtons(cashForm.currency, handleAdjustCashAmount)}
                <p className="mt-3 text-sm font-semibold text-[color:var(--text-main)]">
                  {cashForm.amount ? formatCurrency(Number(cashForm.amount), cashForm.currency) : '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseAddCashSheet}
                  className="mobile-chip-idle rounded-2xl border px-4 py-3 font-semibold"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-[color:var(--text-main)] disabled:opacity-60"
                >
                  {addItemMutation.isPending ? '추가 중...' : '현금 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isAddItemSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
          <div className="mobile-soft-card mx-auto w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
            <div className="border-b border-[color:var(--soft-panel-border)] px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--brand-accent)]">종목 담기</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text-main)]">
                추가할 종목을 골라 주세요
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                미국 종목은 USD, 국내 종목은 KRW로 맞추고 현재가를 평균단가에 먼저 채워 드려요.
              </p>
            </div>

            <form className="space-y-4 px-5 py-5" onSubmit={handleAddItem}>
              <input
                value={stockSearch}
                onChange={(event) => setStockSearch(event.target.value)}
                className="mobile-field w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                placeholder="종목 이름이나 티커로 찾아보세요."
              />

              {stockSearchQuery.data?.content?.length ? (
                <div className="space-y-2">
                  {stockSearchQuery.data.content.slice(0, 5).map((stock) => {
                    const isSelected = selectedAddStock?.symbol === stock.symbol;

                    return (
                      <button
                        key={`${stock.market}-${stock.symbol}`}
                        type="button"
                        onClick={() => {
                          void handleSelectAddStock(stock);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected ? 'mobile-chip-active' : 'mobile-soft-card'
                        }`}
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
                    );
                  })}
                </div>
              ) : stockSearch.trim() ? (
                <p className="text-sm text-[color:var(--text-sub)]">검색 결과가 없어요.</p>
              ) : null}

              {selectedAddStock ? (
                <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[color:var(--text-main)]">
                        {selectedAddStock.nameKr || selectedAddStock.nameEn || selectedAddStock.symbol}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--text-sub)]">
                        {selectedAddStock.symbol} · {selectedAddStock.market}
                      </p>
                    </div>
                    <span className="mobile-chip-idle whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold">
                      {addItemForm.currency}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-[color:var(--text-sub)]">현재가</p>
                      <p className="mt-1 font-semibold text-[color:var(--text-main)]">
                        {loadingAddPriceSymbol === selectedAddStock.symbol ? '불러오는 중...' : selectedAddPriceLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--text-sub)]">평균단가 초기값</p>
                      <p className="mt-1 font-semibold text-[color:var(--text-main)]">
                        {addItemForm.averagePrice
                          ? formatCurrency(Number(addItemForm.averagePrice), addItemForm.currency)
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--text-sub)]">통화</p>
                      <p className="mt-1 font-semibold text-[color:var(--text-main)]">{addItemForm.currency}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mobile-soft-card rounded-[24px] border px-4 py-4 text-sm leading-6 text-[color:var(--text-sub)]">
                  종목을 고르면 현재가를 평균단가로 먼저 채워 드려요.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[color:var(--text-sub)]">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={addItemForm.quantity}
                    onChange={(event) =>
                      setAddItemForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                    placeholder="수량"
                  />
                  {renderQuickAdjustButtons('quantity', handleAdjustAddItem)}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[color:var(--text-sub)]">평균단가</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addItemForm.averagePrice}
                    onChange={(event) =>
                      setAddItemForm((current) => ({ ...current, averagePrice: event.target.value }))
                    }
                    className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                    placeholder="평균단가"
                  />
                  {renderQuickAdjustButtons('averagePrice', handleAdjustAddItem)}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[color:var(--text-sub)]">통화</label>
                <select
                  value={addItemForm.currency}
                  onChange={(event) =>
                    setAddItemForm((current) => ({ ...current, currency: event.target.value }))
                  }
                  className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-sky-400/40"
                >
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseAddItemSheet}
                  className="mobile-chip-idle rounded-2xl border px-4 py-3 font-semibold"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending || !selectedAddStock}
                  className="rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-[color:var(--text-main)] disabled:opacity-60"
                >
                  {addItemMutation.isPending ? '추가 중...' : '포트폴리오에 담기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 px-4 pb-4 pt-10 backdrop-blur-sm">
          <div className="mobile-soft-card mx-auto w-full max-w-md overflow-hidden rounded-[32px] border shadow-card">
            <div className="border-b border-[color:var(--soft-panel-border)] px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--brand-accent)]">{isEditingCash ? '현금 수정' : '종목 수정'}</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text-main)]">
                {editingItem.nameKr || editingItem.nameEn || editingItem.symbol}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">
                {isEditingCash ? `${editingItem.symbol} 현금 자산` : `${editingItem.symbol} · ${editingItem.market}`}
              </p>
            </div>

            <form className="space-y-4 px-5 py-5" onSubmit={handleSaveEditedItem}>
              {isEditingCash ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[color:var(--text-sub)]">보유 금액</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editItemForm.averagePrice}
                      onChange={(event) =>
                        setEditItemForm((current) => ({ ...current, quantity: '1', averagePrice: event.target.value }))
                      }
                      className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                      placeholder="보유 현금"
                    />
                    {renderCashAdjustButtons(editItemForm.currency, handleAdjustEditCashAmount)}
                    <p className="mt-2 text-xs text-[color:var(--text-sub)]">총 보유 현금 기준으로 저장돼요.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[color:var(--text-sub)]">통화</label>
                    <div className="mobile-field mt-2 flex w-full items-center rounded-2xl border px-4 py-3 text-sm font-semibold text-[color:var(--text-main)]">
                      {editItemForm.currency}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--text-sub)]">수량</label>
                      <input
                        type="number"
                        min="1"
                        value={editItemForm.quantity}
                        onChange={(event) =>
                          setEditItemForm((current) => ({ ...current, quantity: event.target.value }))
                        }
                        className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                        placeholder="수량"
                      />
                      {renderQuickAdjustButtons('quantity', handleAdjustEditItem)}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--text-sub)]">평균단가</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editItemForm.averagePrice}
                        onChange={(event) =>
                          setEditItemForm((current) => ({ ...current, averagePrice: event.target.value }))
                        }
                        className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-slate-400 focus:border-sky-400/40"
                        placeholder="평균단가"
                      />
                      {renderQuickAdjustButtons('averagePrice', handleAdjustEditItem)}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[color:var(--text-sub)]">통화</label>
                    <select
                      value={editItemForm.currency}
                      onChange={(event) =>
                        setEditItemForm((current) => ({ ...current, currency: event.target.value }))
                      }
                      className="mobile-field mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-sky-400/40"
                    >
                      <option value="KRW">KRW</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditItemSheet}
                  className="mobile-chip-idle rounded-2xl border px-4 py-3 font-semibold"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={editItemMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-[color:var(--text-main)] disabled:opacity-60"
                >
                  <Pencil size={16} />
                  {editItemMutation.isPending ? '수정 중...' : '수정 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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