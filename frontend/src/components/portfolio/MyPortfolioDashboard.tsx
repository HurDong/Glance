import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Minus, Trash2, RefreshCw, PieChart, TrendingUp, Eye, EyeOff, LayoutDashboard, Settings, Pencil, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { StockSearchDropdown } from '../stocks/StockSearchDropdown';
import { StockIcon } from '../stocks/StockIcon';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Portfolio {
    id: number;
    userId: number;
    name: string;
    description: string;
    isPublic: boolean;
    isPrimary: boolean;
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

apiClient.interceptors.request.use((config) => {
    return config;
});

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

/**
 * 큰 금액을 한국 단위(조/억/만)로 축약해 표시합니다.
 * 예) 18_150_000_000_000 → "약 18.2조"
 */
function formatKRW(won: number): string {
    const abs = Math.abs(won);
    if (abs >= 1_0000_0000_0000) {
        return `₩${(won / 1_0000_0000_0000).toFixed(1)}조`;
    }
    if (abs >= 1_0000_0000) {
        return `₩${(won / 1_0000_0000).toFixed(1)}억`;
    }
    if (abs >= 1_0000) {
        return `₩${(won / 1_0000).toFixed(1)}만`;
    }
    return `₩${won.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const QuickAddButtons = ({ 
    onAdd, 
    currency, 
    type = 'amount',
    onReset
}: { 
    onAdd: (val: number) => void, 
    currency?: string, 
    type?: 'amount' | 'quantity',
    onReset?: () => void
}) => {
    const negButtons = type === 'quantity' 
        ? [
            { label: '-100', value: -100 },
            { label: '-10', value: -10 },
            { label: '-1', value: -1 }
          ]
        : currency === 'KRW'
            ? [
                { label: '-100만', value: -1000000 },
                { label: '-10만', value: -100000 },
                { label: '-1만', value: -10000 }
              ]
            : [
                { label: '-$100', value: -100 },
                { label: '-$10', value: -10 },
                { label: '-$1', value: -1 }
              ];

    const posButtons = type === 'quantity'
        ? [
            { label: '+1', value: 1 },
            { label: '+10', value: 10 },
            { label: '+100', value: 100 }
          ]
        : currency === 'KRW'
            ? [
                { label: '+1만', value: 10000 },
                { label: '+10만', value: 100000 },
                { label: '+100만', value: 1000000 }
              ]
            : [
                { label: '+$1', value: 1 },
                { label: '+$10', value: 10 },
                { label: '+$100', value: 100 }
              ];

    return (
        <div className="grid grid-cols-7 gap-1.5 mt-2 w-full items-stretch">
            {negButtons.map((btn, i) => (
                <button
                    key={`neg-${i}`}
                    type="button"
                    onClick={() => onAdd(btn.value)}
                    className="w-full py-2 text-[10px] font-bold text-red-500 bg-red-400/5 hover:bg-red-400/15 border border-red-400/10 rounded-lg transition-all active:scale-95 shadow-sm"
                >
                    {btn.label}
                </button>
            ))}
            
            <div className="flex items-center justify-center">
                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-[10px] font-bold text-muted-foreground/70 hover:text-red-500 hover:scale-105 transition-all whitespace-nowrap"
                    >
                        초기화
                    </button>
                )}
            </div>

            {posButtons.map((btn, i) => (
                <button
                    key={`pos-${i}`}
                    type="button"
                    onClick={() => onAdd(btn.value)}
                    className="w-full py-2 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/20 border border-primary/10 rounded-lg transition-all active:scale-95 shadow-sm"
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
};

const PremiumStepper = ({ 
    value, 
    onChange, 
    onAdd, 
    currency, 
    placeholder,
    disabled = false,
    step = 1
}: { 
    value: number | string, 
    onChange: (val: number) => void,
    onAdd: (step: number) => void,
    currency?: string,
    placeholder?: string,
    disabled?: boolean,
    step?: number
}) => {
    return (
        <div className="flex items-center bg-muted/30 border border-border/60 rounded-xl p-1 group/stepper focus-within:border-primary/40 transition-all h-12">
            <button 
                type="button"
                disabled={disabled}
                onClick={() => onAdd(-step)}
                className="w-10 h-full flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground/80 hover:text-foreground transition-all disabled:opacity-20 active:scale-90"
            >
                <Minus size={18} />
            </button>
            
            <div className="relative flex-1 flex items-center justify-center h-full">
                {currency && (
                    <span className="absolute left-3 text-muted-foreground/60 font-bold text-sm pointer-events-none">
                        {currency === 'KRW' ? '₩' : '$'}
                    </span>
                )}
                <input
                    type="number"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`w-full bg-transparent border-none outline-none text-center font-mono text-base font-semibold ${currency ? 'pl-8' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
            </div>

            <button 
                type="button"
                disabled={disabled}
                onClick={() => onAdd(step)}
                className="w-10 h-full flex items-center justify-center rounded-lg hover:bg-white/5 text-muted-foreground/80 hover:text-foreground transition-all disabled:opacity-20 active:scale-90"
            >
                <Plus size={18} />
            </button>
        </div>
    );
};

export const MyPortfolioDashboard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [activePortfolioId, setActivePortfolioId] = useState<number | null>(id ? Number(id) : null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [isAddCashModalOpen, setIsAddCashModalOpen] = useState(false);
    
    // Forms
    const [portfolioForm, setPortfolioForm] = useState({ name: '', description: '', isPublic: true });
    const [newItemForm, setNewItemForm] = useState({ symbol: '', quantity: 1, averagePrice: 0, currency: 'KRW' });
    const [cashForm, setCashForm] = useState({ amount: 0, currency: 'KRW' });
    const [selectedStock, setSelectedStock] = useState<{ symbol: string; nameKr: string; market: string } | null>(null);
    
    // UI state
    const [hideDetails, setHideDetails] = useState(false);
    const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
    const [editItemForm, setEditItemForm] = useState({ quantity: 1, averagePrice: 0, currency: 'KRW' });

    const token = useAuthStore((state) => state.token);
    const { showAlert, showConfirm } = useAlertStore();

    useEffect(() => {
        loadPortfolios();
    }, []);

    useEffect(() => {
        if (id && portfolios.find(p => p.id === Number(id))) {
            setActivePortfolioId(Number(id));
        } else if (portfolios.length > 0 && !activePortfolioId) {
            setActivePortfolioId(portfolios[0].id);
            navigate(`/portfolio/${portfolios[0].id}`, { replace: true });
        }
    }, [id, portfolios]);

    const loadPortfolios = async (showRefreshAnim = false) => {
        if (!token) {
            setPortfolios([]);
            setIsLoading(false);
            return;
        }
        
        if (showRefreshAnim) setIsRefreshing(true);
        try {
            const response = await apiClient.get<{ data: Portfolio[] }>('/portfolios', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // API 응답 내의 items 배열이 없는 경우를 대비
            const loaded = response.data.data.map(p => ({ ...p, items: p.items || [] }));
            setPortfolios(loaded);
        } catch (error: any) {
            if (error.response?.status === 404) {
                // 사용자의 포트폴리오가 아직 없는 경우 에러 팝업을 띄우지 않고 빈 배열로 처리합니다.
                setPortfolios([]);
            } else {
                console.error('Failed to load portfolios:', error);
                showAlert('포트폴리오 목록을 불러오지 못했습니다.', { type: 'error' });
            }
        } finally {
            setIsLoading(false);
            if (showRefreshAnim) setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    const handleCreatePortfolio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            showAlert('로그인이 필요한 서비스입니다.', { type: 'warning' });
            return;
        }
        try {
            const res = await apiClient.post<{ data: Portfolio }>('/portfolios', portfolioForm, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsCreateModalOpen(false);
            setPortfolioForm({ name: '', description: '', isPublic: true });
            
            // Reload and set new one active
            await loadPortfolios();
            navigate(`/portfolio/${res.data.data.id}`);
            showAlert('새 포트폴리오가 생성되었습니다.', { type: 'success' });
        } catch (error: any) {
            console.error('Failed to create portfolio:', error);
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                showAlert('로그인이 필요한 서비스입니다.', { type: 'error' });
            } else {
                showAlert('포트폴리오 생성에 실패했습니다.', { type: 'error' });
            }
        }
    };

    const handleUpdatePortfolio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePortfolioId) return;
        try {
            await apiClient.put(`/portfolios/${activePortfolioId}`, portfolioForm, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsEditModalOpen(false);
            loadPortfolios();
            showAlert('포트폴리오가 수정되었습니다.', { type: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || '포트폴리오 수정 실패';
            showAlert(msg, { type: 'error' });
        }
    };

    const handleDeletePortfolio = async (portfolioId: number) => {
        const isConfirmed = await showConfirm('이 포트폴리오를 영구적으로 삭제하시겠습니까?');
        if (!isConfirmed) return;
        try {
            await apiClient.delete(`/portfolios/${portfolioId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            showAlert('포트폴리오가 삭제되었습니다.', { type: 'success' });
            
            if (activePortfolioId === portfolioId) {
                setActivePortfolioId(null);
                navigate('/portfolio');
            }
            loadPortfolios();
        } catch (error) {
            console.error('Failed to delete portfolio', error);
            showAlert('포트폴리오 삭제 실패', { type: 'error' });
        }
    };

    const handleSetPrimary = async (portfolioId: number) => {
        try {
            await apiClient.patch(`/portfolios/${portfolioId}/primary`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            loadPortfolios();
            showAlert('대표 포트폴리오로 설정되었습니다. ⭐', { type: 'success' });
        } catch (error) {
            showAlert('대표 설정에 실패했습니다.', { type: 'error' });
        }
    };


    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePortfolioId || !selectedStock) {
            showAlert('종목을 선택해주세요.', { type: 'warning' });
            return;
        }
        if (!newItemForm.averagePrice || newItemForm.averagePrice <= 0) {
            showAlert('평단가를 올바르게 입력해주세요.', { type: 'warning' });
            return;
        }
        if (!newItemForm.quantity || newItemForm.quantity <= 0) {
            showAlert('수량을 올바르게 입력해주세요.', { type: 'warning' });
            return;
        }

        try {
            await apiClient.post(`/portfolios/${activePortfolioId}/items`, newItemForm, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsAddStockModalOpen(false);
            setNewItemForm({ symbol: '', quantity: 1, averagePrice: 0, currency: 'KRW' });
            setSelectedStock(null);
            loadPortfolios();
            showAlert('종목이 포트폴리오에 담겼습니다.', { type: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || '종목 추가에 실패했습니다.';
            showAlert(msg, { type: 'error' });
        }
    };

    const handleAddCash = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePortfolioId) return;
        if (!cashForm.amount || cashForm.amount <= 0) {
            showAlert('금액을 올바르게 입력해주세요.', { type: 'warning' });
            return;
        }
        try {
            await apiClient.post(`/portfolios/${activePortfolioId}/items`, {
                symbol: cashForm.currency === 'KRW' ? 'KRW' : 'USD',
                market: 'CASH',
                quantity: 1,
                averagePrice: cashForm.amount,
                currency: cashForm.currency,
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setIsAddCashModalOpen(false);
            setCashForm({ amount: 0, currency: 'KRW' });
            loadPortfolios();
            showAlert('현금이 포트폴리오에 추가되었습니다.', { type: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || '현금 추가에 실패했습니다.';
            showAlert(msg, { type: 'error' });
        }
    };

    const handleRemoveStock = async (itemId: number) => {
        if (!activePortfolioId) return;
        const isConfirmed = await showConfirm('포트폴리오에서 이 종목을 제외하시겠습니까?');
        if (!isConfirmed) return;
        try {
            await apiClient.delete(`/portfolios/${activePortfolioId}/items/${itemId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            loadPortfolios();
            showAlert('종목이 삭제되었습니다.', { type: 'success' });
        } catch (error) {
            showAlert('종목 삭제 실패', { type: 'error' });
        }
    };

    const handleEditItemClick = (item: PortfolioItem) => {
        setEditingItem(item);
        setEditItemForm({ quantity: item.quantity, averagePrice: item.averagePrice, currency: item.currency });
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePortfolioId || !editingItem) return;
        try {
            await apiClient.put(`/portfolios/${activePortfolioId}/items/${editingItem.id}`, {
                symbol: editingItem.symbol,
                quantity: editItemForm.quantity,
                averagePrice: editItemForm.averagePrice,
                currency: editItemForm.currency,
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setEditingItem(null);
            loadPortfolios();
            showAlert('종목 정보가 수정되었습니다.', { type: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || '종목 수정에 실패했습니다.';
            showAlert(msg, { type: 'error' });
        }
    };

    const handleStockSelect = (stock: { symbol: string; nameKr: string; nameEn: string; market: string }) => {
        setSelectedStock(stock);
        setNewItemForm(prev => ({ 
            ...prev, 
            symbol: stock.symbol,
            currency: (stock.market === 'KR' || stock.market === 'KOSPI' || stock.market === 'KOSDAQ') ? 'KRW' : 'USD'
        }));
    };

    const activePortfolio = useMemo(() => portfolios.find(p => p.id === activePortfolioId), [portfolios, activePortfolioId]);

    const { totalValueKRW, chartData } = useMemo(() => {
        if (!activePortfolio || !activePortfolio.items) return { totalValueKRW: 0, chartData: [] };
        
        // Mock current price fetching mapping (In real app, we'd fetch live prices here or via WebSocket)
        // For simplification, using averagePrice as current if live price isn't readily available, 
        // to show structure. In real life we'd map prices from a websocket or quotes API.
        let total = 0;
        const data = activePortfolio.items.map(item => {
            // Convert to KRW roughly for total sum (assuming 1350 KRW/USD) if USD
            const estimatedCurrentValue = item.currency === 'USD' 
                ? (item.averagePrice * item.quantity * 1350) 
                : (item.averagePrice * item.quantity);
            total += estimatedCurrentValue;
            
            return {
                name: item.nameKr,
                value: estimatedCurrentValue
            };
        });
        
        // Sort chart data by value
        data.sort((a, b) => b.value - a.value);

        return { totalValueKRW: total, chartData: data };
    }, [activePortfolio]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
            {/* Header & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">내 포트폴리오</h1>
                        <p className="text-muted-foreground mt-1">보유 자산을 한눈에 파악하고 전략적으로 관리하세요.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => loadPortfolios(true)}
                        className="px-4 py-2 border border-border/50 bg-card hover:bg-accent font-medium text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                        동기화
                    </button>
                    <button 
                        onClick={() => {
                            setPortfolioForm({ name: '', description: '', isPublic: true });
                            setIsCreateModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-md"
                    >
                        <Plus size={18} />
                        내 포트폴리오 생성
                    </button>
                </div>
            </div>

            {/* Empty State completely */}
            {portfolios.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] surface-panel rounded-3xl p-12 text-center">
                    <div className="w-48 h-48 mb-8 opacity-80">
                        {/* Beautiful 3D-like icon representation using standard SVG illustration style */}
                        <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-500/20 fill-current">
                            <path d="M166.7 58.3v100c0 4.6-3.7 8.3-8.3 8.3H41.7c-4.6 0-8.3-3.7-8.3-8.3v-100c0-4.6 3.7-8.3 8.3-8.3h116.7c4.5 0 8.3 3.8 8.3 8.3z" fill="currentColor"/>
                            <path d="M150 41.7H50c-4.6 0-8.3-3.7-8.3-8.3s3.7-8.3 8.3-8.3h100c4.6 0 8.3 3.7 8.3 8.3s-3.7 8.3-8.3 8.3z" className="text-primary/40"/>
                            <circle cx="100" cy="110" r="30" className="text-primary/60"/>
                            <path d="M100 80L85 110h30l-15-30z" className="text-blue-400" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3">설정된 포트폴리오가 없습니다</h2>
                    <p className="text-muted-foreground mb-8 max-w-md">새로운 포트폴리오를 만들어 투자 자산을 깔끔하게 추적하고 인사이트를 기록해 보세요.</p>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center gap-3 hover:shadow-[0_8px_30px_rgba(36,99,235,0.4)] transition-all hover:-translate-y-1 text-lg"
                    >
                        <Plus size={24} />
                        첫 포트폴리오 만들기
                    </button>
                </div>
            ) : (
                <>
                    {/* Portfolio Tabs (Glassmorphism) */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {portfolios.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setActivePortfolioId(p.id); navigate(`/portfolio/${p.id}`); }}
                                className={`px-5 py-3 font-semibold rounded-2xl whitespace-nowrap transition-all duration-300 border backdrop-blur-md flex items-center gap-2 ${
                                    activePortfolioId === p.id 
                                    ? 'bg-primary text-primary-foreground border border-primary shadow-[0_10px_24px_rgba(37,99,235,0.28)]' 
                                    : 'bg-card/90 border-border/70 text-muted-foreground hover:bg-accent/80 hover:text-foreground shadow-sm'
                                }`}
                            >
                                {p.isPrimary && <Star size={13} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {activePortfolio && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            
                            {/* Main Summary Card & Chart (Left Col) */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Summary Card */}
                                <div className="surface-panel rounded-3xl p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 flex gap-2">
                                        <button 
                                            onClick={() => setHideDetails(!hideDetails)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                                            title={hideDetails ? "금액 숨김 해제" : "금액 숨기기"}
                                        >
                                            {hideDetails ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleSetPrimary(activePortfolio.id)}
                                            className={`p-1.5 rounded-md transition-colors ${
                                                activePortfolio.isPrimary
                                                ? 'text-yellow-400 bg-yellow-400/10 cursor-default'
                                                : 'text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10'
                                            }`}
                                            title={activePortfolio.isPrimary ? '대표 포트폴리오' : '대표로 설정'}
                                            disabled={activePortfolio.isPrimary}
                                        >
                                            <Star size={16} className={activePortfolio.isPrimary ? 'fill-yellow-400' : ''} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setPortfolioForm({ name: activePortfolio.name, description: activePortfolio.description, isPublic: activePortfolio.isPublic });
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                            title="포트폴리오 설정"
                                        >
                                            <Settings size={16} />
                                        </button>
                                         <button 
                                            onClick={() => handleDeletePortfolio(activePortfolio.id)}
                                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="포트폴리오 삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-foreground pr-24">{activePortfolio.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-6 line-clamp-1">{activePortfolio.description || '설명 없음'}</p>
                                    
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium text-muted-foreground">총 평가 자산 (추정)</div>
                                        {/* 금액을 조/억/만 단위로 축약해 카드 넘침 방지 */}
                                        <div className="text-4xl font-black tracking-tighter leading-tight break-all">
                                            {hideDetails ? '••••••' : formatKRW(totalValueKRW)}
                                        </div>
                                        {/* 전체 금액은 툴팁으로 */}
                                        {!hideDetails && totalValueKRW >= 1_0000 && (
                                            <div className="text-xs text-muted-foreground font-mono mt-1 truncate" title={`₩${totalValueKRW.toLocaleString()}`}>
                                                = ₩{totalValueKRW.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        )}
                                    </div>

                                     {/* Mock ROI for visual */}
                                     <div className="mt-4 flex items-center gap-2 inline-flex px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-bold">
                                        <TrendingUp size={18} />
                                        <span>+0.00%</span>
                                        <span className="text-xs font-medium ml-1 opacity-80">(업데이트 대기중)</span>
                                    </div>
                                </div>

                                {/* Asset Allocation Chart Card */}
                                <div className="surface-panel rounded-3xl p-6">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <PieChart size={18} className="text-primary"/> 
                                        자산 비중
                                    </h3>
                                    {chartData.length > 0 ? (
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {chartData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        formatter={(value: any) => {
                                                            const numValue = Number(value);
                                                            return isNaN(numValue) ? String(value) : formatKRW(numValue);
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: 'hsl(var(--card))',
                                                            color: 'hsl(var(--foreground))',
                                                            borderRadius: '12px',
                                                            border: '1px solid hsl(var(--border))',
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                            fontSize: '13px',
                                                            padding: '8px 14px',
                                                        }}
                                                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                    />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-48 flex items-center justify-center text-muted-foreground/60 text-sm">
                                            차트에 표시할 비중 데이터가 없습니다.
                                        </div>
                                    )}

                                    {/* Asset Legend */}
                                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {chartData.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="truncate max-w-[100px]" title={item.name}>{item.name}</span>
                                                </div>
                                                <div className="font-mono text-xs opacity-70">
                                                    {hideDetails ? '•••' : ((item.value / totalValueKRW) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Holdings List (Right Col) */}
                            <div className="lg:col-span-3">
                                <div className="surface-panel rounded-3xl overflow-hidden h-full flex flex-col">
                                    <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            보유 종목 <span className="bg-muted text-muted-foreground text-sm py-0.5 px-2.5 rounded-full font-medium border border-border/60">{activePortfolio.items?.length || 0}</span>
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsAddCashModalOpen(true)}
                                                className="px-4 py-2.5 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold rounded-xl flex items-center gap-2 transition-all justify-center whitespace-nowrap text-sm border border-emerald-500/25 shadow-sm"
                                            >
                                                💰 현금 추가
                                            </button>
                                            <button 
                                                onClick={() => setIsAddStockModalOpen(true)}
                                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl flex items-center gap-2 transition-all justify-center whitespace-nowrap shadow-sm"
                                            >
                                                <Plus size={18} />
                                                종목 추가하기
                                            </button>
                                        </div>
                                    </div>

                                    {(!activePortfolio.items || activePortfolio.items.length === 0) ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-70">
                                            <div className="w-20 h-20 mb-4 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                                <PieChart size={32} />
                                            </div>
                                            <p className="text-lg font-medium">보유 중인 종목이 없습니다</p>
                                            <p className="text-sm text-muted-foreground mt-1">상단의 종목 추가하기 버튼을 눌러 자산을 구성하세요.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto flex-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                                    <tr>
                                                        <th className="px-6 py-4 font-semibold">종목 정보</th>
                                                        <th className="px-6 py-4 font-semibold text-right">보유 수량</th>
                                                        <th className="px-6 py-4 font-semibold text-right">평단가</th>
                                                        <th className="px-6 py-4 font-semibold text-right">매입 금액</th>
                                                        <th className="px-6 py-4 font-semibold text-center">관리</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {[...activePortfolio.items]
                                                        .sort((a, b) => {
                                                            const valA = a.currency === 'USD' ? (a.quantity * a.averagePrice * 1350) : (a.quantity * a.averagePrice);
                                                            const valB = b.currency === 'USD' ? (b.quantity * b.averagePrice * 1350) : (b.quantity * b.averagePrice);
                                                            return valB - valA;
                                                        })
                                                        .map((item) => {
                                                            const isCash = item.market === 'CASH';
                                                            return (
                                                        <tr key={item.id} className={isCash ? 'hover:bg-accent/70 transition-colors group bg-emerald-500/8' : 'hover:bg-accent/70 transition-colors group'}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    {isCash ? (
                                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
                                                                            💰
                                                                        </div>
                                                                    ) : (
                                                                        <StockIcon
                                                                            symbol={item.symbol}
                                                                            name={item.nameKr || item.nameEn || item.symbol}
                                                                            market={item.market}
                                                                        />
                                                                    )}
                                                                    <div>
                                                                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                                                            {isCash ? (item.symbol === 'KRW' ? '원화 현금' : '달러 현금') : item.nameKr}
                                                                            {isCash && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">현금</span>}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.symbol}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="font-medium text-sm">
                                                                    {hideDetails ? '•••' : item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="font-mono text-sm font-medium">
                                                                    {hideDetails ? '••••••' : `${item.currency === 'KRW' ? '₩' : '$'}${item.averagePrice.toLocaleString()}`}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="font-mono text-sm font-bold opacity-80">
                                                                    {hideDetails ? '••••••' : `${item.currency === 'KRW' ? '₩' : '$'}${(item.quantity * item.averagePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                                                </div>
                                                            </td>
                                                             <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button 
                                                                        onClick={() => handleEditItemClick(item)}
                                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                        title="종목 수정"
                                                                    >
                                                                        <Pencil size={15} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRemoveStock(item.id)}
                                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                        title="목록에서 삭제"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                             </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {/* Cash Add Modal */}
            {isAddCashModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
                    onClick={() => setIsAddCashModalOpen(false)}
                >
                    <div 
                        className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold flex items-center gap-2">💰 현금 추가</h3>
                            <p className="text-sm text-muted-foreground mt-1">포트폴리오에 보유 현금을 추가합니다.</p>
                        </div>
                        <form onSubmit={handleAddCash} className="p-6 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">통화 선택</label>
                                <div className="flex gap-2">
                                    {['KRW', 'USD'].map(cur => (
                                        <button
                                            key={cur}
                                            type="button"
                                            onClick={() => setCashForm(f => ({ ...f, currency: cur }))}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${cashForm.currency === cur ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-accent'}`}
                                        >
                                            {cur === 'KRW' ? '원화 (KRW)' : '달러 (USD)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">추가 금액</label>
                                <PremiumStepper 
                                    value={cashForm.amount || ''}
                                    onChange={(val) => setCashForm(f => ({ ...f, amount: val }))}
                                    onAdd={(step) => setCashForm(f => ({ ...f, amount: Math.max(0, (f.amount || 0) + step) }))}
                                    currency={cashForm.currency}
                                    placeholder={cashForm.currency === 'KRW' ? '예) 5000000' : '예) 3000'}
                                    step={cashForm.currency === 'KRW' ? 10000 : 10}
                                />
                                <QuickAddButtons 
                                    currency={cashForm.currency} 
                                    onAdd={(val) => setCashForm(f => ({ ...f, amount: (f.amount || 0) + val }))}
                                    onReset={() => setCashForm(f => ({ ...f, amount: 0 }))}
                                />
                                {cashForm.amount > 0 && (
                                    <p className="text-[11px] text-muted-foreground mt-1.5 px-2 opacity-60">
                                        = {cashForm.currency === 'KRW'
                                            ? `\u20a9${cashForm.amount.toLocaleString()}`
                                            : `$${cashForm.amount.toLocaleString()}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCashModalOpen(false)}
                                    className="flex-1 py-3.5 text-sm bg-accent/50 text-foreground font-bold rounded-xl hover:bg-muted transition-all active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 text-sm bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                                >
                                    추가 완료
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create / Edit Portfolio Modal */}
            {(isCreateModalOpen || isEditModalOpen) && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
                    onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                >
                    <div 
                        className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <h3 className="text-2xl font-bold">{isCreateModalOpen ? '새 포트폴리오 만들기' : '포트폴리오 설정'}</h3>
                        </div>
                        <form onSubmit={isCreateModalOpen ? handleCreatePortfolio : handleUpdatePortfolio} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-80">포트폴리오 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={portfolioForm.name}
                                    onChange={e => setPortfolioForm({ ...portfolioForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-muted/60 border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="예: 성장주 코어 매집, 배당 포트"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-80">설명 (선택)</label>
                                <textarea
                                    value={portfolioForm.description}
                                    onChange={e => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-muted/60 border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24"
                                    placeholder="어떤 전략으로 운용할 포트폴리오인지 기록해보세요."
                                />
                            </div>
                            <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-accent/30 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={portfolioForm.isPublic}
                                    onChange={e => setPortfolioForm({ ...portfolioForm, isPublic: e.target.checked })}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary bg-muted border-border"
                                />
                                <div>
                                    <div className="font-semibold text-sm">공개 포트폴리오 설정</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">내 채널과 소셜 그룹 구성원들이 이 포트폴리오를 볼 수 있게 됩니다.</div>
                                </div>
                            </label>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                                    className="flex-1 py-3 bg-accent text-foreground font-bold rounded-xl hover:bg-muted transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all font-medium"
                                >
                                    {isCreateModalOpen ? '생성하기' : '저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Stock Modal */}
            {isAddStockModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
                    onClick={() => { setIsAddStockModalOpen(false); setSelectedStock(null); }}
                >
                    <div 
                        className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <h3 className="text-2xl font-bold">포트폴리오 종목 추가</h3>
                        </div>
                        <form onSubmit={handleAddStock} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-80">종목 검색</label>
                                <StockSearchDropdown onSelect={handleStockSelect} />
                                {selectedStock && (
                                    <div className="mt-3 p-4 bg-muted/60 rounded-xl border border-border flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-foreground text-sm">{selectedStock.nameKr}</div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{selectedStock.symbol}</div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                            (selectedStock.market === 'KR' || selectedStock.market === 'KOSPI' || selectedStock.market === 'KOSDAQ') 
                                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                                            : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                        }`}>
                                            {(selectedStock.market === 'KR' || selectedStock.market === 'KOSPI' || selectedStock.market === 'KOSDAQ') ? '국내 (KRW)' : '해외 (USD)'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="flex gap-3 mb-1.5">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">보유 수량 (주)</label>
                                            <PremiumStepper 
                                                value={newItemForm.quantity}
                                                onChange={(val) => setNewItemForm({ ...newItemForm, quantity: val })}
                                                onAdd={(step) => setNewItemForm(f => ({ ...f, quantity: Math.max(0, (f.quantity || 0) + step) }))}
                                                disabled={!selectedStock}
                                                step={1}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">통화</label>
                                            <select
                                                value={newItemForm.currency}
                                                onChange={e => setNewItemForm({ ...newItemForm, currency: e.target.value })}
                                                className="w-full h-12 bg-muted/30 border border-border/60 rounded-xl px-3 text-sm font-bold focus:border-primary/40 outline-none transition-all disabled:opacity-50"
                                                disabled
                                            >
                                                <option value="KRW">KRW (₩)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <QuickAddButtons 
                                        type="quantity"
                                        onAdd={(val) => setNewItemForm(f => ({ ...f, quantity: (f.quantity || 0) + val }))}
                                        onReset={() => setNewItemForm(f => ({ ...f, quantity: 1 }))}
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">매수 평단가</label>
                                    <PremiumStepper 
                                        value={newItemForm.averagePrice}
                                        onChange={(val) => setNewItemForm({ ...newItemForm, averagePrice: val })}
                                        onAdd={(val) => setNewItemForm(f => ({ ...f, averagePrice: Math.max(0, (f.averagePrice || 0) + val) }))}
                                        currency={newItemForm.currency}
                                        disabled={!selectedStock}
                                        placeholder="0.00"
                                        step={newItemForm.currency === 'KRW' ? 1000 : 1}
                                    />
                                    <QuickAddButtons 
                                        currency={newItemForm.currency}
                                        onAdd={(val) => setNewItemForm(f => ({ ...f, averagePrice: (f.averagePrice || 0) + val }))}
                                        onReset={() => setNewItemForm(f => ({ ...f, averagePrice: 0 }))}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddStockModalOpen(false); setSelectedStock(null); }}
                                        className="flex-1 py-3.5 text-sm bg-accent/50 text-foreground font-bold rounded-xl hover:bg-muted transition-all active:scale-95"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!selectedStock}
                                        className="flex-1 py-3.5 text-sm bg-primary bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-30 active:scale-95"
                                    >
                                        + 리스트에 추가
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Stock Modal */}
            {editingItem && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
                    onClick={() => setEditingItem(null)}
                >
                    <div 
                        className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-white/10 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <h3 className="text-2xl font-bold">종목 정보 수정</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-mono font-bold">{editingItem.symbol}</span> — {editingItem.nameKr}
                            </p>
                        </div>
                        <form onSubmit={handleUpdateItem} className="p-6 space-y-5">
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="flex gap-3 mb-1.5">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">보유 수량 (주)</label>
                                            <PremiumStepper 
                                                value={editItemForm.quantity}
                                                onChange={(val) => setEditItemForm({ ...editItemForm, quantity: val })}
                                                onAdd={(step) => setEditItemForm(f => ({ ...f, quantity: Math.max(0, (f.quantity || 0) + step) }))}
                                                step={1}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">통화</label>
                                            <select
                                                value={editItemForm.currency}
                                                onChange={e => setEditItemForm({ ...editItemForm, currency: e.target.value })}
                                                className="w-full h-12 bg-muted/30 border border-border/60 rounded-xl px-3 text-sm font-bold focus:border-primary/40 outline-none transition-all"
                                            >
                                                <option value="KRW">KRW (₩)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <QuickAddButtons 
                                        type="quantity"
                                        onAdd={(val) => setEditItemForm(f => ({ ...f, quantity: (f.quantity || 0) + val }))}
                                        onReset={() => setEditItemForm(f => ({ ...f, quantity: editingItem?.quantity || 1 }))}
                                    />
                                </div>
                                 <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block opacity-70 ml-1">평단가</label>
                                    <PremiumStepper 
                                        value={editItemForm.averagePrice}
                                        onChange={(val) => setEditItemForm({ ...editItemForm, averagePrice: val })}
                                        onAdd={(step) => setEditItemForm(f => ({ ...f, averagePrice: Math.max(0, (f.averagePrice || 0) + step) }))}
                                        currency={editItemForm.currency}
                                        placeholder="0.00"
                                        step={editItemForm.currency === 'KRW' ? 1000 : 1}
                                    />
                                    <QuickAddButtons 
                                        currency={editItemForm.currency}
                                        onAdd={(val) => setEditItemForm(f => ({ ...f, averagePrice: (f.averagePrice || 0) + val }))}
                                        onReset={() => setEditItemForm(f => ({ ...f, averagePrice: editingItem?.averagePrice || 0 }))}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 py-3.5 text-sm bg-accent/50 text-foreground font-bold rounded-xl hover:bg-muted transition-all active:scale-95"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3.5 text-sm bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95"
                                    >
                                        수정 저장
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
