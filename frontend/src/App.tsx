import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { StockCard } from './components/stocks/StockCard';
// import { GroupFeed } from './components/groups/GroupFeed'; // Deprecated
import { GroupPortfolioDashboard } from './components/groups/GroupPortfolioDashboard';
import { StockListPage } from './components/stocks/StockListPage';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { PortfolioDetail } from './components/portfolio/PortfolioDetail';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { StockTicker } from './components/stocks/StockTicker';


const MainContent = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  const trendingStocks: any[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 231.42, change: 4.25, changePercent: 1.87, market: 'US' },
    { symbol: '005930', name: '삼성전자', price: 72500, change: 1200, changePercent: 1.68, market: 'KR' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 145.28, change: 12.45, changePercent: 9.38, market: 'US' },
    { symbol: '035720', name: '카카오', price: 48200, change: -500, changePercent: -1.03, market: 'KR' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <StockTicker />
            {/* Fast Market Overview */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">관심 종목 퀵뷰</h2>
                <button className="text-sm font-medium text-primary hover:underline">목록 편집</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {trendingStocks.map((stock) => (
                  <StockCard key={stock.symbol} {...stock} />
                ))}
              </div>
            </section>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <GroupPortfolioDashboard />
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

                <div className="bg-gradient-to-br from-primary to-orange-600 rounded-xl p-6 text-primary-foreground shadow-lg">
                  <h3 className="text-lg font-bold mb-2">Group Portfolio</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    그룹 멤버들과 수익률 노출 없이 <br/>
                    섹터 비중과 전략을 조용히 공유하세요.
                  </p>
                  <button className="w-full py-2 bg-white text-primary font-bold rounded-lg text-sm hover:bg-opacity-90 transition-opacity">
                    내 그룹 관리하기
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
