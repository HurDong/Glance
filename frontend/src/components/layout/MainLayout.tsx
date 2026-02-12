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

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
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
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300 relative">
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full lg:hidden"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <button 
              onClick={() => onTabChange('dashboard')} 
              className="text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity"
            >
              Glance
            </button>
            <button onClick={toggleSidebar} className="lg:hidden">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group",
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Settings size={20} />
              <span className="font-medium">설정</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border">
          <div className="flex items-center space-x-4">
            <button onClick={toggleSidebar} className="p-2 hover:bg-accent rounded-md">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="종목명, 키워드, 사용자 검색..." 
                className="w-full bg-muted border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="p-2 hover:bg-accent rounded-full text-muted-foreground relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
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
        <main className="flex-1 overflow-y-auto p-6 bg-background/50">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
