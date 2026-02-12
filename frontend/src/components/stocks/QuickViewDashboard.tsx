import React, { useEffect, useState } from 'react';
import { interestApi, type InterestStockResponse } from '../../api/interest';
import { useAuthStore } from '../../stores/authStore';
import { StockIcon } from './StockIcon';
import { TrendingUp, TrendingDown, Star, Plus, Minus } from 'lucide-react';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { StockSearchDropdown } from './StockSearchDropdown';

const StockPriceCard = ({ stock, onDelete }: { stock: InterestStockResponse, onDelete: (symbol: string) => void }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        subscribe(stock.symbol);
    }, [stock.symbol, subscribe]);

    const data = getPrice(stock.symbol);
    const isPositive = data ? parseFloat(data.change) >= 0 : false;

    return (
        <div 
            className="bg-card p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            onClick={() => navigate(`/stocks/${stock.symbol}`)}
        >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(stock.symbol);
                    }}
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-destructive transition-colors"
                >
                    <Minus size={16} />
                </button>
            </div>

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                    <StockIcon symbol={stock.symbol} name={stock.nameEn || stock.nameKr || stock.symbol} market={stock.market as 'US' | 'KR'} securityType={stock.securityType} className="w-10 h-10 text-base" />
                    <div>
                        <h3 className="font-bold text-lg leading-tight">{stock.symbol}</h3>
                        <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">{stock.market}</span>
                    </div>
                </div>
            </div>

            <div className="mt-2">
                {data ? (
                    <>
                        <div className="text-2xl font-bold font-mono tracking-tight">
                            {stock.market === 'KR' || stock.symbol === 'BTC' ? '₩' : '$'}
                            {Number(data.price).toLocaleString()}
                        </div>
                        <div className={clsx("flex items-center text-sm font-semibold mt-1", isPositive ? "text-red-500" : "text-blue-500")}>
                            {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                            <span>{isPositive ? '+' : ''}{data.change} ({data.changeRate}%)</span>
                        </div>
                    </>
                ) : (
                    <div className="animate-pulse space-y-2">
                        <div className="h-8 bg-muted rounded w-2/3"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const QuickViewDashboard: React.FC = () => {
    const [interestStocks, setInterestStocks] = useState<InterestStockResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { token } = useAuthStore();
    const [isAddMode, setIsAddMode] = useState(false);

    const fetchInterestStocks = async () => {
        try {
            setIsLoading(true);
            const data = await interestApi.getInterestStocks();
            setInterestStocks(data);
        } catch (error) {
            console.error('Failed to fetch interest stocks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchInterestStocks();
        } else {
            setInterestStocks([]);
            setIsLoading(false);
        }
    }, [token]);

    const handleSelectStock = async (stock: any) => { 
        if (!stock.symbol) return;
        try {
            await interestApi.addInterestStock(stock.symbol, stock.market); 
            setIsAddMode(false);
            fetchInterestStocks();
        } catch (error) {
            console.error('Failed to add stock:', error);
            alert('종목 추가에 실패했습니다.');
        }
    };

    const handleDeleteStock = async (symbol: string) => {
        if (!confirm(`${symbol}을(를) 관심 종목에서 삭제하시겠습니까?`)) return;
        try {
            await interestApi.removeInterestStock(symbol);
            fetchInterestStocks();
        } catch (error) {
            console.error('Failed to delete stock:', error);
        }
    };

    if (!token) {
        return (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50">
                <p className="text-muted-foreground mb-4">로그인하고 관심 종목을 관리하세요.</p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                    <span>관심 종목 퀵뷰</span>
                </h2>
                <div className="flex items-center gap-2 relative">
                     {isAddMode ? (
                        <div className="absolute right-0 top-0 z-50 w-72">
                             <StockSearchDropdown 
                                onSelect={handleSelectStock} 
                                placeholder="종목 검색 (예: Samsung, AAPL)"
                                autoFocus={true}
                             />
                             <button 
                                onClick={() => setIsAddMode(false)}
                                className="absolute -top-6 right-0 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddMode(true)}
                            className="text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} /> 종목 추가
                        </button>
                    )}
                </div>
            </div>
            
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : interestStocks.length === 0 ? (
                 <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/50">
                    <p className="text-muted-foreground mb-4">등록된 관심 종목이 없습니다.</p>
                    <button onClick={() => setIsAddMode(true)} className="text-primary font-bold hover:underline">
                        첫 번째 종목 추가하기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {interestStocks.map((stock) => (
                        <StockPriceCard key={stock.symbol} stock={stock} onDelete={handleDeleteStock} />
                    ))}
                </div>
            )}
        </section>
    );
};
