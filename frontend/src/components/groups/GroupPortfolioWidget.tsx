import React, { useEffect, useState } from 'react';
import { Users, ChevronRight, PieChart } from 'lucide-react';
import { groupApi, type Group } from '../../api/group';
import { useAuthStore } from '../../stores/authStore';

export const GroupPortfolioWidget: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const { token, user } = useAuthStore();

    useEffect(() => {
        if (token) {
            groupApi.getMyGroups().then(setGroups).catch(console.error);
        }
    }, [token]);

    const activeGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'ACCEPTED')
    );

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    <span>내 그룹</span>
                </h3>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {activeGroups.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                        <p>활성화된 그룹이 없습니다.</p>
                        <p className="text-xs mt-1 opacity-70">그룹에 가입하고 경쟁하세요!</p>
                    </div>
                ) : (
                    activeGroups.slice(0, 3).map(group => (
                        <div key={group.id} className="p-3 bg-muted/30 rounded-lg border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm truncate pr-2">{group.name}</h4>
                                <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">
                                    {group.members.length}명 대기중
                                </span>
                             </div>
                             
                             <div className="flex items-center gap-2 mt-2">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                     {/* Mock progress bar for "Ranking" or "Performance" */}
                                    <div className="h-full bg-primary w-2/3" />
                                </div>
                                <span className="text-xs font-mono font-medium text-primary">#1</span>
                             </div>
                        </div>
                    ))
                )}

                {/* Promo Card if few groups */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/90 to-primary p-4 text-primary-foreground mt-2">
                    <div className="relative z-10">
                        <div className="font-bold text-sm mb-1">주간 챌린지</div>
                        <div className="text-xs opacity-90 mb-3">
                            이번 주 수익률 1위는 누구일까요?
                        </div>
                        <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                            <PieChart size={14} /> 대시보드 바로가기
                        </button>
                    </div>
                    {/* Decorative Circle */}
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                </div>
            </div>
            
             <button className="w-full mt-4 text-xs flex items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                전체 그룹 보기 <ChevronRight size={12} />
            </button>
        </div>
    );
};
