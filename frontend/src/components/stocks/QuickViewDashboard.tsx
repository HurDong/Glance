import React, { useEffect, useState } from 'react';
import { interestApi, type InterestStockResponse } from '../../api/interest';
import { useAuthStore } from '../../stores/authStore';
import { StockIcon } from './StockIcon';
import { TrendingUp, TrendingDown, Star, Plus, Trash2 } from 'lucide-react';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { clsx } from 'clsx';
// import { useNavigate } from 'react-router-dom'; // keeping commented out or just removing lines completely
import { StockSearchDropdown } from './StockSearchDropdown';
import { useAlertStore } from '../../stores/useAlertStore';

const StockPriceCard = ({ stock, onDelete, onSelect }: { stock: InterestStockResponse, onDelete: (symbol: string) => void, onSelect: (symbol: string) => void }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();

    useEffect(() => {
        subscribe(stock.symbol);
    }, [stock.symbol, subscribe]);

    const data = getPrice(stock.symbol);
    const isPositive = data ? parseFloat(data.change) >= 0 : false;

    return (
        <div 
            className="bg-card p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
            onClick={() => onSelect(stock.symbol)}
        >
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(stock.symbol);
                    }}
                    className="p-1.5 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all shadow-sm"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                    <StockIcon symbol={stock.symbol} name={stock.nameEn || stock.nameKr || stock.symbol} market={stock.market} securityType={stock.securityType} className="w-10 h-10 text-base" />
                    <div>
                        <h3 className="font-bold text-lg leading-tight">
                            {(stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? (stock.nameKr || stock.symbol) : stock.symbol}
                        </h3>
                        <div className="flex items-center gap-1">
                             <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">{stock.market}</span>
                             {(stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') && <span className="text-xs text-muted-foreground">{stock.symbol}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-2">
                {data ? (
                    <>
                        <div className="text-2xl font-bold font-mono tracking-tight">
                            {(stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || /^\d{6}$/.test(stock.symbol)) ? '₩' : '$'}
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

interface QuickViewDashboardProps {
    onSelect: (symbol: string) => void;
}

export const QuickViewDashboard: React.FC<QuickViewDashboardProps> = ({ onSelect }) => {
    const [interestStocks, setInterestStocks] = useState<InterestStockResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { token } = useAuthStore();
    const [isAddMode, setIsAddMode] = useState(false);
    const { showAlert, showConfirm } = useAlertStore();

    const fetchInterestStocks = async () => {
        try {
            setIsLoading(true);
            const data = await interestApi.getInterestStocks();
            setInterestStocks(data);
             // Auto-select the first stock if available and none selected? 
             // Logic can be added here or in parent.
             // For now, let user select.
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
            showAlert('종목 추가에 실패했습니다.', { type: 'error' });
        }
    };

    const handleDeleteStock = async (symbol: string) => {
        const isConfirmed = await showConfirm(`${symbol}을(를) 관심 종목에서 삭제하시겠습니까?`);
        if (!isConfirmed) return;
        
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
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={18} />
                    <span>관심 종목</span>
                </h2>
                <div className="flex items-center gap-2 relative">
                     {isAddMode ? (
                        <div className="absolute right-0 top-0 z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-2">
                             <StockSearchDropdown 
                                onSelect={handleSelectStock} 
                                placeholder="종목 검색 (예: 삼성전자, AAPL)..."
                                autoFocus={true}
                             />
                             <button 
                                onClick={() => setIsAddMode(false)}
                                className="w-full mt-2 text-xs text-center py-1 bg-muted hover:bg-muted/80 rounded"
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddMode(true)}
                            className="text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                            <Plus size={14} /> 추가
                        </button>
                    )}
                </div>
            </div>
            
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map(i => (
                        <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : interestStocks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center flex-1 text-center border border-dashed border-border rounded-xl bg-card/50 min-h-[120px]">
                    <p className="text-muted-foreground text-sm mb-2">등록된 종목이 없습니다.</p>
                    <button onClick={() => setIsAddMode(true)} className="text-primary text-xs font-bold hover:underline">
                        + 첫 종목 추가하기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 flex-1">
                    {interestStocks.map((stock) => (
                        <StockPriceCard key={stock.symbol} stock={stock} onDelete={handleDeleteStock} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </section>
    );
};
