import React, { useEffect, useState } from 'react';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

// Major Stock Lists
const KR_STOCKS = ['005930', '000660', '035420', '035720', '005380', '051910', '000270']; // Samsung, SK Hynix, Naver, Kakao, Hyundai, LG Chem, Kia
const US_STOCKS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD'];

interface StockTickerProps {
    symbols?: string[];
}

export const StockTicker: React.FC<StockTickerProps> = ({ symbols: propSymbols }) => {
    const { subscribe } = useStockWebSocket();
    const { getPrice } = useStockStore();
    const [displaySymbols, setDisplaySymbols] = useState<string[]>([]);

    useEffect(() => {
        if (propSymbols) {
            setDisplaySymbols(propSymbols);
            return;
        }

        // Determine active market based on KST
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kstGap = 9 * 60 * 60 * 1000;
        const kstTime = new Date(utc + kstGap);
        const kstHour = kstTime.getHours();

        let targetSymbols: string[] = [];

        // KR Market Focus: 08:00 ~ 18:00 KST
        if (kstHour >= 8 && kstHour < 18) {
            targetSymbols = KR_STOCKS;
        } 
        // US Market Focus: 18:00 ~ 08:00 KST
        else {
            targetSymbols = US_STOCKS;
        }

        setDisplaySymbols(targetSymbols);
    }, [propSymbols]);

    useEffect(() => {
        if (displaySymbols.length > 0) {
            displaySymbols.forEach(symbol => subscribe(symbol));
        }
    }, [displaySymbols, subscribe]);

    // Duplicate symbols to create a seamless loop
    // We need enough copies to fill the screen width + buffer. 
    // Quadrupling should be safe for most screens if the list is short.
    const tickerSymbols = [...displaySymbols, ...displaySymbols, ...displaySymbols, ...displaySymbols];

    return (
        <div className="w-full bg-card border-b border-border overflow-hidden relative">
            {/* Header Overlay */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-card pr-4 pl-2 border-r border-border">
                <div className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                    실시간 시세
                </div>
            </div>

            <div className="flex w-max animate-ticker pause-on-hover pl-24">
                {tickerSymbols.map((symbol, index) => {
                    const data = getPrice(symbol);
                    // Use index in key to allow duplicates
                    const key = `${symbol}-${index}`; 

                    if (!data) return (
                        <div key={key} className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 mx-2">
                             <span className="font-bold text-sm">{symbol}</span>
                             <span className="text-xs text-muted-foreground">Loading...</span>
                        </div>
                    );

                    const isUp = parseFloat(data.change) > 0;
                    const isDown = parseFloat(data.change) < 0;
                    const isSame = parseFloat(data.change) === 0;

                    return (
                        <div key={key} className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 mx-2">
                            <span className="font-bold text-sm">{symbol}</span>
                            <span className={clsx(
                                "font-mono text-sm font-medium",
                                isUp && "text-red-500",
                                isDown && "text-blue-500",
                                isSame && "text-foreground"
                            )}>
                                {data.price}
                            </span>
                            <div className={clsx(
                                "flex items-center text-xs",
                                isUp && "text-red-500",
                                isDown && "text-blue-500",
                                isSame && "text-muted-foreground"
                            )}>
                                {isUp && <TrendingUp size={12} className="mr-0.5" />}
                                {isDown && <TrendingDown size={12} className="mr-0.5" />}
                                {isSame && <Minus size={12} className="mr-0.5" />}
                                <span>{data.changeRate}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Gradient Overlay for smooth fade edges - Right side only implemented for now or modify as needed */}
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
        </div>
    );
};
