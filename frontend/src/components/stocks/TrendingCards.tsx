import { useEffect } from 'react';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { StockIcon } from './StockIcon';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { clsx } from 'clsx';

export interface TrendingStock {
    symbol: string;
    nameKr: string;
    nameEn: string;
    market: 'KR' | 'US' | 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'AMEX';
    status: string;
}

const TRENDING_SYMBOLS: TrendingStock[] = [
    { symbol: '005930', nameKr: '삼성전자', nameEn: 'SAMSUNG ELEC', market: 'KR', status: 'ACTIVE' },
    { symbol: 'NVDA', nameKr: '엔비디아', nameEn: 'NVIDIA', market: 'US', status: 'ACTIVE' },
    { symbol: '000660', nameKr: 'SK하이닉스', nameEn: 'SK HYNIX', market: 'KR', status: 'ACTIVE' },
    { symbol: 'TSLA', nameKr: '테슬라', nameEn: 'TESLA', market: 'US', status: 'ACTIVE' },
    { symbol: 'AAPL', nameKr: '애플', nameEn: 'APPLE', market: 'US', status: 'ACTIVE' },
    { symbol: '035420', nameKr: 'NAVER', nameEn: 'NAVER', market: 'KR', status: 'ACTIVE' }
];

export const TrendingCards = ({ onStockClick }: { onStockClick: (stock: TrendingStock) => void }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();

    useEffect(() => {
        TRENDING_SYMBOLS.forEach(s => subscribe(s.symbol));
    }, [subscribe]);

    return (
        <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Flame className="text-orange-500 animate-pulse" size={24} />
                <h2 className="text-xl font-extrabold tracking-tight">Trending Today</h2>
                <span className="text-sm font-medium text-muted-foreground ml-2">실시간 인기 종목</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {TRENDING_SYMBOLS.map((stock) => {
                    const data = getPrice(stock.symbol);
                    const rateVal = data ? parseFloat(data.changeRate || "0") : 0;
                    const isUp = rateVal > 0;
                    const isDown = rateVal < 0;
                    
                    return (
                        <div 
                            key={stock.symbol}
                            onClick={() => onStockClick(stock)}
                            className="shrink-0 w-[260px] snap-start cursor-pointer group"
                        >
                            <div className="h-full bg-card/60 backdrop-blur-xl border border-border/80 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(var(--primary),0.1)] rounded-2xl p-5 transition-all duration-300">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <StockIcon symbol={stock.symbol} name={stock.nameKr} market={stock.market} className="w-11 h-11 shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-foreground group-hover:text-primary transition-colors">{stock.nameKr}</span>
                                            <span className="text-xs text-muted-foreground font-mono mt-0.5">{stock.symbol}</span>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                        <Flame size={10} /> HOT
                                    </div>
                                </div>
                                
                                <div className="mt-auto flex items-end justify-between">
                                    <div className="flex flex-col">
                                        <div className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Current Price</div>
                                       {data ? (
                                           <div className="text-xl font-black tracking-tight flex items-center gap-1">
                                               <span className="text-sm opacity-60 font-semibold">{stock.market === 'US' ? '$' : '₩'}</span>
                                               {Number(data.price).toLocaleString()}
                                           </div>
                                       ) : (
                                           <div className="text-sm font-bold text-muted-foreground animate-pulse py-1">Loading...</div>
                                       )}
                                    </div>
                                    
                                    {data && (
                                        <div className={clsx(
                                            "flex items-center text-[13px] font-bold px-2 py-1.5 rounded-lg shadow-sm border",
                                            isUp ? "bg-red-500/10 text-red-500 border-red-500/20" : isDown ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {isUp && <TrendingUp size={14} className="mr-1" />}
                                            {isDown && <TrendingDown size={14} className="mr-1" />}
                                            {rateVal > 0 ? '+' : ''}{data.changeRate}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
