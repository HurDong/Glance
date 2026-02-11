import React, { useEffect, useState } from 'react';
import { Users, PieChart, Plus, UserPlus } from 'lucide-react';

// Temporary inline types until module resolution issue is fixed
interface Group {
  id: number;
  name: string;
  description: string;
  owner: {
    id: number;
    nickname: string;
    email: string;
  };
  members: GroupMember[];
  createdAt: string;
}

interface GroupMember {
  id: number;
  member: {
    id: number;
    nickname: string;
    email: string;
  };
  sharedPortfolio?: {
    id: number;
    name: string;
    items: any[];
  };
  joinedAt: string;
}

export const GroupFeed: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroup, setNewGroup] = useState<{ name: string; description: string }>({
        name: '',
        description: ''
    });

    useEffect(() => {
        // Temporarily use empty array until API is working
        setGroups([]);
        setIsLoading(false);
    }, []);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Would create group:', newGroup);
            // TODO: Implement API call when module issue is resolved
            // await groupApi.createGroup(newGroup);
            setIsCreateModalOpen(false);
            setNewGroup({ name: '', description: '' });
            alert('그룹 생성 기능은 곧 활성화됩니다.');
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    내 그룹
                </h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium"
                >
                    <Plus size={16} />
                    <span>새 그룹</span>
                </button>
            </div>

            {groups.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">아직 가입한 그룹이 없습니다.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                        첫 그룹 만들기
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold mb-1">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground">{group.description}</p>
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <UserPlus size={12} className="mr-1" />
                                    {group.members?.length || 0}명
                                </div>
                            </div>

                            {group.members && group.members.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <PieChart size={14} />
                                            공유된 포트폴리오
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.members
                                            .filter(member => member.sharedPortfolio)
                                            .map((member) => (
                                                <div key={member.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg">
                                                    <span className="font-medium">{member.member.nickname}</span>
                                                    <span className="text-xs text-muted-foreground">{member.sharedPortfolio?.name}</span>
                                                </div>
                                            ))}
                                        {group.members.filter(m => m.sharedPortfolio).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">아직 공유된 포트폴리오가 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
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
