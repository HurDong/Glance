import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight, Maximize2, MoreHorizontal } from 'lucide-react';

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

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Chart Header */}
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold">{symbol}</h2>
                        <span className="text-sm font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">KRX</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-mono font-bold">
                            ₩{endPrice.toLocaleString()}
                        </span>
                        <span className={clsx("flex items-center font-medium", isPositive ? "text-red-500" : "text-blue-500")}>
                            {isPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                            {changePercent}%
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted p-1 rounded-lg">
                        {(['1주', '1달', '1년'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range === '1주' ? '1W' : range === '1달' ? '1M' : '1Y')}
                                className={clsx(
                                    "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                    (timeRange === '1W' && range === '1주') || (timeRange === '1M' && range === '1달') || (timeRange === '1Y' && range === '1년')
                                        ? "bg-background shadow-sm text-foreground" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Chart Body */}
            <div className="flex-1 min-h-[300px] w-full p-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
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
                            tickFormatter={(value: any) => `₩${(value/10000).toFixed(0)}만`}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: any) => [`₩${value.toLocaleString()}`, '가격']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={isPositive ? "#ef4444" : "#3b82f6"} 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
