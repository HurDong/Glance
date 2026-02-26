import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight, Maximize2, MoreHorizontal } from 'lucide-react';

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

// Mock data generator for demonstration
const generateData = (days: number) => {
  const data = [];
  let price = 150000; // Starting price
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * 5000; // Random fluctuation
    price += change;
    data.push({
      date: `Day ${i + 1}`,
      price: Math.round(price),
      volume: Math.floor(Math.random() * 10000)
    });
  }
  return data;
};

const dataWeek = generateData(7);
const dataMonth = generateData(30);
const dataYear = generateData(365);

interface StockChartProps {
    symbol: string | null;
}

export const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
    const [timeRange, setTimeRange] = useState<'1W' | '1M' | '1Y'>('1M');

    // Select data based on range
    const data = timeRange === '1W' ? dataWeek : timeRange === '1M' ? dataMonth : dataYear;
    
    // Calculate simple stats for display
    const startPrice = data[0].price;
    const endPrice = data[data.length - 1].price;
    const change = endPrice - startPrice;
    const changePercent = ((change / startPrice) * 100).toFixed(2);
    const isPositive = change >= 0;

    if (!symbol) {
        return (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Maximize2 className="opacity-50" />
                </div>
                <p>차트를 볼 종목을 선택하세요</p>
            </div>
        );
    }

    const name = STOCK_NAMES[symbol] || symbol;
    const isUS = /^[a-zA-Z]+$/.test(symbol);
    const currencyPrefix = isUS ? '$' : '₩';
    const marketLabel = isUS ? 'NASDAQ' : 'KRX';

    return (
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Chart Header */}
            <div className="p-7 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-black tracking-tight">{name}</h2>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">{marketLabel}</span>
                        {symbol !== name && (
                            <span className="text-sm font-semibold text-muted-foreground ml-1">{symbol}</span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-4xl font-mono font-bold tracking-tighter">
                            {currencyPrefix}{endPrice.toLocaleString()}
                        </span>
                        <span className={clsx("flex items-center font-bold px-2 py-1 rounded-lg text-sm bg-opacity-15", isPositive ? "text-[#ff4d4f] bg-[#ff4d4f]" : "text-[#3b82f6] bg-[#3b82f6]")}>
                            {isPositive ? <ArrowUpRight size={18} className="mr-0.5" /> : <ArrowDownRight size={18} className="mr-0.5" />}
                            {changePercent}%
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 p-1 rounded-xl glass-panel">
                        {(['1주', '1달', '1년'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range === '1주' ? '1W' : range === '1달' ? '1M' : '1Y')}
                                className={clsx(
                                    "px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-300",
                                    (timeRange === '1W' && range === '1주') || (timeRange === '1M' && range === '1달') || (timeRange === '1Y' && range === '1년')
                                        ? "bg-white/10 shadow-md text-foreground" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground transition-all duration-300 hover:rotate-90">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Chart Body */}
            {/* Chart Body: Relative container for absolute positioning of chart to prevent size issues */}
            <div className="flex-1 min-h-[300px] w-full p-4 relative min-w-0">
                 <div className="absolute inset-4 min-w-0">
                     <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#ff4d4f" : "#3b82f6"} stopOpacity={0.5}/>
                                <stop offset="95%" stopColor={isPositive ? "#ff4d4f" : "#3b82f6"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                            minTickGap={30}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                            domain={['auto', 'auto']}
                            tickFormatter={(value: any) => isUS ? `$${value}` : `₩${(value/10000).toFixed(0)}만`}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(20,20,24,0.85)', 
                                backdropFilter: 'blur(12px)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                fontWeight: 'bold'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${currencyPrefix}${value.toLocaleString()}`, '가격']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={isPositive ? "#ff4d4f" : "#3b82f6"} 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};
