import React, { useState } from 'react';
import { Layers, Server, Globe, Code2, Database, GitBranch, Cpu, Shield, ChevronDown, ChevronUp } from 'lucide-react';

export default function SystemInfoView() {
  const [showAllLogs, setShowAllLogs] = useState(false);

  const v110Items = [
    '· 修复施泰纳树算法前后端结果不一致问题（辅助点数量差异）',
    '· 优化施泰纳树算法：完全图MST场景下不添加辅助点，与C++后端逻辑保持一致',
    '· 恢复施泰纳树计算过程动画：显示顶点检查、费马点计算、优化跳过等详细步骤',
    '· 新增ID信息显示：城市列表、线路列表、地图弹窗均显示节点/线路ID',
    '· 性能优化：限制施泰纳树迭代次数（最多50轮）和单轮检查顶点数（最多10个），避免220城市场景下浏览器卡顿',
  ];

  const v100Items = [
    '· 首次发布 NetPlan Pro 通信网络规划系统',
    '· 实现 Dijkstra 最短路径、连通性分析、TSP 商旅图、Steiner 树、全路径查询 5 种图算法',
    '· Web 界面 + CLI 命令行双模式运行',
    '· 屏幕分辨率自适应：支持 1024px 以下设备，侧边栏折叠为汉堡菜单',
    '· 模糊搜索：输入文字实时筛选城市/线路，结果分组显示，地图同步高亮',
    '· 地图选点：鼠标悬停显示坐标，点击自动填入 X/Y 输入框',
    '· 线路管理：点击地图选择起点/终点，支持蓝色/橙色双色标记',
    '· 路径规划：点击地图设置起点/终点，支持点击已选城市取消选择',
    '· 所有增删操作弹出橙色确认框二次确认',
    '· 数据导入覆盖模式，成功/失败显示 ✓/× 动画提示',
    '· 导入后保持在导入页面，不自动关闭弹窗',
    '· 新添加的城市/线路显示在列表最上方',
    '· 城市管理：支持省会/地级市类型筛选',
    '· 算法动画可视化：Dijkstra / DFS / BFS / TSP 路径逐步播放',
    '· 施泰纳树：费马点优化的近似最小生成树',
    '· 一键启动脚本：web.bat 启动 Web 模式，cli.bat 启动命令行模式',
  ];

  const changelogItems = [...v110Items, ...v100Items];

  const visibleItems = showAllLogs ? changelogItems : changelogItems.slice(0, 3);
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 h-full">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center gap-4 shrink-0 z-20">
        <h2 className="text-lg font-semibold text-slate-800">版本详情</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">v1.1.0</span>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Version header */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800 mb-1">NetMap Studio</h1>
            <p className="text-slate-400 text-sm">v1.1.0</p>
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff886f]" />
                <h3 className="font-semibold text-slate-800">技术栈</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <TechItem icon={Cpu} color="text-purple-500 bg-purple-50" name="后端" desc="C++ 17 · cpp-httplib · WebSocket" />
              <TechItem icon={Globe} color="text-blue-500 bg-blue-50" name="前端" desc="React 19 · TypeScript · Vite 6 · Tailwind CSS 4" />
              <TechItem icon={Server} color="text-emerald-500 bg-emerald-50" name="通信" desc="RESTful API · JSON · HTTP Proxy" />
              <TechItem icon={Database} color="text-amber-500 bg-amber-50" name="数据" desc="JSON 文件存储 · UTF-8 编码" />
              <TechItem icon={Code2} color="text-rose-500 bg-rose-50" name="构建" desc="CMake · g++ · npm" />
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#ff886f]" />
                <h3 className="font-semibold text-slate-800">功能介绍</h3>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <FeatureItem title="节点管理" desc="城市节点的增删改查，支持批量导入导出" />
              <FeatureItem title="线路规划" desc="通信线路的创建、删除与管理，支持可视化操作" />
              <FeatureItem title="最短路径" desc="基于 Dijkstra 算法的单源最短路径查询与动画演示" />
              <FeatureItem title="连通性分析" desc="图的连通分量检测，DFS/BFS 遍历可视化" />
              <FeatureItem title="商旅问题" desc="旅行商问题(TSP)求解，支持开放/闭合路径" />
              <FeatureItem title="施泰纳树" desc="最小生成树求解，费马点优化" />
              <FeatureItem title="地图可视化" desc="SVG 地图渲染，支持缩放、拖拽、坐标拾取" />
              <FeatureItem title="命令行界面" desc="独立的 CLI 模式，支持所有分析功能" />
            </div>
          </div>

          {/* Changelog */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ff886f]" />
                <h3 className="font-semibold text-slate-800">更新日志</h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* v1.1.0 */}
              <div className="border-l-2 border-[#ff886f] pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-[#ff886f]">v1.1.0</span>
                  <span className="text-xs text-slate-400">2026-03-26</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {v110Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* v1.0.0 */}
              <div className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-500">v1.0.0</span>
                  <span className="text-xs text-slate-400">2026-03-23</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {showAllLogs ? v100Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  )) : v100Items.slice(0, 3).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {v100Items.length > 3 && (
                  <button
                    onClick={() => setShowAllLogs(!showAllLogs)}
                    className="flex items-center gap-1 mt-3 text-xs text-[#ff886f] hover:text-[#f07a61] transition-colors"
                  >
                    {showAllLogs ? (
                      <>收起 <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>展开更多 ({v100Items.length - 3} 条) <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TechItem({ icon: Icon, color, name, desc }: { icon: any, color: string, name: string, desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function FeatureItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff886f] mt-1.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
