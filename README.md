# NetMap Studio —— 通信网络设计系统

> 基于 **React + TypeScript + Node.js/Express + C++17** 的通信网络设计与图论算法可视化系统。
> 数据结构课程设计 —— 将城市抽象为节点、通信线路抽象为边，用图论算法分析中国铁路 / 通信网络，并通过 SVG 地图可视化。

---

## 📖 项目简介

这是一套**前后端分离**的通信网络分析与可视化系统：

- **城市** → 图的**节点（Vertex）**
- **线路** → 图的**边（Edge）**
- **整个网络** → 一张**带权无向图（Graph）**

内置 220 个中国城市节点、291 条去重后的线路，边权为两端城市的欧氏距离。系统提供**网络管理**（增删改城市/线路）与**图论算法分析**（最短路径、最小生成树、旅行商、Steiner 树、连通性），并在浏览器端用可交互的 SVG 地图展示算法结果。

> 项目把 **数据结构、图论算法、C++ 网络编程、HTTP、Node.js、React 与前端可视化**串成了一条完整链路：*文件 → 数据结构 → 算法 → REST API → 前端 → 可视化*。

---

## 🏗️ 系统架构

```
┌────────────────────────────────────────────────┐
│                  浏览器                        │
│         React 19 + TypeScript                  │
│         SVG 可视化 / 城市管理 / 算法分析        │
└──────────────────────┬─────────────────────────┘
                       │  fetch('/api/**')
┌──────────────────────▼─────────────────────────┐
│           Node.js + Express  (:3000)           │
│           前端服务 + /api 反向代理              │
└──────────────────────┬─────────────────────────┘
                       │  HTTP Proxy (→ :3001)
┌──────────────────────▼─────────────────────────┐
│           C++ 后端 HTTP 服务器  (:3001)        │
│         Winsock2 + 手写 SimpleHttpServer        │
│              （每连接一线程，多线程）           │
│                    ApiServer                    │
└──────────────────────┬─────────────────────────┘
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
   Graph (邻接表+邻接矩阵)   Algorithms   FileIO (JSON 读写)
         │                  │               │
         │   ┌────┬────┬────┴────┬────┐    │
         ▼   ▼    ▼    ▼         ▼    ▼    ▼
        Dijkstra  Kruskal  TSP   Steiner  DFS/连通分量   JSON
```

### 一次最短路径请求的完整流程

```
用户选择起点城市
  → React 触发 fetch("/api/analyze/shortest-path/1")
  → Express(:3000) 反向代理到 C++ 后端(:3001)
  → ApiServer 路由分发 → ShortestPath::dijkstraFromCity()
  → Graph 读邻接表 → Dijkstra 计算
  → 返回 JSON（path / distance）
  → React 更新状态 → SVG 地图高亮显示最短路径
```

---

## 🧰 技术栈

### 前端

| 技术                          | 用途                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| **React 19** + **TypeScript** | 组件化 UI、类型安全                                          |
| **Vite**                      | 开发服务器 / 生产构建                                        |
| **Tailwind CSS 4**            | 原子化样式                                                   |
| **lucide-react**              | 图标                                                         |
| **motion**                    | 动画库（声明于依赖，本轮实现主要用 CSS 过渡）                |
| **Express**（Node.js）        | 前端服务器 + `/api` 反向代理                                 |
| **SVG**                       | 网络拓扑可视化（手写 `MapVisualizer` 组件，支持缩放/拖拽/高亮） |

### 后端

| 技术                         | 用途                                              |
| ---------------------------- | ------------------------------------------------- |
| **C++17**                    | 核心业务与图论算法                                |
| **Winsock2**（`ws2_32.lib`） | Windows Socket 网络编程，手写 HTTP 服务器         |
| **STL**                      | `vector` / `map` / `priority_queue` / `thread` 等 |
| **手写 HTTP 服务器**         | `SimpleHttpServer`，每连接一线程并发处理          |
| **手写 JSON 解析**           | `FileIO`，不依赖第三方 JSON 库                    |

> 🧭 **特点**：后端**图算法、HTTP 服务器、JSON 解析全部从零手写**，未依赖现成的图算法库或 JSON 库，旨在真正理解底层原理。

---

## ✨ 核心功能与算法

### 1. 网络管理

- 添加 / 删除 / 编辑城市节点与线路
- 城市坐标、名称、描述管理
- 批量导入/导出（JSON）

### 2. 网络可视化

- 城市节点、线路实时绘制
- 缩放、拖拽、点击高亮
- 算法结果路径动态高亮展示

### 3. 图论算法

| 算法           | 模块           | 说明                                              |
| -------------- | -------------- | ------------------------------------------------- |
| **最短路径**   | `ShortestPath` | Dijkstra（优先队列 + 松弛），O((V+E)logV)         |
| **最小生成树** | `MST`          | Kruskal + 并查集（路径压缩 + 按秩合并），O(ElogE) |
| **旅行商 TSP** | `TSP`          | NP-hard，最近邻贪心 + 2-opt 局部优化 + 距离缓存   |
| **Steiner 树** | `SteinerTree`  | Kruskal 起步 + 费马点（Weiszfeld 迭代）引入中转站 |
| **连通性**     | `Connectivity` | DFS 判断 / 找连通分量 / 用最小总长边补全          |

