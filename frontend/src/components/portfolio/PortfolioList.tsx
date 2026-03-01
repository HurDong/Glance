import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, PieChart, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

// Inline types to avoid module resolution issues
interface Portfolio {
  id: number;
  userId: number;
  name: string;
  description: string;
  isPublic: boolean;
  items: any[];
  createdAt: string;
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Note: We'll set the token per-request in the component to avoid stale closure issues
apiClient.interceptors.request.use((config) => {
  // Token will be set per-request in component
  return config;
});

export const PortfolioList: React.FC = () => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPortfolio, setNewPortfolio] = useState({
        name: '',
        description: '',
        isPublic: true
    });
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        loadPortfolios();
    }, []);

    const loadPortfolios = async () => {
        try {
            const response = await apiClient.get<{ data: Portfolio[] }>('/portfolios', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setPortfolios(response.data.data);
        } catch (error) {
            console.error('Failed to load portfolios:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/portfolios', newPortfolio, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsCreateModalOpen(false);
            setNewPortfolio({ name: '', description: '', isPublic: true });
            loadPortfolios();
        } catch (error) {
            console.error('Failed to create portfolio:', error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8">Loading...</div>;
    }

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">내 포트폴리오</h2>
                    <p className="text-muted-foreground">자산을 그룹별로 관리하고 수익률을 확인하세요.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-opacity-90 font-medium"
                >
                    <Plus size={18} />
                    <span>새 포트폴리오</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios.map((portfolio) => (
                    <div
                        key={portfolio.id}
                        onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                        className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <PieChart size={24} />
                            </div>
                            <button className="text-muted-foreground hover:text-foreground">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                        
                        <h3 className="text-lg font-bold mb-2">{portfolio.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {portfolio.description || '설명이 없습니다.'}
                        </p>

                        <div className="flex items-center justify-between text-sm pt-4 border-t border-border">
                            <span className="text-muted-foreground">
                                보유 종목 <span className="text-foreground font-medium">{portfolio.items?.length || 0}</span>개
                            </span>
                            <div className="flex items-center text-primary font-medium">
                                <span>상세보기</span>
                                <ChevronRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-accent/50 transition-all group h-full min-h-[200px]"
                >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Plus size={24} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-foreground">새 포트폴리오 만들기</span>
                </button>
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl border border-border">
                        <h3 className="text-xl font-bold mb-4">새 포트폴리오 생성</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={newPortfolio.name}
                                    onChange={e => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                    placeholder="예: 미국 테크주 모음"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">설명</label>
                                <textarea
                                    value={newPortfolio.description}
                                    onChange={e => setNewPortfolio({ ...newPortfolio, description: e.target.value})}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none h-24 resize-none"
                                    placeholder="포트폴리오에 대한 설명을 입력하세요."
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={newPortfolio.isPublic}
                                    onChange={e => setNewPortfolio({ ...newPortfolio, isPublic: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isPublic" className="text-sm">공개 여부 (그룹에서 볼 수 있음)</label>
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
