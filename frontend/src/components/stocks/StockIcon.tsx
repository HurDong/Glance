import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockIconProps {
  symbol: string;
  name: string;
  market?: string;
  securityType?: string;
  className?: string;
}

export const StockIcon: React.FC<StockIconProps> = ({ 
  symbol, 
  name, 
  market = 'US',
  securityType,
  className 
}) => {
  const [imgError, setImgError] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const safeSymbol = symbol || '';
  const safeName = name || safeSymbol || '?';

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

  const colors = getColors(safeSymbol);
  const firstChar = safeName.charAt(0).toUpperCase();

  // Logo Sources Definition
  const getLogoSources = () => {
    const s = safeSymbol.toUpperCase();
    
    // KR Sources
    if (market === 'KR' || market === 'KOSPI' || market === 'KOSDAQ') {
        return [
            `https://static.toss.im/png-icons/securities/icn-sec-fill-${s}.png`, // Toss (User Preferred)
            `https://file.alphasquare.co.kr/media/images/stock_logo/kr/${s}.png`, // AlphaSquare (Backup)
        ];
    }

    // US Sources
    // 1. Toss Securities High-Quality Hardcoded (Preserve existing if possible)
    const tossId = {
      'AAPL': 'NAS000C7F-E0',
      'NVDA': 'NAS00208X-E0',
      'TSLA': 'NAS00150X-E0',
      'MSFT': 'NAS00018X-E0',
      'AMZN': 'NAS00143X-E0',
      'GOOGL': 'NAS00216X-E0',
      'META': 'NAS00241X-E0',
    }[s];


    const defaults = [
        `https://assets.parqet.com/logos/symbol/${s}?format=png`, // Parqet (Very reliable for US)
        `https://financialmodelingprep.com/image-stock/${s}.png`, // FMP (Backup)
        `https://eodhistoricaldata.com/img/logos/US/${s}.png`, // EOD (Backup)
    ];

    if (tossId) {
        return [`https://static.toss.im/png-icons/securities/icn-sec-fill-${tossId}.png`, ...defaults];
    }
    return defaults;
  };

  const sources = getLogoSources();

  // Reset error state when symbol changes
  useEffect(() => {
    setImgError(false);
    setSourceIndex(0);
  }, [symbol, market]);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
        setSourceIndex(prev => prev + 1);
    } else {
        setImgError(true);
    }
  };

  // Badge Logic for ETFs
  const getLeverageInfo = (name: string, symbol: string) => {
    const n = name.toUpperCase();
    const s = symbol.toUpperCase();
    
    // Known Inverse/Leveraged tickers if name parsing fails
    if (s === 'SQQQ') return { multi: '3x', type: 'inverse' };
    if (s === 'TQQQ') return { multi: '3x', type: 'bull' };
    if (s === 'SOXL') return { multi: '3x', type: 'bull' };
    if (s === 'SOXS') return { multi: '3x', type: 'inverse' };


    let multi = '';
    let type = 'bull'; // default

    // Detect Multiplier
    if (n.includes('2X')) multi = '2x';
    else if (n.includes('3X')) multi = '3x';
    else if (n.includes('1.5X')) multi = '1.5x';
    else if (n.includes('ULTRA')) multi = '2x'; // ProShares Ultra usually 2x

    // Detect Inverse
    if (n.includes('INVERSE') || n.includes('SHORT') || n.includes('BEAR')) {
        type = 'inverse';
    }

    if (multi) {
        return { multi, type };
    }
    return null;
  };


  const leverage = (securityType === 'ETF' || !securityType) ? getLeverageInfo(safeName, safeSymbol) : null;

  // Render Badge if Leverage Detected OR Generic ETF Badge
  if (leverage) {
      const badgeText = leverage.type === 'inverse' ? `인버스\n${leverage.multi}` : leverage.multi;
      const textSize = leverage.type === 'inverse' ? 'text-[10px] leading-3' : 'text-sm';

      return (
        <div className={cn("relative w-10 h-10", className)}>
            <div className={cn(
                "w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden whitespace-pre-line text-center bg-[#FF4500]", // OrangeRed for Leverage
                textSize
            )}>
                {badgeText}
            </div>
        </div>
      );
  } else if (securityType === 'ETF') {
      // Default ETF Badge (Blue/Grey) - prevents image 404s for ETFs
      return (
        <div className={cn("relative w-10 h-10", className)}>
            <div className={cn(
                "w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden text-sm bg-slate-500", // Generic Slate
            )}>
                ETF
            </div>
        </div>
      );
  }

  if (!imgError && sources.length > 0) {
    return (
      <div className={cn(
        "w-10 h-10 rounded-full bg-white overflow-hidden border border-border flex items-center justify-center shadow-sm relative", 
        className
      )}>
        <img 
          key={`${symbol}-${sourceIndex}`} 
          src={sources[sourceIndex]} 
          alt={symbol} 
          className="w-full h-full object-cover" 
          onError={handleError}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback Avatar with Flag
  return (
    <div className="relative">
        <div 
        className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden",
            className
        )}
        style={{ backgroundColor: colors.bg, color: colors.text }}
        >
        {firstChar}
        </div>
         {/* Market Flag Badge for consistency if needed, but maybe overkill for default avatar? 
             User image showed flag on the badge. Let's add it only for Leverage Badge for now as requested.
         */}
    </div>
  );
};
