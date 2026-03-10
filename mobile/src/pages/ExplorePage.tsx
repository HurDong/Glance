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
          <label className="mobile-soft-card flex items-center gap-3 rounded-[24px] border px-4 py-3">
            <Search size={18} className="text-[color:var(--text-sub)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 애플, AAPL, 삼성전자"
              className="w-full bg-transparent text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-sub)]"
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
                    ? 'mobile-chip-active'
                    : 'mobile-chip-idle'
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
                className="mobile-soft-card block rounded-[24px] border px-4 py-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.08]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[color:var(--text-main)]">{stock.nameKr || stock.nameEn || stock.symbol}</p>
                    <p className="mt-1 text-sm text-[color:var(--text-sub)]">
                      {stock.symbol} · {formatMarketLabel(stock.market)}
                    </p>
                  </div>
                  <span className="mobile-chip-idle shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold">
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
