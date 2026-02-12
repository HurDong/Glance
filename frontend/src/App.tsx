import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
// import { StockCard } from './components/stocks/StockCard'; // Unused
// import { GroupFeed } from './components/groups/GroupFeed'; // Deprecated
import { GroupPortfolioDashboard } from './components/groups/GroupPortfolioDashboard';
import { StockListPage } from './components/stocks/StockListPage';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { PortfolioDetail } from './components/portfolio/PortfolioDetail';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { StockTicker } from './components/stocks/StockTicker';
import { QuickViewDashboard } from './components/stocks/QuickViewDashboard';


const MainContent = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  // const trendingStocks: any[] = ... // Unused

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <StockTicker />
            {/* Fast Market Overview - Now Quick View Dashboard */}
            <QuickViewDashboard />

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                 {/*  GroupPortfolioDashboard Removed from here. 
                      Ideally we can place other widgets here, or expand QuickView.
                      For now, leaving it empty or adding a placeholder/chart if needed. 
                      But since the prompt asked to *increase* space for QuickView, 
                      QuickView is already taking full width above. 
                      So I will just leave the layout structure but maybe remove the column split if not needed, 
                      or keep it for future widgets. 
                      Let's actually MAKE QuickView taking MORE space by not confining it? 
                      It is already in a full-width section above. 
                      
                      Let's just put some market news or summary here instead of empty space? 
                      Or maybe just remove the grid if it's empty.
                      
                      Wait, the prompt said "Group Portfolio lookup is better managed in Group Feed than Main Page".
                      So I removed GroupPortfolioDashboard. 
                      The "Quick View" is now the main star.
                  */}
                 <div className="bg-card rounded-xl border border-border p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <p className="text-lg font-medium mb-2">Market Overview & News</p>
                        <p className="text-sm">준비 중인 기능입니다.</p>
                    </div>
                 </div>
              </div>

              <aside className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="font-bold border-b border-border pb-3 mb-4">빠른 종목 통계</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    증권사 앱보다 3배 빠른 조회. <br/>
                    관심 종목을 등록하고 즉시 시세를 확인하세요.
                  </p>
                  <div className="space-y-2">
                    {['삼성전자', 'SK하이닉스', '마이크로소프트', '구글'].map(name => (
                      <div key={name} className="flex justify-between items-center p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-[10px] text-muted-foreground">간편 조회</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group Portfolio Promotion Widget - Keeping it but pointing to Group Tab? Or removing?
                    "Group Portfolio management... better in Group Feed".
                    I'll keep a small link/promo card but not the dashboard itself.
                */}
                <div className="bg-gradient-to-br from-primary to-orange-600 rounded-xl p-6 text-primary-foreground shadow-lg">
                  <h3 className="text-lg font-bold mb-2">Group Portfolio</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    친구들과 함께하는 투자. <br/>
                    그룹 탭에서 확인하세요.
                  </p>
                  <button 
                    onClick={() => onTabChange('group')}
                    className="w-full py-2 bg-white text-primary font-bold rounded-lg text-sm hover:bg-opacity-90 transition-opacity"
                  >
                    그룹으로 이동
                  </button>
                </div>
              </aside>
            </div>
          </div>
        );
      case 'stocks':
        return <StockListPage />;
      case 'portfolio':
        return <PortfolioList />;
      case 'group':
        return <GroupPortfolioDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
            준비 중인 기능입니다.
          </div>
        );
    }
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={onTabChange}>
      {renderContent()}
    </MainLayout>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/portfolio/:id" element={
        <MainLayout activeTab="portfolio" onTabChange={handleTabChange}>
          <PortfolioDetail />
        </MainLayout>
      } />
      <Route path="/portfolio" element={
        <MainLayout activeTab="portfolio" onTabChange={handleTabChange}>
          <PortfolioList />
        </MainLayout>
      } />
      <Route path="/*" element={<MainContent activeTab={activeTab} onTabChange={handleTabChange} />} />
    </Routes>
  );
}

export default App;
