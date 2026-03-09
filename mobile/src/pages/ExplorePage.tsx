import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStocks } from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { formatMarketLabel } from '@/lib/format';

const markets = ['ALL', 'KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', 'AMEX'];

export function ExplorePage() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('ALL');
  const deferredQuery = useDeferredValue(query);

  const stocksQuery = useQuery({
    queryKey: ['stocks', deferredQuery, market],
    queryFn: () =>
      getStocks({
        query: deferredQuery,
        market,
        page: 0,
        size: 20,
      }),
  });

  return (
    <div className="space-y-5">
      <SectionCard title="종목 탐색" description="이름이나 티커로 바로 찾아보고, 시장 필터로 범위를 좁혀보세요.">
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 애플, AAPL, 삼성전자"
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {markets.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMarket(item)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  market === item
                    ? 'border-blue-400/30 bg-blue-500/15 text-blue-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                {item === 'ALL' ? '전체' : item}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="검색 결과"
        description={
          deferredQuery.trim()
            ? `${stocksQuery.data?.content.length ?? 0}개 종목을 찾았어요.`
            : '먼저 종목 이름이나 티커를 입력해 보세요.'
        }
      >
        {stocksQuery.data && stocksQuery.data.content.length > 0 ? (
          <div className="space-y-3">
            {stocksQuery.data.content.map((stock) => (
              <Link
                key={`${stock.market}-${stock.symbol}`}
                to={`/explore/${stock.symbol}`}
                state={{ name: stock.nameKr || stock.nameEn || stock.symbol, market: stock.market }}
                className="block rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.58))] px-4 py-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.08]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{stock.nameKr || stock.nameEn || stock.symbol}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {stock.symbol} · {formatMarketLabel(stock.market)}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                    {stock.market}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={deferredQuery.trim() ? '검색 결과가 없어요' : '찾고 싶은 종목을 입력해 보세요'}
            description={
              deferredQuery.trim()
                ? '다른 이름이나 티커로 다시 찾아보면 원하는 종목이 보일 수 있어요.'
                : '시장 필터를 함께 쓰면 보고 싶은 범위를 더 빠르게 좁힐 수 있어요.'
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
