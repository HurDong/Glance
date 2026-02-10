import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockIconProps {
  symbol: string;
  name: string;
  market?: 'US' | 'KR';
  className?: string;
}

export const StockIcon: React.FC<StockIconProps> = ({ 
  symbol, 
  name, 
  market = 'US',
  className 
}) => {
  const [error, setError] = useState(false);

  // 로고 색상 추출을 위한 간단한 해시 함수
  const getColors = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return {
        bg: `hsl(${h}, 70%, 40%)`,
        text: `hsl(${h}, 70%, 95%)`
    };
  };

  const colors = getColors(symbol);
  const firstChar = name.charAt(0).toUpperCase();

  // 로고 URL 생성 로직
  // 1. KR 주식: 토스 증권 패턴 시도 (6자리 종목코드)
  // 2. US 주식: 주요 종목 매핑 시도 후 TradingView 대체
  const getLogoUrl = () => {
    const s = symbol.toUpperCase();
    if (market === 'KR') {
      return `https://static.toss.im/png-icons/securities/icn-sec-fill-${symbol}.png`;
    }
    
    // 주요 US 종목 매핑 (토스 증권 ID 패턴)
    const usMapping: Record<string, string> = {
      'AAPL': 'NAS000C7F-E0',
      'NVDA': 'NAS00208X-E0',
      'TSLA': 'NAS00150X-E0',
      'MSFT': 'NAS00018X-E0',
      'AMZN': 'NAS00143X-E0',
      'GOOGL': 'NAS00216X-E0',
      'META': 'NAS00241X-E0',
    };

    if (usMapping[s]) {
      return `https://static.toss.im/png-icons/securities/icn-sec-fill-${usMapping[s]}.png`;
    }
    
    return `https://s3-symbol-logo.tradingview.com/${symbol.toLowerCase()}.svg`;
  };

  const logoUrl = getLogoUrl();

  if (logoUrl && !error) {
    return (
      <div className={cn(
        "w-10 h-10 rounded-full bg-white overflow-hidden border border-border flex items-center justify-center shadow-sm", 
        className
      )}>
        <img 
          src={logoUrl} 
          alt={symbol} 
          className="w-full h-full object-cover" // object-cover로 더 꽉 차게 변경
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden",
        className
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {firstChar}
    </div>
  );
};
