import React, { useState, useRef } from 'react';
import { X, Upload, FileJson } from 'lucide-react';
import * as api from '../api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'cities' | 'routes'>('cities');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (activeTab === 'cities') {
        const citiesData = Array.isArray(data) ? data : (data.cities || []);
        const validCities = citiesData.filter((c: any) => c.name && c.x !== undefined && c.y !== undefined);
        const res = await api.replaceCities(validCities.map((c: any) => ({
          name: c.name,
          x: c.x,
          y: c.y,
          description: c.description || '',
        })));
        setResult({ type: 'success', message: `已覆盖导入 ${res.count} 个城市` });
      } else {
        const routesData = Array.isArray(data) ? data : (data.routes || []);
        const validRoutes = routesData.filter((r: any) => r.source && r.target);
        const res = await api.replaceRoutes(validRoutes.map((r: any) => ({
          source: String(r.source),
          target: String(r.target),
          type: r.type || 'normal',
        })));
        setResult({ type: 'success', message: `已覆盖导入 ${res.count} 条线路` });
      }

      onSuccess();
    } catch (error) {
      setResult({
        type: 'error',
        message: `导入失败: ${error instanceof Error ? error.message : '文件格式错误'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 fade-in" onClick={onClose}>
      <div className="glass-card rounded-3xl w-[500px] max-h-[80vh] overflow-hidden scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">导入数据</h2>
            <p className="text-sm text-slate-500 mt-1">支持 JSON 格式 · 覆盖现有数据</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 mx-6 mt-4 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => { setActiveTab('cities'); setResult(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'cities' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            城市数据
          </button>
          <button
            onClick={() => { setActiveTab('routes'); setResult(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'routes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            路线数据
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 结果动画提示 */}
          {result && (
            <div className={`mb-4 p-5 rounded-2xl flex flex-col items-center gap-3 ${
              result.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              {/* 动画图标 */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
              } ${result.type === 'success' ? 'animate-bounce-once' : 'animate-shake'}`}>
                {result.type === 'success' ? (
                  <svg className="w-8 h-8 text-emerald-500 checkmark-animate" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-500 crossmark-animate" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className={`text-sm font-semibold ${result.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.message}
              </p>
            </div>
          )}

          {/* Drop Zone */}
          {!result && (
            <div
              onClick={handleFileSelect}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleFileChange} />
              <div className={`p-4 rounded-2xl mb-4 ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? '释放文件以导入' : '点击或拖拽文件到此处'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {activeTab === 'cities' ? '支持 cities.json 格式' : '支持 routes.json 格式'}
              </p>
              <p className="text-[10px] text-orange-500 mt-1 font-medium">
                ⚠ 将覆盖现有所有{activeTab === 'cities' ? '城市' : '线路'}数据
              </p>
            </div>
          )}

          {/* 示例格式 */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileJson className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">示例格式</span>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-[#ff886f] font-mono">
                {activeTab === 'cities' ? `[
  { "name": "北京", "x": 0, "y": 0, "description": "首都" },
  { "name": "上海", "x": 450, "y": 88, "description": "经济中心" }
]` : `[
  { "source": "1", "target": "2", "type": "normal" },
  { "source": "2", "target": "3", "type": "trunk" }
]`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 apple-btn-secondary rounded-xl text-sm font-medium text-slate-700">
            关闭
          </button>
          {!result && (
            <button onClick={handleFileSelect} disabled={isProcessing} className="px-5 py-2.5 apple-btn rounded-xl text-sm font-medium text-white disabled:opacity-50">
              {isProcessing ? '处理中...' : '选择文件'}
            </button>
          )}
          {result && (
            <button onClick={() => setResult(null)} className="px-5 py-2.5 apple-btn rounded-xl text-sm font-medium text-white">
              继续导入
            </button>
          )}
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes bounceOnce {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.2); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.05); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes checkmarkDraw {
          0% { stroke-dasharray: 50; stroke-dashoffset: 50; }
          100% { stroke-dasharray: 50; stroke-dashoffset: 0; }
        }
        @keyframes crossDraw {
          0% { stroke-dasharray: 50; stroke-dashoffset: 50; }
          100% { stroke-dasharray: 50; stroke-dashoffset: 0; }
        }
        .animate-bounce-once { animation: bounceOnce 0.6s ease-out; }
        .animate-shake { animation: shake 0.5s ease-out; }
        .checkmark-animate path { animation: checkmarkDraw 0.4s ease-out 0.2s both; stroke-dasharray: 50; stroke-dashoffset: 50; }
        .crossmark-animate path { animation: crossDraw 0.3s ease-out 0.1s both; stroke-dasharray: 50; stroke-dashoffset: 50; }
      `}</style>
    </div>
  );
}
