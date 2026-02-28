import React from 'react';
import { X } from 'lucide-react';
import { StockChart } from './StockChart';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { interestApi } from '../../api/interest';
import { Star } from 'lucide-react';

interface StockDetailModalProps {
    symbol: string;
    name: string;
    market: string;
    onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ symbol, name, market, onClose }) => {
    const [isInterested, setIsInterested] = React.useState(false);
    const { token } = useAuthStore();
    const { showAlert } = useAlertStore();

    React.useEffect(() => {
        if (!token) return;
        const checkInterest = async () => {
            try {
                const stocks = await interestApi.getInterestStocks();
                setIsInterested(stocks.some(s => s.symbol === symbol));
            } catch (error) {
                console.error("Failed to fetch interest stocks:", error);
            }
        };
        checkInterest();
    }, [symbol, token]);

    const handleInterestToggle = async () => {
        if (!token) {
            showAlert('로그인이 필요한 기능입니다.', { type: 'warning' });
            return;
        }
        try {
            if (isInterested) {
                await interestApi.removeInterestStock(symbol);
                setIsInterested(false);
            } else {
                await interestApi.addInterestStock(symbol, market);
                setIsInterested(true);
            }
        } catch (error) {
            console.error('Failed to toggle interest:', error);
            showAlert('관심 종목 변경에 실패했습니다.', { type: 'error' });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden transform transition-all scale-100 opacity-100 max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">{name}</h2>
                        <span className="px-2 py-0.5 rounded bg-muted text-xs font-semibold text-muted-foreground">
                            {symbol}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInterestToggle}
                            className={clsx(
                                "flex items-center justify-center p-2 rounded-xl transition-all",
                                isInterested 
                                    ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" 
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            )}
                            title={isInterested ? "관심 종목 해제" : "관심 종목 추가"}
                        >
                            <Star size={20} className={clsx(isInterested ? "fill-current" : "")} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body - Chart Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-[500px]">
                    <StockChart symbol={symbol} market={market} />
                </div>
            </div>
        </div>
    );
};
