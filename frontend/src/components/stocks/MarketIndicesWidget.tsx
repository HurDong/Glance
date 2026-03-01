import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Globe, DollarSign, Bitcoin } from 'lucide-react';

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

    // Identify exchange rate and bitcoin flexibly
    const exchangeRate = indices.find(i => i.symbol?.includes('USD_KRW') || i.name?.includes('환율') || i.type === 'FOREX' || i.symbol === 'OANDA:USD_KRW');
    const mainIndices = indices.filter(i => i !== exchangeRate);

    const kospi = mainIndices.find(i => i.name.includes('KOSPI') || i.symbol === 'KOSPI' || i.symbol === 'KS11');
    const nasdaq = mainIndices.find(i => i.name.includes('NASDAQ') || i.name.includes('나스닥') || i.symbol === 'IXIC');
    const btc = mainIndices.find(i => i.symbol?.includes('BTC') || i.name?.toLowerCase().includes('bitcoin') || i.type === 'CRYPTO');

    const renderCard = (index: MarketIndex | undefined, isExchangeRate = false) => {
        if (!index && isLoading) {
            return (
                <div className="glass-card p-6 rounded-2xl animate-pulse flex flex-col justify-between min-h-[140px]">
                    <div className="h-6 w-24 bg-white/10 rounded mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-8 w-32 bg-white/10 rounded"></div>
                        <div className="h-4 w-16 bg-white/10 rounded"></div>
                    </div>
                </div>
            );
        }
        if (!index) return null;

        const isPositive = index.change.startsWith('+') || (!index.change.startsWith('-') && parseFloat(index.change) > 0);
        const isZero = parseFloat(index.change) === 0;

        return (
            <div 
                key={index.symbol}
                onClick={() => onSelect?.(index.symbol)}
                className="glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[140px] cursor-pointer hover:bg-white/5 transition-all group overflow-hidden relative"
            >
                {/* Background ambient glow based on trend */}
                <div className={clsx("absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-20 rounded-full", isPositive ? "bg-[#ff4d4f]" : "bg-[#3b82f6]")}></div>
                
                <div className="flex items-center justify-between mb-4 z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 rounded-lg">
                            {isExchangeRate ? <DollarSign size={16} /> : index.type === 'CRYPTO' || index.symbol?.includes('BTC') ? <Bitcoin size={16} /> : index.type === 'US' ? 'US' : index.type === 'KR' ? 'KR' : <Globe size={16} />}
                        </div>
                        <span className="font-bold text-sm text-foreground/80 group-hover:text-primary transition-colors">{index.name}</span>
                    </div>
                </div>

                <div className="z-10">
                    <div className="text-2xl font-black font-mono mb-1">
                        {isExchangeRate ? `₩${index.price}` : index.type === 'US' ? `$${index.price}` : index.type === 'KR' ? `₩${index.price}` : index.price}
                    </div>
                    <div className={clsx("text-sm font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-md", 
                        isPositive ? "text-[#ff4d4f] bg-[#ff4d4f]/10" : isZero ? "text-muted-foreground bg-white/5" : "text-[#3b82f6] bg-[#3b82f6]/10")}>
                        {!isZero && (isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}
                        {index.changePercent}%
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
            {renderCard(kospi)}
            {renderCard(nasdaq)}
            {renderCard(exchangeRate, true)}
            {renderCard(btc)}
        </div>
    );
};
