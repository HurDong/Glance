import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Layers3, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyGroups } from '@/api/groups';
import { getMyPortfolios, getPrimaryPortfolio } from '@/api/portfolio';
import { getInterestStocks, getMarketIndices } from '@/api/stocks';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { formatCurrency, formatNumber, formatSignedText } from '@/lib/format';

export function HomePage() {
  const indicesQuery = useQuery({
    queryKey: ['market-indices'],
    queryFn: getMarketIndices,
  });

  const primaryPortfolioQuery = useQuery({
    queryKey: ['primary-portfolio'],
    queryFn: async () => {
      try {
        return await getPrimaryPortfolio();
      } catch (error) {
        return null;
      }
    },
  });

  const portfoliosQuery = useQuery({
    queryKey: ['portfolios-summary'],
    queryFn: async () => {
      try {
        return await getMyPortfolios();
      } catch (error) {
        return [];
      }
    },
  });

  const interestQuery = useQuery({
    queryKey: ['interest-stocks'],
    queryFn: async () => {
      try {
        return await getInterestStocks();
      } catch (error) {
        return [];
      }
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['groups-summary'],
    queryFn: async () => {
      try {
        return await getMyGroups();
      } catch (error) {
        return [];
      }
    },
  });

  const portfolio = primaryPortfolioQuery.data;

  return (
    <div className="space-y-5">
      <SectionCard title="시장 흐름" description="지금 빠르게 체크할 지수만 먼저 모아봤어요.">
        {indicesQuery.data && indicesQuery.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {indicesQuery.data.map((item) => {
              const isNegative = String(item.changePercent).startsWith('-');

              return (
                <div
                  key={item.symbol}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.symbol}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.name}</p>
                  <p className="mt-3 text-xl font-bold text-white">{item.price}</p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isNegative ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatSignedText(item.changePercent)}%
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="지수 데이터를 아직 불러오지 못했어요"
            description="잠시 후 다시 보면 오늘 시장 흐름을 먼저 볼 수 있어요."
          />
        )}
      </SectionCard>

      <SectionCard title="대표 포트폴리오" description="가장 자주 보는 자산만 먼저 이어서 보여드릴게요.">
        {portfolio ? (
          <div className="space-y-3">
            <div className="rounded-[26px] border border-blue-400/10 bg-[linear-gradient(160deg,rgba(59,130,246,0.18),rgba(15,23,42,0.18))] px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white">{portfolio.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {portfolio.description || '대표 자산 흐름을 빠르게 보기 좋게 준비해뒀어요.'}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  {portfolio.isPublic ? '공개' : '비공개'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {portfolio.items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      {item.nameKr || item.nameEn || item.symbol}
                    </p>
                    <p className="text-sm text-slate-400">
                      {item.symbol} · {formatNumber(item.quantity)}주
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {formatCurrency(item.averagePrice, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="대표 포트폴리오가 아직 없어요"
            description="포트폴리오를 만들면 자산 흐름과 관심 종목을 이 화면에서 바로 이어서 볼 수 있어요."
          />
        )}
      </SectionCard>

      <SectionCard
        title="관심 종목"
        description="다시 보고 싶은 종목만 부담 없이 모아뒀어요."
        action={
          <Link
            to="/explore"
            className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-2xl border border-blue-400/20 bg-blue-500/12 px-3 text-sm font-semibold text-blue-200"
          >
            더보기
            <ArrowRight size={15} />
          </Link>
        }
      >
        {interestQuery.data && interestQuery.data.length > 0 ? (
          <div className="space-y-2">
            {interestQuery.data.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-100">
                    {item.nameKr || item.nameEn || item.symbol}
                  </p>
                  <p className="text-sm text-slate-400">
                    {item.symbol} · {item.market}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-300">
                  <Star size={16} className="fill-current" />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="아직 관심 종목이 없어요"
            description="탐색에서 종목을 둘러보다가 다시 보고 싶은 종목만 가볍게 담아보세요."
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard
          title="포트폴리오"
          description="내 자산 묶음"
          action={<Layers3 size={18} className="text-blue-300" />}
        >
          <p className="text-2xl font-bold text-white">{portfoliosQuery.data?.length || 0}</p>
        </SectionCard>

        <SectionCard
          title="그룹"
          description="함께 보는 공간"
          action={<Users size={18} className="text-slate-200" />}
        >
          <p className="text-2xl font-bold text-white">{groupsQuery.data?.length || 0}</p>
        </SectionCard>
      </div>
    </div>
  );
}
