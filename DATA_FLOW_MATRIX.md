# 前后端数据流详细对照表

**精确回答**: 哪些是后端计算、哪些是前端计算

---

## 表格1: 按视图组件划分

| 视图页面 | 功能 | 算法执行位置 | API调用 | 数据流向 | 代码位置 |
|---------|------|------------|---------|---------|---------|
| **控制面板** (Dashboard) | 显示所有城市/线路 | 后端 | ✅ GET /api/data | 后端→前端 | ApiServer.cpp:290-305 |
| | 统计数据（城市数、线路数） | 前端（计算统计） | ❌ 无 | 前端本地 | Dashboard.tsx |
| **城市管理** (CityManager) | 查询城市列表 | 后端 | ✅ GET /api/data | 后端→前端 | - |
| | 添加城市 | 后端 | ✅ POST /api/cities | 前端→后端 | ApiServer.cpp:?? |
| | 删除城市 | 后端 | ✅ DELETE /api/cities/:id | 前端→后端 | ApiServer.cpp:?? |
| | 更新城市 | 后端 | ✅ POST /api/cities (先删后增) | 前端→后端 | - |
| | 批量导入城市 | 后端 | ✅ POST /api/cities/replace | 前端→后端 | ApiServer.cpp:?? |
| **线路管理** (RouteManager) | 查询线路列表 | 后端 | ✅ GET /api/data | 后端→前端 | - |
| | 添加线路 | 后端 | ✅ POST /api/routes | 前端→后端 | ApiServer.cpp:?? |
| | 删除线路 | 后端 | ✅ DELETE /api/routes/:id | 前端→后端 | ApiServer.cpp:?? |
| | 批量导入线路 | 后端 | ✅ POST /api/routes/replace | 前端→后端 | ApiServer.cpp:?? |
| **连通性分析** (ConnectivityView) | 判断图是否连通 | ❌ **前端** (DFS) | ❌ 无 | 前端本地 | AnalysisViews.tsx:26-137 (generateTraversalSteps) |
| | 查找所有连通分量 | ❌ **前端** (DFS/BFS) | ❌ 无 | 前端本地 | AnalysisViews.tsx:50-127 |
| | 逐步动画（节点访问） | ❌ **前端** (生成步骤) | ❌ 无 | 前端本地 | AnalysisViews.tsx:587-137 |
| | 计算需要添加的缺失线路 | ✅ **后端** (makeConnected) | ✅ GET /api/analyze/connectivity | 后端→前端 | ApiServer.cpp:311-340 |
| | 计算任意两点距离 | ❌ **前端** (欧氏距离公式) | ❌ 无 | 前端本地 | AnalysisViews.tsx:654 (计算dist) |
| **路径规划** (ShortestPathView) | 单源最短路径 (所有目标) | ❌ **前端** (Dijkstra) | ❌ 无 | 前端本地 | AnalysisViews.tsx:647-780 (generateDijkstraSteps) |
| | 逐步动画（松弛过程） | ❌ **前端** (生成步骤) | ❌ 无 | 前端本地 | AnalysisViews.tsx:807-821 |
| | 计算两点间距离 | ❌ **前端** (欧氏距离) | ❌ 无 | 前端本地 | AnalysisViews.tsx:654 |
| **全路径查询** (AllShortestPathsView) | 单源最短路径 (所有目标) | ✅ **后端** (Dijkstra) | ✅ GET /api/analyze/shortest-path/:source | 后端→前端 | ApiServer.cpp:342-370<br>ShortestPath.cpp |
| | 显示结果表格 | 前端（渲染） | - | - | AllShortestPathsView.tsx:2156-2173 |
| **商旅图分析** (TSPView) | TSP近似解 | ✅ **后端** (最近邻) | ✅ GET /api/analyze/tsp/:mode/:source | 后端→前端 | ApiServer.cpp:372-410<br>TSP.cpp |
| | 路径动画（逐节点高亮） | 前端（播放） | - | - | TSPView播放后端返回的path |
| **施泰纳树** (SteinerTreeView) | 最小生成树MST | ❌ **前端** (Kruskal) | ❌ 无 | 前端本地 | AnalysisViews.tsx:1636-1676 |
| | Fermat费马点计算 | ❌ **前端** (几何计算) | ❌ 无 | 前端本地 | AnalysisViews.tsx:1580-1619 |
| | 逐步动画（选边过程） | ❌ **前端** (生成步骤) | ❌ 无 | 前端本地 | AnalysisViews.tsx:1622-1720+ |
| | 计算总长度 | 前端（累加） | ❌ 无 | 前端本地 | AnalysisViews.tsx:1678 |
| **设置页面** (SettingsView) | 查看系统信息 | 前端（静态） | ❌ 无 | - | SettingsView.tsx |

