import React from 'react';
import { Users, PieChart, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface GroupActivity {
  id: string;
  userName: string;
  userAvatar: string;
  action: string;
  topSectors: { name: string; percentage: number }[];
  timestamp: string;
}

const DUMMY_ACTIVITIES: GroupActivity[] = [
  {
    id: '1',
    userName: '김철수',
    userAvatar: 'CS',
    action: '포트폴리오 비중을 조정했습니다.',
    topSectors: [
      { name: '반도체', percentage: 45 },
      { name: '2차전지', percentage: 30 },
      { name: '현금', percentage: 25 },
    ],
    timestamp: '2시간 전'
  },
  {
    id: '2',
    userName: '이영희',
    userAvatar: 'YH',
    action: '새로운 종목을 관심 목록에 추가했습니다.',
    topSectors: [
      { name: '빅테크', percentage: 60 },
      { name: '헬스케어', percentage: 20 },
      { name: '에너지', percentage: 20 },
    ],
    timestamp: '5시간 전'
  }
];

export const GroupFeed: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users size={20} className="text-primary" />
          그룹 활동 피드
        </h2>
        <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          <ShieldCheck size={12} className="mr-1" />
          마스킹 처리됨
        </div>
      </div>

      {DUMMY_ACTIVITIES.map((activity) => (
        <div key={activity.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm">
                {activity.userAvatar}
              </div>
              <div>
                <p className="font-bold text-sm">{activity.userName}</p>
                <p className="text-xs text-muted-foreground">{activity.action}</p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{activity.timestamp}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-muted-foreground">
                <PieChart size={14} />
                주요 자산 비중
              </span>
              <ArrowUpRight size={14} className="text-muted-foreground" />
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
              {activity.topSectors.map((sector, idx) => (
                <div 
                  key={sector.name}
                  style={{ width: `${sector.percentage}%` }}
                  className={`${
                    idx === 0 ? 'bg-primary' : 
                    idx === 1 ? 'bg-orange-400' : 'bg-orange-200'
                  }`}
                  title={`${sector.name}: ${sector.percentage}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {activity.topSectors.map((sector) => (
                <div key={sector.name} className="flex items-center text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-primary mr-1.5" />
                  <span className="text-muted-foreground mr-1">{sector.name}</span>
                  <span className="font-bold">{sector.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
