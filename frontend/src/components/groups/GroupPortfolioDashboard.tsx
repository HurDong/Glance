import React, { useEffect, useState } from 'react';
import { Users, Plus, Share2, Send, Trash2, X, LogOut, Lock, Rocket, ChevronLeft, ChevronRight } from 'lucide-react';
import { groupApi } from '../../api/group';
import type { Group } from '../../api/group';
import { portfolioApi } from '../../api/portfolio';
import type { Portfolio } from '../../api/portfolio';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { StockIcon } from '../stocks/StockIcon';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';
import { useAlertStore } from '../../stores/useAlertStore';
import { StockQuickAddModal } from '../portfolio/StockQuickAddModal';

const PortfolioItemPrice = ({ symbol, market: _market }: { symbol: string, market: string }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();

    useEffect(() => {
        subscribe(symbol);
    }, [symbol, subscribe]);

    const data = getPrice(symbol);

    if (!data) return (
        <div className="flex flex-col items-end gap-1">
            <div className="h-3 w-10 bg-muted/60 rounded animate-pulse"></div>
            <div className="h-2.5 w-8 bg-muted/40 rounded animate-pulse"></div>
        </div>
    );

    // Use changeRate string to deterministically check negative values (handles both numbers and string formats like "-1.49")
    const changeRateStr = String(data.changeRate);
    const isDown = changeRateStr.startsWith('-');
    const isUp = !isDown && parseFloat(changeRateStr) > 0;

    return (
        <div className={clsx("flex flex-col items-end leading-tight", isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-foreground")}>
            <span className="text-xs font-bold tracking-tight">{data.price}</span>
            <span className="text-[10px] font-medium opacity-90">{isUp ? '+' : ''}{data.changeRate}%</span>
        </div>
    );
};

const isCashAsset = (symbol: string) => symbol === 'KRW' || symbol === 'USD' || symbol === 'CASH';

const isKoreanMarket = (market: string) => market === 'KOSPI' || market === 'KOSDAQ';

const getPortfolioItemDisplayName = (item: { symbol: string; market: string; nameKr?: string; nameEn?: string }) => {
    if (isCashAsset(item.symbol)) return `보유 현금 (${item.symbol})`;
    if (isKoreanMarket(item.market)) return item.nameKr || item.symbol;
    return item.nameKr || item.nameEn || item.symbol;
};

const getPortfolioItemTooltipName = (item: { symbol: string; market: string; nameKr?: string; nameEn?: string }) => {
    if (isCashAsset(item.symbol)) return `보유 현금 (${item.symbol})`;
    if (isKoreanMarket(item.market)) return item.nameKr || item.symbol;
    return item.nameKr || item.nameEn || item.symbol;
};

const getPortfolioItemMeta = (item: { symbol: string; market: string }) => {
    if (isCashAsset(item.symbol)) return '현금 자산';
    return `${item.market} · ${item.symbol}`;
};

const PortfolioStockList = ({ stocks, isPrivate }: { stocks: any[], isPrivate: boolean }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [quickAddSymbol, setQuickAddSymbol] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 4;
    const totalPages = Math.ceil(stocks.length / ITEMS_PER_PAGE);
    
    // Ensure we don't end up on an empty page if data changes
    useEffect(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            setCurrentPage(totalPages - 1);
        }
    }, [stocks.length, currentPage, totalPages]);

    if (stocks.length === 0) return null;

    const currentStocks = stocks.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    return (
        <div className="flex flex-col gap-2 relative z-10 w-full mb-4 shrink-0 h-[120px]">
            <div className={clsx(
                "grid grid-cols-2 gap-2 content-start",
                totalPages > 1 ? "min-h-[106px]" : "flex-1"
            )}>
                {currentStocks.map(item => {
                    const itemIsCash = isCashAsset(item.symbol);
                    return (
                        <div
                            key={item.id}
                            className="flex items-center p-2.5 bg-muted/30 border border-border/40 rounded-[16px] hover:bg-muted/60 transition-colors gap-3 group/item cursor-pointer shadow-sm relative h-[52px]"
                        >
                            {itemIsCash ? (
                                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-background">💵</div>
                            ) : (
                                <StockIcon symbol={item.symbol} name={getPortfolioItemDisplayName(item)} market={item.market as 'US'|'KR'} className="w-9 h-9 rounded-full shadow-md shrink-0 ring-2 ring-background" />
                            )}
                            <div className="flex flex-col min-w-0 flex-1 group/tooltip relative justify-center">
                                <div className="font-extrabold text-[12px] sm:text-[13px] text-foreground truncate leading-tight">
                                    {itemIsCash ? `현금 (${item.symbol})` : getPortfolioItemDisplayName(item)}
                                </div>
                                {isPrivate ? (
                                    <div className="text-[10px] text-muted-foreground/80 font-bold mt-0.5 flex items-center gap-1 truncate">
                                        <Lock size={9} /> 비공개 종목
                                    </div>
                                ) : (
                                    <div className="text-[11px] font-bold text-muted-foreground mt-0.5">
                                        {itemIsCash
                                            ? `${item.currency === 'USD' ? '$' : '₩'}${item.averagePrice.toLocaleString()}`
                                            : `${item.quantity}주`}
                                    </div>
                                )}
                                {/* Custom Tooltip */}
                                <div className="absolute left-0 bottom-[110%] bg-popover/95 backdrop-blur-sm text-popover-foreground text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.1)] opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] transform translate-y-1 group-hover/tooltip:translate-y-0">
                                    {itemIsCash ? `현금 자산 (${item.symbol})` : getPortfolioItemTooltipName(item)}
                                </div>
                            </div>
                            {!itemIsCash && (
                                <div className="pl-1.5 border-l border-border/40 flex items-center justify-end shrink-0 min-w-[50px]">
                                    <PortfolioItemPrice symbol={item.symbol} market={item.market} />
                                </div>
                            )}
                            {/* Hover Context Actions */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setQuickAddSymbol(item.symbol); }}
                                className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-95 z-10"
                                title="관심 종목 담기"
                            >
                                <Plus size={10} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-auto pt-1 h-[24px]">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    
                    <div className="flex gap-1.5">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <div 
                                key={idx}
                                className={clsx(
                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                    currentPage === idx ? "bg-primary w-3" : "bg-border"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="p-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
            
            {/* Quick Add Modal */}
            {quickAddSymbol && (
                <StockQuickAddModal
                    symbol={quickAddSymbol}
                    onClose={() => setQuickAddSymbol(null)}
                    onSuccess={() => {}}
                />
            )}
        </div>
    );
};

const ReactionButtons = ({ membershipId, initialReactions, onRefresh }: { 
    membershipId: number, 
    initialReactions?: any[],
    onRefresh: (silent?: boolean) => void 
}) => {
    const [localReactions, setLocalReactions] = useState(initialReactions || []);
    const [animatingId, setAnimatingId] = useState<string | null>(null);
    const { token } = useAuthStore();
    const { showAlert } = useAlertStore();

    useEffect(() => {
        if (initialReactions) {
            setLocalReactions(initialReactions);
        }
    }, [initialReactions]);

    const handleToggleReaction = async (type: string) => {
        if (!token) {
            showAlert('로그인이 필요한 서비스입니다.', { type: 'warning' });
            return;
        }

        setAnimatingId(type);
        setTimeout(() => setAnimatingId(null), 400);

        const updated = localReactions.map(r => {
            if (r.type === type) {
                const newReactedByMe = !r.reactedByMe;
                return {
                    ...r,
                    count: newReactedByMe ? r.count + 1 : Math.max(0, r.count - 1),
                    reactedByMe: newReactedByMe
                };
            }
            return r;
        });
        setLocalReactions(updated);

        try {
            await groupApi.toggleReaction(membershipId, type);
            onRefresh(true);
        } catch (error) {
            console.error('Reaction toggle failed:', error);
            setLocalReactions(initialReactions || []);
        }
    };

    const reactionTypes = [
        { id: 'GOOD', emoji: '👍', label: '잘 샀다', activeColor: 'bg-amber-500 text-white' },
        { id: 'METOO', emoji: '🙋', label: '나도 관심', activeColor: 'bg-rose-500 text-white' },
        { id: 'WATCH', emoji: '👀', label: '관망중', activeColor: 'bg-blue-500 text-white' },
        { id: 'PASS', emoji: '😅', label: '패스', activeColor: 'bg-slate-500 text-white' }
    ];

    return (
        <div className="grid grid-cols-4 gap-1.5 mt-3 mb-1 w-full px-0.5">
            {reactionTypes.map(r => {
                const data = localReactions.find(lr => lr.type === r.id) || { count: 0, reactedByMe: false };
                const isAnimating = animatingId === r.id;
                
                return (
                    <button
                        key={r.id}
                        onClick={() => handleToggleReaction(r.id)}
                        className={clsx(
                            "group relative py-2 px-1 rounded-xl transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 border-[1.5px] active:scale-95 appearance-none shadow-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                            data.reactedByMe
                                ? `${r.activeColor} border-transparent z-10 shadow-none`
                                : `bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground`,
                            isAnimating && "animate-bounce"
                        )}
                    >
                        <span className={clsx(
                            "text-sm transition-transform duration-300 shrink-0",
                            data.reactedByMe ? "scale-110" : "group-hover:scale-110"
                        )}>
                            {r.emoji}
                        </span>
                        
                        <span className="text-[10px] sm:text-[11px] font-black whitespace-nowrap tracking-tighter leading-none">
                            {r.label}
                        </span>

                        {data.count > 0 && (
                            <span className={clsx(
                                "min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[9px] font-black shrink-0",
                                data.reactedByMe 
                                    ? "bg-white/30 text-white" 
                                    : "bg-primary/10 text-primary border border-primary/20"
                            )}>
                                {data.count}
                            </span>
                        )}
                    </button>
                );
            })}
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
    const { showAlert, showConfirm } = useAlertStore();

    const showToast = (text: string, isError = false) => {
        setToastMessage({ text, isError });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleAction = async (action: () => Promise<void>, successMsg: string, errorMsg: string = '작업에 실패했습니다.') => {
        if (!token) {
            showAlert('로그인이 필요한 서비스입니다.', { type: 'warning' });
            return false;
        }
        try {
            await action();
            if (successMsg) showToast(successMsg);
            fetchGroups();
            return true;
        } catch (error: any) {
            console.error('Action failed:', error);
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                showAlert('로그인이 필요한 서비스입니다.', { type: 'error' });
            } else {
                showAlert(errorMsg, { type: 'error' });
            }
            return false;
        }
    };

    const fetchGroups = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const data = await groupApi.getMyGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            if (!silent) setIsLoading(false);
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
        if (!token) {
            showAlert('로그인이 필요한 서비스입니다.', { type: 'warning' });
            return;
        }
        try {
            await groupApi.createGroup(newGroup);
            setIsCreateModalOpen(false);
            setNewGroup({ name: '', description: '' });
            fetchGroups();
            showToast('새 그룹을 만들었습니다.');
        } catch (error: any) {
            console.error('Failed to create group:', error);
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                showAlert('로그인이 필요한 서비스입니다.', { type: 'error' });
            } else {
                showToast('그룹 생성에 실패했습니다. 이름이 중복되었는지 확인해 주세요.', true);
            }
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinGroupId) return;

        try {
            await groupApi.joinGroupByCode(joinGroupId);
            showToast('그룹에 성공적으로 참여했습니다.');
            setJoinGroupId('');
            fetchGroups();
        } catch (error: any) {
            console.error('Join failed:', error);
            const message = error.response?.data?.message || '유효하지 않은 초대 코드이거나 참여에 실패했습니다.';
            showAlert(message, { type: 'error' });
        }
    };

    const handleShareInviteCode = async (group: Group) => {
        const joinUrl = `${window.location.origin}/groups?code=${group.inviteCode}`;
        const textToShare = `[Glance] '${group.name}' 그룹에 초대합니다.\n초대 코드: ${group.inviteCode}\n\nGlance에서 이 코드를 입력하고 바로 참여해 보세요.`;
        
        // PC 移댁뭅?ㅽ넚 ?덈뱶濡쒖씠???덈룄???댁뒋 ?고쉶: 臾댁“嫄??대┰蹂대뱶??癒쇱? 蹂듭궗
        try {
            await navigator.clipboard.writeText(`${textToShare}\n링크: ${joinUrl}`);
            showToast('클립보드에 초대 코드와 링크를 복사했습니다. 원하는 곳에 바로 붙여넣기 하세요.');
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
        }

        if (navigator.share) {
            try {
                // ?쎄컙???쒕젅?????ㅼ씠?곕툕 怨듭쑀李??꾩슦湲?(?좎뒪??硫붿떆吏媛 蹂댁씪 ?쒓컙 ?뺣낫)
                setTimeout(async () => {
                    await navigator.share({
                        title: `${group.name} 그룹 공유`,
                        text: textToShare,
                        url: joinUrl
                    });
                }, 500);
            } catch (error) {
                console.log('공유 취소 또는 실패', error);
            }
        }
    };

    const handleDeleteGroup = async (groupId: number, groupName: string) => {
        const isConfirmed = await showConfirm(`'${groupName}' 그룹을 정말 삭제하시겠습니까?\n\n삭제하면 그룹 자체가 사라지고, 모든 멤버와 공유 데이터가 즉시 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`);
        if (isConfirmed) {
            await handleAction(() => groupApi.deleteGroup(groupId), '그룹을 삭제했습니다.', '방장만 그룹을 삭제할 수 있습니다.');
        }
    };

    const handleLeaveGroup = async (groupId: number, groupName: string) => {
        const isConfirmed = await showConfirm(`'${groupName}' 그룹에서 정말 나가시겠습니까?\n\n내가 공유한 데이터만 제거되며 그룹은 계속 유지됩니다.`);
        if (isConfirmed) {
            await handleAction(() => groupApi.leaveGroup(groupId), '그룹에서 나갔습니다.', '그룹 나가기 중 오류가 발생했습니다.');
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
            '포트폴리오를 그룹에 공유했습니다.',
            '포트폴리오 공유에 실패했습니다.'
        );
        if (success) {
            setIsShareModalOpen(false);
            setSelectedPortfolioId(null);
            // 怨듭쑀 ???꾩옱 蹂닿퀬 ?덈뒗 洹몃９ ?쇰뱶瑜?利됱떆 媛깆떊
            try {
                const updatedGroups = await groupApi.getMyGroups();
                setGroups(updatedGroups);
                // ?꾩옱 ?쇰뱶???쒖떆 以묒씤 洹몃９??理쒖떊 ?곗씠?곕줈 援먯껜
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

    if (activeGroups.length === 0) {
        return (
            <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8 w-full">
                {/* Header Area aligned with MyPortfolioDashboard */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">그룹 피드</h1>
                            <p className="text-muted-foreground mt-1">포트폴리오 공유와 인사이트를 한곳에서</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Compact Join Code Group for Header */}
                        <div className="relative group bg-card border border-border/50 rounded-xl p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm flex items-center min-w-[240px]">
                            <input 
                                type="text" 
                                placeholder="초대 코드 입력..." 
                                value={joinGroupId}
                                onChange={(e) => setJoinGroupId(e.target.value)}
                                className="bg-transparent px-3 py-1.5 text-sm font-medium w-full min-w-0 outline-none text-foreground placeholder:text-muted-foreground/60"
                            />
                            <button 
                                onClick={handleJoinGroup} 
                                className="px-4 py-1.5 bg-muted hover:bg-primary hover:text-white text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap active:scale-95"
                            >
                                참여
                            </button>
                        </div>

                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-md"
                        >
                            <Plus size={18} />
                            새 그룹 만들기
                        </button>
                    </div>
                </div>

                {/* Empty State Illustration Center */}
                <div className="flex flex-col items-center justify-center min-h-[50vh] bg-card/30 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                    <div className="w-48 h-48 mb-8 opacity-80">
                        <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-500/20 fill-current">
                            <path d="M166.7 58.3v100c0 4.6-3.7 8.3-8.3 8.3H41.7c-4.6 0-8.3-3.7-8.3-8.3v-100c0-4.6 3.7-8.3 8.3-8.3h116.7c4.5 0 8.3 3.8 8.3 8.3z" fill="currentColor"/>
                            <path d="M150 41.7H50c-4.6 0-8.3-3.7-8.3-8.3s3.7-8.3 8.3-8.3h100c4.6 0 8.3 3.7 8.3 8.3s-3.7 8.3-8.3 8.3z" className="text-primary/40"/>
                            <circle cx="100" cy="110" r="30" className="text-primary/60"/>
                            <path d="M100 80L85 110h30l-15-30z" className="text-blue-400" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3">아직 참여 중인 그룹이 없습니다</h2>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        동료와 그룹을 만들고 포트폴리오를 함께 살펴보세요. 서로의 포트폴리오를 공유하고 새로운 투자 아이디어를 얻을 수 있습니다.
                    </p>
                    <div className="pt-6">
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-10 py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center gap-3 hover:shadow-[0_8px_30px_rgba(36,99,235,0.4)] transition-all hover:-translate-y-1 text-lg"
                        >
                            <Plus size={24} />
                            지금 바로 시작하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-5 w-full mx-auto px-2 sm:px-6 lg:px-10 xl:px-12 pt-2 md:pt-4 pb-6">
                    <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-start w-full">
                        {/* Left Sidebar */}
                        <div className="w-full lg:min-w-[320px] lg:w-[320px] xl:w-[380px] shrink-0 flex flex-col gap-4 lg:gap-6 sticky top-4 z-20">
                            {/* Sidebar Header */}
                            <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-start gap-4 pr-1 lg:pr-0">
                                <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                                        <Users size={20} className="lg:w-6 lg:h-6" />
                                    </div>
                                    <div className="shrink-0">
                                        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-foreground">그룹 피드</h1>
                                        <p className="hidden lg:block text-muted-foreground mt-1 text-sm sm:text-base">
                                            포트폴리오 공유 및 인사이트
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-row lg:flex-col items-center lg:items-stretch gap-3 w-full overflow-x-auto hide-scrollbar shrink-[2] lg:shrink-0 justify-end lg:justify-start pt-2">
                                    <div className="relative group bg-muted/80 hover:bg-muted border border-border/80 rounded-full lg:rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all shadow-sm flex items-center min-w-[150px] max-w-[200px] lg:w-full lg:max-w-none shrink-0">
                                        <input 
                                            type="text" 
                                            placeholder="초대 코드 입력..." 
                                            value={joinGroupId}
                                            onChange={(e) => setJoinGroupId(e.target.value)}
                                            className="bg-transparent px-3 py-1.5 text-sm font-medium w-full min-w-0 outline-none text-foreground placeholder:text-muted-foreground/70"
                                        />
                                        <button 
                                            onClick={handleJoinGroup} 
                                            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full lg:rounded-lg hover:bg-primary/90 hover:shadow-md transition-all shrink-0 whitespace-nowrap active:scale-95"
                                        >
                                            참여
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (!token) {
                                                showAlert('로그인이 필요한 서비스입니다.', { type: 'warning' });
                                                return;
                                            }
                                            setIsCreateModalOpen(true);
                                        }}
                                        className="px-4 py-2 lg:w-full lg:py-3 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs lg:text-sm font-bold rounded-full lg:rounded-xl hover:shadow-[0_8px_20px_rgba(36,99,235,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md min-w-max shrink-0"
                                    >
                                        <Plus size={16} className="lg:w-5 lg:h-5" /> <span className="hidden sm:inline">새 그룹 만들기</span>
                                    </button>
                                </div>
                            </div>
    
                            {/* Group List */}
                            <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 hide-scrollbar w-full">
                            {activeGroups.map(group => {
                                const isSelected = selectedGroupForFeed?.id === group.id;
                                return (
                                    <div 
                                        key={group.id} 
                                        onClick={() => setSelectedGroupForFeed(group)}
                                        className={clsx(
                                            "flex-shrink-0 lg:flex-shrink-auto flex flex-col lg:flex-row items-center lg:items-center gap-3 p-3 lg:p-4 rounded-2xl cursor-pointer transition-all border duration-300",
                                            isSelected 
                                                ? "bg-primary/10 border-primary shadow-sm" 
                                                : "bg-card border-border/60 hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:shadow-sm"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center font-black text-lg lg:text-xl shadow-inner transition-colors shrink-0 outline outline-2 outline-offset-2",
                                            isSelected ? "bg-gradient-to-br from-primary to-indigo-600 text-white outline-primary/30" : "bg-muted text-muted-foreground outline-transparent"
                                        )}>
                                            {group.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col items-center lg:items-start min-w-0 flex-1 w-full pr-1">
                                            <div className={clsx(
                                                "text-sm lg:text-base font-bold truncate w-full text-center lg:text-left transition-colors",
                                                isSelected ? "text-primary" : "text-foreground"
                                            )}>{group.name}</div>
                                            <div className="hidden lg:block text-xs font-medium text-muted-foreground mt-1 bg-background/50 px-2 py-0.5 rounded-full inline-flex border border-border/50">
                                                <Users size={10} className="mr-1 inline align-baseline" />
                                                멤버 {group.members.length}명
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>

                    {/* Main Feed (Shared Portfolios) */}
                    {selectedGroupForFeed && (
                        <div className="flex-1 w-full min-w-0 flex flex-col gap-4">
                            {/* Selected Group Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 bg-card/40 backdrop-blur-xl border border-border/60 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] pb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h2 className="text-xl md:text-2xl font-bold text-foreground truncate w-full">
                                        {selectedGroupForFeed.name}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        onClick={() => handleShareInviteCode(selectedGroupForFeed)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/80 hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground text-xs font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
                                        title={`초대 코드: ${selectedGroupForFeed.inviteCode} 공유하기`}
                                    >
                                        <Send size={14} />
                                        <span>초대</span>
                                    </button>
                                    {selectedGroupForFeed.owner.email === user?.email ? (
                                        <button 
                                            onClick={() => handleDeleteGroup(selectedGroupForFeed.id, selectedGroupForFeed.name)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/80 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-500 text-muted-foreground text-xs font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
                                            title="그룹 삭제 (방장)"
                                        >
                                            <Trash2 size={14} />
                                            <span>삭제</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleLeaveGroup(selectedGroupForFeed.id, selectedGroupForFeed.name)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/80 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive text-muted-foreground text-xs font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
                                            title="그룹 나가기"
                                        >
                                            <LogOut size={14} />
                                            <span>나가기</span>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedGroupDetails(selectedGroupForFeed)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border/80 hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground text-xs font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
                                    >
                                        <Users size={14} />
                                        <span>정보</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="w-px h-6 bg-border/60 mx-1" />

                                    <button 
                                        onClick={() => handleOpenShareModal(selectedGroupForFeed.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-[0_8px_20px_rgba(36,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all shadow-md whitespace-nowrap"
                                    >
                                        <Share2 size={15} />
                                        <span>공유하기</span>
                                    </button>
                                </div>
                            </div>

                            {/* Portfolio Feed List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
                                {(() => {
                                    const verifiedMembers = selectedGroupForFeed.members.filter(m => m.status === 'ACCEPTED');
                                    const feedItems = verifiedMembers.filter(m => m.sharedPortfolioId && m.sharedPortfolioItems && m.sharedPortfolioItems.length > 0);

                                    if (feedItems.length === 0) {
                                        return (
                                            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-card/30 border border-dashed border-border/80 rounded-3xl text-center w-full">
                                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/50">
                                                    <Share2 size={32} />
                                                </div>
                                                <p className="text-lg font-bold text-foreground mb-2">공유된 포트폴리오가 없습니다</p>
                                                <p className="text-sm text-muted-foreground mb-6">내 포트폴리오를 먼저 공유해서 그룹 피드를 채워보세요.</p>
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
                                            
                                            // Sort items by total value (quantity * price) descending to pick the best Hero Stock
                                            const sortedItems = [...(feedMember.sharedPortfolioItems || [])].sort((a, b) => {
                                                const valA = a.currency === 'USD' ? (a.quantity * a.averagePrice * 1350) : (a.quantity * a.averagePrice);
                                                const valB = b.currency === 'USD' ? (b.quantity * b.averagePrice * 1350) : (b.quantity * b.averagePrice);
                                                return valB - valA;
                                            });

                                            const heroStock = sortedItems[0];
                                            const remainingStocks = sortedItems.slice(1);

                                            return (
                                            <div key={feedMember.id} className="bg-card/90 backdrop-blur-md border border-border/60 rounded-[20px] p-4 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all group relative flex flex-col h-full">
                                                {/* Ambient Background Glow */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none -z-10 group-hover:bg-primary/10 transition-colors overflow-hidden rounded-tr-[20px]"></div>
                                                
                                                {/* Social Header (Compact) */}
                                                <div className="flex items-center gap-2.5 mb-3 relative z-10">
                                                    <div className="relative shrink-0">
                                                        <div className="absolute inset-0 bg-primary/40 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity"></div>
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-primary border-2 border-background flex items-center justify-center font-black text-xl text-white shadow-xl relative z-10 ring-2 ring-primary/10">
                                                            {feedMember.member.nickname.charAt(0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                            {isPrivate && (
                                                                <span className="px-1.5 py-0.5 bg-muted/80 text-muted-foreground font-bold text-[8px] rounded-full flex items-center gap-1 border border-border/50">
                                                                    <Lock size={8} /> SECRET
                                                                </span>
                                                            )}
                                                        </div>
                                                        <strong className="text-foreground tracking-tight text-base sm:text-lg truncate">{feedMember.member.nickname}</strong>
                                                        <div className="text-[11px] font-bold text-primary truncate mt-0.5 max-w-[140px] sm:max-w-[180px]">
                                                            {feedMember.sharedPortfolioName}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* The Hook (Hero Stock) */}
                                                {heroStock && (
                                                    <div className="mb-4 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden z-10 shadow-inner group/hero shrink-0">
                                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                                            <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 font-extrabold text-[10px] tracking-widest uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 shadow-sm">
                                                                <Rocket size={14} className="text-indigo-500 dark:text-indigo-400" /> TOP PICK
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end justify-between relative z-10 w-full">
                                                            <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                                                                {heroStock.symbol === 'KRW' || heroStock.symbol === 'USD' ? (
                                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-3xl sm:text-4xl shadow-xl ring-4 ring-background shrink-0 transition-transform group-hover/hero:scale-110">💵</div>
                                                                ) : (
                                                                    <StockIcon symbol={heroStock.symbol} name={getPortfolioItemDisplayName(heroStock)} market={heroStock.market as 'US'|'KR'} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl ring-4 ring-background shrink-0 transition-transform group-hover/hero:scale-110" />
                                                                )}
                                                                <div className="flex flex-col min-w-0 group/tooltip relative">
                                                                    <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter drop-shadow-md truncate">
                                                                        {getPortfolioItemDisplayName(heroStock)}
                                                                    </div>
                                                                    <div className="text-sm sm:text-base font-bold text-muted-foreground mt-1 truncate">
                                                                        {getPortfolioItemMeta(heroStock)}
                                                                    </div>
                                                                    {/* Custom Tooltip */}
                                                                    <div className="absolute left-0 bottom-[110%] mb-1 bg-popover/95 backdrop-blur-sm text-popover-foreground text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.1)] opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] transform translate-y-1 group-hover/tooltip:translate-y-0">
                                                                        {getPortfolioItemTooltipName(heroStock)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end shrink-0">
                                                                {isPrivate ? (
                                                                    <div className="mb-2 text-[10px] font-bold text-muted-foreground bg-card/80 border border-border/60 px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                                                        <Lock size={10} /> 비공개 종목
                                                                    </div>
                                                                ) : (
                                                                    <div className="mb-2 text-[12px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-sm">
                                                                        {heroStock.symbol === 'KRW' || heroStock.symbol === 'USD'
                                                                            ? `${heroStock.currency === 'USD' ? '$' : '₩'}${heroStock.averagePrice.toLocaleString()}`
                                                                            : `${heroStock.quantity}주 보유`}
                                                                    </div>
                                                                )}
                                                                <div className="transform scale-125 origin-bottom-right mt-1">
                                                                    {heroStock.symbol !== 'KRW' && heroStock.symbol !== 'USD' && <PortfolioItemPrice symbol={heroStock.symbol} market={heroStock.market} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stocks Grid (Chunky Pills) with Pagination */}
                                                <PortfolioStockList stocks={remainingStocks} isPrivate={isPrivate} />

                                                {/* Interactions & Clone Button */}
                                                <div className="mt-auto pt-3 flex flex-col gap-2.5 relative z-10 shrink-0">
                                                    <div className="flex justify-center scale-95 sm:scale-100 origin-center mb-0.5">
                                                        <ReactionButtons 
                                                            membershipId={feedMember.id} 
                                                            initialReactions={feedMember.reactions}
                                                            onRefresh={fetchGroups}
                                                        />
                                                    </div>
                                                    
                                                    <button
                                                        className="w-full py-2.5 rounded-[12px] font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm border border-transparent
                                                        bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/25 active:scale-[0.98]"
                                                        onClick={(_e) => showToast('해당 포트폴리오 복제 기능은 준비 중입니다.')}
                                                    >
                                                        <Plus size={18} strokeWidth={3} /> 포트폴리오 복제하기
                                                    </button>
                                                </div>
                                            </div>
                                            );
                                        });
                                    })()}
                            </div>
                        </div>
                    )}
                </div>

            {/* Modals (Create, Share) - Keeping simplified versions for brevity in this initial implementation */}
            {isCreateModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setIsCreateModalOpen(false)}
                >
                    <div 
                        className="bg-card p-6 rounded-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-4">새 그룹 만들기</h3>
                        <form onSubmit={handleCreateGroup}>
                            <input className="w-full bg-muted border-none p-3 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="그룹 이름" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} required autoFocus />
                            <textarea className="w-full bg-muted border-none p-3 rounded-lg mb-5 text-sm h-24 resize-none focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="모임 소개나 투자 방향을 적어보세요" value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">취소</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-all">만들기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isShareModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setIsShareModalOpen(false)}
                >
                    <div 
                        className="bg-card p-6 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
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
                        showToast(`${quickAddSymbol} 종목을 내 포트폴리오에 담았습니다.`);
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
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedGroupDetails(null)}
                >
                    <div 
                        className="bg-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
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
                                                    {member.status === 'ACCEPTED'
                                                        ? (member.sharedPortfolioId ? '포트폴리오 공유 중' : '참여 중')
                                                        : '초대 대기 중'}
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
