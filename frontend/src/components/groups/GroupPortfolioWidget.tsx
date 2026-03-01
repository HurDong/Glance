import React, { useEffect } from 'react';
import { Users, PieChart } from 'lucide-react';
import { groupApi } from '../../api/group';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';

export const GroupPortfolioWidget: React.FC = () => {
    const { token } = useAuthStore();

    useEffect(() => {
        if (token) {
            groupApi.getMyGroups().catch(console.error);
        }
    }, [token]);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Weekly Challenge Leaderboard */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between mb-5 z-10">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <PieChart size={16} />
                        </div>
                        주간 챌린지
                    </h3>
                    <button className="text-xs font-bold text-muted-foreground hover:text-foreground">
                        더보기
                    </button>
                </div>

                <div className="space-y-4 z-10">
                    {/* Mock Leaderboard */}
                    {[
                        { rank: 1, name: '투자왕김존버', return: '+12.5%', isUp: true, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                        { rank: 2, name: '워렌버핏조카', return: '+8.2%', isUp: true, color: 'text-zinc-300', bg: 'bg-zinc-300/10' },
                        { rank: 3, name: '단타의신', return: '+5.1%', isUp: true, color: 'text-amber-600', bg: 'bg-amber-600/10' },
                    ].map(user => (
                        <div key={user.rank} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={clsx("w-7 h-7 flex items-center justify-center rounded-full font-black text-xs", user.bg, user.color)}>
                                    {user.rank}
                                </div>
                                <div className="font-bold text-sm">{user.name}</div>
                            </div>
                            <div className="text-[#ff4d4f] font-mono font-bold text-sm">
                                {user.return}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Group Feed */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col flex-1 relative overflow-hidden">
                <div className="flex items-center justify-between mb-5 z-10">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Users size={16} />
                        </div>
                        그룹 피드
                    </h3>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar z-10">
                    {/* Mock Feed Items */}
                    {[
                        { id: 1, user: '투자왕김존버', action: 'NVIDIA 매수', time: '10분 전', icon: '📈' },
                        { id: 2, user: '워렌버핏조카', action: '새 포트폴리오 공유', time: '1시간 전', icon: '💼' },
                        { id: 3, user: '테슬람', action: '테슬라 목표가 달성!', time: '2시간 전', icon: '🚀' },
                        { id: 4, user: '단타의신', action: '삼성전자 수익 실현', time: '5시간 전', icon: '💰' },
                    ].map(item => (
                        <div key={item.id} className="flex gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg flex-shrink-0 border border-white/10">
                                {item.icon}
                            </div>
                            <div>
                                <div className="text-sm">
                                    <span className="font-bold text-primary">{item.user}</span>님이
                                    <span className="font-medium text-foreground ml-1">{item.action}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{item.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button className="w-full mt-4 bg-white/5 hover:bg-white/10 text-foreground py-2.5 rounded-xl text-sm font-bold transition-colors border border-white/5 z-10">
                    내 그룹 전체보기
                </button>
            </div>
        </div>
    );
};
