import { useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import { formatSignedText } from '@/lib/format';

export type ChartRange = '1m' | '5m' | '15m' | '1h' | '1d' | '1w' | '1M' | '1Y';

type MinuteChartRange = Extract<ChartRange, '1m' | '5m' | '15m'>;

type ChartPoint = {
  date: string;
  price: number;
};

type LineChartProps = {
  points: ChartPoint[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  currency: string;
  currentPrice?: string;
  changeRate?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const CHART_PADDING = 10;

const MINUTE_RANGE_OPTIONS: { value: MinuteChartRange; label: string }[] = [
  { value: '1m', label: '1분' },
  { value: '5m', label: '5분' },
  { value: '15m', label: '15분' },
];

const PRIMARY_RANGE_OPTIONS: { value: ChartRange | 'minute'; label: string }[] = [
  { value: 'minute', label: '분봉' },
  { value: '1h', label: '1시간' },
  { value: '1d', label: '1일' },
  { value: '1w', label: '1주' },
  { value: '1M', label: '1개월' },
  { value: '1Y', label: '1년' },
];

const RANGE_LABELS: Record<ChartRange, string> = {
  '1m': '1분',
  '5m': '5분',
  '15m': '15분',
  '1h': '1시간',
  '1d': '1일',
  '1w': '1주',
  '1M': '1개월',
  '1Y': '1년',
};

function formatAxisLabel(raw: string) {
  if (raw.length === 12 || raw.length === 14) {
    return `${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
  }

  if (raw.length === 8) {
    return `${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
  }

  return raw;
}

function formatDetailLabel(raw: string) {
  if (raw.length === 12 || raw.length === 14) {
    return `${raw.slice(4, 6)}.${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
  }

  if (raw.length === 8) {
    return `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
  }

  return raw;
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(value);
}

function getTrendClass(value: number | null) {
  if (value === null || Number.isNaN(value) || value === 0) {
    return 'border-slate-400/20 bg-slate-500/10 text-slate-700 dark:text-slate-200';
  }

  return value < 0
    ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-200'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200';
}

export function LineChart(props: LineChartProps) {
  const chartGradientId = useId().replace(/:/g, '');
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const values = props.points.map((point) => point.price);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const valueRange = max - min || 1;
  const rawChangeRate = props.changeRate !== undefined ? Number(props.changeRate) : null;
  const baseChangeRate = rawChangeRate !== null && Number.isFinite(rawChangeRate) ? rawChangeRate : null;
  const isMinuteRange = props.range === '1m' || props.range === '5m' || props.range === '15m';
  const overallTrend =
    props.points.length > 1 ? props.points[props.points.length - 1].price - props.points[0].price : baseChangeRate ?? 0;
  const chartColor = overallTrend < 0 ? '#2563eb' : '#ef4444';

  const chartPoints = useMemo(
    () =>
      props.points.map((point, index) => {
        const x =
          CHART_PADDING +
          (index / Math.max(props.points.length - 1, 1)) * (CHART_WIDTH - CHART_PADDING * 2);
        const y =
          CHART_HEIGHT -
          CHART_PADDING -
          ((point.price - min) / valueRange) * (CHART_HEIGHT - CHART_PADDING * 2);

        return {
          ...point,
          x,
          y,
        };
      }),
    [props.points, min, valueRange],
  );

  const pointsPath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = chartPoints.length
    ? `${pointsPath} L ${CHART_WIDTH - CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} L ${CHART_PADDING} ${
        CHART_HEIGHT - CHART_PADDING
      } Z`
    : '';

  const latestPoint = chartPoints.at(-1) ?? null;
  const firstPoint = chartPoints[0] ?? null;
  const activePoint = activeIndex !== null ? chartPoints[activeIndex] ?? null : null;
  const displayPoint = isInteracting ? activePoint ?? latestPoint : latestPoint;
  const rawCurrentPrice = props.currentPrice ? Number(props.currentPrice.replace(/,/g, '')) : Number.NaN;
  const latestPrice = Number.isFinite(rawCurrentPrice) ? rawCurrentPrice : latestPoint?.price;
  const displayPrice = displayPoint?.price ?? latestPrice;
  const interactiveChangeRate =
    isInteracting && displayPoint && firstPoint && firstPoint.price !== 0
      ? ((displayPoint.price - firstPoint.price) / firstPoint.price) * 100
      : null;
  const changeRateText = isInteracting
    ? interactiveChangeRate !== null
      ? `${formatSignedText(interactiveChangeRate.toFixed(2))}%`
      : null
    : props.changeRate
      ? `${formatSignedText(props.changeRate)}%`
      : null;
  const trendClass = getTrendClass(isInteracting ? interactiveChangeRate : baseChangeRate);
  const helperTitle = isInteracting && displayPoint ? '선택 시점' : '차트 탐색';
  const helperText =
    isInteracting && displayPoint
      ? formatDetailLabel(displayPoint.date)
      : '차트를 길게 누르고 좌우로 움직이면 시점별 가격을 볼 수 있어요.';

  const resetInteraction = () => {
    setIsInteracting(false);
    setActiveIndex(null);
  };

  const updateActivePoint = (clientX: number) => {
    const node = chartRef.current;

    if (!node || chartPoints.length === 0) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const clampedX = Math.min(Math.max(relativeX, 0), rect.width);
    const nextIndex = Math.round(
      (clampedX / Math.max(rect.width, 1)) * Math.max(chartPoints.length - 1, 0),
    );

    setActiveIndex(nextIndex);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (chartPoints.length === 0) {
      return;
    }

    setIsInteracting(true);
    updateActivePoint(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isInteracting) {
      return;
    }

    updateActivePoint(event.clientX);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetInteraction();
  };

  const handlePrimaryRangeChange = (value: ChartRange | 'minute') => {
    resetInteraction();

    if (value === 'minute') {
      props.onRangeChange(isMinuteRange ? props.range : '1m');
      return;
    }

    props.onRangeChange(value);
  };

  return (
    <div className="space-y-3">
      <div className="mobile-soft-card overflow-hidden rounded-[28px] border p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
              차트 보기
            </p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-2xl font-black tracking-tight text-[color:var(--text-main)]">
                {typeof displayPrice === 'number' && Number.isFinite(displayPrice)
                  ? formatPrice(displayPrice, props.currency)
                  : '-'}
              </p>
              {changeRateText ? (
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trendClass}`}>
                  {changeRateText}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-full border border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--text-sub)]">
            {isInteracting && displayPoint ? formatDetailLabel(displayPoint.date) : RANGE_LABELS[props.range]}
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {PRIMARY_RANGE_OPTIONS.map((option) => {
            const isActive = option.value === 'minute' ? isMinuteRange : props.range === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePrimaryRangeChange(option.value)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? 'mobile-chip-active' : 'mobile-chip-idle'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {isMinuteRange ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MINUTE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  resetInteraction();
                  props.onRangeChange(option.value);
                }}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  props.range === option.value ? 'mobile-chip-active' : 'mobile-chip-idle'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {props.isLoading ? (
          <div className="mt-4 flex h-52 items-center justify-center rounded-[24px] border border-dashed border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] text-sm text-[color:var(--text-sub)]">
            차트 데이터를 불러오는 중이에요.
          </div>
        ) : props.errorMessage ? (
          <div className="mt-4 flex h-52 items-center justify-center rounded-[24px] border border-dashed border-rose-400/25 bg-rose-500/8 px-5 text-center text-sm text-rose-700 dark:text-rose-200">
            {props.errorMessage}
          </div>
        ) : props.points.length === 0 ? (
          <div className="mt-4 flex h-52 items-center justify-center rounded-[24px] border border-dashed border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] text-sm text-[color:var(--text-sub)]">
            차트 데이터가 없어요.
          </div>
        ) : (
          <div
            ref={chartRef}
            className="mt-4 overflow-hidden rounded-[24px] border border-[color:var(--soft-panel-border)] bg-[color:var(--field-bg)] px-3 py-4 touch-none"
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
          >
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-52 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3].map((line) => {
                const y = CHART_PADDING + ((CHART_HEIGHT - CHART_PADDING * 2) / 3) * line;

                return (
                  <line
                    key={line}
                    x1={CHART_PADDING}
                    y1={y}
                    x2={CHART_WIDTH - CHART_PADDING}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeDasharray="4 6"
                  />
                );
              })}

              <path d={areaPath} fill={`url(#${chartGradientId})`} />
              <path
                d={pointsPath}
                fill="none"
                stroke={chartColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              {isInteracting && displayPoint ? (
                <>
                  <line
                    x1={displayPoint.x}
                    y1={CHART_PADDING}
                    x2={displayPoint.x}
                    y2={CHART_HEIGHT - CHART_PADDING}
                    stroke={chartColor}
                    strokeDasharray="4 6"
                    strokeOpacity="0.55"
                  />
                  <circle cx={displayPoint.x} cy={displayPoint.y} r="8" fill={chartColor} fillOpacity="0.14" />
                  <circle
                    cx={displayPoint.x}
                    cy={displayPoint.y}
                    r="4.5"
                    fill={chartColor}
                    stroke="white"
                    strokeWidth="2"
                  />
                </>
              ) : null}
            </svg>

            <div className="mt-3 flex items-center justify-between text-xs font-medium text-[color:var(--text-sub)]">
              <span>{formatAxisLabel(props.points[0].date)}</span>
              <span>{formatAxisLabel(props.points[props.points.length - 1].date)}</span>
            </div>
          </div>
        )}

        {props.points.length > 0 ? (
          <div className="mt-3 rounded-[18px] border border-[color:var(--soft-panel-border)] bg-[color:var(--soft-panel-bg)] px-3 py-3">
            <p className="text-[11px] font-semibold text-[color:var(--text-sub)]">{helperTitle}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[color:var(--text-main)]">{helperText}</p>
              {isInteracting && displayPoint ? (
                <p className="shrink-0 text-sm font-bold text-[color:var(--text-main)]">
                  {formatPrice(displayPoint.price, props.currency)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {props.points.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="mobile-soft-card rounded-[18px] border px-3 py-3">
              <p className="text-[11px] text-[color:var(--text-sub)]">최저가</p>
              <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">
                {formatPrice(min, props.currency)}
              </p>
            </div>
            <div className="mobile-soft-card rounded-[18px] border px-3 py-3">
              <p className="text-[11px] text-[color:var(--text-sub)]">최고가</p>
              <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">
                {formatPrice(max, props.currency)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}