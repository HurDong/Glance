import React, { useEffect } from 'react';
import { Users, PieChart } from 'lucide-react';
import { groupApi } from '../../api/group';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import type { GroupFeed } from '../../api/group';

export const GroupPortfolioWidget: React.FC<{ groupId: number }> = ({ groupId }) => {
    const { token } = useAuthStore();
    const [feeds, setFeeds] = React.useState<GroupFeed[]>([]);

    useEffect(() => {
        if (token && groupId) {
            groupApi.getGroupFeeds(groupId)
                .then(setFeeds)
                .catch(console.error);
        }
    }, [token, groupId]);

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'CREATE_GROUP':
                return '🆕';
            case 'JOIN_GROUP':
                return '👋';
            case 'SHARE_PORTFOLIO':
                return '📊';
            case 'LEAVE_GROUP':
                return '🚪';
            default:
                return '🔔';
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

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
                        { rank: 1, name: '수익률 상위권', return: '+12.5%', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                        { rank: 2, name: '안정형 투자자', return: '+8.2%', color: 'text-zinc-300', bg: 'bg-zinc-300/10' },
                        { rank: 3, name: '집중 매수형', return: '+5.1%', color: 'text-amber-600', bg: 'bg-amber-600/10' },
                    ].map(user => (
                        <div key={user.rank} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={clsx('w-7 h-7 flex items-center justify-center rounded-full font-black text-xs', user.bg, user.color)}>
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
                    {feeds.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            아직 등록된 활동이 없습니다.
                        </div>
                    ) : (
                        feeds.map(feed => (
                            <div key={feed.id} className="flex gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg flex-shrink-0 border border-white/10">
                                    {getActionIcon(feed.actionType)}
                                </div>
                                <div>
                                    <div className="text-sm">
                                        <span className="font-bold text-primary">{feed.nickname}</span>님이
                                        <span className="font-medium text-foreground ml-1">
                                            {feed.actionType === 'CREATE_GROUP' && '새 그룹을 만들었습니다'}
                                            {feed.actionType === 'JOIN_GROUP' && '그룹에 참여했습니다'}
                                            {feed.actionType === 'SHARE_PORTFOLIO' && '포트폴리오를 공유했습니다'}
                                            {feed.actionType === 'LEAVE_GROUP' && '그룹에서 나갔습니다'}
                                            {!['CREATE_GROUP', 'JOIN_GROUP', 'SHARE_PORTFOLIO', 'LEAVE_GROUP'].includes(feed.actionType) && feed.content}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">{getTimeAgo(feed.createdAt)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <button className="w-full mt-4 bg-white/5 hover:bg-white/10 text-foreground py-2.5 rounded-xl text-sm font-bold transition-colors border border-white/5 z-10">
                    전체 그룹 피드 보기
                </button>
            </div>
        </div>
    );
};
