import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, Star, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--up))', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

interface PortfolioItem {
    id: number;
    symbol: string;
    nameKr: string;
    nameEn: string;
    market: string;
    quantity: number;
    averagePrice: number;
    currency: string;
}

interface PrimaryPortfolio {
    id: number;
    name: string;
    isPrimary: boolean;
    items: PortfolioItem[];
}

const apiClient = axios.create({ baseURL: 'http://localhost:8080/api/v1' });

export const PortfolioOverviewWidget = () => {
    const { token } = useAuthStore();
    const [portfolio, setPortfolio] = useState<PrimaryPortfolio | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!token) { setIsLoading(false); return; }

        apiClient.get<{ data: PrimaryPortfolio }>('/portfolios/primary', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => setPortfolio(res.data.data))
        .catch(() => setError(true))
        .finally(() => setIsLoading(false));
    }, [token]);

    if (!token) return null;

    if (isLoading) {
        return (
            <div className="bg-card/40 backdrop-blur-xl border border-border shadow-sm p-6 rounded-2xl h-[160px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !portfolio) {
        return (
            <div className="bg-card/40 backdrop-blur-xl border border-border shadow-sm p-6 rounded-2xl flex items-center gap-3 text-muted-foreground">
                <AlertCircle size={18} />
                <span className="text-sm">대표 포트폴리오를 불러올 수 없습니다.</span>
            </div>
        );
    }

    const items = portfolio.items || [];
    const chartData = items.map(item => ({
        name: item.nameKr || item.symbol,
        value: item.currency === 'USD'
            ? item.averagePrice * item.quantity * 1350
            : item.averagePrice * item.quantity,
    })).sort((a, b) => b.value - a.value);

    const totalAsset = chartData.reduce((acc, curr) => acc + curr.value, 0);

    const formatKRW = (won: number) => {
        if (won >= 1_0000_0000_0000) return `₩${(won / 1_0000_0000_0000).toFixed(1)}조`;
        if (won >= 1_0000_0000) return `₩${(won / 1_0000_0000).toFixed(1)}억`;
        if (won >= 1_0000) return `₩${(won / 1_0000).toFixed(1)}만`;
        return `₩${won.toLocaleString()}`;
    };

    return (
        <div className="bg-card/40 backdrop-blur-xl border border-border shadow-sm p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
            {/* Left Info */}
            <div className="flex-1 space-y-4 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/20 rounded-xl text-primary">
                        <Briefcase size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            {portfolio.isPrimary && (
                                <Star size={13} className="fill-yellow-400 text-yellow-400 shrink-0" />
                            )}
                            <h3 className="font-bold text-lg truncate">{portfolio.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">내 포트폴리오 요약</p>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm text-muted-foreground mb-1">총 자산 (추정)</h4>
                    <div className="text-3xl font-black font-mono">
                        {formatKRW(totalAsset)}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    보유 종목 <span className="font-bold text-foreground">{items.length}</span>개
                </div>
            </div>

            {/* Right Chart */}
            {chartData.length > 0 ? (
                <div className="h-[140px] w-[140px] md:w-[180px] md:h-[160px] relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={62}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => formatKRW(Number(value))}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[140px] w-[140px] md:w-[180px] md:h-[160px] shrink-0 flex items-center justify-center text-muted-foreground/40 text-xs text-center">
                    보유 종목이<br/>없습니다
                </div>
            )}
        </div>
    );
};
