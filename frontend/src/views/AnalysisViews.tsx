import React, { useState, useEffect, useRef, useCallback } from 'react';
import { City, Route } from '../types';
import * as api from '../api';
import MapVisualizer from '../components/MapVisualizer';
import { Play, FileDown, Save, Maximize, Plus, Minus, RefreshCw, Activity, GitMerge, Square, ArrowRight } from 'lucide-react';

export function ConnectivityView({ cities, routes }: { cities: City[], routes: Route[] }) {
  const [result, setResult] = useState<any>(null);
  const [missingEdges, setMissingEdges] = useState<any[]>([]);
  const [algo, setAlgo] = useState<'dfs' | 'bfs'>('dfs');
  const [speed, setSpeed] = useState(200);
  const [currentNode, setCurrentNode] = useState<string>('-');

  // 动画控制状态
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // 动画控制
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsRef = useRef<any[]>([]);

  // 生成DFS/BFS步骤（逐步可视化）
  const generateTraversalSteps = useCallback((algorithm: 'dfs' | 'bfs') => {
    const steps: any[] = [];

    // 构建邻接表
    const adjList = new Map<string, string[]>();
    cities.forEach(c => adjList.set(c.id, []));
    routes.forEach(r => {
      adjList.get(r.source)!.push(r.target);
      adjList.get(r.target)!.push(r.source); // 无向图
    });

    const visited = new Set<string>();
    const components: string[][] = [];

    // 步骤0：初始化
    steps.push({
      type: 'init',
      visited: new Set<string>(),
      currentNode: null,
      currentEdge: null,
      message: `开始${algorithm === 'dfs' ? '深度优先' : '广度优先'}遍历，探索连通分量...`
    });

    // 遍历每个连通分量
    for (const city of cities) {
      if (visited.has(city.id)) continue;

      const component: string[] = [];
      const stack: string[] = [city.id]; // DFS栈 或 BFS队列
      visited.add(city.id);

      steps.push({
        type: 'component_start',
        visited: new Set(visited),
        currentNode: city.id,
        currentEdge: null,
        message: `发现新的连通分量，起点: ${city.name}`
      });

      while (stack.length > 0) {
        let u: string;
        if (algorithm === 'dfs') {
          u = stack.pop()!;
        } else {
          u = stack.shift()!;
        }

        component.push(u);

        steps.push({
          type: 'visit',
          visited: new Set(visited),
          currentNode: u,
          currentEdge: null,
          message: `访问节点 ${cities.find(c => c.id === u)?.name}`
        });

        const neighbors = adjList.get(u) || [];
        for (const v of neighbors) {
          // 记录所有边的探索（包括已访问的）
          const vCity = cities.find(c => c.id === v)!;
          const uCity = cities.find(c => c.id === u)!;

          if (visited.has(v)) {
            // 已访问的节点 - 回边或横边
            steps.push({
              type: 'edge_skip',
              visited: new Set(visited),
              currentNode: u,
              currentEdge: `${u}->${v}`,
              message: `检查边 ${uCity.name} → ${vCity.name}，节点已访问过`
            });
          } else {
            // 新节点 - 树边
            steps.push({
              type: 'edge_explore',
              visited: new Set(visited),
              currentNode: u,
              currentEdge: `${u}->${v}`,
              message: `探索边 ${uCity.name} → ${vCity.name}，发现新节点`
            });

            visited.add(v);
            if (algorithm === 'dfs') {
              stack.push(v);
            } else {
              stack.push(v);
            }
          }
        }
      }

      components.push(component);

      steps.push({
        type: 'component_done',
        visited: new Set(visited),
        currentNode: null,
        currentEdge: null,
        message: `连通分量完成，包含 ${component.length} 个节点`
      });
    }

    steps.push({
      type: 'complete',
      visited: new Set(visited),
      components: components,
      message: `✅ 遍历完成！共发现 ${components.length} 个连通分量，${visited.size} 个节点可达`
    });

    return steps;
  }, [cities, routes]);

  // 监听起点终点变化，停止当前动画
  useEffect(() => {
    if (isAnimating) {
      stopAnimation();
      resetAnimation();
    }
  }, [algo]);

  const handleAnalyze = async () => {
    if (cities.length === 0) return alert('请先加载城市数据');

    setIsAnimating(true);
    setIsPaused(false);
    setCurrentStep(0);
    setLogMessages([]);
    stepsRef.current = [];

    // 停止之前的动画
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }

    try {
      // 生成所有步骤
      const steps = generateTraversalSteps(algo);
      stepsRef.current = steps;
      setTotalSteps(steps.length);

      // 开始动画
      runAnimationStep(0);
    } catch (error) {
      console.error("Failed to generate steps", error);
      setIsAnimating(false);
    }
  };

  const runAnimationStep = useCallback(async (stepIndex: number) => {
    if (stepIndex >= stepsRef.current.length) {
      setIsAnimating(false);
      setIsPaused(false);
      // 最终结果
      const finalStep = stepsRef.current[stepsRef.current.length - 1];
      const isConnected = finalStep.components.length === 1;
      setResult({
        connected: isConnected,
        components: finalStep.components,
        visitedCount: finalStep.visited.size
      });

      // 如果不连通，获取需要增加的线路
      if (!isConnected) {
        try {
          const data = await api.analyzeConnectivity();
          setMissingEdges(data.missingEdges || []);
        } catch (error) {
          console.error('Failed to get missing edges', error);
        }
      }
      return;
    }

    const step = stepsRef.current[stepIndex];
    setCurrentStep(stepIndex + 1);

    // 更新日志
    setLogMessages(prev => [...prev.slice(-9), step.message]);

    // 更新当前显示状态
    if (step.currentNode) {
      const city = cities.find(c => c.id === step.currentNode);
      setCurrentNode(city?.name || '未知');
    }

    // 继续下一步
    animationRef.current = setTimeout(() => {
      runAnimationStep(stepIndex + 1);
    }, speed);
  }, [speed, cities]);

  const stopAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsPaused(true);
  };

  const continueAnimation = () => {
    setIsPaused(false);
    runAnimationStep(currentStep);
  };

  const resetAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
    setIsPaused(false);
    setCurrentStep(0);
    setCurrentNode('-');
    setLogMessages([]);
    setResult(null);
    setMissingEdges([]);
  };

  // 计算高亮路线：基于当前动画步骤（显示所有检查过的边）
  const getHighlightedRoutes = useCallback(() => {
    const highlighted: any[] = [];

    if (isAnimating && stepsRef.current.length > 0) {
      const stepIndex = Math.min(currentStep - 1, stepsRef.current.length - 1);

      // 收集到当前步骤为止的所有边（已检查的）
      const treeEdges: Set<string> = new Set();      // edge_explore - 绿色
      const skippedEdges: Set<string> = new Set();   // edge_skip - 浅灰色

      for (let i = 0; i <= stepIndex; i++) {
        const step = stepsRef.current[i];
        if (step.currentEdge) {
          if (step.type === 'edge_explore') {
            treeEdges.add(step.currentEdge);
          } else if (step.type === 'edge_skip') {
            skippedEdges.add(step.currentEdge);
          }
        }
      }

      // 1. 已探索的树边（绿色）
      treeEdges.forEach(edge => {
        const [from, to] = edge.split('->');
        highlighted.push({
          source: from,
          target: to,
          color: '#22c55e' // 绿色
        });
      });

      // 2. 已检查但已访问的边（浅灰色）
      skippedEdges.forEach(edge => {
        const [from, to] = edge.split('->');
        // 如果这条边同时也是 tree edge（不太可能），不添加
        if (!treeEdges.has(edge)) {
          highlighted.push({
            source: from,
            target: to,
            color: '#94a3b8' // 浅灰色
          });
        }
      });

      // 3. 当前正在探索的边（蓝色）- 最后添加以覆盖
      const currentStepData = stepsRef.current[stepIndex];
      if (currentStepData && currentStepData.currentEdge) {
        const [from, to] = currentStepData.currentEdge.split('->');
        highlighted.push({
          source: from,
          target: to,
          color: 'var(--color-primary)' // 蓝色
        });
      }

      return highlighted;
    }

    // 动画结束后：显示所有检查过的边（树边绿色，已检查非树边浅灰色）
    if (result && stepsRef.current.length > 0) {
      const treeEdges: Set<string> = new Set();
      const skippedEdges: Set<string> = new Set();

      stepsRef.current.forEach(step => {
        if (step.currentEdge) {
          if (step.type === 'edge_explore') {
            treeEdges.add(step.currentEdge);
          } else if (step.type === 'edge_skip') {
            skippedEdges.add(step.currentEdge);
          }
        }
      });

      const resultEdges: any[] = [];

      // 树边绿色
      treeEdges.forEach(edge => {
        const [from, to] = edge.split('->');
        resultEdges.push({ source: from, target: to, color: '#22c55e' });
      });

      // 非树边浅灰色
      skippedEdges.forEach(edge => {
        if (!treeEdges.has(edge)) {
          const [from, to] = edge.split('->');
          resultEdges.push({ source: from, target: to, color: '#94a3b8' });
        }
      });

      // 需要增加的线路（橙色虚线）
      missingEdges.forEach(edge => {
        resultEdges.push({ source: edge.source, target: edge.target, color: '#f97316', dashed: true });
      });

      return resultEdges;
    }

    return [];
  }, [isAnimating, currentStep, result, missingEdges]);

  const highlightedRoutes = getHighlightedRoutes();

  // 计算高亮城市（当前蓝色，已访问绿色）
  const getHighlightedCities = useCallback(() => {
    const highlighted: any[] = [];

    if (isAnimating && stepsRef.current.length > 0) {
      const currentStepData = stepsRef.current[Math.min(currentStep - 1, stepsRef.current.length - 1)];
      if (!currentStepData) return [];

      // 当前访问的节点：蓝色（最重要）
      if (currentStepData.currentNode) {
        highlighted.push({ id: currentStepData.currentNode, color: 'var(--color-primary)' });
      }

      // 已访问节点：绿色（排除当前节点，避免颜色覆盖）
      currentStepData.visited.forEach((id: string) => {
        if (id !== currentStepData.currentNode && !highlighted.some(h => h.id === id)) {
          highlighted.push({ id, color: '#22c55e' });
        }
      });

      return highlighted;
    }

    // 结果状态：所有已访问节点保持绿色
    if (result) {
      result.components.flat().forEach((id: string) => {
        if (!highlighted.some(h => h.id === id)) {
          highlighted.push({ id, color: '#22c55e' });
        }
      });
    }

    return highlighted;
  }, [isAnimating, currentStep, result]);

  const highlightedCities = getHighlightedCities();

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      {/* Global Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">连通性分析</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        {/* Left Control Panel */}
        <section className="w-80 flex flex-col bg-white shadow-xl z-10 border-r border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">连通性分析</h2>
            <p className="text-sm text-slate-500 leading-relaxed">基于深度优先 (DFS) 或 广度优先 (BFS) 算法检测网络节点之间的连通状态。</p>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto sidebar-scroll">
            {/* Algorithm Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">选择算法</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setAlgo('dfs')}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${algo === 'dfs' ? 'border-[#1c85e8] bg-blue-50 text-[#1c85e8]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  DFS 遍历
                </button>
                <button 
                  onClick={() => setAlgo('bfs')}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${algo === 'bfs' ? 'border-[#1c85e8] bg-blue-50 text-[#1c85e8]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  BFS 遍历
                </button>
              </div>
            </div>

            {/* Parameter Settings */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">动画速度 (ms): {speed}</label>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>10ms (最快)</span>
                <span>1000ms (最慢)</span>
              </div>
            </div>

            {/* Animation Control */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {!isAnimating && !result && (
                  <button onClick={handleAnalyze}
                    className="w-full py-3 bg-[#1c85e8] hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed">
                    <Activity className="w-5 h-5" /> 开始连通性分析
                  </button>
                )}

                {isAnimating && !isPaused && (
                  <button onClick={stopAnimation}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-medium flex items-center justify-center gap-2 text-sm">
                    <Square className="w-4 h-4" /> 暂停
                  </button>
                )}

                {isAnimating && isPaused && (
                  <button onClick={continueAnimation}
                    className="flex-1 py-2 bg-[#ff886f] hover:bg-[#ff886f] text-white rounded font-medium flex items-center justify-center gap-2 text-sm">
                    <Play className="w-4 h-4" /> 继续
                  </button>
                )}

                {(isAnimating || result) && (
                  <button onClick={resetAnimation}
                    className="px-3 py-2 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50">
                    重置
                  </button>
                )}
              </div>
            </div>

            {/* Progress Display */}
            {(isAnimating || result) && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">进度</span>
                    <span className="font-mono text-[#1c85e8]">{currentStep} / {totalSteps}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-[#1c85e8] h-2 rounded-full transition-all" style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {currentNode && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">当前:</span>
                    <span className="font-bold text-[#1c85e8]">{currentNode}</span>
                  </div>
                )}
              </div>
            )}

            {/* Algorithm Log */}
            {logMessages.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">算法推演</h4>
                <div className="bg-slate-50 rounded border border-slate-200 p-2 text-[10px] font-mono space-y-1 max-h-40 overflow-y-auto">
                  {logMessages.map((msg, idx) => (
                    <div key={idx} className={`${idx === logMessages.length - 1 ? 'text-[#1c85e8] font-semibold' : 'text-slate-600'}`}>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">分析结果</h3>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-slate-500 font-medium">节点总数:</span>
                  <span className="text-xs font-bold text-slate-800">{cities.length}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-slate-500 font-medium">已访问节点:</span>
                  <span className="text-xs font-bold text-[#ff886f]">{result?.visitedCount || (result?.components?.flat().length || 0)}</span>
                </div>
                {result && (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">连通状态:</span>
                      <span className={`text-xs font-bold ${result.connected ? 'text-[#ff886f]' : 'text-[#ff886f]'}`}>
                        {result.connected ? '完全连通' : '未连通'}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">连通分量:</span>
                      <span className="text-xs font-bold text-slate-800">{result.components.length}</span>
                    </div>
                    {!result.connected && missingEdges.length > 0 && (
                      <>
                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-slate-500 font-medium">需新增线路:</span>
                          <span className="text-xs font-bold text-orange-500">{missingEdges.length} 条</span>
                        </div>
                        <div className="flex justify-between mb-3">
                          <span className="text-xs text-slate-500 font-medium">新增总长度:</span>
                          <span className="text-xs font-bold text-orange-500">
                            {missingEdges.reduce((sum, e) => sum + e.distance, 0)} km
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <div className="font-medium mb-1">建议新增线路:</div>
                          {missingEdges.map((edge, idx) => {
                            const fromCity = cities.find(c => c.id === edge.source);
                            const toCity = cities.find(c => c.id === edge.target);
                            return (
                              <div key={idx} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                                <span>{fromCity?.name} → {toCity?.name}</span>
                                <span className="text-orange-500">{edge.distance} km</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Map Area */}
        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities}
              routes={routes}
              highlightedRoutes={highlightedRoutes}
              highlightedCities={highlightedCities}
              disableAutoZoom={true}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-600 font-mono shadow-sm">
              <span className="inline-flex items-center gap-3">
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#1c85e8] mr-1"></span>当前</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff886f] mr-1"></span>树边</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1"></span>已检查</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>建议新增</span>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function ShortestPathView({ cities, routes }: { cities: City[], routes: Route[] }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [weightType, setWeightType] = useState<'distance' | 'delay'>('distance');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 动画控制状态
  const [animationSpeed, setAnimationSpeed] = useState(800); // ms per step
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentNode, setCurrentNode] = useState<string>('');
  const [currentEdge, setCurrentEdge] = useState<string>('');
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // 动画控制
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsRef = useRef<any[]>([]);

  const handleCityClick = (city: City) => {
    if (!source) {
      // 起点为空，设为起点
      setSource(city.id);
    } else if (!target) {
      // 起点已选、终点为空，设为终点
      setTarget(city.id);
    } else if (source === city.id || target === city.id) {
      // 点击已选中的城市，取消选择
      if (source === city.id) {
        setSource(target);
        setTarget('');
      } else {
        setTarget('');
      }
    } else {
      // 都已选且点击新城市，重新从起点开始
      setSource(city.id);
      setTarget('');
    }
    setResult(null);
    setCurrentStep(0);
    setLogMessages([]);
    if (animationRef.current) clearTimeout(animationRef.current);
    setIsAnimating(false);
  };

  // 生成Dijkstra算法步骤（在JavaScript中实现逐步动画）
  const generateDijkstraSteps = useCallback((startId: string, endId: string) => {
    const steps: any[] = [];

    // 构建邻接表
    const adjList = new Map<string, { to: string; distance: number }[]>();
    cities.forEach(c => adjList.set(c.id, []));
    routes.forEach(r => {
      const dist = Math.round(Math.sqrt(Math.pow(cities.find(c => c.id === r.source)!.x - cities.find(c => c.id === r.target)!.x, 2) + Math.pow(cities.find(c => c.id === r.source)!.y - cities.find(c => c.id === r.target)!.y, 2)));
      adjList.get(r.source)!.push({ to: r.target, distance: dist });
      adjList.get(r.target)!.push({ to: r.source, distance: dist }); // 无向图
    });

    const n = cities.length;
    const dist = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const visited = new Set<string>();
    const cityIdToIndex = new Map(cities.map((c, i) => [c.id, i]));

    // 初始化
    cities.forEach(c => {
      dist.set(c.id, Infinity);
      parent.set(c.id, null);
    });
    dist.set(startId, 0);

    // 优先队列模拟
    const pq: { id: string; dist: number }[] = [{ id: startId, dist: 0 }];

    // 步骤0：初始状态
    steps.push({
      type: 'init',
      visited: new Set<string>(),
      currentEdge: null,
      currentNode: startId,
      dist: new Map(dist),
      parent: new Map(parent),
      message: `初始化: 起点 ${cities.find(c => c.id === startId)?.name} 距离为0，其余节点距离为∞`
    });

    while (pq.length > 0) {
      // 取出最小距离节点
      pq.sort((a, b) => a.dist - b.dist);
      const u = pq.shift()!;

      if (visited.has(u.id)) continue;
      visited.add(u.id);

      // 找到u的城市索引
      const uIdx = cityIdToIndex.get(u.id)!;
      const uCity = cities[uIdx];

      // 如果u就是目标，添加目标确认步骤
      if (u.id === endId) {
        steps.push({
          type: 'target_found',
          visited: new Set(visited),
          currentEdge: null,
          currentNode: u.id,
          dist: new Map(dist),
          parent: new Map(parent),
          message: `🎯 目标节点 ${uCity.name} 已找到！最短路径距离为 ${dist.get(endId)} km`
        });
        break;
      }

      // 处理u的所有邻居
      const neighbors = adjList.get(u.id) || [];
      for (const neighbor of neighbors) {
        const v = neighbor.to;
        if (visited.has(v)) continue;

        const oldDist = dist.get(v)!;
        const newDist = dist.get(u.id)! + neighbor.distance;

        if (newDist < oldDist) {
          dist.set(v, newDist);
          parent.set(v, u.id);

          // 松弛成功步骤
          const vCity = cities.find(c => c.id === v)!;
          steps.push({
            type: 'relax',
            visited: new Set(visited),
            currentEdge: `${u.id}->${v}`,
            currentNode: u.id,
            dist: new Map(dist),
            parent: new Map(parent),
            message: `松弛边 ${uCity.name} → ${vCity.name}: 发现更短路径，距离更新为 ${newDist} km`
          });

          pq.push({ id: v, dist: newDist });
        }
      }

      // 节点完成步骤
      steps.push({
        type: 'visit_done',
        visited: new Set(visited),
        currentEdge: null,
        currentNode: u.id,
        dist: new Map(dist),
        parent: new Map(parent),
        message: `节点 ${uCity.name} 已处理完毕，所有可达邻居已松弛`
      });
    }

    // 最终路径构建
    const path: string[] = [];
    let curr = endId;
    while (curr !== null) {
      path.unshift(curr);
      curr = parent.get(curr) || null;
    }

    // 最终高亮路径
    const finalEdges: { source: string; target: string }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      finalEdges.push({ source: path[i], target: path[i + 1] });
    }

    steps.push({
      type: 'complete',
      visited: new Set(visited),
      currentEdge: null,
      currentNode: null,
      finalPath: path,
      finalEdges: finalEdges,
      dist: new Map(dist),
      parent: new Map(parent),
      message: `✅ 路径规划完成！总距离: ${dist.get(endId)} km，经过 ${path.length} 个节点`
    });

    return steps;
  }, [cities, routes]);

  // 监听起点终点变化，停止当前动画
  useEffect(() => {
    if (isAnimating) {
      stopAnimation();
      resetAnimation();
    }
  }, [source, target]);

  const handleAnalyze = async () => {
    if (!source || !target) return alert('请选择起点和终点');
    if (source === target) return alert('起点和终点不能相同');

    setIsCalculating(true);
    setIsAnimating(false);
    setResult(null);
    setCurrentStep(0);
    setLogMessages([]);
    stepsRef.current = [];

    // 停止之前的动画
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }

    try {
      // 生成所有步骤
      const steps = generateDijkstraSteps(source, target);
      stepsRef.current = steps;
      setTotalSteps(steps.length);
      setIsCalculating(false);
      setIsAnimating(true);

      // 开始动画
      runAnimationStep(0);
    } catch (error) {
      console.error("Failed to generate steps", error);
      setIsCalculating(false);
    }
  };

  const runAnimationStep = (stepIndex: number) => {
    if (stepIndex >= stepsRef.current.length) {
      setIsAnimating(false);
      // 最终结果
      const finalStep = stepsRef.current[stepsRef.current.length - 1];
      if (finalStep.finalPath) {
        setResult({
          path: finalStep.finalPath,
          distance: finalStep.dist.get(target),
          from: source,
          to: target
        });
      }
      return;
    }

    const step = stepsRef.current[stepIndex];
    setCurrentStep(stepIndex + 1);

    // 更新日志
    setLogMessages(prev => [...prev.slice(-9), step.message]);

    // 更新当前显示状态
    if (step.currentNode) {
      const city = cities.find(c => c.id === step.currentNode);
      setCurrentNode(city?.name || '未知');
    }

    if (step.currentEdge) {
      const [fromId, toId] = step.currentEdge.split('->');
      const fromCity = cities.find(c => c.id === fromId);
      const toCity = cities.find(c => c.id === toId);
      setCurrentEdge(`${fromCity?.name} → ${toCity?.name}`);
    }

    // 继续下一步
    animationRef.current = setTimeout(() => {
      runAnimationStep(stepIndex + 1);
    }, animationSpeed);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentStep(0);
    setCurrentNode('');
    setCurrentEdge('');
    setLogMessages([]);
    setResult(null);
  };

  // 计算高亮路线：基于当前动画步骤
  const getHighlightedRoutes = useCallback(() => {
    if (isAnimating && stepsRef.current.length > 0) {
      const currentStepData = stepsRef.current[Math.min(currentStep - 1, stepsRef.current.length - 1)];
      if (!currentStepData) return [];

      const highlightedRoutes: any[] = [];

      // 1. 已完成确定的边（绿色）- 从parent回溯
      if (currentStepData.parent && target) {
        const pathToTarget: string[] = [];
        let curr: string | null = target;
        while (curr !== null && curr !== source) {
          const parent = currentStepData.parent.get(curr);
          if (parent === null) break;
          pathToTarget.unshift(curr);
          curr = parent;
        }
        if (curr === source) {
          pathToTarget.unshift(source);
          // 生成绿色路径
          for (let i = 0; i < pathToTarget.length - 1; i++) {
            highlightedRoutes.push({
              source: pathToTarget[i],
              target: pathToTarget[i + 1],
              color: '#22c55e' // 绿色
            });
          }
        }
      }

      // 2. 当前正在处理的边（蓝色）- 高亮当前考虑的边
      if (currentStepData.currentEdge) {
        const [from, to] = currentStepData.currentEdge.split('->');
        // 检查这条边是否已经在绿色路径中
        const isInFinalPath = highlightedRoutes.some(hr =>
          (hr.source === from && hr.target === to) ||
          (hr.source === to && hr.target === from)
        );
        if (!isInFinalPath) {
          highlightedRoutes.push({
            source: from,
            target: to,
            color: 'var(--color-primary)' // 蓝色
          });
        }
      }

      return highlightedRoutes;
    }

    // 动画结束后或没有动画：显示最终绿色路径
    if (result && result.path) {
      const finalRoutes = [];
      for (let i = 0; i < result.path.length - 1; i++) {
        finalRoutes.push({
          source: result.path[i],
          target: result.path[i + 1],
          color: '#22c55e' // 绿色
        });
      }
      return finalRoutes;
    }

    return [];
  }, [isAnimating, currentStep, result, source, target]);

  const highlightedRoutes = getHighlightedRoutes();

  // 计算高亮城市（当前节点蓝色，已访问绿色，起点特殊）
  const getHighlightedCities = useCallback(() => {
    const highlighted: any[] = [];

    if (isAnimating && stepsRef.current.length > 0) {
      const currentStepData = stepsRef.current[Math.min(currentStep - 1, stepsRef.current.length - 1)];
      if (!currentStepData) return [];

      // 起点：始终高亮（紫色）
      highlighted.push({ id: source, color: '#8b5cf6' });
      // 终点：橙色
      if (target) highlighted.push({ id: target, color: '#f97316' });

      // 已访问节点：绿色
      currentStepData.visited.forEach((id: string) => {
        if (id !== source && id !== target) {
          highlighted.push({ id, color: '#22c55e' });
        }
      });

      // 当前节点：蓝色（覆盖绿色）
      if (currentStepData.currentNode && currentStepData.currentNode !== source && currentStepData.currentNode !== target) {
        highlighted.push({ id: currentStepData.currentNode, color: 'var(--color-primary)' });
      }

      return highlighted;
    }

    // 结果状态：起点紫色，终点橙色，路径上的节点绿色
    if (result && result.path) {
      highlighted.push({ id: source, color: '#8b5cf6' });
      if (target) highlighted.push({ id: target, color: '#f97316' });
      result.path.forEach((id: string) => {
        if (id !== source && id !== target) {
          highlighted.push({ id, color: '#22c55e' });
        }
      });
    } else {
      // 无结果时也显示起点和终点
      if (source) highlighted.push({ id: source, color: '#8b5cf6' });
      if (target) highlighted.push({ id: target, color: '#f97316' });
    }

    return highlighted;
  }, [isAnimating, currentStep, result, source, target]);

  const highlightedCities = getHighlightedCities();

  // Helper to get city name
  const getCityName = (id: string) => cities.find(c => c.id === id)?.name || '未知节点';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      {/* Global Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">最短路径规划</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              if (!result || !result.path) {
                alert('请先计算路径');
                return;
              }
              const pathNames = result.path.map((id: string) => getCityName(id)).join(' → ');
              const exportText = `起点: ${getCityName(source)}\n终点: ${getCityName(target)}\n路径: ${pathNames}\n总距离: ${result.distance} km\n预计时延: ${(result.distance * 0.005).toFixed(1)} ms`;
              
              const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `路径方案_${getCityName(source)}_to_${getCityName(target)}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }} 
            className="flex items-center space-x-2 px-4 py-2 apple-btn-secondary rounded-xl text-sm font-medium text-slate-700"
          >
            <FileDown className="h-4 w-4" />
            <span>导出方案</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        {/* Left Control Panel */}
        <section className="w-80 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">路径参数设置</h2>
            <p className="text-xs text-slate-500 italic">基于 Dijkstra 算法计算最优拓扑路径</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
            {/* Parameter Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">起点城市</label>
                <select 
                  className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3 border"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                >
                  <option value="">请选择起点</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">终点城市</label>
                <select 
                  className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3 border"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                >
                  <option value="">请选择终点</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">优化权重</label>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setWeightType('distance')}
                    className={`flex-1 py-2 px-3 text-xs rounded border transition-colors ${weightType === 'distance' ? 'bg-[#1c85e8] text-white border-[#1c85e8]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#1c85e8]'}`}
                  >
                    距离优先
                  </button>
                  <button 
                    onClick={() => setWeightType('delay')}
                    className={`flex-1 py-2 px-3 text-xs rounded border transition-colors ${weightType === 'delay' ? 'bg-[#1c85e8] text-white border-[#1c85e8]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#1c85e8]'}`}
                  >
                    时延优先
                  </button>
                </div>
              </div>
              
              {/* Animation Control */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">动画速度 (ms): {animationSpeed}</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="1000" 
                    step="10"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                    disabled={isAnimating}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>10ms (最快)</span>
                    <span>1000ms (最慢)</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isAnimating && !result && (
                    <button onClick={handleAnalyze} disabled={isCalculating}
                      className="w-full py-3 bg-[#1c85e8] hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed">
                      <Play className="w-5 h-5" /> 开始规划
                    </button>
                  )}

                  {isAnimating && (
                    <button onClick={stopAnimation}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-medium flex items-center justify-center gap-2 text-sm">
                      <Square className="w-4 h-4" /> 暂停
                    </button>
                  )}

                  {(result || isAnimating) && (
                    <button onClick={resetAnimation}
                      className="px-3 py-2 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50">
                      重置
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Display */}
              {(isAnimating || result) && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">进度</span>
                      <span className="font-mono text-[#1c85e8]">{currentStep} / {totalSteps}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-[#1c85e8] h-2 rounded-full transition-all" style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {currentNode && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">当前:</span>
                      <span className="font-bold text-[#1c85e8]">{currentNode}</span>
                      {currentEdge && <span className="text-slate-400">→ {currentEdge.split('→')[1]}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Algorithm Log */}
            {logMessages.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">算法推演</h4>
                <div className="bg-slate-50 rounded border border-slate-200 p-2 text-[10px] font-mono space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '200px' }}>
                  {logMessages.map((msg, idx) => (
                    <div key={idx} className={`${idx === logMessages.length - 1 ? 'text-[#1c85e8] font-semibold' : 'text-slate-600'}`}>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>

            {/* Analysis Results */}
            {result && (
              <div className="space-y-4 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">计算结果</h3>
                  {result.distance !== null ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">最优解已找到</span>
                  ) : (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">无法到达</span>
                  )}
                </div>

                {result.distance !== null && (
                  <>
                    {/* Path List */}
                    <div className="space-y-3">
                      <div className="relative pl-6 border-l-2 border-dashed border-slate-200 ml-2">
                        {result.path.map((nodeId: string, index: number) => {
                          const isStart = index === 0;
                          const isEnd = index === result.path.length - 1;
                          const isMiddle = !isStart && !isEnd;
                          
                          return (
                            <div key={`${nodeId}-${index}`} className={`relative ${isEnd ? '' : 'mb-6'}`}>
                              <div className={`absolute -left-[1.625rem] top-1 w-3 h-3 rounded-full border-2 border-white ${isStart ? 'bg-[#1c85e8]' : isEnd ? 'bg-[#ff886f]' : 'bg-slate-300'}`}></div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {getCityName(nodeId)} {isStart ? '(起点)' : isEnd ? '(终点)' : '(中继节点)'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {isStart ? '路径起始点' : isEnd ? '目标到达点' : '经由路由节点'}
                                  </p>
                                </div>
                                {index > 0 && (
                                  <span className="text-xs font-mono text-slate-400">
                                    +{(() => {
                                      const prevCity = cities.find(c => c.id === result.path[index - 1]);
                                      const currCity = cities.find(c => c.id === nodeId);
                                      if (prevCity && currCity) {
                                        return Math.round(Math.sqrt(Math.pow(prevCity.x - currCity.x, 2) + Math.pow(prevCity.y - currCity.y, 2)));
                                      }
                                      return 0;
                                    })()} km
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">总路径长度</p>
                          <p className="text-lg font-bold text-[#1c85e8]">{result.distance} km</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">预计时延</p>
                          <p className="text-lg font-bold text-[#1c85e8]">{(result.distance * 0.005).toFixed(1)} ms</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Map Area */}
        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities}
              routes={routes}
              highlightedRoutes={highlightedRoutes}
              highlightedCities={highlightedCities}
              disableAutoZoom={isAnimating}
              onCityClick={handleCityClick}
            />

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-600 font-mono shadow-sm">
              <span className="inline-flex items-center gap-3">
                <span><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1"></span>起点</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>终点</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#22c55e] mr-1"></span>已确定</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#1c85e8] mr-1"></span>当前</span>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function TSPView({ cities, routes }: { cities: City[], routes: Route[] }) {
  const [source, setSource] = useState('');
  const [algo, setAlgo] = useState<'open' | 'closed'>('open');
  const [speed, setSpeed] = useState(100);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [animIndex, setAnimIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<any>(null);

  const handleCityClick = (city: City) => {
    setSource(city.id);
    setResult(null);
    setAnimIndex(-1);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleAnalyze = async () => {
    if (!source) return alert('请选择起点城市');
    
    setIsCalculating(true);
    setResult(null);
    setAnimIndex(-1);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const data = await api.analyzeTSP(source, algo);
      setResult(data);
      // 开始动画
      setAnimIndex(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('TSP analysis failed', error);
      alert('分析失败');
    } finally {
      setIsCalculating(false);
    }
  };

  // 动画效果
  useEffect(() => {
    if (!isPlaying || !result?.path || animIndex < 0) return;
    
    if (animIndex >= result.path.length) {
      setIsPlaying(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      setAnimIndex(prev => prev + 1);
    }, speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, animIndex, result, speed]);

  const handlePause = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleResume = () => {
    if (result?.path && animIndex < result.path.length) {
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResult(null);
    setAnimIndex(-1);
    setIsPlaying(false);
  };

  const getCityName = (id: string) => cities.find(c => c.id === id)?.name || '未知';

  // 统计重复经过的城市
  const getRepeatedCities = useCallback((): Set<string> => {
    if (!result?.path) return new Set<string>();
    const count = new Map<string, number>();
    result.path.forEach((id: string) => {
      count.set(id, (count.get(id) || 0) + 1);
    });
    const repeated = new Set<string>();
    count.forEach((v, k) => {
      if (v > 1) repeated.add(k);
    });
    return repeated;
  }, [result]);

  const repeatedCities: Set<string> = getRepeatedCities();

  // 高亮路线
  const highlightedRoutes: any[] = [];
  if (result?.path && animIndex > 0) {
    const endIndex = Math.min(animIndex, result.path.length);
    for (let i = 0; i < endIndex - 1; i++) {
      highlightedRoutes.push({
        source: result.path[i],
        target: result.path[i + 1],
        color: '#22c55e'
      });
    }
  }

  // 高亮城市
  const highlightedCities: any[] = [];
  if (source) {
    highlightedCities.push({ id: source, color: '#8b5cf6' });
  }
  if (result?.path && animIndex > 0) {
    const endIndex = Math.min(animIndex, result.path.length);
    for (let i = 1; i < endIndex; i++) {
      if (result.path[i] !== source) {
        const isRepeated = repeatedCities.has(result.path[i]);
        highlightedCities.push({ 
          id: result.path[i], 
          color: isRepeated ? '#f97316' : '#22c55e' 
        });
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <h2 className="text-lg font-semibold text-slate-800">旅行商问题 (TSP)</h2>
      </header>

      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        <section className="w-80 flex flex-col bg-white shadow-xl z-10 border-r border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">TSP 路径规划</h2>
            <p className="text-sm text-slate-500">选择起点城市，寻找经过所有城市的最短路径（只使用已有路线）。</p>
          </div>
          
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">起点城市</label>
              <select 
                className="w-full rounded-md border-slate-300 text-sm py-2 px-3 border"
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                <option value="">请选择起点</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">问题类型</label>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setAlgo('open')}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium ${algo === 'open' ? 'border-[#1c85e8] bg-blue-50 text-[#1c85e8]' : 'border-slate-200 text-slate-600'}`}
                >
                  开放路径（不返回起点）
                </button>
                <button 
                  onClick={() => setAlgo('closed')}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium ${algo === 'closed' ? 'border-[#1c85e8] bg-blue-50 text-[#1c85e8]' : 'border-slate-200 text-slate-600'}`}
                >
                  闭合路径（返回起点）
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">动画速度 (ms): {speed}</label>
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>10ms (最快)</span>
                <span>500ms (最慢)</span>
              </div>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={isCalculating || !source}
              className="w-full py-3 bg-[#1c85e8] hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  计算中...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  开始求解
                </>
              )}
            </button>

            {result && (
              <div className="flex gap-2">
                {isPlaying ? (
                  <button onClick={handlePause} className="flex-1 py-2 bg-orange-500 text-white rounded font-medium">
                    暂停
                  </button>
                ) : animIndex < result.path?.length ? (
                  <button onClick={handleResume} className="flex-1 py-2 bg-[#ff886f] text-white rounded font-medium">
                    继续
                  </button>
                ) : null}
                <button onClick={handleReset} className="flex-1 py-2 border border-slate-300 text-slate-600 rounded font-medium">
                  重置
                </button>
              </div>
            )}

            {result && (
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs mb-2">进度: {animIndex} / {result.path?.length || 0}</div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-[#1c85e8] h-2 rounded-full" style={{ width: `${result.path?.length ? (animIndex / result.path.length) * 100 : 0}%` }}></div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">求解结果</h3>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-[#1c85e8]">{result.distance || result.totalDistance || 0} km</div>
                  <div className="text-xs text-slate-500">途经 {result.path?.length || 0} 个城市</div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">路径详情</h4>
                  <div className="text-xs bg-slate-50 p-2 rounded border border-slate-200 break-words">
                    {result.path && result.path.length > 0 ? (
                      result.path.map((id: string, idx: number) => {
                        const isRepeated = repeatedCities.has(id) && idx > 0 && result.path.indexOf(id) !== idx;
                        return (
                          <span key={idx}>
                            <span className={isRepeated ? 'text-orange-500 font-bold' : 'text-slate-700'}>
                              {getCityName(id)}
                            </span>
                            {idx < result.path.length - 1 && <span className="text-slate-400">→</span>}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-slate-400">暂无路径数据</span>
                    )}
                  </div>
                  {repeatedCities.size > 0 && (
                    <div className="text-[10px] text-orange-500 mt-1">
                      重复经过: {Array.from(repeatedCities).map(id => getCityName(id)).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 overflow-hidden">
          <div className="w-full h-full bg-white rounded-xl shadow-lg relative overflow-hidden border border-slate-200">
            <MapVisualizer
              cities={cities}
              routes={routes}
              highlightedRoutes={highlightedRoutes}
              highlightedCities={highlightedCities}
              disableAutoZoom={true}
              onCityClick={handleCityClick}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export function SteinerTreeView({ cities, routes }: { cities: City[], routes: Route[] }) {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (cities.length < 3) return alert('至少需要3个城市');

    setIsLoading(true);
    setResult(null);

    try {
      const data = await api.analyzeSteiner();
      setResult(data);
    } catch (error) {
      console.error('Failed to analyze steiner tree', error);
      alert('分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  // 计算高亮路线
  const highlightedRoutes = result?.edges?.map((edge: any) => ({
    source: edge.source,
    target: edge.target,
    color: '#22c55e'
  })) || [];

  // 计算高亮城市（所有原始城市 + Steiner点）
  const highlightedCities: any[] = [];
  cities.forEach(city => {
    highlightedCities.push({ id: city.id, color: 'var(--color-primary)' });
  });
  if (result?.steinerPoints) {
    result.steinerPoints.forEach((sp: any) => {
      highlightedCities.push({ id: sp.id, color: '#f97316' });
    });
  }

  // 构建显示的城市列表（包含 Steiner 点）
  const displayCities: any[] = [...cities];
  if (result?.steinerPoints) {
    result.steinerPoints.forEach((sp: any) => {
      displayCities.push({ id: sp.id, x: sp.x, y: sp.y, name: `辅助点${Math.abs(sp.id)}` });
    });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      <style>{`
        .steiner-point {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">施泰纳树 (Steiner Tree)</h2>
        </div>
      </header>

      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        <section className="w-80 flex flex-col bg-white shadow-xl z-10 border-r border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">最短布线方案</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              设计最短通信线路使所有城市连通，可添加辅助点(Steiner点)优化布线。
            </p>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 space-y-4 border-b border-slate-100">
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full py-3 bg-[#1c85e8] hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <GitMerge className="w-5 h-5" />
                {isLoading ? '计算中...' : '开始求解'}
              </button>

              {(result || isLoading) && (
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="w-full py-2 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  清除结果
                </button>
              )}
            </div>

            {result && (
              <div className="p-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">布线方案</h3>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">城市数:</span>
                    <span className="text-sm font-bold text-[#1c85e8]">{cities.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">辅助点:</span>
                    <span className="text-sm font-bold text-orange-500">{result.steinerPoints.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">总长度:</span>
                    <span className="text-sm font-bold text-[#ff886f]">{result.totalWeight.toFixed(2)} km</span>
                  </div>
                </div>
                
                {result.steinerPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-1">辅助点位置</h4>
                    <div className="text-[10px] text-slate-600 space-y-1">
                      {result.steinerPoints.map((sp: any) => (
                        <div key={sp.id} className="flex justify-between">
                          <span className="text-orange-500 font-medium">{sp.name}</span>
                          <span>({sp.x.toFixed(1)}, {sp.y.toFixed(1)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={displayCities}
              routes={[]}
              highlightedRoutes={highlightedRoutes}
              highlightedCities={highlightedCities}
              disableAutoZoom={true}
            />
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-600 font-mono shadow-sm">
              <span className="inline-flex items-center gap-3">
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#1c85e8] mr-1"></span>城市</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>辅助点</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff886f] mr-1"></span>线路</span>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AllShortestPathsView({ cities, routes }: { cities: City[], routes: Route[] }) {
  const [source, setSource] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // 计算高亮路线
  const getHighlightedRoutes = useCallback(() => {
    const highlighted: any[] = [];

    // 如果选中了某个目标城市，显示该路径
    if (selectedTarget && results.length > 0) {
      const selected = results.find(r => r.target === selectedTarget);
      if (selected && selected.path) {
        for (let i = 0; i < selected.path.length - 1; i++) {
          highlighted.push({
            source: selected.path[i],
            target: selected.path[i + 1],
            color: '#22c55e'
          });
        }
      }
    }

    return highlighted;
  }, [selectedTarget, results]);

  // 计算高亮城市
  const getHighlightedCities = useCallback(() => {
    const highlighted: any[] = [];

    // 起点紫色
    if (source) {
      highlighted.push({ id: source, color: '#8b5cf6' });
    }

    // 如果选中了某个目标城市，高亮该路径上的城市
    if (selectedTarget && results.length > 0) {
      const selected = results.find(r => r.target === selectedTarget);
      if (selected && selected.path) {
        selected.path.forEach((id: string, index: number) => {
          if (id !== source) {
            if (index === selected.path.length - 1) {
              highlighted.push({ id, color: '#ff886f' }); // 终点红色
            } else {
              highlighted.push({ id, color: '#22c55e' }); // 中继节点绿色
            }
          }
        });
      }
    }

    return highlighted;
  }, [source, selectedTarget, results]);

  const highlightedRoutes = getHighlightedRoutes();
  const highlightedCities = getHighlightedCities();

  const handleAnalyze = async () => {
    if (!source) return alert('请选择起点城市');

    setIsLoading(true);
    setSelectedTarget(null);

    try {
      const data = await api.analyzeShortestPath(source);
      // 按距离排序
      const sorted = data.sort((a: any, b: any) => a.distance - b.distance);
      setResults(sorted);
    } catch (error) {
      console.error('Failed to analyze', error);
      alert('分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCityClick = (city: City) => {
    setSource(city.id);
    setResults([]);
    setSelectedTarget(null);
  };

  const handleTargetClick = (targetId: string) => {
    setSelectedTarget(targetId === selectedTarget ? null : targetId);
  };

  const getCityName = (id: string) => cities.find(c => c.id === id)?.name || '未知';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-800">全路径查询</h2>
        </div>
      </header>

      <main className="flex-1 flex flex-row overflow-hidden bg-slate-50">
        <section className="w-80 flex flex-col bg-white shadow-xl z-10 border-r border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">单源最短路径</h2>
            <p className="text-sm text-slate-500 leading-relaxed">选择起点城市，查询到所有其他城市的最短路径，按距离从近到远排列。</p>
          </div>

          <div className="p-6 border-b border-slate-100 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">起点城市</label>
              <select 
                className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3 border"
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                <option value="">请选择起点</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={isLoading || !source}
              className="w-full py-3 bg-[#1c85e8] hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  查询中...
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  查询所有路径
                </>
              )}
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto sidebar-scroll">
            {results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">查询结果</h3>
                  <span className="text-xs text-slate-500">{results.length} 个城市</span>
                </div>

                <div className="space-y-3">
                  {results.map((r, idx) => {
                    const isSelected = selectedTarget === r.target;
                    const isEven = idx % 2 === 0;

                    return (
                      <div 
                        key={r.target}
                        id={`path-item-${r.target}`}
                        onClick={() => handleTargetClick(r.target)}
                        className={`p-3 border rounded-lg transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-400 ring-opacity-50' 
                            : `border-slate-100 hover:border-slate-300 ${!isEven ? 'bg-slate-50' : 'bg-white'}`
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 text-sm font-medium">
                              <span>{getCityName(source)}</span>
                              <ArrowRight className="text-slate-400 h-3 w-3" />
                              <span>{getCityName(r.target)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400">{r.distance} km</span>
                              <span className="text-[10px] text-slate-400">|</span>
                              <span className="text-[10px] text-slate-400">{r.path.length} 节点</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {r.path.map((id: string) => getCityName(id)).join(' → ')}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-[#1c85e8] font-bold">#{idx + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white relative overflow-hidden" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MapVisualizer
              cities={cities}
              routes={routes}
              highlightedRoutes={highlightedRoutes}
              highlightedCities={highlightedCities}
              disableAutoZoom={true}
              disablePopup={true}
              onCityClick={handleCityClick}
            />
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-600 font-mono shadow-sm">
              <span className="inline-flex items-center gap-3">
                <span><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1"></span>起点</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff886f] mr-1"></span>路径</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff886f] mr-1"></span>终点</span>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
