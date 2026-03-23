import React, { useState, useRef } from 'react';
import { City, Route } from '../types';
import * as api from '../api';
import MapVisualizer from '../components/MapVisualizer';
import ImportModal from '../components/ImportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Download, ZoomIn, ZoomOut, Plus, Search, X } from 'lucide-react';

export default function CityManager({ cities, routes, onUpdate }: { cities: City[], routes: Route[], onUpdate: () => void }) {
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [cityType, setCityType] = useState<'key' | 'normal'>('normal');
  const [filterType, setFilterType] = useState<'all' | 'key' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapHighlightedCity, setMapHighlightedCity] = useState<City | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; action: () => void }>({
    open: false, title: '', message: '', action: () => {},
  });

  const listRef = useRef<HTMLDivElement>(null);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalDesc = desc;
    if (!desc || desc.trim() === '') {
      finalDesc = cityType === 'key' ? '省会' : '地级市';
    } else if (cityType === 'key' && !desc.includes('省会') && !desc.includes('直辖市')) {
      finalDesc = `${desc}（省会）`;
    }

    const isUpdate = !!selectedCityId;
    const cityName = name;

    setConfirmDialog({
      open: true,
      title: isUpdate ? '确认更新城市' : '确认添加城市',
      message: isUpdate
        ? `将更新城市「${cityName}」的信息，此操作会直接修改数据文件。`
        : `将添加新城市「${cityName}」(${x}, ${y})，此操作会直接写入数据文件。`,
      action: async () => {
        if (isUpdate) {
          await api.deleteCity(selectedCityId!);
        }
        await api.addCity({ name, x: parseInt(x), y: parseInt(y), description: finalDesc });
        setName(''); setX(''); setY(''); setDesc('');
        setSelectedCityId(null);
        setCityType('normal');
        onUpdate();
      },
    });
  };

  const handleDelete = (id: string) => {
    const city = cities.find(c => c.id === id);
    setConfirmDialog({
      open: true,
      title: '确认删除城市',
      message: `将删除城市「${city?.name || '未知'}」，此操作不可恢复，会直接修改数据文件。`,
      action: async () => {
        await api.deleteCity(id);
        if (selectedCityId === id) {
          setName(''); setX(''); setY(''); setDesc('');
          setSelectedCityId(null);
        }
        onUpdate();
      },
    });
  };

  const handleSelect = (city: City) => {
    setSelectedCityId(city.id);
    setMapHighlightedCity(city); // 地图上高亮该城市
    setName(city.name);
    setX(city.x.toString());
    setY(city.y.toString());
    setDesc(city.description);

    // 根据城市描述自动识别类型
    const isKeyCity = city.description?.includes('省会') || city.description?.includes('直辖市');
    setCityType(isKeyCity ? 'key' : 'normal');

    // 滚动列表到选中项
    setTimeout(() => {
      const element = document.getElementById(`city-item-${city.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  // 地图上点击城市时的处理
  const handleMapCityClick = (city: City) => {
    setSelectedCityId(city.id);
    setMapHighlightedCity(city);
    setName(city.name);
    setX(city.x.toString());
    setY(city.y.toString());
    setDesc(city.description);

    // 根据城市描述自动识别类型
    const isKeyCity = city.description?.includes('省会') || city.description?.includes('直辖市');
    setCityType(isKeyCity ? 'key' : 'normal');

    // 滚动左侧列表到选中项
    setTimeout(() => {
      const element = document.getElementById(`city-item-${city.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleReset = () => {
    setSelectedCityId(null);
    setName('');
    setX('');
    setY('');
    setDesc('');
    setCityType('trunk'); // 重置类型选择
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden h-full">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-semibold text-slate-800">城市节点配置</h2>
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text)' }} />
            <input
              type="text"
              placeholder="搜索城市..."
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
        <div className="flex items-center gap-4">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 apple-btn-secondary text-sm font-medium">
            <Download className="h-4 w-4" />
            导入数据
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex overflow-hidden">
        {/* CRUD Form Panel */}
        <section className="w-80 flex flex-col bg-white border-r border-slate-200 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">城市信息</h3>
            <form className="space-y-4" onSubmit={handleAddOrUpdate}>
              <div>
                <input
                  required
                  className="w-full apple-input px-4 py-3 text-sm"
                  id="city-name" name="name" placeholder="请输入城市名称" type="text"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    required
                    className="w-full apple-input px-4 py-3 text-sm"
                    id="coord-x" name="x" placeholder="坐标-X" type="number"
                    value={x} onChange={e => setX(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    required
                    className="w-full apple-input px-4 py-3 text-sm"
                    id="coord-y" name="y" placeholder="坐标-Y" type="number"
                    value={y} onChange={e => setY(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <textarea
                  className="w-full apple-input px-4 py-3 text-sm resize-none"
                  id="description" name="description" placeholder="描述：城市类型、备注等..." rows={2}
                  value={desc} onChange={e => setDesc(e.target.value)}
                />
              </div>

              {/* 城市类型选择 */}
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCityType('key')}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      cityType === 'key'
                        ? 'border border-[#1c85e8] bg-blue-50 text-[#1c85e8]'
                        : 'border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    省会/直辖市
                  </button>
                  <button
                    type="button"
                    onClick={() => setCityType('normal')}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      cityType === 'normal'
                        ? 'border border-[#ff886f] bg-[#fff5f2] text-[#ff886f]'
                        : 'border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    地级市
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-[#1c85e8] hover:bg-[#1870c5] text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                {selectedCityId ? '更新城市' : '添加城市'}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => selectedCityId && handleDelete(selectedCityId)}
                  disabled={!selectedCityId}
                  className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${selectedCityId ? 'text-[#ff886f] hover:bg-[#fff5f2]' : 'text-slate-400 cursor-not-allowed'}`}
                >
                  删除
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  重置
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">节点列表</h3>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部 ({cities.length})
              </button>
              <button
                onClick={() => setFilterType('key')}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  filterType === 'key'
                    ? 'bg-[#1c85e8] text-white'
                    : 'bg-blue-50 text-[#1c85e8] hover:bg-blue-100'
                }`}
              >
                省会/直辖市 ({cities.filter(c => c.description?.includes('省会') || c.description?.includes('直辖市')).length})
              </button>
              <button
                onClick={() => setFilterType('normal')}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  filterType === 'normal'
                    ? 'bg-[#ff886f] text-white'
                    : 'bg-[#fff5f2] text-[#ff886f] hover:bg-[#ffe8e2]'
                }`}
              >
                地级市 ({cities.filter(c => !c.description?.includes('省会') && !c.description?.includes('直辖市')).length})
              </button>
            </div>

            <div className="space-y-3">
              {[...cities]
                .reverse()  // 新添加的在最上面
                .filter(c => {
                  // 搜索过滤（模糊匹配城市名称）
                  if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return false;
                  }
                  // 类型筛选
                  if (filterType === 'all') return true;
                  if (filterType === 'key') {
                    return c.description?.includes('省会') || c.description?.includes('直辖市');
                  }
                  if (filterType === 'normal') {
                    return !c.description?.includes('省会') && !c.description?.includes('直辖市');
                  }
                  return true;
                })
                .map((c, index) => {
                  const isSelected = selectedCityId === c.id;
                  const isMapHighlighted = mapHighlightedCity?.id === c.id;
                  const isEven = index % 2 === 0;

                  return (
                    <div
                      key={c.id}
                      id={`city-item-${c.id}`}
                      onClick={() => handleSelect(c)}
                      className={`p-3 border rounded-lg transition-all group relative ${
                        isMapHighlighted
                          ? 'bg-orange-50 border-orange-300 shadow-sm ring-2 ring-orange-400 ring-opacity-50 animate-pulse'
                          : isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : `border-slate-100 hover:border-slate-300 ${!isEven ? 'bg-slate-50' : 'bg-white'}`
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 text-sm font-medium">
                            <span>{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.description?.includes('省会') || c.description?.includes('直辖市') ? 'bg-blue-50 text-[#1c85e8]' : 'bg-[#fff5f2] text-[#ff886f]'}`}>
                              {c.description?.includes('省会') || c.description?.includes('直辖市') ? '省会/直辖市' : '地级市'}
                            </span>
                            <span className="text-[10px] text-slate-400">X:{c.x}, Y:{c.y}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.id);
                          }}
                          className="text-slate-400 hover:text-[#ff886f] transition-colors"
                          title="移除城市"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              {cities.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-4">暂无城市数据</div>
              )}
            </div>
          </div>
        </section>

        {/* Map Visualization Panel */}
        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities.filter(c => {
                // 搜索过滤
                if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                // 类型筛选
                if (filterType === 'key') {
                  return c.description?.includes('省会') || c.description?.includes('直辖市');
                }
                if (filterType === 'normal') {
                  return !c.description?.includes('省会') && !c.description?.includes('直辖市');
                }
                return true;
              })}
              routes={routes}
              highlightedCities={mapHighlightedCity ? [{ id: mapHighlightedCity.id, color: '#ff886f' }] : []}
              onCityClick={handleMapCityClick}
              showCoords={true}
              onMapClick={(clickX, clickY) => {
                setX(clickX.toString());
                setY(clickY.toString());
              }}
            />

            {/* Legend - 动态显示当前筛选状态 */}
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-[10px] text-slate-500 font-mono shadow-sm flex items-center gap-2">
              {searchQuery && (
                <span>搜索: "{searchQuery}"</span>
              )}
              {filterType !== 'all' && (
                <span>
                  {filterType === 'key' ? '省会/直辖市' : '地级市'}
                </span>
              )}
              <span className="text-orange-500 font-sans font-medium">点击地图自动填入坐标</span>
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
