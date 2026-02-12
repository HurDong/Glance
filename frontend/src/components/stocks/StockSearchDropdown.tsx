import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { StockIcon } from './StockIcon';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Stock {
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: 'US' | 'KR';
  status: string;
}

interface StockSearchDropdownProps {
  onSelect: (stock: Stock) => void;
  placeholder?: string;
  initialResults?: number; // Number of results to show initially (default 5)
  autoFocus?: boolean;
}

export const StockSearchDropdown: React.FC<StockSearchDropdownProps> = ({ 
  onSelect, 
  placeholder = "종목명 또는 티커 검색...",
  initialResults = 5,
  autoFocus = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [_selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAll(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setStocks([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchStocks(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchStocks = async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/stocks?page=0&size=20&query=${encodeURIComponent(query)}`,
        { signal: abortControllerRef.current.signal }
      );
      const result = await response.json();
      
      if (result.success) {
        setStocks(result.data.content);
        setIsOpen(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (_selectedStock: Stock) => {
    setSelectedStock(_selectedStock);
    setSearchQuery(_selectedStock.nameKr);
    setIsOpen(false);
    setShowAll(false);
    onSelect(_selectedStock);
  };

  const displayedStocks = showAll ? stocks : stocks.slice(0, initialResults);
  const hasMore = stocks.length > initialResults;

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pl-10 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={18} />
        )}
      </div>

      {isOpen && stocks.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {displayedStocks.map((stock) => (
            <button
              key={`${stock.market}-${stock.symbol}`}
              onClick={() => handleSelect(stock)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
            >
              <StockIcon 
                symbol={stock.symbol} 
                name={stock.nameKr} 
                market={stock.market} 
                className="w-10 h-10 text-xs flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate">{stock.nameKr}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                    stock.market === 'KR' ? "bg-blue-500/10 text-blue-500" : "bg-orange-500/10 text-orange-500"
                  )}>
                    {stock.market === 'KR' ? '국내' : '해외'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{stock.nameEn}</span>
                  <span>·</span>
                  <span className="font-mono">{stock.symbol}</span>
                </div>
              </div>
            </button>
          ))}
          
          {!showAll && hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-primary hover:bg-accent transition-colors font-medium"
            >
              <span>더보기 ({stocks.length - initialResults}개 더 있음)</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {isOpen && searchQuery && stocks.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-xl p-4 text-center text-muted-foreground text-sm">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
};
