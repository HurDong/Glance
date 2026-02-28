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

import { apiClient as api } from '../../api/axios';
import { useStockStore } from '../../stores/useStockStore';

interface ChartPoint {
    date: string;
    price: number;
    volume: number;
}

interface StockChartProps {
    symbol: string | null;
    market?: string;
}

export const StockChart: React.FC<StockChartProps> = ({ symbol, market }) => {
    const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h' | '1d' | '1w' | '1M' | '1Y'>('1d');
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const { getPrice } = useStockStore();
    const currentPriceData = symbol ? getPrice(symbol) : null;

    // Fetch historical data
    React.useEffect(() => {
        if (!symbol) return;
        
        const fetchChartData = async () => {
            setIsLoading(true);
            setErrorMsg(null);
            try {
                const response = await api.get(`/stocks/${symbol}/chart`, {
                    params: { range: timeRange }
                });
                if (response.data && response.data.success && response.data.data) {
                    const points = response.data.data.data.map((p: any) => ({
                        date: p.date,
                        price: p.price,
                        volume: p.volume
                    }));
                    if (points.length === 0) {
                        setErrorMsg("조회된 차트 데이터가 없습니다.");
                    } else {
                        setChartData(points);
                    }
                } else if (response.data && !response.data.success) {
                    setErrorMsg(response.data.message || "차트 데이터를 불러오는데 실패했습니다.");
                }
            } catch (error: any) {
                console.error("Failed to fetch chart data", error);
                setErrorMsg(error.response?.data?.message || "서버 통신 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchChartData();
    }, [symbol, timeRange]);

    // Real-time update logic
    React.useEffect(() => {
        if (!currentPriceData || chartData.length === 0) return;

        setChartData(prev => {
            if (prev.length === 0) return prev;
            const newData = [...prev];
            const currentPrice = Number(currentPriceData.price);
            
            // Check if the last point is today
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const lastPoint = newData[newData.length - 1];
            
            // Intraday points have 'yyyyMMddHHmmss', Periodic have 'yyyyMMdd'
            // We just match the prefix to see if it's today
            if (lastPoint.date && lastPoint.date.startsWith(todayStr)) {
                // Update today's last price point
                newData[newData.length - 1] = { ...lastPoint, price: currentPrice };
            } else {
                // Add a new point for today
                newData.push({
                    date: todayStr,
                    price: currentPrice,
                    volume: 0
                });
            }
            
            return newData;
        });
    }, [currentPriceData]);

    const displayData = chartData;
    
    // Calculate simple stats for display
    const startPrice = displayData.length > 0 ? displayData[0].price : 0;
    const endPrice = displayData.length > 0 ? displayData[displayData.length - 1].price : 0;
    const change = endPrice - startPrice;
    const changePercent = startPrice > 0 ? ((change / startPrice) * 100).toFixed(2) : '0.00';
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
    
    // Determine market based on passed prop first, then fallback to symbol inference
    const isKoreanMarket = market 
        ? (market === 'KR' || market === 'KOSPI' || market === 'KOSDAQ' || market === 'KRX')
        : /^\d{6}(?:[A-Z])?$/.test(symbol); // Also handle ETF symbols like 0026S0

    const currencyPrefix = isKoreanMarket ? '₩' : '$';
    
    // Use the explicitly passed market label if available, otherwise guess
    let marketLabel = market || 'NASDAQ';
    if (!market) {
        if (isKoreanMarket) marketLabel = 'KRX';
        else if (symbol.startsWith('BINANCE:')) marketLabel = 'CRYPTO';
    } else if (market === 'KR') {
        marketLabel = 'KRX'; // Normalise 'KR' to 'KRX' for display
    }

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
                    <div className="flex bg-white/5 p-1 rounded-xl glass-panel overflow-x-auto gap-1">
                        {(['1분', '5분', '15분', '1시간', '1일', '1주', '1달', '1년'] as const).map((range) => {
                            const rangeKey = range === '1분' ? '1m' : range === '5분' ? '5m' : range === '15분' ? '15m' : range === '1시간' ? '1h' : range === '1일' ? '1d' : range === '1주' ? '1w' : range === '1달' ? '1M' : '1Y';
                            return (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(rangeKey as any)}
                                    className={clsx(
                                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap",
                                        timeRange === rangeKey
                                            ? "bg-white/10 shadow-md text-foreground" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    {range}
                                </button>
                            );
                        })}
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
                    {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    ) : errorMsg ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10 p-6 text-center">
                            <span className="text-destructive mb-2">데이터 로드 실패</span>
                            <span className="text-sm font-medium">{errorMsg}</span>
                        </div>
                    ) : displayData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            {/* ... chart ... */}
                            <AreaChart data={displayData}>
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
                            tickFormatter={(val: string) => {
                                if (!val) return val;
                                // Intraday format (yyyyMMddHHmm) -> HH:mm
                                if (val.length === 12 || val.length === 14) {
                                    return `${val.substring(8, 10)}:${val.substring(10, 12)}`;
                                }
                                // Daily format (yyyyMMdd) -> MM/DD
                                if (val.length === 8) {
                                    return `${val.substring(4, 6)}/${val.substring(6, 8)}`;
                                }
                                return val;
                            }}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                            domain={[
                                (dataMin: number) => dataMin * 0.95,
                                (dataMax: number) => dataMax * 1.05
                            ]}
                            tickFormatter={(value: any) => !isKoreanMarket ? `$${value?.toFixed(1) || value}` : `₩${(value/10000).toFixed(0)}만`}
                            width={55}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                fontWeight: 'bold',
                                color: 'hsl(var(--foreground))'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${currencyPrefix}${value.toLocaleString()}`, '가격']}
                            labelFormatter={(label: any) => {
                                if (!label) return label;
                                const labelStr = String(label);
                                if (labelStr.length === 12 || labelStr.length === 14) {
                                    return `${labelStr.substring(0, 4)}-${labelStr.substring(4, 6)}-${labelStr.substring(6, 8)} ${labelStr.substring(8, 10)}:${labelStr.substring(10, 12)}`;
                                }
                                if (labelStr.length === 8) {
                                    return `${labelStr.substring(0, 4)}-${labelStr.substring(4, 6)}-${labelStr.substring(6, 8)}`;
                                }
                                return labelStr;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke={isPositive ? "#ff4d4f" : "#3b82f6"} 
                            strokeWidth={displayData.length > 150 ? 1.5 : 3}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                            isAnimationActive={displayData.length <= 100}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                    ) : null}
                 </div>
            </div>
        </div>
    );
};
