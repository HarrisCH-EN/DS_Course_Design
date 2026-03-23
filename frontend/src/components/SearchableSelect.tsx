import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, MapPin } from 'lucide-react';
import { City } from '../types';

interface SearchableSelectProps {
  cities: City[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  selecting?: boolean;  // 是否正在等待地图点击
  onSelectFromMap?: () => void;  // 点击"从地图选择"按钮
  excludeId?: string;  // 排除的城市ID（避免起点终点相同）
  label?: string;
}

export default function SearchableSelect({
  cities,
  value,
  onChange,
  placeholder,
  selecting = false,
  onSelectFromMap,
  excludeId,
  label,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCity = cities.find(c => c.id === value);

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = cities
    .filter(c => c.id !== excludeId)
    .filter(c => {
      if (!search) return true;
      return c.name.toLowerCase().includes(search.toLowerCase()) ||
             c.id === search ||
             (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    })
    .sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>}
      <div className={`flex items-center gap-1 rounded-lg border transition-all ${
        selecting
          ? 'border-[#ff886f] ring-2 ring-[#ff886f]/20 bg-[#fff5f2]'
          : 'border-slate-200 hover:border-slate-300'
      }`}>
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 cursor-pointer min-h-[38px]"
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        >
          {selectedCity ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800 truncate">{selectedCity.name}</span>
              <span className="text-[10px] text-slate-400 shrink-0">({selectedCity.x}, {selectedCity.y})</span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
              placeholder={selecting ? '请点击地图选择...' : placeholder}
              value={search}
              onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
            />
          )}
          {selectedCity && !isOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onSelectFromMap && (
          <button
            type="button"
            onClick={onSelectFromMap}
            className={`px-2 py-2 border-l transition-colors shrink-0 ${
              selecting
                ? 'text-[#ff886f] bg-white'
                : 'text-slate-400 hover:text-[#ff886f] hover:bg-slate-50'
            }`}
            title="从地图选择"
          >
            <MapPin className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-50">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-slate-400">无匹配城市</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-blue-50 transition-colors ${
                  value === c.id ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-sm text-slate-800">{c.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{c.x}, {c.y}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