### 4. 数据结构

```
Graph 同时维护：
  · 邻接表  vector<vector<pair<int,int>>>   —— 高效遍历邻居
  · 邻接矩阵 vector<vector<int>>           —— O(1) 查询任意两点距离
  · map<int,int> cityIdToIndex             —— 城市ID → 内部索引映射
```

---

## 🔌 API 一览

### 数据管理

```
GET    /api/data                获取全部城市 + 线路
POST   /api/cities              添加城市
DELETE /api/cities/:id          删除城市
POST   /api/routes              添加线路
DELETE /api/routes/:id          删除线路
POST   /api/cities/replace      批量覆盖城市（导入）
POST   /api/routes/replace      批量覆盖线路（导入）
```

### 算法分析

```
GET    /api/analyze/connectivity           连通性（DFS + 连通分量 + 补全建议）
GET    /api/analyze/shortest-path/:sourceId 从某城到所有城的最短路径（Dijkstra）
GET    /api/analyze/tsp/open/:sourceId      TSP 开放路径
GET    /api/analyze/tsp/closed/:sourceId    TSP 闭合路径
GET    /api/analyze/steiner                 Steiner 树
```

---

## 📂 项目结构

```
DS_Course_Design/
├── src/                       # C++ 后端
│   ├── main.cpp               # 入口：CLI 或 API 服务器模式
│   ├── SimpleHttpServer.*     # 手写 Winsock2 HTTP 服务器（多线程）
│   ├── ApiServer.*            # REST API 路由 + JSON 序列化
│   ├── graph/                 # Graph（邻接表+邻接矩阵）、City、Edge
│   ├── algorithms/            # ShortestPath / MST / TSP / SteinerTree / Connectivity
│   ├── io/FileIO.*            # JSON / TXT 读写（手写解析）
│   └── ui/CLI.*               # 命令行交互界面
│
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── App.tsx            # 主应用 + 侧边栏导航
│   │   ├── api.ts             # 后端 API 请求封装
│   │   ├── types.ts           # TypeScript 类型定义
│   │   ├── components/        # MapVisualizer / SearchableSelect 等
│   │   ├── views/             # Dashboard / CityManager / RouteManager / AnalysisViews 等
│   │   └── ThemeContext.tsx   # 主题上下文
│   ├── server.ts              # Express + Vite + /api 反向代理
│   └── package.json
│
├── data/                      # 数据文件（cities.json / routes.json）
├── build/CMakeLists.txt       # CMake 构建配置
├── cli.bat                    # 一键运行 CLI 模式
├── web_start.bat              # 一键启动前后端
└── network.exe                # 已编译后端可执行文件
```

---

## 🚀 快速开始

### 先跑后端

```bash
# 方式一：CMake
cd build
cmake ..
cmake --build .

# 方式二：g++ 直接编译（同 cli.bat 中的写法）
g++ -std=c++17 -O2 src/main.cpp src/ApiServer.cpp src/SimpleHttpServer.cpp \
    src/graph/Graph.cpp src/algorithms/*.cpp src/io/FileIO.cpp src/ui/CLI.cpp \
    -lws2_32 -o network.exe
```

> 依赖 Windows API（Winsock2），**仅支持 Windows**，CMake 已配置 `_WIN32_WINNT=0x0A00`。

运行后端：

- **CLI 模式**：`network.exe --data data`
- **API 服务器模式**（前端需要）：`network.exe --server --port 3001 --data data`

### 再跑前端

```bash
cd frontend
npm install        # 首次安装依赖
npm run dev        # 启动开发服务器（Express + Vite）
```

### 一键启动（Windows）

双击 `web_start.bat`：自动启动后端 `:3001` 与前端，浏览器访问 `http://localhost:3000`。

---

## 💾 数据存储

项目不使用传统数据库，而是 **JSON 文件 + 内存中的 Graph**：

```
JSON 文件 → C++ FileIO(手写解析) → Graph → 算法计算
                ↑                                ↓
                └────── 修改后保存回 JSON ←──────┘
```

每次增删改后自动写回 `data/cities.json`、`data/routes.json`；启动时自动加载（JSON 优先，回退 TXT）。

---

## ⚠️ 说明

- 本项目依赖 Windows API（Winsock2 / `windows.h`），**仅支持 Windows 编译与运行**。
- 前端依赖里配置了 Gemini AI（`@google/genai`，需 `GEMINI_API_KEY`），当前核心业务未实际调用。
- 自写 JSON 解析器对简单扁平结构足够；生产环境建议换成成熟 JSON 库（如 `nlohmann/json`）。

### 已编译产物

`network.exe` 已随项目提供，可直接运行无需重新编译。

---

© 数据结构课程设计 —— 通信网络设计系统
