import React, { useEffect, useState, useRef } from 'react';
import { StockIcon } from './StockIcon';
import { Search, Loader2, Star } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { StockDetailModal } from './StockDetailModal';
import { interestApi } from '../../api/interest';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/useAlertStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Stock {
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: string;
  status: string;
}

export const StockListPage: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [interestedItems, setInterestedItems] = useState<Set<string>>(new Set());
  
  const { token } = useAuthStore();
  const { showAlert } = useAlertStore();

  const observerTarget = useRef<HTMLDivElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchInterest = async () => {
      if (token) {
        try {
          const res = await interestApi.getInterestStocks();
          setInterestedItems(new Set(res.map(r => r.symbol)));
        } catch (error) {
          console.error('Failed to fetch interest items', error);
        }
      } else {
        setInterestedItems(new Set());
      }
    };
    fetchInterest();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStocks = async (pageNum: number, query: string, marketFl: string, isNewSearch: boolean) => {
    // If loading more (pagination), prevent duplicate requests
    if (!isNewSearch && loading) return;

    // For new search, cancel previous request if explicitly requested or just by logic
    if (isNewSearch) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }

    setLoading(true);
    try {
      const signal = isNewSearch ? abortControllerRef.current?.signal : undefined;
      const marketParam = marketFl !== 'ALL' ? `&market=${marketFl}` : '';
      const response = await fetch(
        `/api/v1/stocks?page=${pageNum}&size=50&query=${encodeURIComponent(query)}${marketParam}`,
        { signal }
      );
      const result = await response.json();
      
      if (result.success) {
        const newStocks: Stock[] = result.data.content;
        const isLast = result.data.last;
        
        setStocks(prev => {
          if (isNewSearch) return newStocks;
          const existingKeys = new Set(prev.map(s => `${s.market}-${s.symbol}`));
          const uniqueNewStocks = newStocks.filter(s => !existingKeys.has(`${s.market}-${s.symbol}`));
          return [...prev, ...uniqueNewStocks];
        });
        setHasMore(!isLast);
        setPage(pageNum);
      } else {
        setError(result.message || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignore abort errors
        return;
      }
      setError('서버 연결에 실패했습니다.');
    } finally {
      // Only turn off loading if it wasn't aborted or replaced
      setLoading(false);
    }
  };

  // Fetch when search or market changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchStocks(0, debouncedSearchQuery, marketFilter, true);
  }, [debouncedSearchQuery, marketFilter]);

  // Refs for accessing latest state in observer without re-triggering effect
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);
  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);
  const marketFilterRef = useRef(marketFilter);

  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
    pageRef.current = page;
    debouncedSearchQueryRef.current = debouncedSearchQuery;
    marketFilterRef.current = marketFilter;
  }, [loading, hasMore, page, debouncedSearchQuery, marketFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          fetchStocks(pageRef.current + 1, debouncedSearchQueryRef.current, marketFilterRef.current, false);
        }
      },
      { rootMargin: '400px', threshold: 0 } // Trigger way before reaching the bottom
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, []); // Empty dependency array - observer is created once

  const handleToggleInterest = async (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation();
    if (!token) {
        showAlert('로그인이 필요한 기능입니다.', { type: 'warning' });
        return;
    }
    const isInterested = interestedItems.has(stock.symbol);
    try {
        if (isInterested) {
            await interestApi.removeInterestStock(stock.symbol);
            setInterestedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(stock.symbol);
                return newSet;
            });
        } else {
            await interestApi.addInterestStock(stock.symbol, stock.market);
            setInterestedItems(prev => {
                const newSet = new Set(prev);
                newSet.add(stock.symbol);
                return newSet;
            });
        }
    } catch (error) {
        console.error('Failed to toggle interest', error);
        showAlert('관심 종목 상태 변경에 실패했습니다.', { type: 'error' });
    }
  };

  if (error && stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-destructive">
        <p className="font-bold text-xl mb-2">오류 발생</p>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
  <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">종목 탐색</h1>
            <p className="text-sm text-muted-foreground">새로운 투자 기회와 인기 종목들을 한눈에 탐색하세요.</p>
          </div>

          {/* Market Filters + Search — one line */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
              {['ALL', 'KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', 'AMEX'].map(market => (
                <button
                  key={market}
                  onClick={() => setMarketFilter(market)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm border",
                    marketFilter === market
                      ? "bg-primary text-primary-foreground border-primary/20 shadow-[0_4px_14px_rgba(var(--primary),0.3)] scale-105"
                      : "bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground border-border/60 hover:border-border"
                  )}
                >
                  {market === 'ALL' ? '전체 시장' : market}
                </button>
              ))}
            </div>

            {/* Search bar — flush right on the same line */}
            <div className="relative ml-auto w-full sm:w-72 shadow-md rounded-full group shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
              <input
                type="text"
                placeholder="종목명 또는 티커 검색..."
                className="w-full bg-muted/50 border-2 border-border hover:border-primary/40 rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>


      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-xl font-extrabold tracking-tight">전체 종목</h2>
        <span className="text-sm font-medium text-muted-foreground">실시간 데이터 기준</span>
      </div>

      {stocks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stocks.map((stock) => (
                <div 
                  key={`${stock.market}-${stock.symbol}`} 
                  className="relative bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-5 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(var(--primary),0.05)] transition-all cursor-pointer group flex flex-col justify-between h-full hover:-translate-y-0.5"
                  onClick={() => setSelectedStock(stock)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <StockIcon 
                        symbol={stock.symbol} 
                        name={stock.nameKr} 
                        market={stock.market as any} 
                        className="w-10 h-10 shadow-sm group-hover:scale-105 transition-transform" 
                      />
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground group-hover:text-primary transition-colors line-clamp-1" title={stock.nameKr}>{stock.nameKr}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-muted-foreground uppercase">{stock.nameEn || stock.symbol}</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 border",
                            (stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          )}>
                            {(stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? 'KR' : 'US'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleToggleInterest(e, stock)}
                      className="p-1.5 hover:bg-muted/80 rounded-full transition-colors z-10 -mr-2 -mt-2 group/star"
                      title="관심종목 추가/제거"
                    >
                      <Star 
                         size={20} 
                         className={cn(
                             "transition-all",
                             interestedItems.has(stock.symbol) 
                               ? "fill-yellow-500 text-yellow-500" 
                               : "text-muted-foreground/40 group-hover/star:text-yellow-500/60"
                         )} 
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/30">
                     <span className="text-[11px] font-semibold text-muted-foreground">Market Status</span>
                     <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                         Active Live
                     </span>
                  </div>
                </div>
            ))}
          </div>
      ) : (
          !loading && (
             <div className="flex flex-col items-center justify-center p-12 bg-card/20 rounded-2xl border border-dashed border-border/60 text-muted-foreground h-[40vh]">
               <Search size={48} className="text-muted-foreground/30 mb-4" />
               <p className="font-bold text-lg mb-1">검색 결과가 없습니다.</p>
               <p className="text-sm mb-4">다른 키워드나 필터로 다시 시도해보세요.</p>
               <button onClick={() => { setSearchQuery(''); setMarketFilter('ALL'); }} className="px-5 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">전체보기로 초기화</button>
             </div>
          )
      )}
      
      {/* Loading Indicator & Infinite Scroll Target */}
      <div ref={observerTarget} className="p-4 flex justify-center items-center w-full mt-6 h-16">
        {loading && <Loader2 className="animate-spin text-muted-foreground" size={24} />}
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal 
          symbol={selectedStock.symbol} 
          name={selectedStock.nameKr || selectedStock.nameEn || selectedStock.symbol} 
          market={selectedStock.market}
          onClose={() => setSelectedStock(null)} 
        />
      )}
    </div>
  );
};
