import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Share2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { StockSearchDropdown } from '../stocks/StockSearchDropdown';

// Inline types to avoid module resolution issues
interface Portfolio {
  id: number;
  userId: number;
  name: string;
  description: string;
  isPublic: boolean;
  items: PortfolioItem[];
  createdAt: string;
}

interface PortfolioItem {
  id: number;
  symbol: string;
  nameKr: string;
  nameEn: string;
  market: string;
  quantity: number;
  averagePrice: number;
  currency: string;
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Token will be set per-request in component
apiClient.interceptors.request.use((config) => {
  return config;
});

export const PortfolioDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const token = useAuthStore((state) => state.token);
    
    const [newItem, setNewItem] = useState({
        symbol: '',
        quantity: 1,
        averagePrice: 0,
        currency: 'KRW'
    });
    const [selectedStock, setSelectedStock] = useState<{ symbol: string; nameKr: string; market: string } | null>(null);
    const [hideDetails, setHideDetails] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        isPublic: false
    });

    useEffect(() => {
        if (id) loadPortfolio(Number(id));
    }, [id]);

    const loadPortfolio = async (portfolioId: number) => {
        try {
            const response = await apiClient.get<{ data: Portfolio }>(`/portfolios/${portfolioId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setPortfolio(response.data.data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            navigate('/portfolio');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!portfolio || !selectedStock) {
            alert('종목을 선택해주세요.');
            return;
        }
        
        if (!newItem.averagePrice || newItem.averagePrice <= 0) {
            alert('평단가를 입력해주세요.');
            return;
        }
        
        if (!newItem.quantity || newItem.quantity <= 0) {
            alert('수량을 입력해주세요.');
            return;
        }
        try {
            await apiClient.post(`/portfolios/${portfolio.id}/items`, newItem, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsAddModalOpen(false);
            setNewItem({ symbol: '', quantity: 1, averagePrice: 0, currency: 'KRW' });
            setSelectedStock(null);
            loadPortfolio(portfolio.id);
        } catch (error: any) {
            console.error('Failed to add item:', error);
            const errorMessage = error.response?.data?.message || '종목 추가 실패: 심볼을 확인해주세요.';
            alert(errorMessage);
        }
    };

    const handleStockSelect = (stock: { symbol: string; nameKr: string; nameEn: string; market: 'US' | 'KR' }) => {
        setSelectedStock(stock);
        setNewItem(prev => ({ 
            ...prev, 
            symbol: stock.symbol,
            currency: stock.market === 'KR' ? 'KRW' : 'USD'
        }));
    };

    const handleDeleteItem = async (itemId: number) => {
        if (!portfolio || !confirm('정말 이 종목을 삭제하시겠습니까?')) return;
        try {
            await apiClient.delete(`/portfolios/${portfolio.id}/items/${itemId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            loadPortfolio(portfolio.id);
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleEditClick = () => {
        if (portfolio) {
            setEditForm({
                name: portfolio.name,
                description: portfolio.description,
                isPublic: portfolio.isPublic
            });
            setIsEditModalOpen(true);
        }
    };

    const handleUpdatePortfolio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!portfolio) return;
        
        try {
            await apiClient.put(`/portfolios/${portfolio.id}`, editForm, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsEditModalOpen(false);
            loadPortfolio(portfolio.id);
        } catch (error: any) {
            console.error('Failed to update portfolio:', error);
            const errorMessage = error.response?.data?.message || '포트폴리오 수정 실패';
            alert(errorMessage);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!portfolio) return <div className="p-8 text-center">Portfolio not found</div>;

    const totalValue = portfolio.items?.reduce((acc, item) => acc + (item.quantity * item.averagePrice), 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
                <button 
                    onClick={() => navigate('/portfolio')}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {portfolio.name}
                        {!portfolio.isPublic && <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">비공개</span>}
                    </h1>
                    <p className="text-muted-foreground text-sm">{portfolio.description}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setHideDetails(!hideDetails)}
                        className="p-2 hover:bg-accent rounded-lg text-muted-foreground tooltip" 
                        title={hideDetails ? "상세 정보 보기" : "상세 정보 숨기기"}
                    >
                        {hideDetails ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button className="p-2 hover:bg-accent rounded-lg text-primary tooltip" title="공유하기">
                        <Share2 size={20} />
                    </button>
                     <button 
                        onClick={handleEditClick}
                        className="p-2 hover:bg-accent rounded-lg text-muted-foreground tooltip" 
                        title="수정하기"
                    >
                        <Edit2 size={20} />
                    </button>
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-sm text-muted-foreground">총 매수 금액</span>
                    <div className="text-2xl font-bold mt-1">
                        {hideDetails ? '••••••' : `₩${totalValue.toLocaleString()}`}
                    </div>
                </div>
                 <div className="bg-card border border-border p-4 rounded-xl">
                    <span className="text-sm text-muted-foreground">보유 종목 수</span>
                    <div className="text-2xl font-bold mt-1">
                        {portfolio.items?.length || 0}개
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-bold">보유 종목 목록</h3>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center space-x-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90"
                    >
                        <Plus size={16} />
                        <span>종목 추가</span>
                    </button>
                </div>
                
                {portfolio.items?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        보유 중인 종목이 없습니다. 우측 상단 버튼을 눌러 추가해보세요.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left">종목명</th>
                                    <th className="px-4 py-3 text-right">수량</th>
                                    <th className="px-4 py-3 text-right">평단가</th>
                                    <th className="px-4 py-3 text-right">매수금액</th>
                                    <th className="px-4 py-3 text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio.items?.map((item) => (
                                    <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{item.nameKr}</div>
                                            <div className="text-xs text-muted-foreground">{item.symbol}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {hideDetails ? '•••' : item.quantity.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {hideDetails ? '••••••' : `${item.currency === 'KRW' ? '₩' : '$'}${item.averagePrice.toLocaleString()}`}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {hideDetails ? '••••••' : `${item.currency === 'KRW' ? '₩' : '$'}${(item.quantity * item.averagePrice).toLocaleString()}`}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl border border-border">
                        <h3 className="text-xl font-bold mb-4">종목 추가</h3>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">종목 검색</label>
                                <StockSearchDropdown onSelect={handleStockSelect} />
                                {selectedStock && (
                                    <div className="mt-2 p-3 bg-accent/50 rounded-lg border border-border">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-sm">{selectedStock.nameKr}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{selectedStock.symbol}</div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                                selectedStock.market === 'KR' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                                            }`}>
                                                {selectedStock.market === 'KR' ? '국내' : '해외'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">수량</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">통화</label>
                                    <select
                                        value={newItem.currency}
                                        onChange={e => setNewItem({ ...newItem, currency: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                    >
                                        <option value="KRW">KRW (원)</option>
                                        <option value="USD">USD (달러)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">평단가</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={newItem.averagePrice}
                                    onChange={e => setNewItem({ ...newItem, averagePrice: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90"
                                >
                                    추가하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl border border-border">
                        <h3 className="text-xl font-bold mb-4">포트폴리오 수정</h3>
                        <form onSubmit={handleUpdatePortfolio} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">포트폴리오 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none"
                                    placeholder="예: 미국 주식 포트폴리오"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">설명 (선택)</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-transparent focus:border-primary outline-none resize-none"
                                    rows={3}
                                    placeholder="포트폴리오에 대한 설명을 입력하세요"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="editIsPublic"
                                    checked={editForm.isPublic}
                                    onChange={e => setEditForm({ ...editForm, isPublic: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="editIsPublic" className="text-sm cursor-pointer">
                                    공개 포트폴리오로 설정
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90"
                                >
                                    수정하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
