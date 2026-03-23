import React, { useState, useRef } from 'react';
import { City, Route } from '../types';
import * as api from '../api';
import MapVisualizer from '../components/MapVisualizer';
import ImportModal from '../components/ImportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Download, ArrowRight, Trash2, Plus, Search, X } from 'lucide-react';

export default function RouteManager({ cities, routes, onUpdate }: { cities: City[], routes: Route[], onUpdate: () => void }) {
  const [showImport, setShowImport] = useState(false);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [highlightedRouteFromMap, setHighlightedRouteFromMap] = useState<Route | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; action: () => void }>({
    open: false, title: '', message: '', action: () => {},
  });

  // 地图选点：如果起点为空则设起点，否则设终点
  const handleMapCityClick = (city: City) => {
    if (!source) {
      setSource(city.id);
    } else if (!target) {
      setTarget(city.id);
    } else {
      setSource(city.id);
      setTarget('');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !target) return alert('请选择起点和终点');
    if (source === target) return alert('起点和终点不能相同');

    const exists = routes.some(r =>
      (r.source === source && r.target === target) ||
      (r.source === target && r.target === source)
    );
    if (exists) return alert('该线路已存在');

    const sourceName = cities.find(c => c.id === source)?.name || source;
    const targetName = cities.find(c => c.id === target)?.name || target;

    setConfirmDialog({
      open: true,
      title: '确认添加线路',
      message: `将添加线路「${sourceName} → ${targetName}」，此操作会直接写入数据文件。`,
      action: async () => {
        await api.addRoute({ source, target });
        setSource('');
        setTarget('');
        onUpdate();
      },
    });
  };

  const handleDelete = (id: string) => {
    const route = routes.find(r => r.id === id);
    const sourceName = cities.find(c => c.id === route?.source)?.name || '未知';
    const targetName = cities.find(c => c.id === route?.target)?.name || '未知';

    setConfirmDialog({
      open: true,
      title: '确认删除线路',
      message: `将删除线路「${sourceName} → ${targetName}」，此操作不可恢复，会直接修改数据文件。`,
      action: async () => {
        await api.deleteRoute(id);
        if (selectedRouteId === id) setSelectedRouteId(null);
        if (highlightedRouteFromMap?.id === id) setHighlightedRouteFromMap(null);
        onUpdate();
      },
    });
  };

  const handleSelectRoute = (route: Route) => {
    setSelectedRouteId(route.id);
    setHighlightedRouteFromMap(route);
    setTimeout(() => {
      const element = document.getElementById(`route-item-${route.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  const handleMapRouteClick = (route: Route) => {
    setSelectedRouteId(route.id);
    setHighlightedRouteFromMap(route);
    setTimeout(() => {
      const element = document.getElementById(`route-item-${route.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const calculateDistance = (c1: City, c2: City) => {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  };

  const filteredRoutes = [...routes].reverse().filter(r => {
    if (searchQuery) {
      const c1 = cities.find(c => c.id === r.source);
      const c2 = cities.find(c => c.id === r.target);
      const matchesSource = c1?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTarget = c2?.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSource && !matchesTarget) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      {/* Global Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">线路管理</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text)' }} />
            <input
              type="text"
              placeholder="搜索城市或线路..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="apple-input pl-10 pr-4 py-2.5 w-64 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                style={{ color: 'var(--color-text)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 apple-btn-secondary text-sm font-medium">
            <Download className="h-4 w-4" />
            导入数据
          </button>
        </div>
      </header>

      {/* Main Interactive Area */}
      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        {/* Left Control Panel */}
        <section className="w-80 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4">添加线路</h3>
            <form className="space-y-4" onSubmit={handleAdd}>
              <div>
                <select 
                  required
                  className="block w-full rounded-md border-slate-300 text-sm focus:ring-[#1c85e8] focus:border-[#1c85e8] py-2 px-3 border"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                >
                  <option value="">请选择起始城市</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <select 
                  required
                  className="block w-full rounded-md border-slate-300 text-sm focus:ring-[#1c85e8] focus:border-[#1c85e8] py-2 px-3 border"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                >
                  <option value="">请选择终止城市</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#1c85e8] hover:bg-[#1870c5] text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                添加线路
              </button>
            </form>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">现有线路</h3>
              <span className="text-xs text-slate-500">共 {filteredRoutes.length} 条</span>
            </div>

            {/* Route List Items */}
            <div className="space-y-3">
              {filteredRoutes.map((r, index) => {
                const c1 = cities.find(c => c.id === r.source);
                const c2 = cities.find(c => c.id === r.target);
                if (!c1 || !c2) return null;

                const distance = calculateDistance(c1, c2);
                const isEven = index % 2 === 0;
                const isSelected = selectedRouteId === r.id;
                const isMapHighlighted = highlightedRouteFromMap?.id === r.id;

                return (
                  <div
                    key={r.id}
                    id={`route-item-${r.id}`}
                    onClick={() => handleSelectRoute(r)}
                    className={`p-3 border rounded-lg transition-all group relative ${
                      isMapHighlighted
                        ? 'bg-orange-50 border-orange-300 shadow-sm ring-2 ring-orange-400 ring-opacity-50'
                        : isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : `border-slate-100 hover:border-slate-300 ${!isEven ? 'bg-slate-50' : 'bg-white'}`
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 text-sm font-medium">
                          <span>{c1.name}</span>
                          <ArrowRight className="text-slate-400 h-3 w-3" />
                          <span>{c2.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{distance} km</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="text-slate-400 hover:text-[#ff886f] transition-colors"
                        title="移除线路"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredRoutes.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-4">
                  {searchQuery ? '未找到匹配的线路' : '暂无线路数据'}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Map View Area */}
        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities}
              routes={filteredRoutes}
              highlightedRoutes={highlightedRouteFromMap ? [{ source: highlightedRouteFromMap.source, target: highlightedRouteFromMap.target, color: '#ff886f' }] : []}
              highlightedCities={[
                ...(source ? [{ id: source, color: '#9333ea' }] : []),
                ...(target ? [{ id: target, color: '#ff886f' }] : []),
              ]}
              disableAutoZoom={true}
              onRouteClick={handleMapRouteClick}
              onCityClick={handleMapCityClick}
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-[10px] text-slate-500 font-mono shadow-sm flex items-center gap-3">
              {searchQuery && <span>搜索: "{searchQuery}"</span>}
              <span className="text-orange-500 font-sans font-medium">点击地图选择起点/终点</span>
              {target && <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff886f] mr-1"></span>终点</span>}
              {source && <span><span className="inline-block w-2 h-2 rounded-full bg-[#9333ea] mr-1"></span>起点</span>}
            </div>
          </div>
        </section>
      </main>

      {/* Import Modal */}
      <ImportModal 
        isOpen={showImport} 
        onClose={() => setShowImport(false)} 
        onSuccess={() => { onUpdate(); }} 
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
