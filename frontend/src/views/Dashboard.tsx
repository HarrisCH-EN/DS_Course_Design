import React, { useState, useRef, useEffect, useCallback } from 'react';
import { City, Route } from '../types';
import MapVisualizer from '../components/MapVisualizer';
import ImportModal from '../components/ImportModal';
import { Search, Download, Ruler, Map as MapIcon, Building2, Route as RouteIcon, X } from 'lucide-react';

interface SearchResult {
  type: 'city' | 'route';
  id: string;
  label: string;
  sublabel: string;
  cityId?: string;
  routeSource?: string;
  routeTarget?: string;
}

export default function Dashboard({ cities, routes, onNavigate, onUpdate }: { cities: City[], routes: Route[], onNavigate: (view: string) => void, onUpdate?: () => void }) {
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [highlightedCities, setHighlightedCities] = useState<{ id: string; color?: string }[]>([]);
  const [highlightedRoutes, setHighlightedRoutes] = useState<{ source: string; target: string; color?: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 模糊搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setHighlightedCities([]);
      setHighlightedRoutes([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // 搜索城市
    cities.forEach(city => {
      if (city.name.toLowerCase().includes(q) ||
          city.id === q ||
          (city.description && city.description.toLowerCase().includes(q))) {
        results.push({
          type: 'city',
          id: city.id,
          label: city.name,
          sublabel: `(${city.x}, ${city.y}) ${city.description || ''}`,
          cityId: city.id,
        });
      }
    });

    // 搜索线路
    routes.forEach(route => {
      const sourceCity = cities.find(c => c.id === route.source);
      const targetCity = cities.find(c => c.id === route.target);
      const sourceName = sourceCity?.name || route.source;
      const targetName = targetCity?.name || route.target;
      const routeLabel = `${sourceName} → ${targetName}`;

      if (routeLabel.toLowerCase().includes(q) ||
          sourceName.toLowerCase().includes(q) ||
          targetName.toLowerCase().includes(q)) {
        results.push({
          type: 'route',
          id: route.id,
          label: routeLabel,
          sublabel: route.type === 'trunk' ? '主干光缆' : '普通线路',
          routeSource: route.source,
          routeTarget: route.target,
        });
      }
    });

    setSearchResults(results.slice(0, 20));
    setShowResults(results.length > 0);

    // 实时高亮匹配项
    const matchedCityIds = results.filter(r => r.type === 'city').map(r => r.cityId!);
    const matchedRoutes = results.filter(r => r.type === 'route').map(r => ({
      source: r.routeSource!,
      target: r.routeTarget!,
    }));
    setHighlightedCities(matchedCityIds.map(id => ({ id, color: '#ff886f' })));
    setHighlightedRoutes(matchedRoutes.map(r => ({ ...r, color: '#ff886f' })));
  }, [cities, routes]);

  // 点击搜索结果
  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    if (result.type === 'city' && result.cityId) {
      setHighlightedCities([{ id: result.cityId, color: '#ff886f' }]);
      setHighlightedRoutes([]);
    } else if (result.type === 'route' && result.routeSource && result.routeTarget) {
      setHighlightedCities([]);
      setHighlightedRoutes([{ source: result.routeSource, target: result.routeTarget, color: '#ff886f' }]);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setHighlightedCities([]);
    setHighlightedRoutes([]);
  };

  // 计算平均路径长度
  const avgPathLength = routes.length > 0
    ? (routes.reduce((sum, r) => {
        const c1 = cities.find(c => c.id === r.source);
        const c2 = cities.find(c => c.id === r.target);
        if (c1 && c2) {
          return sum + Math.round(Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2)));
        }
        return sum;
      }, 0) / routes.length).toFixed(1)
    : "0";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/50 bg-white/60 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
            <input
              className="apple-input pl-10 pr-8 py-2.5 w-80 text-sm"
              placeholder="搜索城市或线路..."
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onKeyDown={e => { if (e.key === 'Escape') clearSearch(); }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* 搜索结果下拉框 */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50">
                {/* 城市分组 */}
                {searchResults.filter(r => r.type === 'city').length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">
                      城市节点 ({searchResults.filter(r => r.type === 'city').length})
                    </div>
                    {searchResults.filter(r => r.type === 'city').map(r => (
                      <button
                        key={`city-${r.id}`}
                        onClick={() => handleResultClick(r)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{r.label}</div>
                          <div className="text-[11px] text-slate-400 truncate">{r.sublabel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 线路分组 */}
                {searchResults.filter(r => r.type === 'route').length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0 border-t border-slate-100">
                      通信线路 ({searchResults.filter(r => r.type === 'route').length})
                    </div>
                    {searchResults.filter(r => r.type === 'route').map(r => (
                      <button
                        key={`route-${r.id}`}
                        onClick={() => handleResultClick(r)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                          <RouteIcon className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{r.label}</div>
                          <div className="text-[11px] text-slate-400 truncate">{r.sublabel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 无结果 */}
                {searchResults.length === 0 && searchQuery.trim() && (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    未找到匹配的城市或线路
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 搜索高亮提示 */}
          {searchQuery.trim() && !showResults && highlightedCities.length + highlightedRoutes.length > 0 && (
            <span className="text-xs text-slate-400">
              已高亮 {highlightedCities.length + highlightedRoutes.length} 个匹配项
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 apple-btn-secondary rounded-xl text-sm font-medium text-slate-700"
          >
            <Download className="h-4 w-4" />
            导入数据
          </button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部统计数据 */}
        <div className="px-8 py-6 bg-white/40 backdrop-blur-sm border-b border-slate-200/50 shrink-0">
          <div className="grid grid-cols-3 gap-6 max-w-3xl">
            <div className="glass-card p-5 rounded-2xl card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">总城市数</p>
                  <h3 className="text-3xl font-bold mt-2 gradient-text">{cities.length}</h3>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
                  <MapIcon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="glass-card p-5 rounded-2xl card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">激活线路</p>
                  <h3 className="text-3xl font-bold mt-2 gradient-text">{routes.length}</h3>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25">
                  <MapIcon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="glass-card p-5 rounded-2xl card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">平均路径长度</p>
                  <h3 className="text-3xl font-bold mt-2 gradient-text">{avgPathLength} km</h3>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/25">
                  <Ruler className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 全屏地图 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities}
              routes={routes}
              highlightedCities={highlightedCities}
              highlightedRoutes={highlightedRoutes}
              onCityClick={(city) => setHighlightedCities([{ id: city.id, color: '#ff886f' }])}
              onMapClick={() => {
                setHighlightedCities([]);
                setHighlightedRoutes([]);
              }}
            />

            {/* 左下角状态面板 */}
            <div className="absolute bottom-4 left-4 glass-card px-4 py-2 rounded-xl text-xs text-slate-600 font-medium">
              {highlightedCities.length + highlightedRoutes.length > 0 ? (
                <span className="text-[#ff886f]">
                  搜索高亮: {highlightedCities.length} 个城市, {highlightedRoutes.length} 条线路
                </span>
              ) : (
                '坐标系比例: 1px = 1km | 中心点: 0,0'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => { if (onUpdate) onUpdate(); }}
      />
    </div>
  );
}
