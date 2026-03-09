import { formatDateLabel } from '@/lib/format';

export function LineChart(props: { points: { date: string; price: number }[] }) {
  if (props.points.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-slate-900/70 px-4 py-10 text-center text-sm text-slate-400">
        차트 데이터가 없습니다.
      </div>
    );
  }

  const width = 320;
  const height = 140;
  const values = props.points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = props.points
    .map((point, index) => {
      const x = (index / Math.max(props.points.length - 1, 1)) * width;
      const y = height - ((point.price - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.58))] p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke="#60a5fa"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{formatDateLabel(props.points[0].date)}</span>
        <span>{formatDateLabel(props.points[props.points.length - 1].date)}</span>
      </div>
    </div>
  );
}
