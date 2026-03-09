import { useMemo } from 'react';
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
import { LineChart } from '@/components/common/LineChart';
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

  const priceQuery = useQuery({
    queryKey: ['stock-price', symbol],
    queryFn: () => getStockPrice(symbol),
    enabled: Boolean(symbol),
    refetchInterval: 20000,
  });

  const chartQuery = useQuery({
    queryKey: ['stock-chart', symbol],
    queryFn: () => getStockChart(symbol),
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
        isInterested ? '관심 종목에서 제거했어요.' : '관심 종목에 담아뒀어요.',
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
        description="시장 화면으로 돌아가서 다시 선택해주세요."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
        <ArrowLeft size={16} />
        시장으로 돌아가기
      </Link>

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.9)_55%,rgba(59,130,246,0.22)_100%)] px-6 py-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">{state.market || '시장 정보'}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {state.name || symbol}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{symbol}</p>
          </div>

          <button
            type="button"
            onClick={() => interestMutation.mutate()}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
              isInterested
                ? 'bg-blue-500 text-white'
                : 'border border-white/10 bg-white/[0.06] text-slate-300'
            }`}
          >
            <Star size={18} className={isInterested ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
            <p className="text-xs text-slate-400">현재가</p>
            <p className="mt-2 text-2xl font-bold text-white">{priceQuery.data?.price || '-'}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
            <p className="text-xs text-slate-400">등락률</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                String(priceQuery.data?.changeRate).startsWith('-') ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {priceQuery.data?.changeRate ? `${formatSignedText(priceQuery.data.changeRate)}%` : '-'}
            </p>
          </div>
        </div>
      </section>

      <SectionCard title="최근 차트" description="지금 흐름을 빠르게 읽을 수 있게 최근 데이터만 보여드릴게요.">
        {chartQuery.data?.data?.length ? (
          <LineChart
            points={chartQuery.data.data.map((point) => ({ date: point.date, price: point.price }))}
          />
        ) : (
          <EmptyState
            title="차트 데이터가 아직 없어요"
            description="잠시 후 다시 확인하면 최신 흐름이 들어올 수 있어요."
          />
        )}
      </SectionCard>
    </div>
  );
}
