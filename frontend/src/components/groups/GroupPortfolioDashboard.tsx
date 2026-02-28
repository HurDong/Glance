import React, { useEffect, useState } from 'react';
import { Users, Plus, Share2, Send, Trash2, X } from 'lucide-react';
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
        }
    };

    const activeGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'ACCEPTED')
    );

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">데이터를 불러오는 중입니다...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="text-primary" />
                    <span>그룹 포트폴리오</span>
                </h2>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="그룹 ID 또는 초대 코드..." 
                        value={joinGroupId}
                        onChange={(e) => setJoinGroupId(e.target.value)}
                        className="bg-card border border-border px-3 py-1.5 rounded-lg text-sm w-48 focus:border-primary outline-none"
                    />
                    <button onClick={handleJoinGroup} className="px-4 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80">
                        참여하기
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus size={16} /> 새 그룹
                    </button>
                </div>
            </div>

            {activeGroups.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/50">
                    <p className="text-muted-foreground mb-4">아직 참여 중인 그룹이 없어요.</p>
                    <button onClick={() => setIsCreateModalOpen(true)} className="text-primary font-bold hover:underline">
                        첫 그룹을 만들어보세요!
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {activeGroups.map(group => (
                        <div key={group.id} className="space-y-6 bg-card/30 rounded-2xl p-6 border border-border/50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
                                <div className="space-y-2">
                                    <div className="flex items-center flex-wrap gap-2.5">
                                        <h3 
                                            className="text-2xl font-extrabold tracking-tight cursor-pointer hover:text-primary transition-colors duration-200" 
                                            onClick={() => setSelectedGroupDetails(group)}
                                            title="그룹 정보 및 멤버 보기"
                                        >
                                            {group.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                                            <button 
                                                onClick={() => handleShareInviteCode(group)}
                                                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                                                title="초대 코드 공유하기"
                                            >
                                                <Send size={14} className="relative top-[0.5px] -ml-[1px]" />
                                                <span>초대 코드: {group.inviteCode}</span>
                                            </button>
                                            {group.owner.email === user?.email && (
                                                <button 
                                                    onClick={() => handleDeleteGroup(group.id, group.name)}
                                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                                                    title="그룹 삭제 (방장 전용)"
                                                >
                                                    <Trash2 size={14} className="relative top-[0.5px] -ml-[1px]" />
                                                    <span>삭제</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {group.description && (
                                        <p className="text-sm text-muted-foreground/90 leading-relaxed max-w-2xl">{group.description}</p>
                                    )}
                                </div>
                                <div 
                                    className="text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg shrink-0 self-start md:self-center border border-border/50 cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => setSelectedGroupDetails(group)}
                                    title="전체 멤버 보기"
                                >
                                    멤버 {group.members.length}명
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.members
                                    .filter(m => m.status === 'ACCEPTED' && m.sharedPortfolioId)
                                    .map(member => (
                                    <div key={member.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-5 px-1 py-2">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
                                                {member.member.nickname.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="font-extrabold text-base">{member.member.nickname}</div>
                                                <div className="text-xs font-medium text-muted-foreground mt-0.5">{member.sharedPortfolioName}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {member.sharedPortfolioItems?.slice(0, 5).map(item => (
                                                <div 
                                                    key={item.id} 
                                                    onClick={() => setQuickAddSymbol(item.symbol)}
                                                    className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-xl hover:border-primary/40 hover:bg-muted/30 hover:shadow-md transition-all cursor-pointer group/item relative overflow-hidden"
                                                    title="클릭하여 내 포트폴리오에 담기"
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <StockIcon symbol={item.symbol} name={item.symbol} market={item.market as 'US'|'KR'} className="w-8 h-8 shadow-sm group-hover/item:scale-105 transition-transform" />
                                                        <div>
                                                            <div className="text-sm font-bold group-hover/item:text-primary transition-colors">{item.symbol}</div>
                                                            <div className="text-xs text-muted-foreground font-medium mt-0.5">{item.quantity}주 보유</div>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 flex flex-col items-end">
                                                        <PortfolioItemPrice symbol={item.symbol} market={item.market} />
                                                        <span className="text-xs text-primary/0 group-hover/item:text-primary/90 transition-colors font-bold mt-1">
                                                            + 내 포트폴리오에 담기
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {member.sharedPortfolioItems && member.sharedPortfolioItems.length > 5 && (
                                                <div className="text-center text-xs text-muted-foreground pt-1">
                                                    <span className="bg-muted px-2 py-1 rounded-full">+ {member.sharedPortfolioItems.length - 5}개 더보기</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer min-h-[200px]"
                                     onClick={() => handleOpenShareModal(group.id)}>
                                    <Share2 className="mb-2" />
                                    <span className="text-sm font-bold mt-1">
                                        {group.members.some(m => m.member.email === user?.email && m.sharedPortfolioId) ? '공유 중인 포트폴리오 변경' : '내 포트폴리오 공유하기'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
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
