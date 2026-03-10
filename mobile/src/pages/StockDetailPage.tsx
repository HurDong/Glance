import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  addInterestStock,
  getInterestStocks,
  getStockChart,
  getStockPrice,
  removeInterestStock,
} from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { LineChart, type ChartRange } from '@/components/common/LineChart';
import { SectionCard } from '@/components/common/SectionCard';
import { formatSignedText } from '@/lib/format';
import { useToastStore } from '@/stores/toastStore';

export function StockDetailPage() {
  const params = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const symbol = params.symbol || '';
  const state = (location.state as { name?: string; market?: string } | null) || {};
  const [chartRange, setChartRange] = useState<ChartRange>('1d');

  const priceQuery = useQuery({
    queryKey: ['stock-price', symbol],
    queryFn: () => getStockPrice(symbol),
    enabled: Boolean(symbol),
    refetchInterval: 20000,
  });

  const chartQuery = useQuery({
    queryKey: ['stock-chart', symbol, chartRange],
    queryFn: () => getStockChart(symbol, chartRange),
    enabled: Boolean(symbol),
  });

  const interestQuery = useQuery({
    queryKey: ['interest-stocks'],
    queryFn: getInterestStocks,
  });

  const isInterested = useMemo(
    () => interestQuery.data?.some((item) => item.symbol === symbol) ?? false,
    [interestQuery.data, symbol],
  );

  const chartCurrency = useMemo(() => {
    return state.market === 'KOSPI' || state.market === 'KOSDAQ' ? 'KRW' : 'USD';
  }, [state.market]);

  const interestMutation = useMutation({
    mutationFn: async () => {
      if (isInterested) {
        return removeInterestStock(symbol);
      }

      return addInterestStock(symbol, state.market || 'NASDAQ');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interest-stocks'] });
      pushToast(
        isInterested ? '관심 종목에서 제거했어요.' : '관심 종목에 담았어요.',
        'success',
      );
    },
    onError: (error) => {
      console.error(error);
      pushToast('관심 종목 변경에 실패했어요.', 'error');
    },
  });

  if (!symbol) {
    return (
      <EmptyState
        title="종목 정보를 찾지 못했어요"
        description="시장 화면으로 돌아가서 다시 선택해 주세요."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-sub)]"
      >
        <ArrowLeft size={16} />
        시장으로 돌아가기
      </Link>

      <section className="mobile-hero-card rounded-[32px] border px-6 py-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[color:var(--brand-accent)]">
              {state.market || '시장 정보'}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[color:var(--text-main)]">
              {state.name || symbol}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-sub)]">{symbol}</p>
          </div>

          <button
            type="button"
            onClick={() => interestMutation.mutate()}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
              isInterested ? 'bg-blue-500 text-white' : 'mobile-icon-surface border'
            }`}
          >
            <Star size={18} className={isInterested ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
            <p className="text-xs text-[color:var(--text-sub)]">현재가</p>
            <p className="mt-2 text-2xl font-bold text-[color:var(--text-main)]">
              {priceQuery.data?.price || '-'}
            </p>
          </div>
          <div className="mobile-soft-card rounded-[24px] border px-4 py-4">
            <p className="text-xs text-[color:var(--text-sub)]">등락률</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                String(priceQuery.data?.changeRate).startsWith('-') ? 'text-blue-600' : 'text-rose-500'
              }`}
            >
              {priceQuery.data?.changeRate ? `${formatSignedText(priceQuery.data.changeRate)}%` : '-'}
            </p>
          </div>
        </div>
      </section>

      <SectionCard title="차트" description="기간을 바꾸고 길게 눌러 시점별 가격을 확인해보세요.">
        <LineChart
          points={chartQuery.data?.data?.map((point) => ({ date: point.date, price: point.price })) || []}
          range={chartRange}
          onRangeChange={setChartRange}
          currency={chartCurrency}
          currentPrice={priceQuery.data?.price}
          changeRate={priceQuery.data?.changeRate}
          isLoading={chartQuery.isLoading}
          errorMessage={chartQuery.isError ? '차트 데이터를 다시 불러와 주세요.' : null}
        />
      </SectionCard>
    </div>
  );
}
