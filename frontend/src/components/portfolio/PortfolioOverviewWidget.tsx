import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, TrendingUp } from 'lucide-react';

const MOCK_DATA = [
    { name: '주식 (KR)', value: 4500000 },
    { name: '주식 (US)', value: 8200000 },
    { name: '현금', value: 1300000 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--up))', 'hsl(var(--muted-foreground))'];

export const PortfolioOverviewWidget = () => {
    const totalAsset = MOCK_DATA.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
            {/* Left Info */}
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/20 rounded-xl text-primary">
                        <Briefcase size={20} />
                    </div>
                    <h3 className="font-bold text-lg">내 포트폴리오 요약</h3>
                </div>
                <div>
                    <h4 className="text-sm text-muted-foreground mb-1">총 자산</h4>
                    <div className="text-3xl font-black font-mono">
                        ₩{totalAsset.toLocaleString()}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#ff4d4f] bg-[#ff4d4f]/10 w-fit px-3 py-1.5 rounded-lg mt-2">
                    <TrendingUp size={16} />
                    <span>+12.4% (All Time)</span>
                </div>
            </div>

            {/* Right Chart */}
            <div className="h-[140px] w-[140px] md:w-[200px] md:h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={MOCK_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="rgba(255,255,255,0.05)"
                        >
                            {MOCK_DATA.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: any) => `₩${typeof value === 'number' ? value.toLocaleString() : value}`}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
