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
import { MarketIndicesWidget } from './components/stocks/MarketIndicesWidget';
import { StockChart } from './components/stocks/StockChart';
import { GroupPortfolioWidget } from './components/groups/GroupPortfolioWidget';


const MainContent = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* Top Section: Ticker + QuickView + Hot */}
            <div>
                 <StockTicker />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Column (Main) */}
                <div className="lg:col-span-9 flex flex-col gap-6 h-full min-h-0">
                    {/* Top Row: Interest Stocks & Hot Stocks */}
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-6 min-h-[300px]">
                        <div className="md:col-span-4 h-full">
                            <QuickViewDashboard onSelect={setSelectedSymbol} />
                        </div>
                        <div className="md:col-span-3 h-full">
                            <MarketIndicesWidget onSelect={setSelectedSymbol} />
                        </div>
                    </div>

                    {/* Bottom Row: Chart */}
                    <div className="flex-1 min-h-[400px]">
                        <StockChart symbol={selectedSymbol} />
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="lg:col-span-3 h-full min-h-0">
                    <GroupPortfolioWidget />
                </div>
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
