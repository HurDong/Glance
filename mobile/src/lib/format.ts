import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(value);
}

export function formatMarketLabel(market: string) {
  switch (market) {
    case 'KOSPI':
    case 'KOSDAQ':
      return '국내';
    case 'NASDAQ':
    case 'NYSE':
    case 'AMEX':
      return '미국';
    default:
      return market;
  }
}

export function formatDateLabel(raw: string) {
  if (raw.length !== 8) {
    return raw;
  }

  return `${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
}

export function formatRelativeTime(value: string) {
  return formatDistanceToNow(new Date(value), {
    addSuffix: true,
    locale: ko,
  });
}

export function formatSignedText(value: string) {
  return value.startsWith('-') || value.startsWith('+') ? value : `+${value}`;
}