---

## 表格2: 按算法类型划分

### 图论算法执行位置总览

| 算法 | 后端位置 | 前端位置 | API端点 | 前端使用场景 |
|------|---------|---------|---------|-------------|
| **Dijkstra最短路径** | ✅ `ShortestPath::dijkstraFromCity()` | ✅ 完整重现在 `generateDijkstraSteps()` | `/api/analyze/shortest-path/:source` | AllShortestPathsView用后端<br>ShortestPathView用前端 |
| **连通性DFS/BFS** | ✅ `Connectivity::isConnected()`<br>`Connectivity::findConnectedComponents()` | ✅ 完整重现在 `generateTraversalSteps()` | `/api/analyze/connectivity` (仅缺失边) | ConnectivityView用前端（动画）<br>makeConnected用后端 |
| **最小生成树MST** | ✅ `MST::kruskal()` | ✅ 完整重现在 `generateSteinerSteps()` (Kruskal部分) | ❌ 无 | SteinerTreeView用前端（动画） |
| **旅行商TSP** | ✅ `TSP::solveFromCity()` (最近邻) | ❌ 无 | `/api/analyze/tsp/:mode/:source` | TSPView用后端 |
| **施泰纳树Steiner** | ✅ `SteinerTree::solve()` (MST+Fermat优化) | ✅ 完整重现在 `generateSteinerSteps()` (MST+Fermat) | `/api/analyze/steiner` | SteinerTreeView用前端（动画） |

---

## 表格3: 按数据流向划分

### 只读数据（后端→前端）

| 数据 | 来源API | 用途 | 是否已缓存 |
|------|---------|------|-----------|
| 城市列表 | GET /api/data | 显示在地图、列表、下拉框 | ✅ App.tsx状态管理 |
| 线路列表 | GET /api/data | 地图连线、算法计算输入 | ✅ App.tsx状态管理 |
| 连通性缺失线路 | GET /api/analyze/connectivity | 显示需要添加哪些线路使图连通 | ❌ 按需调用 |
| 全路径查询结果 | GET /api/analyze/shortest-path/:source | AllShortestPathsView表格展示 | ❌ 按需调用 |
| TSP路径结果 | GET /api/analyze/tsp/:mode/:source | TSPView展示路径 | ❌ 按需调用 |
| Steiner树结果 | ❌ 无API（前端计算） | - | - |

---

### 写操作（前端→后端）

| 操作 | API | 后端函数 | 持久化文件 |
|------|-----|---------|-----------|
| 添加城市 | POST /api/cities | ApiServer::addCity() | data/cities.json |
| 删除城市 | DELETE /api/cities/:id | ApiServer::deleteCity() | data/cities.json |
| 添加线路 | POST /api/routes | ApiServer::addRoute() | data/routes.json |
| 删除线路 | DELETE /api/routes/:id | ApiServer::deleteRoute() | data/routes.json |
| 批量替换城市 | POST /api/cities/replace | ApiServer::replaceCities() | data/cities.json |
| 批量替换线路 | POST /api/routes/replace | ApiServer::replaceRoutes() | data/routes.json |

---

## 🔍 关键发现

### 1. 算法计算分布不均匀

**用后端的**:
- AllShortestPathsView (全路径查询)
- TSPView (商旅图)
- ConnectivityView中只有makeConnected用后端（缺失线路计算）

**用前端的**:
- ShortestPathView (路径规划) - ❌ 未用后端Dijkstra
- SteinerTreeView (施泰纳树) - ❌ 未用后端SteinerTree
- ConnectivityView (连通性分析) - ❌ 未用后端连通性判断

**问题**: 前端重复实现了后端已有的算法，导致：
- 算法不一致风险（如你刚修复的后端Bug，前端仍可能有）
- 代码重复（前端也需维护Dijkstra、MST、DFS等）

---

### 2. 为什么前端要自己实现？

**推测原因**：
1. **动画需要** - 后端只返回结果，无法提供逐步动画
2. **响应速度** - 前端本地计算即时，无需网络
3. **离线使用** - 数据加载后无需后端服务

**证据**: 前端每个都有`generateXXXSteps()`函数，长度100-400行，专门生成动画步骤。

---

### 3. 现架构下的维护负担

