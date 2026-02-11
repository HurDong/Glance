import React, { useEffect, useState } from 'react';
import { Users, PieChart, Plus, UserPlus, Check, X, Search } from 'lucide-react';
import { groupApi } from '../../api/group';
import type { Group } from '../../api/group';
import { portfolioApi } from '../../api/portfolio';
import type { Portfolio } from '../../api/portfolio';
import { useAuthStore } from '../../stores/authStore';
import { Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { StockIcon } from '../stocks/StockIcon';

export const GroupFeed: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroup, setNewGroup] = useState<{ name: string; description: string }>({
        name: '',
        description: ''
    });
    const [joinGroupId, setJoinGroupId] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
    const { token, user } = useAuthStore();

    const handleAction = async (action: () => Promise<void>, successMsg: string) => {
        try {
            await action();
            alert(successMsg);
            fetchGroups();
        } catch (error) {
            console.error('Action failed:', error);
            alert('작업에 실패했습니다.');
        }
    };

    const fetchGroups = async () => {
        try {
            setIsLoading(true);
            const data = await groupApi.getMyGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPortfolios = async () => {
        try {
            const data = await portfolioApi.getMyPortfolios();
            setPortfolios(data);
        } catch (error) {
            console.error('Failed to fetch portfolios:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchGroups();
        } else {
            setGroups([]);
            setIsLoading(false);
        }
    }, [token]);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await groupApi.createGroup(newGroup);
            setIsCreateModalOpen(false);
            setNewGroup({ name: '', description: '' });
            fetchGroups();
            alert('그룹이 생성되었습니다.');
        } catch (error) {
            console.error('Failed to create group:', error);
            alert('그룹 생성에 실패했습니다.');
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinGroupId) {
            alert('그룹 ID를 입력해주세요.');
            return;
        }
        await handleAction(() => groupApi.joinGroup(parseInt(joinGroupId)), '그룹 가입을 신청했습니다.');
        setJoinGroupId('');
    };

    const handleOpenShareModal = (groupId: number) => {
        setSelectedGroupId(groupId);
        setIsShareModalOpen(true);
        fetchPortfolios();
    };

    const handleSharePortfolio = async () => {
        if (!selectedGroupId || !selectedPortfolioId) {
            alert('포트폴리오를 선택해주세요.');
            return;
        }
        await handleAction(
            () => groupApi.sharePortfolio(selectedGroupId, selectedPortfolioId),
            '포트폴리오가 공유되었습니다.'
        );
        setIsShareModalOpen(false);
        setSelectedPortfolioId(null);
    };

    const invitedGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'INVITED')
    );

    const activeGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'ACCEPTED')
    );

    if (isLoading) {
        return <div className="text-center p-8">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar: Search/Join & Create */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <form onSubmit={handleJoinGroup} className="flex-1 flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="number"
                            value={joinGroupId}
                            onChange={(e) => setJoinGroupId(e.target.value)}
                            placeholder="그룹 ID로 참가 신청..."
                            className="w-full bg-card hover:bg-accent/50 focus:bg-card border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all outline-none"
                        />
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-accent hover:bg-accent/80 text-accent-foreground rounded-xl text-sm font-semibold shadow-sm transition-all">
                        참가 신청
                    </button>
                </form>
                
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 text-sm font-bold"
                >
                    <Plus size={18} />
                    <span>새 그룹 만들기</span>
                </button>
            </div>

            {/* Invitations Section */}
            {invitedGroups.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <UserPlus size={16} />
                        초대받은 그룹
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invitedGroups.map(group => {
                            const myMembership = group.members.find(m => m.member.email === user?.email);
                            return (
                                <div key={group.id} className="bg-card border-2 border-primary/20 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold">{group.name}</div>
                                        <div className="text-xs text-muted-foreground">{group.owner.nickname}님의 초대</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleAction(() => groupApi.handleInvitation(myMembership!.id, true), '초대를 수락했습니다.')}
                                            className="p-2 bg-primary text-primary-foreground rounded-lg hover:shadow-md hover:shadow-primary/20 transition-all"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleAction(() => groupApi.handleInvitation(myMembership!.id, false), '초대를 거절했습니다.')}
                                            className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="border-t border-border my-6" />

            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Users size={20} className="text-primary" />
                내 그룹
            </h2>

            {activeGroups.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">아직 가입한 그룹이 없습니다.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all font-bold text-sm"
                    >
                        첫 그룹 만들기
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeGroups.map((group) => (
                        <div key={group.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold mb-1">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground">{group.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        <UserPlus size={12} className="mr-1" />
                                        {group.members.filter(m => m.status === 'ACCEPTED').length}명
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">ID: {group.id}</div>
                                </div>
                            </div>

                            {/* Pending Requests for Owner */}
                            {group.owner.email === user?.email && group.members.some(m => m.status === 'PENDING') && (
                                <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                    <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                                        <UserPlus size={14} />
                                        가입 신청 대기 중
                                    </div>
                                    <div className="space-y-2">
                                        {group.members.filter(m => m.status === 'PENDING').map(req => (
                                            <div key={req.id} className="flex items-center justify-between bg-card p-2 rounded border border-border text-sm">
                                                <span>{req.member.nickname}</span>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleAction(() => groupApi.handleJoinRequest(group.id, req.id, true), '가입을 승인했습니다.')}
                                                        className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-colors"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(() => groupApi.handleJoinRequest(group.id, req.id, false), '가입을 거절했습니다.')}
                                                        className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {group.members && group.members.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <PieChart size={14} />
                                            공유된 포트폴리오
                                        </span>
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        {group.members
                                            .filter(member => member.status === 'ACCEPTED' && member.sharedPortfolioId)
                                            .map((member) => (
                                                <div key={member.id} className="group/card relative overflow-hidden bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                                                    {/* Decorative Background Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                                                    
                                                    <div className="relative p-5">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-inner">
                                                                    {member.member.nickname.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-lg leading-tight">{member.sharedPortfolioName}</div>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                        <span>by</span>
                                                                        <span className="font-medium text-foreground">{member.member.nickname}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                                                                수익률 공개 예정
                                                            </div>
                                                        </div>
                                                        
                                                        {member.sharedPortfolioItems && member.sharedPortfolioItems.length > 0 ? (
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                                {member.sharedPortfolioItems.map(item => (
                                                                    <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                                                                        <StockIcon 
                                                                            symbol={item.symbol} 
                                                                            name={item.nameKr} 
                                                                            market={item.market as 'US' | 'KR'} 
                                                                            className="w-8 h-8 shadow-sm"
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-xs font-semibold truncate text-foreground">{item.nameKr}</div>
                                                                            <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                                                                <span>{item.symbol}</span>
                                                                                <span className="font-medium bg-background px-1.5 rounded text-foreground">{item.quantity}주</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border/60">
                                                                <p className="text-xs text-muted-foreground">공유된 종목이 없습니다.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        {group.members.filter(m => m.status === 'ACCEPTED' && m.sharedPortfolioId).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                                                아직 공유된 포트폴리오가 없습니다. 하단 버튼을 눌러 공유해보세요!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Share Button (Only for Accepted Members) */}
                            <div className="mt-6 pt-4 border-t border-border flex justify-end">
                                <button
                                    onClick={() => handleOpenShareModal(group.id)}
                                    className="group/btn flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 text-sm font-bold"
                                >
                                    <Share2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                    <span>포트폴리오 공유하기</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            {/* ... (existing modal) */}

            {/* Share Portfolio Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">공유할 포트폴리오 선택</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {portfolios.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">공유할 수 있는 포트폴리오가 없습니다.</p>
                            ) : (
                                portfolios.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => setSelectedPortfolioId(p.id)}
                                        className={clsx(
                                            "p-4 rounded-xl border cursor-pointer transition-all",
                                            selectedPortfolioId === p.id 
                                                ? "border-primary bg-primary/5 shadow-sm" 
                                                : "border-border hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.items.length}개 종목</div>
                                            </div>
                                            {selectedPortfolioId === p.id && <Check className="text-primary" size={20} />}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSharePortfolio}
                                disabled={!selectedPortfolioId}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                공유하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl border border-border">
                        <h3 className="text-xl font-bold mb-4">새 그룹 만들기</h3>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">그룹 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={newGroup.name}
                                    onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                    placeholder="예: 투자 스터디 그룹"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">설명</label>
                                <textarea
                                    value={newGroup.description}
                                    onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none h-24 resize-none"
                                    placeholder="그룹에 대한 설명을 입력하세요."
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90"
                                >
                                    생성하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
