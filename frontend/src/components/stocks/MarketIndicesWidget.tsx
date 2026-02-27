import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Globe, DollarSign, Bitcoin, Coins } from 'lucide-react';

interface MarketIndex {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    type: 'US' | 'KR' | 'FOREX' | 'CRYPTO' | 'COMMODITY';
}

interface MarketIndicesWidgetProps {
    onSelect?: (symbol: string) => void;
}

export const MarketIndicesWidget: React.FC<MarketIndicesWidgetProps> = ({ onSelect }) => {
    const [indices, setIndices] = React.useState<MarketIndex[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchIndices = async () => {
            try {
                const response = await fetch('/api/v1/market/indices');
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setIndices(data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch market indices:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchIndices();
        const interval = setInterval(fetchIndices, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    // Separate main indices from the exchange rate
    const mainIndices = indices.filter(i => i.symbol !== 'OANDA:USD_KRW');
    const exchangeRate = indices.find(i => i.symbol === 'OANDA:USD_KRW');

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Globe className="text-blue-500 fill-blue-500/20" size={20} />
                </div>
                <h3 className="font-bold text-lg">주요 지수</h3>
                {isLoading && indices.length === 0 && <span className="text-xs text-muted-foreground ml-auto">로딩중...</span>}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {mainIndices.map((index) => {
                    const isPositive = index.change.startsWith('+') || (!index.change.startsWith('-') && parseFloat(index.change) > 0);
                    const isZero = parseFloat(index.change) === 0;
                    
                    return (
                        <div 
                            key={index.symbol}
                            onClick={() => onSelect?.(index.symbol)}
                            className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all border border-transparent hover:border-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                    index.type === 'US' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                    index.type === 'KR' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                    index.type === 'FOREX' ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                    index.type === 'CRYPTO' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                )}>
                                    {index.type === 'US' && 'US'}
                                    {index.type === 'KR' && 'KR'}
                                    {index.type === 'FOREX' && <DollarSign size={14} />}
                                    {index.type === 'CRYPTO' && <Bitcoin size={16} />}
                                    {index.type === 'COMMODITY' && <Coins size={14} />}
                                </div>
                                <div>
                                    <div className="font-bold text-sm group-hover:text-primary transition-colors">{index.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{index.symbol}</div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className="font-mono text-sm font-medium">
                                    {index.type === 'US' || index.type === 'CRYPTO' || index.type === 'COMMODITY' ? '$' : index.type === 'KR' ? '₩' : ''}
                                    {index.price}
                                </div>
                                <div className={clsx("text-xs font-bold flex items-center justify-end gap-1", 
                                    isPositive ? "text-red-500" : isZero ? "text-muted-foreground" : "text-blue-500")}>
                                    {!isZero && (isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                                    {index.changePercent}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-border">
                {exchangeRate ? (
                    <div 
                        onClick={() => onSelect?.(exchangeRate.symbol)}
                        className="group flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all border border-transparent hover:border-border"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <DollarSign size={14} />
                            </div>
                            <div>
                                <div className="font-bold text-sm group-hover:text-primary transition-colors">{exchangeRate.name}</div>
                                <div className="text-[10px] text-muted-foreground">USD/KRW</div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className="font-mono text-sm font-medium">
                                ₩{exchangeRate.price}
                            </div>
                            <div className={clsx("text-xs font-bold flex items-center justify-end gap-1", 
                                exchangeRate.change.startsWith('+') || (!exchangeRate.change.startsWith('-') && parseFloat(exchangeRate.change) > 0) ? "text-red-500" : parseFloat(exchangeRate.change) === 0 ? "text-muted-foreground" : "text-blue-500")}>
                                {parseFloat(exchangeRate.change) !== 0 && ((exchangeRate.change.startsWith('+') || (!exchangeRate.change.startsWith('-') && parseFloat(exchangeRate.change) > 0)) ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                                {exchangeRate.changePercent}%
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full text-xs text-center p-2 text-muted-foreground animate-pulse">
                        환율 정보 로딩중...
                    </div>
                )}
            </div>
        </div>
    );
};
