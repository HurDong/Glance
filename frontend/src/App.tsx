import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
// import { StockCard } from './components/stocks/StockCard'; // Unused
// import { GroupFeed } from './components/groups/GroupFeed'; // Deprecated
import { GroupPortfolioDashboard } from './components/groups/GroupPortfolioDashboard';
import { StockListPage } from './components/stocks/StockListPage';
import { MyPortfolioDashboard } from './components/portfolio/MyPortfolioDashboard';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { StockTicker } from './components/stocks/StockTicker';
import { PortfolioOverviewWidget } from './components/portfolio/PortfolioOverviewWidget';
import { MarketIndicesWidget } from './components/stocks/MarketIndicesWidget';
import { StockChart } from './components/stocks/StockChart';
import { WatchlistWidget } from './components/stocks/WatchlistWidget';
import { GlobalAlert } from './components/shared/GlobalAlert';

const MainContent = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col h-[calc(100vh-80px)] space-y-6 pb-8 custom-scrollbar overflow-y-auto overflow-x-hidden">
            {/* Top Section: Ticker */}
            <div className="w-full max-w-[1700px] mx-auto px-4 lg:px-8 pt-6">
                 <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                     <StockTicker />
                 </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 w-full max-w-[1700px] mx-auto px-4 lg:px-8">
                {/* Left Column (Main) */}
                <div className="lg:col-span-9 flex flex-col gap-6 h-full">
                    {/* Top Row: Market Indices Grid */}
                    <div className="w-full">
                        <MarketIndicesWidget onSelect={setSelectedSymbol} />
                    </div>

                    {/* Middle Row: Chart */}
                    <div className="flex-1 min-h-[500px]">
                        <StockChart symbol={selectedSymbol} />
                    </div>

                    {/* Bottom Row: Portfolio Overview */}
                    <div className="w-full">
                        <PortfolioOverviewWidget />
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="lg:col-span-3 flex flex-col gap-6 h-full">
                    <WatchlistWidget onSelect={setSelectedSymbol} />
                </div>
            </div>
          </div>
        );
      case 'stocks':
        return <StockListPage />;
      case 'portfolio':
        return <MyPortfolioDashboard />;
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
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/portfolio/:id" element={
          <MainLayout activeTab="portfolio" onTabChange={handleTabChange}>
            <MyPortfolioDashboard />
          </MainLayout>
        } />
        <Route path="/portfolio" element={
          <MainLayout activeTab="portfolio" onTabChange={handleTabChange}>
            <MyPortfolioDashboard />
          </MainLayout>
        } />
        <Route path="/*" element={<MainContent activeTab={activeTab} onTabChange={handleTabChange} />} />
      </Routes>
      <GlobalAlert />
    </>
  );
}

export default App;
