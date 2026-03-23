import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, Route as RouteIcon, Network, Navigation, Map, GitMerge, ScanSearch, Info, Menu, X } from 'lucide-react';
import * as api from './api';
import { City, Route } from './types';
import Dashboard from './views/Dashboard';
import CityManager from './views/CityManager';
import RouteManager from './views/RouteManager';
import { ConnectivityView, ShortestPathView, TSPView, SteinerTreeView, AllShortestPathsView } from './views/AnalysisViews';
import SettingsView from './views/SettingsView';
import SystemInfoView from './views/SystemInfoView';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [cities, setCities] = useState<City[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = async () => {
    const data = await api.getData();
    setCities(data.cities);
    setRoutes(data.routes);
  };

  useEffect(() => { loadData(); }, []);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard cities={cities} routes={routes} onNavigate={setCurrentView} onUpdate={loadData} />;
      case 'cities': return <CityManager cities={cities} routes={routes} onUpdate={loadData} />;
      case 'routes': return <RouteManager cities={cities} routes={routes} onUpdate={loadData} />;
      case 'connectivity': return <ConnectivityView cities={cities} routes={routes} />;
      case 'shortest-path': return <ShortestPathView cities={cities} routes={routes} />;
      case 'all-paths': return <AllShortestPathsView cities={cities} routes={routes} />;
      case 'tsp': return <TSPView cities={cities} routes={routes} />;
      case 'steiner': return <SteinerTreeView cities={cities} routes={routes} />;
      case 'settings': return <SettingsView cities={cities} routes={routes} onUpdate={loadData} />;
      case 'system-info': return <SystemInfoView />;
      default: return <div className="p-8 text-slate-500">开发中...</div>;
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => {
    const isActive = currentView === id;
    const isHovered = hoveredNav === id;
    
    return (
      <button
        onClick={() => navigateTo(id)}
        onMouseEnter={() => setHoveredNav(id)}
        onMouseLeave={() => setHoveredNav(null)}
        className="relative w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200"
        style={{
          color: isActive ? 'white' : 'var(--color-text-dark)',
          background: isActive ? 'var(--color-primary)' : (isHovered ? 'var(--color-border)' : 'transparent'),
          borderRadius: 'var(--radius)'
        }}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile header */}
      <div className="mobile-header fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 items-center px-4 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Network className="w-5 h-5 text-[#1c85e8]" />
          <span className="font-semibold text-slate-800">NetMap Studio</span>
        </div>
      </div>

      {/* Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar-desktop w-64 flex-shrink-0 flex flex-col ${sidebarOpen ? 'open' : ''}`}
        style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-border)' }}>
        {/* Logo section */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div style={{ background: 'var(--color-primary)', borderRadius: 'var(--radius)', padding: '10px' }}>
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-dark)' }}>
                NetMap Studio
              </h1>
              <p className="text-[11px] font-medium tracking-wider" style={{ color: 'var(--color-text)' }}>Data Structures Design</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto sidebar-scroll">
          {/* Main menu */}
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>主菜单</p>
          </div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="控制面板" />
          <NavItem id="cities" icon={Building2} label="城市管理" />
          <NavItem id="routes" icon={RouteIcon} label="线路管理" />

          {/* Analysis tools */}
          <div className="px-3 pt-6 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>分析工具</p>
          </div>
          <NavItem id="shortest-path" icon={Navigation} label="路径规划" />
          <NavItem id="connectivity" icon={Network} label="连通性分析" />
          <NavItem id="all-paths" icon={ScanSearch} label="全路径查询" />
          <NavItem id="tsp" icon={Map} label="商旅图分析" />
          <NavItem id="steiner" icon={GitMerge} label="施泰纳树" />

          {/* System Info */}
          <div className="px-3 pt-6 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>系统信息</p>
          </div>
          <NavItem id="system-info" icon={Info} label="关于系统" />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex-1 glass-card overflow-hidden fade-in">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