你需要在**两个地方**修复算法Bug：
```
后端算法Bug → 修复 ShortestPath.cpp
         ↓ 但前端仍有同样的Bug！
前端算法Bug → 还需修复 generateDijkstraSteps() (AnalysisViews.tsx)
```

**你的情况**：刚优化后端Dijkstra到O((V+E)log V)，但前端ShortestPathView还是O(V²)的朴素实现（第688行`pq.sort()`是O(n²)操作）。

---

## 📊 前后端算法复杂度对比

### Dijkstra最短路径

| 实现 | 位置 | 复杂度 | 问题 |
|------|------|-------|------|
| 后端 (修复后) | ShortestPath.cpp:30-42 | O((V+E) log V) ✅ | 已优化 |
| 前端 (当前) | AnalysisViews.tsx:686-739 | O(V² log V + E) | `pq.sort()`每次O(n log n)，总体O(V² log V) |

✅ **你的优化已生效**: 后端Dijkstra现在是高效版本
⚠️ **待办**: 前端Dijkstra也需要优化（用二叉堆代替排序）

---

### MST最小生成树

| 实现 | 位置 | 复杂度 | 问题 |
|------|------|-------|------|
| 后端 | MST.cpp:34-62 | O(E log E) ✅ | UnionFind优化良好 |
| 前端 | AnalysisViews.tsx:1636-1676 | O(E log E) ✅ | 实现类似，正确 |

---

### DFS连通性

| 实现 | 位置 | 复杂度 |
|------|------|-------|
| 后端 | Connectivity.cpp:5-13 | O(V+E) |
| 前端 | AnalysisViews.tsx:65-116 | O(V+E) |

---

## 🎯 建议的行动清单

### 立即要做 (维持现状)
- ✅ 后端算法已优化完成
- ✅ 前端继续使用本地算法（动画需求决定的）
- ✅ 确保数据加载API正常 (`/api/data`)

### 可选优化
1. **前端Dijkstra性能优化**
   - 位置: `AnalysisViews.tsx:688`
   - 问题: `pq.sort()` 每次O(n log n)
   - 改进: 用数组模拟二叉堆，或使用`pq.shift()`找到最小值（O(n)）
   - 复杂度: O(V² log V) → O((V+E) log V)

2. **建立算法一致性测试**
   - 开发模式下，对比前后端Dijkstra结果是否一致
   - 防止未来Bug引入导致结果分歧

3. **文档化架构决策**
   - 在README中说明为什么保留前端算法
   - 标注哪些用后端、哪些用前端

---

## ✅ 回答用户问题

**问题**: 我需要知道具体哪些东西是后端计算前端调用，哪些是前端计算的

**总结表格**:

| 功能 | 计算位置 | 说明 |
|------|---------|------|
| 加载城市/线路数据 | 后端 | 必须，数据持久化 |
| 城市/线路CRUD | 后端 | 必须，数据持久化 |
| 连通性分析(DFS/BFS动画) | **前端** | 需要逐步步骤 |
| makeConnected(缺失线路) | 后端 | 一次性结果 |
| 路径规划(Dijkstra动画) | **前端** | 需要逐步步骤 |
| 全路径查询(结果表格) | 后端 | 一次性结果 |
| TSP旅行商 | 后端 | 已用后端 |
| 施泰纳树(MST+优化动画) | **前端** | 需要逐步步骤 |

**核心规律**:
- ✅ **需要动画的** → 前端自己算
- ✅ **只需最终结果的** → 调用后端

---

## 📝 附: API端点完整列表

### 数据API
```
GET  /api/data                     → 加载所有城市线路
POST /api/cities                   → 添加城市
DELETE /api/cities/:id            → 删除城市
POST /api/cities/replace           → 批量替换城市
POST /api/routes                   → 添加线路
DELETE /api/routes/:id            → 删除线路
POST /api/routes/replace           → 批量替换线路
```

### 分析API
```
GET  /api/analyze/connectivity              → 连通性+缺失线路
GET  /api/analyze/shortest-path/:source     → 单源所有目标最短路径
GET  /api/analyze/tsp/open/:source          → TSP开放路径
GET  /api/analyze/tsp/closed/:source        → TSP闭合路径
GET  /api/analyze/steiner                   → 施泰纳树(未使用)
```

**当前使用情况**:
- `/api/analyze/shortest-path/:source` → AllShortestPathsView ✅
- `/api/analyze/tsp/*` → TSPView ✅
- `/api/analyze/steiner` → **未使用** (前端自己算Steiner)
- `/api/analyze/connectivity` → 只用`missingEdges`部分

---

*文档生成: 2026-03-24*
