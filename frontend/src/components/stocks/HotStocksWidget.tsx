import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

// Mock Hot Stocks Data
const HOT_STOCKS = [
    { symbol: 'NVDA', name: 'Nvidia', change: '+2.14%', price: '$188.92', isHot: true },
    { symbol: 'TSLA', name: 'Tesla', change: '-4.82%', price: '$413.90', isHot: true },
    { symbol: '005930', name: 'Samsung', change: '+1.02%', price: '₩54,300', isHot: false }, // Rising but not "super hot"
    { symbol: 'BTC', name: 'Bitcoin', change: '+5.40%', price: '$98,200', isHot: true },
];

interface HotStocksWidgetProps {
    onSelect: (symbol: string) => void;
}

export const HotStocksWidget: React.FC<HotStocksWidgetProps> = ({ onSelect }) => {
    return (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-orange-500/10 rounded-lg">
                    <Flame className="text-orange-500 fill-orange-500" size={20} />
                </div>
                <h3 className="font-bold text-lg">실시간 인기 종목</h3>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {HOT_STOCKS.map((stock) => {
                    const isPositive = stock.change.startsWith('+');
                    return (
                        <div 
                            key={stock.symbol}
                            onClick={() => onSelect(stock.symbol)}
                            className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all border border-transparent hover:border-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                                    {stock.symbol.slice(0, 1)}
                                </div>
                                <div>
                                    <div className="font-bold text-sm group-hover:text-primary transition-colors">{stock.symbol}</div>
                                    <div className="text-xs text-muted-foreground">{stock.name}</div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className="font-mono text-sm font-medium">{stock.price}</div>
                                <div className={clsx("text-xs font-bold flex items-center justify-end gap-1", isPositive ? "text-red-500" : "text-blue-500")}>
                                    {isPositive && <TrendingUp size={12} />}
                                    {stock.change}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-border">
                <button className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                    전체 순위 보기 →
                </button>
            </div>
        </div>
    );
};
