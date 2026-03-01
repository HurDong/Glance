import React, { useEffect, useState } from 'react';
import { Users, Plus, Share2, Send, Trash2, X, Sparkles, Activity } from 'lucide-react';
import { groupApi } from '../../api/group';
import type { Group } from '../../api/group';
import { portfolioApi } from '../../api/portfolio';
import type { Portfolio } from '../../api/portfolio';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { StockIcon } from '../stocks/StockIcon';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { StockQuickAddModal } from '../portfolio/StockQuickAddModal';

const PortfolioItemPrice = ({ symbol, market: _market }: { symbol: string, market: string }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();

    useEffect(() => {
        subscribe(symbol);
    }, [symbol, subscribe]);

    const data = getPrice(symbol);

    if (!data) return <span className="text-xs text-muted-foreground">가격 정보 로딩중...</span>;

    // Use changeRate string to deterministically check negative values (handles both numbers and string formats like "-1.49")
    const changeRateStr = String(data.changeRate);
    const isDown = changeRateStr.startsWith('-');
    const isUp = !isDown && parseFloat(changeRateStr) > 0;

    return (
        <div className={clsx("flex items-center text-sm font-bold tracking-tight", isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-foreground")}>
            {data.price}
            <span className="ml-1.5 text-xs font-medium opacity-90">({data.changeRate}%)</span>
        </div>
    );
};

export const GroupPortfolioDashboard: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroup, setNewGroup] = useState<{ name: string; description: string }>({ name: '', description: '' });
    const [joinGroupId, setJoinGroupId] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
    const [quickAddSymbol, setQuickAddSymbol] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{text: string, isError: boolean} | null>(null);
    const [selectedGroupDetails, setSelectedGroupDetails] = useState<Group | null>(null);
    const [selectedGroupForFeed, setSelectedGroupForFeed] = useState<Group | null>(null);
    const { token, user } = useAuthStore();

    const showToast = (text: string, isError = false) => {
        setToastMessage({ text, isError });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleAction = async (action: () => Promise<void>, successMsg: string, errorMsg: string = '작업에 실패했습니다.') => {
        try {
            await action();
            if (successMsg) showToast(`✅ ${successMsg}`);
            fetchGroups();
            return true;
        } catch (error) {
            console.error('Action failed:', error);
            showToast(`❌ ${errorMsg}`, true);
            return false;
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
            showToast('✅ 새 그룹이 생성되었습니다!');
        } catch (error) {
            console.error('Failed to create group:', error);
            showToast('❌ 그룹 생성에 실패했습니다. (이름이 중복될 수 있습니다)', true);
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinGroupId) return;

        let success = false;
        // If it's pure numbers, try joining by ID, otherwise join by code
        if (/^\d+$/.test(joinGroupId)) {
            success = await handleAction(() => groupApi.joinGroup(parseInt(joinGroupId)), '그룹에 성공적으로 가입되었습니다!', '존재하지 않는 그룹 ID이거나 이미 가입된 그룹입니다.');
        } else {
            success = await handleAction(() => groupApi.joinGroupByCode(joinGroupId), '초대 코드로 그룹에 성공적으로 가입되었습니다!', '유효하지 않은 초대 코드이거나 이미 가입된 그룹입니다.');
        }
        if (success) setJoinGroupId('');
    };

    const handleShareInviteCode = async (group: Group) => {
        const joinUrl = `${window.location.origin}/groups?code=${group.inviteCode}`;
        const textToShare = `[Glance] '${group.name}' 주식 포트폴리오 그룹에 초대합니다!\n초대 코드: ${group.inviteCode}\n\nGlance에서 위 코드를 입력하고 바로 합류하세요!`;
        
        // PC 카카오톡 안드로이드/윈도우 이슈 우회: 무조건 클립보드에 먼저 복사
        try {
            await navigator.clipboard.writeText(`${textToShare}\n링크: ${joinUrl}`);
            showToast(`✅ 클립보드에 초대 코드가 복사되었습니다! 카카오톡 등에서 바로 붙여넣기(Ctrl+V) 하세요.`);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
        }

        if (navigator.share) {
            try {
                // 약간의 딜레이 후 네이티브 공유창 띄우기 (토스트 메시지가 보일 시간 확보)
                setTimeout(async () => {
                    await navigator.share({
                        title: `${group.name} 그룹 공유`,
                        text: textToShare,
                        url: joinUrl
                    });
                }, 500);
            } catch (error) {
                console.log('공유 취소됨 또는 실패', error);
            }
        }
    };

    const handleDeleteGroup = async (groupId: number, groupName: string) => {
        if (window.confirm(`'${groupName}' 그룹을 정말 삭제하시겠습니까? 모든 멤버와 공유 데이터가 사라집니다.`)) {
            await handleAction(() => groupApi.deleteGroup(groupId), '그룹이 삭제되었습니다.', '방장만 그룹을 삭제할 수 있습니다.');
        }
    };

    const handleOpenShareModal = (groupId: number) => {
        setSelectedGroupId(groupId);
        setIsShareModalOpen(true);
        fetchPortfolios();
    };

    const handleSharePortfolio = async () => {
        if (!selectedGroupId || !selectedPortfolioId) return;
        const success = await handleAction(
            () => groupApi.sharePortfolio(selectedGroupId, selectedPortfolioId),
            '포트폴리오가 그룹에 성공적으로 공유되었습니다.',
            '포트폴리오 공유에 실패했습니다.'
        );
        if (success) {
            setIsShareModalOpen(false);
            setSelectedPortfolioId(null);
            // 공유 후 현재 보고 있는 그룹 피드를 즉시 갱신
            try {
                const updatedGroups = await groupApi.getMyGroups();
                setGroups(updatedGroups);
                // 현재 피드에 표시 중인 그룹도 최신 데이터로 교체
                if (selectedGroupForFeed) {
                    const updated = updatedGroups.find(g => g.id === selectedGroupForFeed.id);
                    if (updated) setSelectedGroupForFeed(updated);
                } else if (selectedGroupId) {
                    const updated = updatedGroups.find(g => g.id === selectedGroupId);
                    if (updated) setSelectedGroupForFeed(updated);
                }
            } catch (e) {
                console.error('그룹 피드 갱신 실패:', e);
            }
        }
    };

    const activeGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'ACCEPTED')
    );

    useEffect(() => {
        if (activeGroups.length > 0 && !selectedGroupForFeed) {
            setSelectedGroupForFeed(activeGroups[0]);
        } else if (activeGroups.length === 0) {
            setSelectedGroupForFeed(null);
        }
    }, [groups, user?.email]);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">데이터를 불러오는 중입니다...</div>;

    return (
        <div className="space-y-6 lg:space-y-8 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">소셜 그룹</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">포트폴리오를 공유하고 인사이트를 나눠보세요</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group bg-card/60 backdrop-blur-md border border-border/80 rounded-full p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm flex items-center w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="초대 코드 입력..." 
                            value={joinGroupId}
                            onChange={(e) => setJoinGroupId(e.target.value)}
                            className="bg-transparent px-3 py-1.5 text-sm w-full sm:w-40 outline-none"
                        />
                        <button 
                            onClick={handleJoinGroup} 
                            className="px-4 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full hover:bg-secondary/80 transition-colors shrink-0"
                        >
                            참여
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2 sm:px-4 sm:py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">그룹 만들기</span>
                    </button>
                </div>
            </div>

            {activeGroups.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-border/60 rounded-3xl bg-card/20 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Activity size={40} className="opacity-80" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">투자는 함께할 때 더 즐겁습니다</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                        동료들과 그룹을 맺고 수익률 챌린지에 도전해보세요. 서로의 포트폴리오를 공유하며 새로운 투자 아이디어를 얻을 수 있습니다.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            첫 그룹 생성하기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                    {/* Left Sidebar (Compact Group List) */}
                    <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 hide-scrollbar sticky top-24">
                        {activeGroups.map(group => {
                            const isSelected = selectedGroupForFeed?.id === group.id;
                            return (
                                <div 
                                    key={group.id} 
                                    onClick={() => setSelectedGroupForFeed(group)}
                                    className={clsx(
                                        "flex-shrink-0 lg:flex-shrink-auto flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-3 p-3 lg:p-4 rounded-2xl cursor-pointer transition-all border",
                                        isSelected 
                                            ? "bg-card shadow-sm border-primary/30 ring-1 ring-primary/10 lg:translate-x-1" 
                                            : "hover:bg-card/50 border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-sm lg:text-base shadow-sm transition-colors shrink-0",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {group.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-center lg:items-start max-w-[80px] lg:max-w-none">
                                        <div className={clsx(
                                            "text-xs lg:text-sm font-bold truncate w-full text-center lg:text-left transition-colors",
                                            isSelected ? "text-primary" : "text-foreground"
                                        )}>{group.name}</div>
                                        <div className="hidden lg:block text-[11px] text-muted-foreground">멤버 {group.members.length}명</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Main Feed (Shared Portfolios) */}
                    {selectedGroupForFeed && (
                        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
                            {/* Selected Group Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-card/40 backdrop-blur-xl border border-border/60 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] pb-5">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                        <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{selectedGroupForFeed.name}</span>
                                        <span className="text-muted-foreground/30">/</span>
                                        <span className="text-primary font-extrabold flex items-center gap-1.5">
                                            <Sparkles size={18} /> 포트폴리오 피드
                                        </span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleShareInviteCode(selectedGroupForFeed)}
                                        className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors border border-primary/20"
                                        title={`초대 코드: ${selectedGroupForFeed.inviteCode} 공유하기`}
                                    >
                                        <Send size={16} />
                                    </button>
                                    {selectedGroupForFeed.owner.email === user?.email && (
                                        <button 
                                            onClick={() => handleDeleteGroup(selectedGroupForFeed.id, selectedGroupForFeed.name)}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                                            title="그룹 삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedGroupDetails(selectedGroupForFeed)}
                                        className="px-3 py-2 bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground text-sm font-bold rounded-lg border border-border/50 text-center transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        정보
                                    </button>
                                    <button 
                                        onClick={() => handleOpenShareModal(selectedGroupForFeed.id)}
                                        className="px-4 py-2 bg-gradient-to-r from-primary to-primary text-primary-foreground text-sm font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap border border-primary/20"
                                    >
                                        공유하기
                                    </button>
                                </div>
                            </div>

                            {/* Portfolio Feed List */}
                            <div className="flex flex-col gap-5">
                                {(() => {
                                    const verifiedMembers = selectedGroupForFeed.members.filter(m => m.status === 'ACCEPTED');
                                    const feedItems = verifiedMembers.filter(m => m.sharedPortfolioId && m.sharedPortfolioItems && m.sharedPortfolioItems.length > 0);

                                    if (feedItems.length === 0) {
                                        return (
                                            <div className="py-20 flex flex-col items-center justify-center bg-card/30 border border-dashed border-border/80 rounded-3xl text-center">
                                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/50">
                                                    <Share2 size={32} />
                                                </div>
                                                <p className="text-lg font-bold text-foreground mb-2">공유된 포트폴리오가 없습니다</p>
                                                <p className="text-sm text-muted-foreground mb-6">내 포트폴리오를 가장 먼저 공유하여 그룹의 피드를 채워보세요!</p>
                                                <button 
                                                    onClick={() => handleOpenShareModal(selectedGroupForFeed.id)}
                                                    className="px-5 py-2.5 bg-card border border-border/80 shadow-sm text-foreground text-sm font-bold rounded-xl hover:bg-muted/80 transition-colors"
                                                >
                                                    포트폴리오 공유하기
                                                </button>
                                            </div>
                                        );
                                    }

                                    return feedItems.map((feedMember) => {
                                        const isPrivate = feedMember.sharedPortfolioIsPublic === false;
                                        return (
                                        <div key={feedMember.id} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:border-primary/30 hover:shadow-[0_6px_30px_rgba(0,0,0,0.08)] group">
                                            {/* Feed Card Header */}
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center text-secondary-foreground font-bold shadow-sm text-base shrink-0">
                                                        {feedMember.member.nickname.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-base">
                                                            <strong className="text-foreground tracking-tight text-lg">{feedMember.member.nickname}</strong>
                                                            <span className="text-muted-foreground mx-1.5">님의 포트폴리오</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="text-sm font-bold text-primary">
                                                                {feedMember.sharedPortfolioName}
                                                            </div>
                                                            {isPrivate && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                                                                    🔒 비공개
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stocks Masonry/Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                {feedMember.sharedPortfolioItems?.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="flex justify-between items-center p-4 bg-background/50 border border-border/50 rounded-2xl hover:bg-muted/30 hover:border-primary/30 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <StockIcon symbol={item.symbol} name={item.symbol} market={item.market as 'US'|'KR'} className="w-11 h-11 rounded-full shadow-sm bg-white shrink-0" />
                                                            <div>
                                                                <div className="font-extrabold text-base truncate max-w-[160px]">
                                                                    {(item.market === 'KOSPI' || item.market === 'KOSDAQ') ? (item.nameKr || item.symbol) : item.symbol}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground font-mono opacity-60">
                                                                    {(item.market === 'KOSPI' || item.market === 'KOSDAQ') ? item.symbol : (item.nameEn || '')}
                                                                </div>
                                                                {isPrivate ? (
                                                                    <div className="text-xs text-muted-foreground font-mono mt-1 tracking-wider">🔒 ••• 주 보유</div>
                                                                ) : (
                                                                    <div className="text-xs text-muted-foreground font-mono mt-1">{item.quantity}주 보유</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                            <div className="">
                                                                <PortfolioItemPrice symbol={item.symbol} market={item.market} />
                                                            </div>
                                                            <button
                                                                onClick={() => setQuickAddSymbol(item.symbol)}
                                                                className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <Plus size={12} strokeWidth={2.5} /> 담기
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Feed Card Footer */}
                                            <div className="border-t border-border/40 pt-4 mt-2">
                                                {isPrivate ? (
                                                    <div className="w-full py-2.5 text-muted-foreground/60 text-sm font-medium rounded-xl flex items-center justify-center gap-2">
                                                        🔒 비공개 포트폴리오 — 수량·평단가는 숨겨져 있습니다
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="w-full py-2.5 bg-muted/30 text-muted-foreground text-sm font-bold rounded-xl hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center gap-2 group-hover:border-primary/20 border border-transparent"
                                                        onClick={() => showToast(`해당 기능은 아직 준비 중입니다.`)}
                                                    >
                                                        <Share2 size={16} /> 이 포트폴리오 내용 관심종목에 복사
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals (Create, Share) - Keeping simplified versions for brevity in this initial implementation */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">새 그룹 만들기</h3>
                        <form onSubmit={handleCreateGroup}>
                            <input className="w-full bg-muted border-none p-3 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="그룹 이름" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} required autoFocus />
                            <textarea className="w-full bg-muted border-none p-3 rounded-lg mb-5 text-sm h-24 resize-none focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="모임에 대한 짧은 소개를 적어주세요." value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">취소</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-all">만들기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                        <h3 className="text-lg font-bold mb-4">공유할 포트폴리오 선택</h3>
                        <div className="overflow-y-auto flex-1 space-y-2 mb-6 hide-scrollbar max-h-60">
                            {portfolios.map(p => (
                                <div key={p.id} onClick={() => setSelectedPortfolioId(p.id)} className={clsx("p-4 rounded-xl cursor-pointer transition-all flex justify-between items-center border", selectedPortfolioId === p.id ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted border-transparent")}>
                                    <div className="font-bold text-sm">{p.name}</div>
                                    <div className="text-xs font-semibold px-2 py-1 bg-background rounded-full">{p.items.length}개 종목</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 shrink-0">
                            <button onClick={() => setIsShareModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">취소</button>
                            <button onClick={handleSharePortfolio} disabled={!selectedPortfolioId} className={clsx("px-4 py-2 font-bold rounded-lg transition-all", selectedPortfolioId ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed")}>공유하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Modal */}
            {quickAddSymbol && (
                <StockQuickAddModal
                    symbol={quickAddSymbol}
                    onClose={() => setQuickAddSymbol(null)}
                    onSuccess={() => {
                        showToast(`✅ ${quickAddSymbol} 종목이 내 포트폴리오에 성공적으로 담겼습니다!`);
                    }}
                />
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={clsx("text-white backdrop-blur-md px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 border", 
                        toastMessage.isError ? "bg-red-500/90 shadow-[0_8px_30px_rgba(239,68,68,0.3)] border-red-400/20" : "bg-green-500/90 shadow-[0_8px_30px_rgba(34,197,94,0.3)] border-green-400/20"
                    )}>
                        {toastMessage.text}
                    </div>
                </div>
            )}
            {/* Group Details / Member List Modal */}
            {selectedGroupDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border/50 relative">
                            <button 
                                onClick={() => setSelectedGroupDetails(null)} 
                                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="pr-8">
                                <h3 className="text-2xl font-extrabold mb-2 tracking-tight">{selectedGroupDetails.name}</h3>
                                {selectedGroupDetails.description ? (
                                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedGroupDetails.description}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">그룹 소개가 없습니다.</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-sm text-muted-foreground">멤버 목록 ({selectedGroupDetails.members.length})</h4>
                            </div>
                            
                            <div className="space-y-3">
                                {selectedGroupDetails.members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/60 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                                                {member.member.nickname.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-2">
                                                    {member.member.nickname}
                                                    {selectedGroupDetails.owner.email === member.member.email && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">방장</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {member.status === 'ACCEPTED' ? (
                                                        member.sharedPortfolioId ? '포트폴리오 공유 중' : '참여 중'
                                                    ) : '초대 대기 중'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end">
                            <button 
                                onClick={() => setSelectedGroupDetails(null)} 
                                className="px-5 py-2 bg-secondary text-secondary-foreground font-bold rounded-lg shadow-sm hover:bg-secondary/80 transition-all text-sm"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
