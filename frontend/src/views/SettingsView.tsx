import React, { useRef, useState } from 'react';
import { UploadCloud, FileJson, X } from 'lucide-react';
import { City, Route } from '../types';
import MapVisualizer from '../components/MapVisualizer';
import * as api from '../api';

export default function SettingsView({ cities, routes, onUpdate }: { cities: City[], routes: Route[], onUpdate?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [exampleType, setExampleType] = useState<'cities' | 'routes'>('cities');

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (Array.isArray(data)) {
        if (data.length > 0 && data[0].name && data[0].x !== undefined) {
          for (const city of data) {
            await api.addCity({ name: city.name, x: city.x, y: city.y, description: city.description || '' });
          }
          alert(`成功导入 ${data.length} 个城市`);
        } else if (data.length > 0 && data[0].source && data[0].target) {
          for (const route of data) {
            await api.addRoute({ source: route.source, target: route.target, type: route.type || 'normal' });
          }
          alert(`成功导入 ${data.length} 条路线`);
        }
      } else if (data.cities && data.routes) {
        for (const city of data.cities) {
          await api.addCity({ name: city.name, x: city.x, y: city.y, description: city.description || '' });
        }
        for (const route of data.routes) {
          await api.addRoute({ source: route.source, target: route.target, type: route.type || 'normal' });
        }
        alert(`成功导入 ${data.cities.length} 个城市和 ${data.routes.length} 条路线`);
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('文件格式错误，请检查JSON格式');
      console.error(error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const getExampleData = () => {
    if (exampleType === 'cities') {
      return JSON.stringify(cities.slice(0, 5), null, 2);
    } else {
      return JSON.stringify(routes.slice(0, 5), null, 2);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Settings Configuration */}
      <div className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-dark)' }}>数据导入</h2>
          <p className="mt-1" style={{ color: 'var(--color-text)' }}>上传城市节点或网络拓扑数据</p>
        </header>
        <div className="max-w-3xl space-y-6">
          {/* File Import Section */}
          <section className="glass-card p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-dark)' }}>
              <UploadCloud className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              导入数据
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text)' }}>支持 JSON 格式，可导入城市数据、路线数据或合并数据</p>
            <div 
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer"
              style={{
                borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
                background: isDragging ? 'var(--color-bg)' : 'transparent'
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange}
              />
              <UploadCloud className="w-12 h-12 mb-3" style={{ color: isDragging ? 'var(--color-primary)' : 'var(--color-text)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-dark)' }}>
                {isDragging ? '释放文件以导入' : '点击或将文件拖拽至此处'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text)' }}>支持 cities.json / routes.json / 合并数据</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={handleUploadClick} className="apple-btn px-4 py-2 rounded-xl text-sm font-medium">
                选择文件
              </button>
              <button onClick={() => setShowExample(true)} className="apple-btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                查看示例文件
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Map Preview Area */}
      <section className="w-[450px] p-4 border-l overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-full glass-card rounded-xl overflow-hidden">
          <div className="relative h-full">
            <MapVisualizer cities={cities} routes={routes} />
          </div>
        </div>
      </section>

      {/* Example File Modal */}
      {showExample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExample(false)}>
          <div className="glass-card rounded-2xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-dark)' }}>示例文件格式</h3>
              <button onClick={() => setShowExample(false)} className="p-2 rounded-lg" style={{ color: 'var(--color-text)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setExampleType('cities')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: exampleType === 'cities' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: exampleType === 'cities' ? 'white' : 'var(--color-text-dark)'
                  }}
                >
                  cities.json
                </button>
                <button 
                  onClick={() => setExampleType('routes')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: exampleType === 'routes' ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: exampleType === 'routes' ? 'white' : 'var(--color-text-dark)'
                  }}
                >
                  routes.json
                </button>
              </div>
              <div className="rounded-xl p-4 overflow-auto max-h-[400px]" style={{ background: '#1a1a1a' }}>
                <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#4ade80' }}>{getExampleData()}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
