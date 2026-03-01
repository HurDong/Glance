import React, { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { Star, TrendingUp, TrendingDown, Minus, Loader2, Search, Trash2, X } from 'lucide-react';
import { interestApi, type InterestStockResponse } from '../../api/interest';
import { apiClient as api } from '../../api/axios';
import { useAuthStore } from '../../stores/authStore';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { StockIcon } from './StockIcon';
import { useNavigate } from 'react-router-dom';

export interface WatchlistWidgetProps {
    onSelect?: (symbol: string) => void;
}

interface SearchStock {
    symbol: string;
    nameKr: string;
    nameEn: string;
    market: string;
}

export const WatchlistWidget: React.FC<WatchlistWidgetProps> = ({ onSelect }) => {
    const { token } = useAuthStore();
    const [interestedStocks, setInterestedStocks] = useState<InterestStockResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { subscribe } = useStockWebSocket();
    const { getPrice } = useStockStore();
    const navigate = useNavigate();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchStock[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const fetchInterest = async () => {
        if (!token) {
            setInterestedStocks([]);
            setIsLoading(false);
            return;
        }
        try {
            const res = await interestApi.getInterestStocks();
            setInterestedStocks(res);
        } catch (error) {
            console.error('Failed to fetch interest items', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInterest();
    }, [token]);

    // WebSocket Subscribe for prices
    useEffect(() => {
        if (interestedStocks.length > 0) {
            interestedStocks.forEach(stock => subscribe(stock.symbol));
        }
    }, [interestedStocks, subscribe]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length === 0) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }
            setIsSearching(true);
            try {
                const res = await api.get(`/stocks?page=0&size=5&query=${encodeURIComponent(searchQuery)}`);
                if (res.data?.data?.content) {
                    setSearchResults(res.data.data.content);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAdd = async (stock: SearchStock) => {
        try {
            setIsLoading(true);
            await interestApi.addInterestStock(stock.symbol, stock.market);
            await fetchInterest();
            setSearchQuery('');
            setShowDropdown(false);
        } catch (error) {
            console.error('Failed to add interest stock', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (e: React.MouseEvent, symbol: string) => {
        e.stopPropagation();
        try {
            setIsLoading(true);
            await interestApi.removeInterestStock(symbol);
            await fetchInterest();
        } catch (error) {
            console.error('Failed to remove interest stock', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="glass-card rounded-2xl p-6 flex flex-col h-full min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Star className="text-primary" size={24} />
                    </div>
                    <h2 className="text-xl font-bold font-header">나의 관심종목</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center space-y-4">
                    <Star size={48} className="text-muted-foreground/30 mb-2" />
                    <p>로그인 후 관심종목을 등록하여<br />빠르게 시세를 확인하세요.</p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
                    >
                        로그인하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Star className="text-primary fill-primary" size={24} />
                    </div>
                    <h2 className="text-xl font-bold font-header">나의 관심종목</h2>
                </div>
                <span className="text-sm font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                    {interestedStocks.length}
                </span>
            </div>

            {/* Internal Search Bar */}
            <div className="relative mb-4 z-20" ref={searchRef}>
                <div className="relative flex items-center">
                    <Search className="absolute left-3 text-muted-foreground" size={16} />
                    <input 
                        type="text" 
                        placeholder="관심종목 검색 및 추가..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-8 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                            className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Dropdown Results */}
                {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                        {isSearching ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-primary" size={20} />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {searchResults.map(stock => {
                                    const isAlreadyAdded = interestedStocks.some(s => s.symbol === stock.symbol);
                                    return (
                                        <div 
                                            key={stock.symbol}
                                            onClick={() => !isAlreadyAdded && handleAdd(stock)}
                                            className={clsx(
                                                "flex items-center justify-between p-3 border-b border-white/5 last:border-0 transition-colors",
                                                isAlreadyAdded 
                                                    ? "opacity-50 cursor-not-allowed bg-black/20" 
                                                    : "hover:bg-white/5 cursor-pointer group"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <StockIcon symbol={stock.symbol} name={stock.nameKr} market={stock.market} className="w-8 h-8 shrink-0" />
                                                <div className="flex flex-col truncate">
                                                    <span className={clsx("font-bold text-sm truncate", !isAlreadyAdded && "group-hover:text-primary transition-colors")}>
                                                        {stock.nameKr || stock.nameEn}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">{stock.symbol}</span>
                                                </div>
                                            </div>
                                            {isAlreadyAdded ? (
                                                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">추가됨</span>
                                            ) : (
                                                <button className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    추가
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 relative z-10">
                {isLoading && interestedStocks.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : interestedStocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                        <p>등록된 관심 종목이 없습니다.</p>
                        <p className="text-sm mt-1 mb-4">위의 검색창을 이용해 추가해보세요.</p>
                    </div>
                ) : (
                    interestedStocks.map((stock) => {
                        const liveData = getPrice(stock.symbol);
                        const rateVal = liveData ? parseFloat(liveData.changeRate || "0") : 0;
                        const isUp = rateVal > 0;
                        const isDown = rateVal < 0;
                        const isSame = rateVal === 0 || isNaN(rateVal);
                        const isUS = stock.market === 'US' || stock.market === 'NASDAQ' || stock.market === 'NYSE' || stock.market === 'AMEX' || /^[a-zA-Z]+$/.test(stock.symbol);
                        const currencyPrefix = isUS ? '$' : '₩';
                        
                        const formattedPrice = liveData ? Number(liveData.price).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                        }) : '-';

                        const displayName = stock.nameKr || stock.nameEn || stock.symbol;

                        return (
                            <div 
                                key={stock.symbol} 
                                onClick={() => onSelect?.(stock.symbol)}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5 relative"
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                     <StockIcon 
                                        symbol={stock.symbol} 
                                        name={displayName} 
                                        market={stock.market} 
                                        className="w-10 h-10 shrink-0" 
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="font-bold text-[14px] truncate group-hover:text-primary transition-colors">{displayName}</span>
                                        <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 bg-white/5 w-fit rounded uppercase tracking-wider mt-0.5">{stock.symbol}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0 pl-2">
                                    <div className="flex flex-col items-end transition-transform duration-300 group-hover:-translate-x-10">
                                        {liveData ? (
                                            <>
                                                <span className="font-mono font-bold text-[14px]">
                                                    {currencyPrefix}{formattedPrice}
                                                </span>
                                                <div className={clsx(
                                                    "flex items-center text-[11px] font-bold mt-0.5",
                                                    isUp && "text-[#ff4d4f]",
                                                    isDown && "text-[#3b82f6]",
                                                    isSame && "text-muted-foreground"
                                                )}>
                                                    {isUp && <TrendingUp size={12} className="mr-0.5" />}
                                                    {isDown && <TrendingDown size={12} className="mr-0.5" />}
                                                    {isSame && <Minus size={12} className="mr-0.5" />}
                                                    <span>{liveData.changeRate}%</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="animate-pulse flex flex-col items-end gap-1">
                                                <div className="h-4 w-16 bg-white/10 rounded"></div>
                                                <div className="h-3 w-12 bg-white/10 rounded"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete Button (Visible on Hover) */}
                                    <button 
                                        onClick={(e) => handleRemove(e, stock.symbol)}
                                        className="p-2.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive rounded-lg transition-all opacity-0 group-hover:opacity-100 absolute right-1.5 shrink-0 bg-[#0F121C] shadow-md border border-white/5"
                                        title="관심종목에서 삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {interestedStocks.length > 0 && (
                <div className="pt-4 mt-2 border-t border-white/5 text-center shrink-0">
                   <button 
                        onClick={() => navigate('/stocks')}
                        className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                   >
                       전체 종목 관리하기
                   </button>
                </div>
            )}
        </div>
    );
};
