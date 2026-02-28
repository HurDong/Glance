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
      { threshold: 0.1 } // Changed threshold to 0.1 to trigger slightly earlier/easier
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">전체 종목 리스트</h1>
            <p className="text-sm text-muted-foreground">가나다순으로 정렬된 현재 상장 종목들입니다.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="종목명 또는 티커 검색..." 
              className="w-full bg-card border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Market Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['ALL', 'KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', 'AMEX'].map(market => (
            <button
              key={market}
              onClick={() => setMarketFilter(market)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                marketFilter === market 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              )}
            >
              {market === 'ALL' ? '전체' : market}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4 w-16">로고</th>
                <th className="px-6 py-4">종목명</th>
                <th className="px-6 py-4">티커</th>
                <th className="px-6 py-4 text-right">시장</th>
                <th className="px-6 py-4 text-right">상태</th>
                <th className="px-6 py-4 text-center w-16">관심</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stocks.length > 0 ? (
                stocks.map((stock) => (
                  <tr 
                    key={`${stock.market}-${stock.symbol}`} 
                    className="hover:bg-accent/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedStock(stock)}
                  >
                    <td className="px-6 py-4">
                      <StockIcon 
                        symbol={stock.symbol} 
                        name={stock.nameKr} 
                        market={stock.market} 
                        className="w-8 h-8 text-xs" 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold group-hover:text-primary transition-colors">{stock.nameKr}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{stock.nameEn}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded border border-border/50">{stock.symbol}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full",
                        (stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? "bg-blue-500/10 text-blue-500" : "bg-orange-500/10 text-orange-500"
                      )}>
                        {(stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? '국내' : '해외'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-medium text-green-500">상장중</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => handleToggleInterest(e, stock)}
                        className="p-2 hover:bg-muted rounded-full transition-colors group/star"
                      >
                        <Star 
                           size={18} 
                           className={cn(
                               "transition-all",
                               interestedItems.has(stock.symbol) 
                                 ? "fill-yellow-500 text-yellow-500" 
                                 : "text-muted-foreground group-hover/star:text-yellow-500/50"
                           )} 
                        />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        
        {/* Loading Indicator & Infinite Scroll Target */}
        <div ref={observerTarget} className="p-4 flex justify-center w-full">
          {loading && <Loader2 className="animate-spin text-muted-foreground" size={24} />}
        </div>
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
