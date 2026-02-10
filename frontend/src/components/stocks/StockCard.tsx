import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockIcon } from './StockIcon';

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market?: 'US' | 'KR';
}

export const StockCard: React.FC<StockCardProps> = ({ 
  symbol, 
  name, 
  price, 
  change, 
  changePercent,
  market = 'US'
}) => {
  const isPositive = change >= 0;

  return (
    <div className="bg-card p-4 rounded-xl border border-border hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-3">
          <StockIcon symbol={symbol} name={name} market={market} className="w-8 h-8 text-sm" />
          <div>
            <h3 className="font-bold text-base group-hover:text-primary transition-colors">{symbol}</h3>
            <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{name}</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span className="text-sm font-semibold">{isPositive ? '+' : ''}{changePercent}%</span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold font-mono">
          {symbol === 'BTC' ? '₩' : '$'}
          {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{change} 대비 오늘
        </p>
      </div>
    </div>
  );
};
