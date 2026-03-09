import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChartNoAxesCombined,
  House,
  LogOut,
  Moon,
  Search,
  Sun,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getUnreadNotificationCount } from '@/api/notifications';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

const items = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/explore', label: '탐색', icon: Search },
  { to: '/portfolio', label: '포트폴리오', icon: ChartNoAxesCombined },
  { to: '/groups', label: '그룹', icon: Users },
];

type ThemeMode = 'light' | 'dark';

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.push);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const saved = window.localStorage.getItem('glance-mobile-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('glance-mobile-theme', theme);
  }, [theme]);

  const greeting = useMemo(() => {
    if (!user) {
      return '안녕하세요!';
    }

    return `안녕하세요 ${user.nickname}님!`;
  }, [user]);

  const isLight = theme === 'light';

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-transparent text-[color:var(--text-main)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-5rem] h-56 w-56 -translate-x-1/2 rounded-full bg-[color:var(--glow-primary)] blur-3xl" />
        <div className="absolute right-[-4rem] top-40 h-44 w-44 rounded-full bg-[color:var(--glow-secondary)] blur-3xl" />
        <div className="absolute bottom-16 left-[-3rem] h-40 w-40 rounded-full bg-[color:var(--glow-tertiary)] blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--shell-border)] bg-[color:var(--shell-bg)] px-4 py-3 shadow-card backdrop-blur-2xl">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--shell-highlight)] to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-accent)]">
                Glance
              </p>
              <p className="truncate text-sm font-semibold text-[color:var(--text-main)]">{greeting}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--shell-border)] bg-[color:var(--shell-button-bg)] text-[color:var(--text-main)] transition hover:bg-[color:var(--shell-button-hover)]"
                aria-label={isLight ? '다크 모드로 전환' : '라이트 모드로 전환'}
              >
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--shell-border)] bg-[color:var(--shell-button-bg)] text-[color:var(--text-main)] transition hover:bg-[color:var(--shell-button-hover)]"
              >
                <Bell size={18} />
                {(unreadQuery.data ?? 0) > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--brand-solid)] px-1 text-[11px] font-bold text-white">
                    {Math.min(unreadQuery.data ?? 0, 99)}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  pushToast('로그아웃되었어요.', 'info');
                  navigate('/login', { replace: true });
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--shell-border)] bg-[color:var(--shell-button-bg)] text-[color:var(--text-sub)] transition hover:bg-[color:var(--shell-button-hover)] hover:text-[color:var(--text-main)]"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2 rounded-[28px] border border-[color:var(--shell-border)] bg-[color:var(--nav-bg)] p-2 shadow-card backdrop-blur-2xl">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-1.5 py-3 text-[10px] font-semibold transition',
                  isActive
                    ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-active-text)]'
                    : 'text-[color:var(--nav-inactive-text)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[color:var(--text-main)]',
                )
              }
            >
              <item.icon size={18} />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
