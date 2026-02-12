import React, { useEffect, useState } from 'react';
import { Users, Plus, Share2 } from 'lucide-react';
import { groupApi } from '../../api/group';
import type { Group } from '../../api/group';
import { portfolioApi } from '../../api/portfolio';
import type { Portfolio } from '../../api/portfolio';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';
import { StockIcon } from '../stocks/StockIcon';
import { useStockStore } from '../../stores/useStockStore';
import { useStockWebSocket } from '../../hooks/useStockWebSocket';

const PortfolioItemPrice = ({ symbol, market: _market }: { symbol: string, market: string }) => {
    const { getPrice } = useStockStore();
    const { subscribe } = useStockWebSocket();

    useEffect(() => {
        subscribe(symbol);
    }, [symbol, subscribe]);

    const data = getPrice(symbol);

    if (!data) return <span className="text-[10px] text-muted-foreground">Waiting...</span>;

    const isUp = parseFloat(data.change) > 0;
    const isDown = parseFloat(data.change) < 0;

    return (
        <div className={clsx("flex items-center text-xs font-mono", isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-foreground")}>
            {data.price}
            <span className="ml-1 text-[10px] opacity-80">({data.changeRate}%)</span>
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
    const { token, user } = useAuthStore();

    const handleAction = async (action: () => Promise<void>, _successMsg: string) => {
        try {
            await action();
            // alert(successMsg); // Removed alert for smoother UX
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
        } catch (error) {
            console.error('Failed to create group:', error);
            alert('그룹 생성에 실패했습니다.');
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinGroupId) return;
        await handleAction(() => groupApi.joinGroup(parseInt(joinGroupId)), '그룹 가입을 신청했습니다.');
        setJoinGroupId('');
    };

    const handleOpenShareModal = (groupId: number) => {
        setSelectedGroupId(groupId);
        setIsShareModalOpen(true);
        fetchPortfolios();
    };

    const handleSharePortfolio = async () => {
        if (!selectedGroupId || !selectedPortfolioId) return;
        await handleAction(
            () => groupApi.sharePortfolio(selectedGroupId, selectedPortfolioId),
            '포트폴리오가 공유되었습니다.'
        );
        setIsShareModalOpen(false);
        setSelectedPortfolioId(null);
    };

    const activeGroups = groups.filter(g => 
        g.members.some(m => m.member.email === user?.email && m.status === 'ACCEPTED')
    );

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="text-primary" />
                    <span>Group Portfolios</span>
                </h2>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        placeholder="Group ID..." 
                        value={joinGroupId}
                        onChange={(e) => setJoinGroupId(e.target.value)}
                        className="bg-card border border-border px-3 py-1.5 rounded-lg text-sm w-32 focus:border-primary outline-none"
                    />
                    <button onClick={handleJoinGroup} className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-lg hover:bg-secondary/80">
                        Join
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 flex items-center gap-1"
                    >
                        <Plus size={16} /> New
                    </button>
                </div>
            </div>

            {activeGroups.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-xl bg-card/50">
                    <p className="text-muted-foreground mb-4">No active groups found.</p>
                    <button onClick={() => setIsCreateModalOpen(true)} className="text-primary font-bold hover:underline">
                        Create your first group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {activeGroups.map(group => (
                        <div key={group.id} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <div>
                                    <h3 className="text-xl font-bold">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground">{group.description}</p>
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    ID: {group.id} • {group.members.length} Members
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.members
                                    .filter(m => m.status === 'ACCEPTED' && m.sharedPortfolioId)
                                    .map(member => (
                                    <div key={member.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                                                {member.member.nickname.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold">{member.member.nickname}</div>
                                                <div className="text-xs text-muted-foreground">{member.sharedPortfolioName}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {member.sharedPortfolioItems?.slice(0, 5).map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <StockIcon symbol={item.symbol} name={item.symbol} market={item.market as 'US'|'KR'} className="w-6 h-6" />
                                                        <div>
                                                            <div className="text-xs font-bold">{item.symbol}</div>
                                                            <div className="text-[10px] text-muted-foreground">{item.quantity} shares</div>
                                                        </div>
                                                    </div>
                                                    <PortfolioItemPrice symbol={item.symbol} market={item.market} />
                                                </div>
                                            ))}
                                            {member.sharedPortfolioItems && member.sharedPortfolioItems.length > 5 && (
                                                <div className="text-center text-xs text-muted-foreground pt-1">
                                                    + {member.sharedPortfolioItems.length - 5} more items
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer min-h-[200px]"
                                     onClick={() => handleOpenShareModal(group.id)}>
                                    <Share2 className="mb-2" />
                                    <span className="text-sm font-medium">Share your portfolio</span>
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
                        <h3 className="text-lg font-bold mb-4">Create Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <input className="w-full bg-muted p-2 rounded mb-2 text-sm" placeholder="Group Name" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
                            <textarea className="w-full bg-muted p-2 rounded mb-4 text-sm" placeholder="Description" value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-3 py-1.5 text-sm">Cancel</button>
                                <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                        <h3 className="text-lg font-bold mb-4">Select Portfolio to Share</h3>
                        <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                            {portfolios.map(p => (
                                <div key={p.id} onClick={() => setSelectedPortfolioId(p.id)} className={clsx("p-3 border rounded cursor-pointer", selectedPortfolioId === p.id ? "border-primary bg-primary/10" : "border-border")}>
                                    <div className="font-bold text-sm">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.items.length} items</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsShareModalOpen(false)} className="px-3 py-1.5 text-sm">Cancel</button>
                            <button onClick={handleSharePortfolio} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm">Share</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
