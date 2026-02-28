import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Minus } from 'lucide-react';
import { portfolioApi } from '../../api/portfolio';
import type { Portfolio } from '../../api/portfolio';
import { StockIcon } from '../stocks/StockIcon';
import { useStockStore } from '../../stores/useStockStore';
import { clsx } from 'clsx';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/useAlertStore';

// Note: Using a direct axios call for addItem as it might not be in portfolioApi yet 
// based on PortfolioDetail.tsx using it directly
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

interface StockQuickAddModalProps {
    symbol: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export const StockQuickAddModal: React.FC<StockQuickAddModalProps> = ({ symbol, onClose, onSuccess }) => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [averagePrice, setAveragePrice] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    
    const { getPrice } = useStockStore();
    const token = useAuthStore((state) => state.token);
    const { showAlert } = useAlertStore();
    
    const stockData = getPrice(symbol);
    const currentPriceStr = stockData?.price.replace(/,/g, '') || '0';
    const parsedCurrentPrice = parseFloat(currentPriceStr);

    // Assume KR market if symbol is 6 digits, else US
    const isKorean = /^\d{6}$/.test(symbol);
    const currency = isKorean ? 'KRW' : 'USD';

    useEffect(() => {
        const fetchPortfolios = async () => {
            try {
                const data = await portfolioApi.getMyPortfolios();
                setPortfolios(data);
                if (data.length > 0) {
                    setSelectedPortfolioId(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch portfolios", error);
            }
        };
        fetchPortfolios();
    }, []);

    // Set initial average price to current price
    useEffect(() => {
        if (parsedCurrentPrice && averagePrice === 0) {
            setAveragePrice(parsedCurrentPrice);
        }
    }, [parsedCurrentPrice]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedPortfolioId || quantity <= 0 || averagePrice <= 0) {
            showAlert("모든 필드를 올바르게 입력해주세요.", { type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const newItem = {
                symbol: symbol,
                quantity: quantity,
                averagePrice: averagePrice,
                currency: currency
            };
            
            await apiClient.post(`/portfolios/${selectedPortfolioId}/items`, newItem, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            // Call success callback
            if (onSuccess) onSuccess();
            onClose();
            
        } catch (error: any) {
             console.error('Failed to add item:', error);
             const errorMessage = error.response?.data?.message || '종목 추가에 실패했습니다. (이미 있는 종목일 수 있습니다)';
             showAlert(errorMessage, { type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
            <div className="bg-background w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl border border-border relative transform transition-all scale-100 opacity-100">
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold tracking-tight mb-6 text-foreground">내 포트폴리오에 담기</h3>

                {/* Stock Info Summary */}
                <div className="flex items-center gap-4 mb-8">
                    <StockIcon symbol={symbol} name={symbol} market={isKorean ? 'KR' : 'US'} className="w-12 h-12 shadow-sm rounded-full" />
                    <div>
                        <div className="font-bold text-lg text-foreground leading-tight">{symbol}</div>
                        <div className="text-sm font-medium text-muted-foreground mt-0.5">
                            현재가: <span className="font-mono">{currency === 'KRW' ? '₩' : '$'}{stockData?.price || '로딩 중...'}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2">저장할 포트폴리오</label>
                        {portfolios.length === 0 ? (
                            <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-xl border border-destructive/20 font-medium">
                                포트폴리오가 없습니다. 먼저 포트폴리오를 생성해주세요.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                {portfolios.map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => setSelectedPortfolioId(p.id)}
                                        className={clsx(
                                            "p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-200",
                                            selectedPortfolioId === p.id 
                                                ? "bg-primary/5 border-primary shadow-sm" 
                                                : "bg-muted/30 border-border hover:border-primary/50 hover:bg-muted/50"
                                        )}
                                    >
                                        <span className={clsx("font-semibold text-sm", selectedPortfolioId === p.id ? "text-primary" : "text-foreground")}>
                                            {p.name}
                                        </span>
                                        {selectedPortfolioId === p.id && <Check size={18} className="text-primary" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-5 pt-2">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">매수 수량</label>
                            <div className="flex items-center bg-muted/50 border border-border rounded-xl h-12 overflow-hidden transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    value={quantity}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setQuantity(val === '' ? '' as any : Number(val));
                                    }}
                                    onKeyDown={e => {
                                        if (
                                            !/[0-9]/.test(e.key) &&
                                            !['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'].includes(e.key) &&
                                            !e.ctrlKey && !e.metaKey
                                        ) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full h-full bg-transparent text-center text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button type="button" onClick={() => setQuantity(quantity + 1)} className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">평단가 ({currency})</label>
                            <div className="relative flex items-center bg-muted/50 border border-border rounded-xl h-12 overflow-hidden transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                                <div className="absolute left-4 font-mono font-medium text-muted-foreground">{currency === 'KRW' ? '₩' : '$'}</div>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    required
                                    value={averagePrice === 0 ? '' : averagePrice}
                                    onChange={e => {
                                        let val = e.target.value.replace(/[^0-9.]/g, '');
                                        // Prevent multiple dots
                                        const parts = val.split('.');
                                        if (parts.length > 2) {
                                            val = parts[0] + '.' + parts.slice(1).join('');
                                        }
                                        setAveragePrice(val === '' ? '' as any : Number(val));
                                    }}
                                    onKeyDown={e => {
                                        if (
                                            !/[0-9.]/.test(e.key) &&
                                            !['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'].includes(e.key) &&
                                            !e.ctrlKey && !e.metaKey
                                        ) {
                                            e.preventDefault();
                                        }
                                        // Prevent multiple dots from keystroke
                                        if (e.key === '.' && String(averagePrice).includes('.')) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full h-full bg-transparent pl-8 pr-4 text-right text-sm font-semibold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Value Preview */}
                    <div className="flex justify-between items-center bg-muted/40 px-5 py-4 rounded-xl border border-border mt-2">
                        <span className="text-sm text-muted-foreground font-bold">총 예상 금액</span>
                        <span className="text-lg font-black font-mono text-foreground tracking-tight">
                            {currency === 'KRW' ? '₩' : '$'}{(quantity * averagePrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={!selectedPortfolioId || isSubmitting || quantity <= 0 || averagePrice <= 0}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-[0_4px_14px_rgba(36,99,235,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] text-[15px]"
                        >
                            {isSubmitting ? '진행 중...' : '내 포트폴리오에 담기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
