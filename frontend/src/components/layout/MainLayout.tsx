import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Settings, 
  Menu, 
  X,
  Search,
  Bell,
  Sun,
  Moon,
  List // 추가
} from 'lucide-react';
import { ProfilePopover } from '../user/ProfilePopover';
import { LoginPopover } from '../auth/LoginPopover';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}


import { useAuthStore } from '../../stores/authStore';

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const { user } = useAuthStore();


  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  /* State for Profile Popover */
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = React.useRef<HTMLButtonElement>(null);

  /* State for Login Popover */
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const loginButtonRef = React.useRef<HTMLButtonElement>(null);

  // ... navItems
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '시장 개요' },
    { id: 'stocks', icon: List, label: '전체 종목' },
    { id: 'group', icon: Users, label: '그룹 피드' },
    { id: 'portfolio', icon: TrendingUp, label: '내 포트폴리오' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5 text-foreground transition-colors duration-300 relative selection:bg-primary/30">
      <ProfilePopover 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        anchorRef={profileButtonRef}
      />
      
      <LoginPopover
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        anchorRef={loginButtonRef}
      />

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card/60 backdrop-blur-2xl border-r border-white/5 transition-transform duration-300 lg:relative lg:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)]",
          !isSidebarOpen && "-translate-x-full lg:hidden"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <button 
              onClick={() => onTabChange('dashboard')} 
              className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 tracking-tighter hover:opacity-80 transition-opacity"
            >
              Glance
            </button>
            <button onClick={toggleSidebar} className="lg:hidden">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                  activeTab === item.id
                    ? "bg-primary/15 text-primary font-semibold shadow-sm border border-primary/20" 
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon size={20} className={cn("transition-colors duration-300", activeTab === item.id ? "text-primary" : "group-hover:text-foreground")} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 hover:translate-x-1 transition-all group">
              <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="font-medium">설정</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
          <div className="flex items-center space-x-4 gap-2">
            <button 
              onClick={toggleSidebar} 
              className="p-2 bg-card hover:bg-accent border border-border/50 shadow-sm rounded-xl transition-all text-foreground/80 hover:text-primary flex items-center justify-center group"
              title="사이드바 열기/닫기"
            >
              <Menu size={22} className="group-hover:scale-110 transition-transform duration-300" />
            </button>
            <div className="relative hidden md:block w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="종목명, 키워드, 사용자 검색..." 
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-300 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-foreground transition-all duration-300 hover:rotate-12"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
            </button>
            
            {user ? (
               <button 
                ref={profileButtonRef}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
              >
                {user.nickname ? user.nickname.substring(0, 2).toUpperCase() : 'ME'}
              </button>
            ) : (
              <button 
                ref={loginButtonRef}
                onClick={() => setIsLoginOpen(!isLoginOpen)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-opacity-90 transition-opacity"
              >
                로그인
              </button>
            )}
           
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
