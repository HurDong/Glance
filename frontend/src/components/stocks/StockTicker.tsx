import React, { useEffect, useState } from 'react';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

// Major Stock Lists and Names
const STOCK_NAMES: { [key: string]: string } = {
    '005930': '삼성전자',
    '000660': 'SK하이닉스',
    '035420': 'NAVER',
    '035720': '카카오',
    '005380': '현대차',
    '051910': 'LG화학',
    '000270': '기아',
    'NVDA': 'NVIDIA',
    'TSLA': 'Tesla',
    'AAPL': 'Apple',
    'MSFT': 'Microsoft',
    'AMZN': 'Amazon',
    'GOOGL': 'Alphabet',
    'META': 'Meta',
    'AMD': 'AMD'
};

const KR_STOCKS = ['005930', '000660', '035420', '035720', '005380', '051910', '000270'];
const US_STOCKS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD'];

interface StockTickerProps {
    symbols?: string[];
}

export const StockTicker: React.FC<StockTickerProps> = ({ symbols: propSymbols }) => {
    const { subscribe } = useStockWebSocket();
    // ... (rest of hook logic same) ...
    const { getPrice } = useStockStore(); // Fix: Ensure getPrice is destructured correctly if previously missed
    const [displaySymbols, setDisplaySymbols] = useState<string[]>([]);

    useEffect(() => {
    // ... (rest of effect logic same) ...
        if (propSymbols) {
            setDisplaySymbols(propSymbols);
            return;
        }

        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstGap = 9 * 60 * 60 * 1000;
        const kstTime = new Date(utc + kstGap);
        const kstHour = kstTime.getHours();

        let targetSymbols: string[] = [];

        if (kstHour >= 8 && kstHour < 18) {
            targetSymbols = KR_STOCKS;
        } else {
            targetSymbols = US_STOCKS;
        }

        setDisplaySymbols(targetSymbols);
    }, [propSymbols]);

    useEffect(() => {
        if (displaySymbols.length > 0) {
            displaySymbols.forEach(symbol => subscribe(symbol));
        }
    }, [displaySymbols, subscribe]);

    const tickerSymbols = [...displaySymbols, ...displaySymbols, ...displaySymbols, ...displaySymbols];

    return (
        <div className="w-full bg-card border-b border-border overflow-hidden relative group"> {/* added group for hover pause */}
            {/* Header Overlay */}
            <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center bg-card pr-4 pl-4 border-r border-border shadow-sm">
                <div className="text-xs font-bold text-primary whitespace-nowrap flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    실시간 시세
                </div>
            </div>

            <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused] pl-32 items-center h-10"> {/* Adjusted padding and height */}
                {tickerSymbols.map((symbol, index) => {
                    // Use index in key to allow duplicates
                    const key = `${symbol}-${index}`; 
                    const data = getPrice(symbol); // Access store state directly if possible or via hook
                    const name = STOCK_NAMES[symbol] || symbol;

                    if (!data) return (
                        <div key={key} className="flex-shrink-0 flex items-center space-x-2 px-6 border-r border-border/50 last:border-0">
                             <span className="font-bold text-sm text-foreground/80">{name}</span>
                             <span className="text-xs text-muted-foreground animate-pulse">Waiting...</span>
                        </div>
                    );

                    const changeVal = parseFloat(data.change);
                    const isUp = changeVal > 0;
                    const isDown = changeVal < 0;
                    const isSame = changeVal === 0;

                    return (
                        <div key={key} className="flex-shrink-0 flex items-center space-x-3 px-6 border-r border-border/50 last:border-0 hover:bg-muted/50 transition-colors cursor-default">
                            <span className="font-bold text-sm text-foreground/90">{name}</span>
                            
                            <div className="flex items-center space-x-2">
                                <span className={clsx(
                                    "font-mono text-sm font-medium",
                                    isUp && "text-red-500",
                                    isDown && "text-blue-500",
                                    isSame && "text-foreground"
                                )}>
                                    {parseInt(data.price).toLocaleString()} {/* Format price with commas */}
                                </span>
                                
                                <div className={clsx(
                                    "flex items-center text-xs font-medium px-1.5 py-0.5 rounded",
                                    isUp && "bg-red-500/10 text-red-500",
                                    isDown && "bg-blue-500/10 text-blue-500",
                                    isSame && "bg-gray-100 text-gray-500 dark:bg-gray-800"
                                )}>
                                    {isUp && <TrendingUp size={12} className="mr-1" />}
                                    {isDown && <TrendingDown size={12} className="mr-1" />}
                                    {isSame && <Minus size={12} className="mr-1" />}
                                    <span>{data.changeRate}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
        </div>
    );
};
