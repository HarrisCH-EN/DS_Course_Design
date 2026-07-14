# 通信网络设计系统 - 完整代码解读

## 项目概述

这是一个基于图论算法的通信网络设计系统，包含 C++ 后端和 React 前端。系统可以管理城市节点和线路，并提供多种图论算法分析功能。

**技术栈：**

- 后端：C++11 + 自建 HTTP 服务器
- 前端：React 18 + TypeScript + PixiJS + Tailwind CSS
- 数据存储：JSON 文件

---

## 第一部分：C++ 后端解读

### 1. 数据结构定义

#### 1.1 City.h - 城市节点结构

```cpp
#ifndef CITY_H
#define CITY_H

#include <string>

struct City {
    int id;                    // 城市唯一标识符
    std::string name;          // 城市名称
    int x;                     // X 坐标（用于地图显示）
    int y;                     // Y 坐标（用于地图显示）
    std::string description;   // 城市简介

    // 默认构造函数
    City() : id(0), x(0), y(0) {}

    // 带参数的构造函数，方便创建城市对象
    City(int id, const std::string& name, int x, int y, const std::string& desc = "")
        : id(id), name(name), x(x), y(y), description(desc) {}
};

#endif
```

**解释：**
这个结构体定义了城市的基本属性。每个城市有一个唯一的 ID，名称用于显示，坐标用于在地图上定位，简介提供额外信息。提供了两个构造函数，一个是默认的空构造，一个是方便初始化所有字段的构造函数。

---

#### 1.2 Edge.h - 边（线路）结构

```cpp
#ifndef EDGE_H
#define EDGE_H

struct Edge {
    int from;      // 起点城市 ID
    int to;        // 终点城市 ID
    int length;    // 线路长度（根据两城市坐标计算的欧几里得距离）

    // 默认构造函数
    Edge() : from(0), to(0), length(0) {}

    // 带参数的构造函数
    Edge(int f, int t, int len) : from(f), to(t), length(len) {}
};

#endif
```

**解释：**
边表示两个城市之间的通信线路。`from` 和 `to` 是城市 ID，`length` 是线路长度。在这个系统中，图是无向图，所以边 (A, B) 和 (B, A) 是同一条边。

---

### 2. 图的核心实现

#### 2.1 Graph.h - 图类定义

```cpp
class Graph {
private:
    std::vector<City> cities;                              // 存储所有城市
    std::map<int, int> cityIdToIndex;                      // 城市ID到数组索引的映射
    std::vector<std::vector<std::pair<int, int>>> adjList; // 邻接表：每个城市的邻居列表
    std::vector<std::vector<int>> adjMatrix;               // 邻接矩阵：存储城市间距离
```

**解释：**
这个图类使用了两种数据结构来存储图：

1. **邻接表 (adjList)**：适合稀疏图，遍历邻居快。每个元素是 `pair<邻居索引, 距离>`
2. **邻接矩阵 (adjMatrix)**：适合查询两点间是否有边，O(1) 时间复杂度

为什么同时用两种？因为不同算法有不同需求。DFS/BFS 用邻接表快，查询特定边用矩阵快。

`cityIdToIndex` 这个映射很关键，因为城市 ID 可能不连续（比如 ID 是 1, 5, 100），但数组索引必须从 0 开始连续。

---

#### 2.2 Graph.cpp - 核心方法实现

**添加城市：**

```cpp
void Graph::addCity(const City& city) {
    // 如果城市已存在，直接返回
    if (cityIdToIndex.find(city.id) != cityIdToIndex.end()) {
        return;
    }

    int idx = cities.size();           // 新城市的索引就是当前数组大小
    cities.push_back(city);            // 添加到城市列表
    cityIdToIndex[city.id] = idx;      // 建立 ID 到索引的映射

    adjList.resize(cities.size());     // 邻接表扩容

    // 邻接矩阵扩容：新增一行一列
    adjMatrix.resize(cities.size());
    for (auto& row : adjMatrix) {
        row.resize(cities.size(), -1); // -1 表示没有边
    }
}
```

**解释：**
添加城市时要同步更新三个数据结构。邻接矩阵用 -1 表示两城市间没有直接线路。这里的扩容操作时间复杂度是 O(n²)，但因为添加城市不频繁，所以可以接受。

---

**删除城市：**

```cpp
bool Graph::removeCity(int cityId) {
    if (cityIdToIndex.find(cityId) == cityIdToIndex.end()) {
        return false;  // 城市不存在
    }

    int idx = cityIdToIndex[cityId];

    // 从三个数据结构中删除
    cities.erase(cities.begin() + idx);
    adjList.erase(adjList.begin() + idx);
    adjMatrix.erase(adjMatrix.begin() + idx);  // 删除对应行

    // 删除邻接矩阵的对应列
    for (auto& row : adjMatrix) {
        row.erase(row.begin() + idx);
    }

    // 更新邻接表中的索引引用
    for (auto& neighbors : adjList) {
        // 删除指向被删除城市的边
        neighbors.erase(
            std::remove_if(neighbors.begin(), neighbors.end(),
                [idx](const std::pair<int, int>& p) { return p.first == idx; }),
            neighbors.end()
        );

        // 所有大于 idx 的索引都要减 1（因为数组元素前移了）
        for (auto& p : neighbors) {
            if (p.first > idx) p.first--;
        }
    }

    // 重建 ID 到索引的映射
    cityIdToIndex.clear();
    for (int i = 0; i < (int)cities.size(); i++) {
        cityIdToIndex[cities[i].id] = i;
    }

    return true;
}
```

**解释：**
删除城市是最复杂的操作。难点在于删除后，所有索引都会变化。比如删除索引 2 的城市，原来索引 3、4、5 的城市会变成 2、3、4。所以要遍历所有邻接表，把大于被删除索引的值都减 1。最后重建整个 ID 映射表。

---

**添加边：**

```cpp
bool Graph::addEdge(int fromId, int toId) {
    // 检查两个城市是否存在
    if (cityIdToIndex.find(fromId) == cityIdToIndex.end() ||
        cityIdToIndex.find(toId) == cityIdToIndex.end()) {
        return false;
    }

    int fromIdx = cityIdToIndex[fromId];
    int toIdx = cityIdToIndex[toId];

    // 根据两城市坐标计算欧几里得距离
    const City& c1 = cities[fromIdx];
    const City& c2 = cities[toIdx];
    int dist = calculateDistance(c1.x, c1.y, c2.x, c2.y);

    // 无向图：双向添加
    adjList[fromIdx].push_back({toIdx, dist});
    adjList[toIdx].push_back({fromIdx, dist});

    adjMatrix[fromIdx][toIdx] = dist;
    adjMatrix[toIdx][fromIdx] = dist;

    return true;
}
```

**解释：**
添加边时自动计算距离，使用欧几里得距离公式 `sqrt((x2-x1)² + (y2-y1)²)`。因为是无向图，所以要在两个方向都添加边。邻接表添加到末尾，邻接矩阵直接赋值。

---

**获取所有边：**

```cpp
std::vector<Edge> Graph::getAllEdges() const {
    std::vector<Edge> edges;
    for (int i = 0; i < cities.size(); i++) {
        for (const auto& neighbor : adjList[i]) {
            // 只添加 i < neighbor.first 的边，避免重复
            if (i < neighbor.first) {
                edges.push_back(Edge(cities[i].id, cities[neighbor.first].id, neighbor.second));
            }
        }
    }
    return edges;
}
```

**解释：**
因为是无向图，边 (A, B) 在邻接表中会存两次：A 的邻居有 B，B 的邻居有 A。为了避免重复，只添加索引小的那一端。比如边 (2, 5)，只在遍历索引 2 时添加，遍历索引 5 时跳过。

---

### 3. 算法实现

#### 3.1 Connectivity.cpp - 连通性判断

**DFS 深度优先搜索：**

```cpp
void Connectivity::dfs(int node, const std::vector<std::vector<std::pair<int, int>>>& adjList,
                       std::vector<bool>& visited) {
    visited[node] = true;  // 标记当前节点已访问
    for (const auto& neighbor : adjList[node]) {
        if (!visited[neighbor.first]) {
            dfs(neighbor.first, adjList, visited);  // 递归访问邻居
        }
    }
}
```

**解释：**
这是经典的 DFS 算法。从一个节点出发，递归访问所有能到达的节点。如果图是连通的，从任意节点出发都能访问到所有节点。

---

**判断图是否连通：**

```cpp
bool Connectivity::isConnected(const Graph& graph) {
    int n = graph.getCityCount();
    if (n == 0) return true;  // 空图认为是连通的

    std::vector<std::vector<std::pair<int, int>>> adjList = buildAdjList(graph);
    std::vector<bool> visited(n, false);

    dfs(0, adjList, visited);  // 从节点 0 开始 DFS

    // 检查是否所有节点都被访问到
    for (bool v : visited) {
        if (!v) return false;  // 有节点未访问，说明不连通
    }
    return true;
}
```

**解释：**
从第一个城市开始 DFS，如果能访问到所有城市，说明图连通。时间复杂度 O(V+E)，V 是城市数，E 是线路数。

---

**找出所有连通分量：**

```cpp
std::vector<std::vector<int>> Connectivity::findConnectedComponents(const Graph& graph) {
    int n = graph.getCityCount();
    std::vector<std::vector<std::pair<int, int>>> adjList = buildAdjList(graph);
    std::vector<bool> visited(n, false);
    std::vector<std::vector<int>> components;  // 存储所有连通分量

    for (int i = 0; i < n; i++) {
        if (!visited[i]) {  // 发现一个新的连通分量
            std::vector<int> component;
            std::vector<int> stack = {i};  // 用栈实现非递归 DFS
            visited[i] = true;

            while (!stack.empty()) {
                int node = stack.back();
                stack.pop_back();
                component.push_back(node);  // 加入当前连通分量

                for (const auto& neighbor : adjList[node]) {
                    if (!visited[neighbor.first]) {
                        visited[neighbor.first] = true;
                        stack.push_back(neighbor.first);
                    }
                }
            }
            components.push_back(component);
        }
    }
    return components;
}
```

**解释：**
遍历所有节点，每次遇到未访问的节点就启动一次 DFS，找出一个连通分量。比如图有 3 个孤立的部分，就会返回 3 个连通分量。这里用栈代替递归，避免栈溢出。

---

**使图连通的最小代价方案：**

```cpp
std::vector<Edge> Connectivity::makeConnected(const Graph& graph) {
    std::vector<std::vector<int>> components = findConnectedComponents(graph);
    std::vector<Edge> newEdges;

    if (components.size() <= 1) {
        return newEdges;  // 已经连通，不需要添加边
    }

    std::vector<City> cities = graph.getAllCities();
    int numComponents = components.size();

    // 计算每对连通分量之间的最短距离边
    for (int i = 0; i < numComponents; i++) {
        for (int j = i + 1; j < numComponents; j++) {
            int minDist = std::numeric_limits<int>::max();
            int bestFrom = -1, bestTo = -1;

            // 暴力枚举两个连通分量中的所有城市对
            for (int nodeA : components[i]) {
                for (int nodeB : components[j]) {
                    int dist = graph.calculateDistance(
                        cities[nodeA].x, cities[nodeA].y,
                        cities[nodeB].x, cities[nodeB].y
                    );

                    if (dist < minDist) {
                        minDist = dist;
                        bestFrom = cities[nodeA].id;
                        bestTo = cities[nodeB].id;
                    }
                }
            }

            if (bestFrom != -1 && bestTo != -1) {
                allComponentEdges.push_back({i, j, bestFrom, bestTo, minDist});
            }
        }
    }

    // 按距离排序，准备用 Kruskal 算法
    std::sort(allComponentEdges.begin(), allComponentEdges.end(),
        [](const ComponentEdge& a, const ComponentEdge& b) {
            return a.distance < b.distance;
        });

    // 并查集实现
    std::vector<int> parent(numComponents);
    for (int i = 0; i < numComponents; i++) {
        parent[i] = i;  // 初始化：每个连通分量是独立的
    }

    auto find = [&parent](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];  // 路径压缩优化
            x = parent[x];
        }
        return x;
    };

    auto unite = [&find, &parent](int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) return false;  // 已经在同一集合
        parent[rootY] = rootX;  // 合并
        return true;
    };

    // Kruskal 算法：贪心选择最短边
    for (const auto& edge : allComponentEdges) {
        if (unite(edge.fromComp, edge.toComp)) {
            newEdges.push_back(Edge(edge.fromCity, edge.toCity, edge.distance));
            if (newEdges.size() == numComponents - 1) {
                break;  // n 个连通分量需要 n-1 条边连接
            }
        }
    }

    return newEdges;
}
```

**解释：**
这个算法解决的问题是：如果图不连通，怎么用最少的线路总长度把它连起来？

步骤：

1. 先找出所有连通分量（比如 3 个孤立的城市群）
2. 计算每两个连通分量之间的最短连接边（暴力枚举所有城市对）
3. 把这些边按长度排序
4. 用 Kruskal 算法（基于并查集）贪心选择最短边，直到所有连通分量连成一个整体

并查集的作用是快速判断两个连通分量是否已经连通，避免形成环。

---

#### 3.2 ShortestPath.cpp - 最短路径算法

**Dijkstra 算法实现：**

```cpp
std::vector<PathResult> ShortestPath::dijkstraFromCity(const Graph& graph, int startCityId) {
    int n = graph.getCityCount();
    std::vector<City> cities = graph.getAllCities();

    int startIdx = graph.cityIdToIdx(startCityId);
    if (startIdx == -1) {
        return {};  // 起点不存在
    }

    // 初始化距离数组、父节点数组、访问标记
    std::vector<int> dist(n, INT_MAX);  // 所有距离初始化为无穷大
    std::vector<int> parent(n, -1);     // 用于回溯路径
    std::vector<bool> visited(n, false);

    dist[startIdx] = 0;  // 起点到自己的距离是 0

    // 优先队列：pair<距离, 节点索引>，按距离从小到大排序
    using P = std::pair<int, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0, startIdx});

    while (!pq.empty()) {
        int u = pq.top().second;  // 取出距离最小的节点
        pq.pop();

        if (visited[u]) continue;  // 已经处理过，跳过
        visited[u] = true;

        // 遍历所有邻居节点
        const auto& neighbors = graph.getNeighborsByIndex(u);
        for (const auto& neighbor : neighbors) {
            int v = neighbor.first;   // 邻居节点索引
            int w = neighbor.second;  // 边的权重（距离）

            if (!visited[v]) {
                // 松弛操作：如果通过 u 到 v 的距离更短，就更新
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;  // 记录父节点，用于回溯路径
                    pq.push({dist[v], v});
                }
            }
        }
    }

    // 构建结果：从起点到每个其他城市的最短路径
    std::vector<PathResult> results;
    for (int i = 0; i < n; i++) {
        if (i == startIdx) continue;  // 跳过起点自己

        PathResult result;
        result.targetId = cities[i].id;
        result.distance = dist[i];

        // 如果可达，回溯路径
        if (dist[i] != INT_MAX) {
            std::vector<int> path;
            int curr = i;
            while (curr != -1) {
                path.push_back(cities[curr].id);
                curr = parent[curr];  // 沿着父节点回溯
            }
            std::reverse(path.begin(), path.end());  // 反转得到正向路径
            result.path = path;
        }

        results.push_back(result);
    }

    std::sort(results.begin(), results.end());
    return results;
}
```

**解释：**
Dijkstra 是经典的单源最短路径算法，适用于边权非负的图。

核心思想：

1. 维护一个距离数组 `dist[]`，记录起点到每个节点的当前最短距离
2. 用优先队列每次取出距离最小的未访问节点
3. 对该节点的所有邻居进行"松弛"操作：如果通过当前节点到邻居的距离更短，就更新邻居的距离
4. 重复直到所有节点都被访问

时间复杂度：O((V+E)logV)，V 是节点数，E 是边数。优先队列保证了每次都处理距离最小的节点，这是算法正确性的关键。

路径回溯：通过 `parent[]` 数组记录每个节点是从哪个节点更新来的，最后从终点沿着父节点链回溯到起点，就得到了完整路径。

---

#### 3.3 TSP.cpp - 旅行商问题

**问题定义：**
旅行商问题（Traveling Salesman Problem）：给定一组城市，找一条路径访问所有城市恰好一次，使总路径长度最短。这是 NP-hard 问题，没有多项式时间的精确算法。

**距离缓存优化：**

```cpp
struct DistanceCache {
    std::map<std::pair<int, int>, int> cache;  // 缓存已计算的距离
    const Graph* graph;
    std::map<int, std::vector<std::pair<int, int>>> adjList;

    int get(int u, int v) {
        if (u == v) return 0;
        auto key = std::make_pair(u, v);
        auto it = cache.find(key);
        if (it != cache.end()) return it->second;  // 命中缓存

        // 未命中，用 Dijkstra 计算最短距离
        // ... Dijkstra 算法代码 ...

        cache[key] = d;  // 存入缓存
        return d;
    }
};
```

**解释：**
TSP 算法会频繁查询两城市间的最短距离。如果每次都重新计算，会非常慢。所以用一个 map 缓存已经计算过的结果。第一次查询 (A, B) 时计算并缓存，后续查询直接返回。

---

**贪心构造初始解：**

```cpp
static std::vector<int> greedyTSP(const Graph& graph, int startCityId,
                                   bool returnToStart, DistanceCache& distCache) {
    auto cities = graph.getAllCities();
    std::set<int> unvisited;
    for (const auto& city : cities) {
        unvisited.insert(city.id);
    }

    std::vector<int> path;
    int current = startCityId;
    path.push_back(current);
    unvisited.erase(current);

    // 每次选择距离当前城市最近的未访问城市
    while (!unvisited.empty()) {
        int nearest = -1;
        int minDist = INT_MAX;

        for (int city : unvisited) {
            int d = distCache.get(current, city);
            if (d < minDist) {
                minDist = d;
                nearest = city;
            }
        }

        if (nearest == -1) break;  // 无法到达剩余城市
        path.push_back(nearest);
        unvisited.erase(nearest);
        current = nearest;
    }

    if (returnToStart && !path.empty()) {
        path.push_back(startCityId);  // 回到起点
    }

    return path;
}
```

**解释：**
贪心算法：从起点开始，每次选择距离当前位置最近的未访问城市。这不是最优解，但能快速得到一个还不错的初始解。时间复杂度 O(n²)，n 是城市数。

---

**2-opt 局部优化：**

```cpp
static void twoOptImprove(std::vector<int>& path, DistanceCache& distCache,
                          TSPResult& result) {
    bool improved = true;
    int iterations = 0;
    int maxIterations = 1000;
    int bestDist = computeTotalDistance(path, distCache);

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        // 尝试所有可能的边交换
        for (int i = 0; i < (int)path.size() - 2; i++) {
            for (int j = i + 2; j < (int)path.size() - 1; j++) {
                // 当前有边 (a->b) 和 (c->d)
                int a = path[i];
                int b = path[i+1];
                int c = path[j];
                int d = path[j+1];

                int oldEdgesDist = distCache.get(a, b) + distCache.get(c, d);
                int newEdgesDist = distCache.get(a, c) + distCache.get(b, d);

                // 如果交换后更短，就执行交换
                if (newEdgesDist < oldEdgesDist) {
                    // 反转中间段 [i+1, j]
                    std::reverse(path.begin() + i + 1, path.begin() + j + 1);
                    bestDist = bestDist - oldEdgesDist + newEdgesDist;
                    improved = true;
                    break;
                }
            }
            if (improved) break;
        }
    }

    result.totalDistance = bestDist;
}
```

**解释：**
2-opt 是经典的 TSP 局部优化算法。思想是：

1. 选择路径中的两条边 (a->b) 和 (c->d)
2. 尝试删除这两条边，改成 (a->c) 和 (b->d)
3. 这相当于把中间的路径段反转
4. 如果反转后总距离更短，就接受这个改变
5. 重复直到无法改进

举例：路径 A->B->C->D->E，选择边 (A->B) 和 (C->D)，反转后变成 A->C->B->D->E。

这个算法能把贪心解优化到局部最优，但不保证全局最优。时间复杂度 O(n²) 每次迭代。

---

**完整 TSP 求解流程：**

```cpp
TSPResult TSP::solveFromCity(const Graph& graph, int startCityId, bool returnToStart) {
    TSPResult result;
    result.totalDistance = 0;

    DistanceCache distCache(&graph);

    // 1. 贪心构造初始解
    std::vector<int> path = greedyTSP(graph, startCityId, returnToStart, distCache);

    if (path.empty()) {
        return result;  // 无解
    }

    result.path = path;

    // 2. 2-opt 局部优化
    twoOptImprove(result.path, distCache, result);

    return result;
}
```

**解释：**
两阶段算法：先用贪心快速得到初始解，再用 2-opt 优化。这是实践中常用的启发式方法，能在合理时间内得到接近最优的解。

---

#### 3.4 SteinerTree.cpp - 施泰纳树问题

**问题定义：**
施泰纳树问题（Steiner Tree Problem）：给定一组必须连接的关键节点（城市），找一棵树连接所有关键节点，使树的总边长最小。与最小生成树不同，施泰纳树允许在图中添加额外的"施泰纳点"（Steiner points）来连接多个分支，从而可能获得比 MST 更短的总长度。

**费马点计算（Weiszfeld算法）：**

```cpp
SteinerTree::FermatResult SteinerTree::computeFermatPoint(
    double ax, double ay,
    double bx, double by,
    double cx, double cy)
{
    double a = hypot(cx - bx, cy - by);
    double b = hypot(cx - ax, cy - ay);
    double c = hypot(bx - ax, by - ay);

    if (a < 1e-9 || b < 1e-9 || c < 1e-9) {
        return {(ax + bx + cx) / 3.0, (ay + by + cy) / 3.0, true};
    }

    double cosA = (b*b + c*c - a*a) / (2*b*c);
    double cosB = (a*a + c*c - b*b) / (2*a*c);
    double cosC = (a*a + b*b - c*c) / (2*a*b);

    cosA = max(-1.0, min(1.0, cosA));
    cosB = max(-1.0, min(1.0, cosB));
    cosC = max(-1.0, min(1.0, cosC));

    if (cosA <= -0.5) return {ax, ay, true};
    if (cosB <= -0.5) return {bx, by, true};
    if (cosC <= -0.5) return {cx, cy, true};

    // Weiszfeld迭代算法
    double fx = (ax + bx + cx) / 3.0;
    double fy = (ay + by + cy) / 3.0;

    for (int i = 0; i < 100; i++) {
        double d1 = dist(fx, fy, ax, ay);
        double d2 = dist(fx, fy, bx, by);
        double d3 = dist(fx, fy, cx, cy);

        if (d1 < 1e-9 || d2 < 1e-9 || d3 < 1e-9) break;

        double w1 = 1.0 / d1;
        double w2 = 1.0 / d2;
        double w3 = 1.0 / d3;

        double nx = (ax*w1 + bx*w2 + cx*w3) / (w1+w2+w3);
        double ny = (ay*w1 + by*w2 + cy*w3) / (w1+w2+w3);

        if (hypot(nx - fx, ny - fy) < 1e-7) {
            fx = nx; fy = ny;
            break;
        }
        fx = nx; fy = ny;
    }

    return {fx, fy, false};
}
```

**解释：**
费马点是到三角形三个顶点距离之和最小的点。

**两种情况：**

1. **钝角三角形**：如果三角形有角 ≥ 120°，费马点就是那个钝角顶点（余弦值 ≤ -0.5）。
2. **锐角三角形**：费马点在三角形内部，到三个顶点的连线夹角都是 120°。

本实现使用 **Weiszfeld 迭代算法**（加权几何中位数）：

- 初始值取三角形的重心
- 迭代：权重 = 1/距离，新位置 = 三个顶点的加权平均
- 距离越近的顶点权重越大
- 最多迭代 100 次，或直到收敛（变化 < 1e-7）

相比几何旋转法，Weiszfeld 方法数值更稳定，对任意三角形都有效。

---

**辅助函数：**

```cpp
// 判断是否同一无向边
static bool isSameEdge(const Edge& e, int u, int v) {
    return (e.from == u && e.to == v) || (e.from == v && e.to == u);
}

// 计算两点欧几里得距离
static double dist(double x1, double y1, double x2, double y2) {
    return hypot(x1 - x2, y1 - y2);
}

// 边的总长度
static int totalWeight(const vector<Edge>& edges) {
    int s = 0;
    for (auto& e : edges) s += e.length;
    return s;
}

// 连通性检查：确保所有关键城市保持连通
static bool isConnected(const vector<Edge>& edges, const set<int>& citySet) {
    if (citySet.size() <= 1) return true;

    map<int, vector<int>> adj;
    for (auto& e : edges) {
        adj[e.from].push_back(e.to);
        adj[e.to].push_back(e.from);
    }

    queue<int> q;
    set<int> vis;

    int start = *citySet.begin();
    q.push(start);
    vis.insert(start);

    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            if (citySet.count(v) && !vis.count(v)) {
                vis.insert(v);
                q.push(v);
            }
        }
    }
    return vis.size() == citySet.size();
}
```

---

**施泰纳树求解主流程：**

```cpp
SteinerTreeResult SteinerTree::solve(const Graph& graph) {
    SteinerTreeResult res;
    auto cities = graph.getAllCities();
    int n = cities.size();

    if (n <= 1) return res;

    // 坐标映射：城市ID -> (x, y)
    map<int, pair<double,double>> pos;
    set<int> citySet;

    for (auto& c : cities) {
        pos[c.id] = {c.x, c.y};
        citySet.insert(c.id);
    }

    // Step 1: 计算最小生成树作为初始解
    vector<Edge> edges = MST::kruskal(graph);

    int nextSteiner = -1;  // Steiner点使用负ID（-1, -2, -3, ...）

    // Step 2: 迭代优化，尝试添加Steiner点
    bool improved = true;
    int iter = 0;
    const int MAX_ITER = 50;  // 最多迭代50次

    while (improved && iter < MAX_ITER) {
        improved = false;
        iter++;

        // 构建邻接表
        map<int, vector<int>> adj;
        for (auto& e : edges) {
            adj[e.from].push_back(e.to);
            adj[e.to].push_back(e.from);
        }

        // 遍历所有节点，寻找度数 >= 3 的节点
        for (auto& [u, nbrs] : adj) {
            if (nbrs.size() < 3) continue;  // 至少要有3个邻居才可能优化

            // 尝试所有三元组邻居组合
            for (int i = 0; i < (int)nbrs.size(); i++) {
                for (int j = i+1; j < (int)nbrs.size(); j++) {
                    for (int k = j+1; k < (int)nbrs.size(); k++) {
                        int v1 = nbrs[i];
                        int v2 = nbrs[j];
                        int v3 = nbrs[k];

                        auto [ux,uy] = pos[u];
                        auto [x1,y1] = pos[v1];
                        auto [x2,y2] = pos[v2];
                        auto [x3,y3] = pos[v3];

                        // 计算三个邻居的费马点
                        auto f = computeFermatPoint(x1,y1,x2,y2,x3,y3);
                        if (f.isVertex) continue;  // 费马点是顶点，无法优化

                        // 计算替换前后的边长
                        double oldLen =
                            dist(ux,uy,x1,y1) +
                            dist(ux,uy,x2,y2) +
                            dist(ux,uy,x3,y3);

                        double newLen =
                            dist(f.x,f.y,x1,y1) +
                            dist(f.x,f.y,x2,y2) +
                            dist(f.x,f.y,x3,y3);

                        // 如果新方案没有显著改进，跳过
                        if (newLen >= oldLen - 1e-6) continue;

                        // 构造新边集：删除原来的三条边（u-v1, u-v2, u-v3）
                        vector<Edge> newEdges;

                        for (auto& e : edges) {
                            if (isSameEdge(e,u,v1) ||
                                isSameEdge(e,u,v2) ||
                                isSameEdge(e,u,v3)) continue;
                            newEdges.push_back(e);
                        }

                        // 添加Steiner点和三条新边
                        int s = nextSteiner--;  // 使用负ID
                        pos[s] = {f.x, f.y};

                        auto addEdge = [&](int a, int b) {
                            auto [ax,ay] = pos[a];
                            auto [bx,by] = pos[b];
                            int d = (int)round(dist(ax,ay,bx,by));
                            newEdges.emplace_back(a,b,d);
                        };

                        addEdge(s, v1);
                        addEdge(s, v2);
                        addEdge(s, v3);

                        // 关键检查：确保所有关键城市仍然连通
                        if (!isConnected(newEdges, citySet)) continue;

                        // 接受改进
                        edges = newEdges;
                        improved = true;
                        goto NEXT_ITER;  // 跳出多层循环，重新构建邻接表
                    }
                }
            }
        }

        NEXT_ITER:;
    }

    // 收集所有Steiner点（ID为负数的节点）
    set<int> used;
    for (auto& e : edges) {
        if (e.from < 0) used.insert(e.from);
        if (e.to < 0) used.insert(e.to);
    }

    for (int id : used) {
        SteinerPoint sp;
        sp.id = id;
        sp.x = pos[id].first;
        sp.y = pos[id].second;
        res.steinerPoints.push_back(sp);
    }

    res.edges = edges;
    res.totalDistance = totalWeight(edges);
    return res;
}
```

**解释：**
这是一个**启发式局部优化算法**，不保证全局最优，但实践中效果很好。

**算法流程：**

1. **初始化**：用 Kruskal 算法计算最小生成树（MST）作为初始解
   - MST 保证了所有关键城市连通
   - MST 是一个好的起点，虽然不一定最优

2. **迭代优化**（最多 50 次）：
   - 在当前树的每个节点上，如果度数 ≥ 3（有3个或更多分支）
   - 尝试该节点的所有三元组邻居组合
   - 计算这三个邻居的费马点
   - 如果费马点不是顶点（在三角形内部）且能减少总长度
   - 删除原来的三条边，用Steiner点连接这三个邻居

3. **连通性检查**：
   - 每次修改后必须检查所有关键城市是否仍然连通
   - `isConnected()` 函数执行 BFS/DFS 检查

4. **Steiner点标记**：
   - 使用负整数 ID（-1, -2, -3, ...）区分Steiner点和真实城市
   - 从坐标映射 `pos` 中提取所有负ID的点作为结果

**为什么度数≥3的节点才考虑？**

- 如果一个节点只有1或2个邻居，它只是路径上的中间点
- 只有度数≥3的节点是"分支点"，才有优化的空间
- 用Steiner点替换分支点可以减少总长度（三叉分支被优化为Y形）

**举例说明：**

```
原始情况：       优化后：
    B             B
    |            / \
    A ---- C    A---S---C
                    |
                    D

节点A连接B、C、D三个邻居，边长分别为10, 10, 10，总长30。
计算B、C、D的费马点S，如果SB+SC+SD=28，则用S替换A，总长度减少2。
```

**时间复杂度：**

- 最坏情况：O(iterations × V × degree³)，V是节点数，degree是平均度数
- 通常 iterations < 50，degree 很小（稀疏树），所以实际运行很快

**与MST的对比：**

- MST：不允许添加额外节点，只能直接用原城市
- Steiner Tree：允许添加Steiner点，可能获得更短的总长度
- 在几何空间中，Steiner树可以比MST短约 10-15%

---

### 4. 文件 IO 和数据持久化

#### 4.1 FileIO.cpp - JSON 文件读写

**简单的 JSON 解析器：**

```cpp
static std::string extractValue(const std::string& line, const std::string& key) {
    // 查找 "key": 的位置
    size_t pos = line.find("\"" + key + "\"");
    if (pos == std::string::npos) return "";

    // 找到冒号
    pos = line.find(":", pos);
    if (pos == std::string::npos) return "";

    // 提取值（到逗号或右花括号）
    size_t start = pos + 1;
    size_t end = line.find_first_of(",}", start);
    if (end == std::string::npos) end = line.length();

    std::string value = trim(line.substr(start, end - start));

    // 移除引号
    if (value.length() >= 2 && value.front() == '"' && value.back() == '"') {
        value = value.substr(1, value.length() - 2);
    }

    return value;
}
```

**解释：**
这是一个简化的 JSON 解析器，不依赖第三方库。它逐行读取文件，用字符串查找提取键值对。虽然不支持复杂的嵌套结构，但对于这个项目的简单 JSON 格式足够了。

---

**加载城市数据：**

```cpp
bool FileIO::loadCitiesJSON(Graph& graph, const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::string line;
    bool inObject = false;
    int id = 0;
    std::string name, description;
    int x = 0, y = 0;

    while (std::getline(file, line)) {
        line = trim(line);

        // 检测对象开始 {
        if (line.find("{") != std::string::npos) {
            inObject = true;
            // 重置变量
            id = 0;
            name = "";
            description = "";
            x = y = 0;
        }

        if (inObject) {
            // 提取各个字段
            std::string idStr = extractValue(line, "id");
            if (!idStr.empty()) id = std::stoi(idStr);

            std::string nameStr = extractValue(line, "name");
            if (!nameStr.empty()) name = nameStr;

            std::string xStr = extractValue(line, "x");
            if (!xStr.empty()) x = std::stoi(xStr);

            std::string yStr = extractValue(line, "y");
            if (!yStr.empty()) y = std::stoi(yStr);

            std::string descStr = extractValue(line, "description");
            if (!descStr.empty()) description = descStr;
        }

        // 检测对象结束 }
        if (line.find("}") != std::string::npos && inObject) {
            if (id > 0 && !name.empty()) {
                City city(id, name, x, y, description);
                graph.addCity(city);
            }
            inObject = false;
        }
    }

    file.close();
    return true;
}
```

**解释：**
逐行读取 JSON 文件，用状态机的方式解析。`inObject` 标记当前是否在一个对象内部。遇到 `{` 开始收集字段，遇到 `}` 就创建城市对象并添加到图中。

---

**保存城市数据：**

```cpp
bool FileIO::saveCitiesJSON(const Graph& graph, const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::vector<City> cities = graph.getAllCities();
    file << "[\n";

    for (size_t i = 0; i < cities.size(); i++) {
        const City& city = cities[i];
        file << "  {\n";
        file << "    \"id\": \"" << city.id << "\",\n";
        file << "    \"name\": \"" << city.name << "\",\n";
        file << "    \"x\": " << city.x << ",\n";
        file << "    \"y\": " << city.y << ",\n";
        file << "    \"description\": \"" << city.description << "\"\n";
        file << "  }";
        if (i < cities.size() - 1) file << ",";  // 最后一个对象不加逗号
        file << "\n";
    }

    file << "]\n";
    file.close();
    return true;
}
```

**解释：**
手动拼接 JSON 字符串。注意最后一个对象后面不能有逗号，这是 JSON 语法要求。格式化输出带缩进，方便人工阅读和调试。

---

### 5. HTTP 服务器和 API

#### 5.1 SimpleHttpServer.cpp - 轻量级 HTTP 服务器

这个项目实现了一个简单的 HTTP 服务器，用于前后端通信。核心功能：

- 监听端口，接受 TCP 连接
- 解析 HTTP 请求（GET/POST/PUT/DELETE）
- 路由分发到对应的处理函数
- 返回 HTTP 响应

**关键代码片段：**

```cpp
void SimpleHttpServer::start(int port) {
    // 创建 socket
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);

    // 绑定端口
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);
    bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr));

    // 监听连接
    listen(serverSocket, 10);

    while (running) {
        // 接受客户端连接
        int clientSocket = accept(serverSocket, nullptr, nullptr);

        // 读取请求
        char buffer[4096];
        recv(clientSocket, buffer, sizeof(buffer), 0);

        // 解析请求并路由
        std::string response = handleRequest(buffer);

        // 发送响应
        send(clientSocket, response.c_str(), response.length(), 0);
        closesocket(clientSocket);
    }
}
```

**解释：**
这是一个阻塞式的单线程 HTTP 服务器。每次只处理一个请求，处理完才接受下一个。虽然性能不高，但对于本地开发和小规模使用足够了。

---

#### 5.2 ApiServer.cpp - RESTful API 实现

`ApiServer.cpp` 定义了项目的 **RESTful API 服务端**，是前端与后端算法之间的桥梁。

核心功能分三块：

**1. 数据 CRUD 路由**（第 37-317 行）

| 端点                       | 操作                   |
| -------------------------- | ---------------------- |
| `GET /api/data`            | 获取全部城市和路由数据 |
| `POST /api/cities`         | 添加城市               |
| `DELETE /api/cities/:id`   | 删除城市               |
| `POST /api/routes`         | 添加路由（边）         |
| `DELETE /api/routes/:id`   | 删除路由               |
| `POST /api/cities/replace` | 批量替换所有城市       |
| `POST /api/routes/replace` | 批量替换所有路由       |

**2. 算法分析路由**（第 319-446 行）

| 端点                                                       | 调用算法          |
| ---------------------------------------------------------- | ----------------- |
| `GET /api/analyze/connectivity`                            | 连通性分析        |
| `GET /api/analyze/shortest-path/:sourceId`                 | Dijkstra 最短路径 |
| `GET /api/analyze/tsp/open/:sourceId` / `closed/:sourceId` | TSP 旅行商问题    |
| `GET /api/analyze/steiner`                                 | Steiner 树        |

**3. 数据持久化**（第 495-542 行）

- `loadData()` / `saveData()` — 通过 `FileIO` 读写 JSON 文件

**API 路由定义：**

```cpp
void ApiServer::setupRoutes() {
    // 获取所有城市
    server->Get("/api/cities", [this](const std::string& body) {
        return citiesToJson();
    });

    // 添加城市
    server->Post("/api/cities", [this](const std::string& body) {
        City city;
        if (!FileIO::parseCityFromJSON(body, city)) {
            return std::string("{\"error\":\"Invalid city data\"}");
        }
        graph.addCity(city);
        saveData();
        return toJson(city);
    });

    // 删除城市
    server->Delete("/api/cities/:id", [this](const std::string& body) {
        // 从 URL 提取 ID
        int id = extractIdFromPath(body);
        if (graph.removeCity(id)) {
            saveData();
            return std::string("{\"success\":true}");
        }
        return std::string("{\"error\":\"City not found\"}");
    });

    // 最短路径算法
    server->Get("/api/analyze/shortest-path", [this](const std::string& body) {
        // 从查询参数提取起点和终点
        int start = extractParam(body, "start");
        int end = extractParam(body, "end");

        PathResult result = ShortestPath::dijkstraBetween(graph, start, end);
        return pathResultToJson(result);
    });
}
```

**解释：**
这里定义了所有的 API 端点。每个端点绑定一个 lambda 函数作为处理器。前端通过这些 API 与后端交互：

- GET /api/cities - 获取城市列表
- POST /api/cities - 添加城市
- DELETE /api/cities/:id - 删除城市
- GET /api/analyze/shortest-path?start=1&end=5 - 计算最短路径

---

## 第二部分：React 前端解读

### 1. 项目结构

```
frontend/
├── src/
│   ├── components/        # 可复用组件
│   │   ├── MapVisualizer.tsx      # 地图可视化（PixiJS）
│   │   ├── ConfirmDialog.tsx      # 确认对话框
│   │   ├── ImportModal.tsx        # 数据导入弹窗
│   │   └── SearchableSelect.tsx   # 可搜索下拉框
│   ├── views/             # 页面视图
│   │   ├── Dashboard.tsx          # 仪表盘
│   │   ├── CityManager.tsx        # 城市管理
│   │   ├── RouteManager.tsx       # 线路管理
│   │   ├── AnalysisViews.tsx      # 算法分析
│   │   ├── SystemInfoView.tsx     # 系统信息
│   │   └── SettingsView.tsx       # 设置页面
│   ├── api.ts             # API 请求封装
│   ├── types.ts           # TypeScript 类型定义
│   ├── ThemeContext.tsx   # 主题上下文
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 入口文件
├── package.json
└── vite.config.ts
```

---

### 2. 核心组件解读

#### 2.1 MapVisualizer.tsx - 地图可视化引擎

**组件功能：**
这是整个前端最核心的组件，负责在 SVG 画布上渲染城市节点和线路，支持缩放、拖拽、高亮显示等交互功能。

**Props 接口定义：**

```typescript
interface Props {
  cities: City[];                    // 所有城市数据
  routes: Route[];                   // 所有线路数据
  highlightedRoutes?: {              // 需要高亮的线路
    source: string;
    target: string;
    color?: string;                  // 自定义颜色
    dashed?: boolean;                // 是否虚线
  }[];
  highlightedCities?: {              // 需要高亮的城市
    id: string;
    color?: string;                  // 自定义颜色
    className?: string;              // 自定义样式类
  }[];
  disableAutoZoom?: boolean;         // 禁用自动缩放到高亮元素
  disablePopup?: boolean;            // 禁用悬浮提示框
  showCoords?: boolean;              // 显示鼠标坐标（用于调试）
  onCityClick?: (city: City) => void;      // 城市点击回调
  onRouteClick?: (route: Route) => void;   // 线路点击回调
  onMapClick?: (x: number, y: number) => void;  // 空白处点击回调
}
```

**解释：**
这个组件设计得很灵活，通过 props 可以控制各种行为。`highlightedRoutes` 和 `highlightedCities` 用于算法可视化时高亮显示路径。回调函数让父组件能响应用户交互。

---

**状态管理：**

```typescript
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
const [isDragging, setIsDragging] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const [hoveredCity, setHoveredCity] = useState<City | null>(null);
const [hoveredRoute, setHoveredRoute] = useState<Route | null>(null);
const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
const [mouseDataCoord, setMouseDataCoord] = useState<{ x: number; y: number } | null>(null);
const [lockedCity, setLockedCity] = useState<City | null>(null);
const [lockedRoute, setLockedRoute] = useState<Route | null>(null);

// X坐标压缩比例（使地图比例更接近真实地理）
const xScale = 0.12;
```

**解释：**

- `transform`：控制地图的平移和缩放，类似 CSS transform
- `isDragging`：标记是否正在拖拽地图
- `hoveredCity/Route`：鼠标悬浮的元素，用于显示提示框
- `lockedCity/Route`：点击锁定的元素，提示框不会因鼠标移动而消失
- `xScale = 0.12`：因为中国地理上东西跨度大于南北，所以压缩 X 坐标，让地图比例更真实

---

**自动居中和缩放：**

```typescript
useEffect(() => {
  if (cities.length === 0 || !svgRef.current) return;
  const padding = 50;

  // 反转y坐标（地理坐标y向上为正，SVG坐标y向下为正）
  // 压缩x坐标使比例更合理
  const yValues = cities.map(c => -c.y);
  const xValues = cities.map(c => c.x * xScale);

  // 计算所有城市的边界框
  const minX = Math.min(...xValues) - padding;
  const maxX = Math.max(...xValues) + padding;
  const minY = Math.min(...yValues) - padding;
  const maxY = Math.max(...yValues) + padding;
  const contentWidth = Math.max(maxX - minX, 100);
  const contentHeight = Math.max(maxY - minY, 100);

  // 计算合适的缩放比例，让所有城市都可见
  const svgRect = svgRef.current.getBoundingClientRect();
  const scaleX = svgRect.width / contentWidth;
  const scaleY = svgRect.height / contentHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% 留一些边距

  // 计算中心点
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // 设置 transform，让地图居中显示
  setTransform({
    x: svgRect.width / 2 - cx * scale,
    y: svgRect.height / 2 - cy * scale,
    scale: scale
  });
}, [cities.length]); // 只在城市数量变化时重新居中
```

**解释：**
这段代码在组件加载时自动计算合适的视图，让所有城市都在可见范围内。

关键步骤：

1. 找出所有城市的边界（最小/最大 X、Y 坐标）
2. 计算需要多大的缩放比例才能让边界框适应 SVG 画布
3. 计算平移量，让边界框的中心对齐画布中心

注意 Y 坐标反转：地理坐标系中北方（高纬度）Y 值大，但 SVG 坐标系中 Y 向下增长，所以要取负数。

---

**鼠标滚轮缩放：**

```typescript
const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  if (!svgRef.current) return;

  const zoomSensitivity = 0.001;
  const delta = -e.deltaY * zoomSensitivity;
  const newScale = Math.max(0.1, Math.min(transform.scale * Math.exp(delta), 10));

  const rect = svgRef.current.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 计算新的平移量，让缩放以鼠标位置为中心
  const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
  const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

  setTransform({ x: newX, y: newY, scale: newScale });
};
```

**解释：**
这是实现"以鼠标为中心缩放"的关键代码。

原理：

1. 根据滚轮方向计算新的缩放比例（向上放大，向下缩小）
2. 限制缩放范围在 0.1 到 10 倍之间
3. 计算新的平移量，让鼠标指向的点在缩放前后保持在屏幕上的同一位置

数学推导：

- 设鼠标在屏幕上的位置是 `(mouseX, mouseY)`
- 缩放前，鼠标指向的数据点坐标是 `(mouseX - transform.x) / transform.scale`
- 缩放后，要让这个数据点仍然在 `(mouseX, mouseY)` 位置
- 所以新的平移量 `newX = mouseX - (数据点坐标) * newScale`

---

**拖拽地图：**

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  setIsDragging(true);
  setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (isDragging) {
    // 拖拽地图
    setTransform({
      ...transform,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  } else {
    // 更新悬浮框位置
    setHoverPosition({ x: e.clientX, y: e.clientY });

    // 计算鼠标在数据坐标系中的位置
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const dataX = (screenX - transform.x) / transform.scale / xScale;
      const dataY = -(screenY - transform.y) / transform.scale;
      setMouseDataCoord({ x: Math.round(dataX), y: Math.round(dataY) });
      setMouseScreenPos({ x: e.clientX, y: e.clientY });
    }
  }
};

const handleMouseUp = () => {
  setIsDragging(false);
};
```

**解释：**
经典的拖拽实现：

1. 鼠标按下时记录起始位置
2. 鼠标移动时计算偏移量，更新 transform
3. 鼠标抬起时结束拖拽

同时，鼠标移动时还会计算鼠标在数据坐标系中的位置，用于显示坐标提示（调试功能）。

坐标转换公式：

- 屏幕坐标 → 数据坐标：`(screenX - transform.x) / transform.scale`
- 数据坐标 → 屏幕坐标：`dataX * transform.scale + transform.x`

---

**渲染城市节点：**

```typescript
{cities.map(city => {
  const x = city.x * xScale;
  const y = -city.y;  // 反转Y坐标

  // 检查是否被高亮
  const highlight = highlightedCities.find(h => h.id === city.id);
  const isHighlighted = !!highlight;
  const highlightColor = highlight?.color || '#3b82f6';

  return (
    <g key={city.id}>
      {/* 高亮光晕效果 */}
      {isHighlighted && (
        <circle
          cx={x}
          cy={y}
          r={8}
          fill={highlightColor}
          opacity={0.3}
          className="animate-pulse"
        />
      )}

      {/* 城市节点 */}
      <circle
        cx={x}
        cy={y}
        r={4}
        fill={isHighlighted ? highlightColor : '#64748b'}
        stroke="white"
        strokeWidth={1.5}
        className="cursor-pointer hover:r-6 transition-all"
        onClick={() => handleCityClick(city)}
        onMouseEnter={() => setHoveredCity(city)}
        onMouseLeave={() => setHoveredCity(null)}
      />

      {/* 城市名称标签 */}
      <text
        x={x}
        y={y - 8}
        fontSize={10}
        fill="#475569"
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        {city.name}
      </text>
    </g>
  );
})}
```

**解释：**
每个城市渲染为一个圆圈加文字标签。

细节：

1. 高亮城市会有一个脉动的光晕效果（`animate-pulse`）
2. 鼠标悬浮时圆圈会变大（`hover:r-6`）
3. 文字标签设置 `pointer-events-none`，避免遮挡鼠标事件
4. 使用 `textAnchor="middle"` 让文字居中对齐

---

**渲染线路：**

```typescript
{routes.map(route => {
  const sourceCity = cities.find(c => c.id === route.source);
  const targetCity = cities.find(c => c.id === route.target);
  if (!sourceCity || !targetCity) return null;

  const x1 = sourceCity.x * xScale;
  const y1 = -sourceCity.y;
  const x2 = targetCity.x * xScale;
  const y2 = -targetCity.y;

  // 检查是否被高亮
  const highlight = highlightedRoutes.find(
    h => (h.source === route.source && h.target === route.target) ||
         (h.source === route.target && h.target === route.source)
  );
  const isHighlighted = !!highlight;
  const highlightColor = highlight?.color || '#10b981';
  const isDashed = highlight?.dashed || false;

  return (
    <line
      key={route.id}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={isHighlighted ? highlightColor : '#cbd5e1'}
      strokeWidth={isHighlighted ? 3 : 1.5}
      strokeDasharray={isDashed ? '5,5' : undefined}
      className="cursor-pointer hover:stroke-width-4 transition-all"
      onClick={() => handleRouteClick(route)}
      onMouseEnter={() => setHoveredRoute(route)}
      onMouseLeave={() => setHoveredRoute(null)}
    />
  );
})}
```

**解释：**
线路渲染为 SVG `<line>` 元素。

细节：

1. 高亮线路会变粗、变色
2. 支持虚线样式（`strokeDasharray`），用于显示待添加的边
3. 鼠标悬浮时线条变粗
4. 线路是双向的，所以查找高亮时要检查两个方向

---

**悬浮提示框：**

```typescript
{(hoveredCity || lockedCity) && !disablePopup && (
  <div
    className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-3 pointer-events-none"
    style={{
      left: hoverPosition.x + 15,
      top: hoverPosition.y + 15,
    }}
  >
    <div className="text-sm font-semibold text-slate-900 dark:text-white">
      {(lockedCity || hoveredCity)!.name}
    </div>
    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
      ID: {(lockedCity || hoveredCity)!.id}
    </div>
    <div className="text-xs text-slate-500 dark:text-slate-400">
      坐标: ({(lockedCity || hoveredCity)!.x}, {(lockedCity || hoveredCity)!.y})
    </div>
    {(lockedCity || hoveredCity)!.description && (
      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xs">
        {(lockedCity || hoveredCity)!.description}
      </div>
    )}
  </div>
)}
```

**解释：**
当鼠标悬浮或点击城市时，显示一个浮动的信息卡片。

细节：

1. 使用 `fixed` 定位，相对于浏览器窗口
2. 位置跟随鼠标，偏移 15px 避免遮挡
3. `pointer-events-none` 让鼠标事件穿透，不影响下层元素
4. 支持锁定模式：点击城市后提示框固定，再次点击取消

---

#### 2.2 api.ts - API 请求封装

**功能：**
封装所有与后端交互的 HTTP 请求，提供类型安全的接口。

**基础数据操作：**

```typescript
// 获取所有数据
export async function getData(): Promise<{ cities: City[]; routes: Route[] }> {
  const res = await fetch('/api/data');
  return res.json();
}

// 添加城市
export async function addCity(city: Omit<City, 'id'>): Promise<City> {
  const res = await fetch('/api/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(city),
  });
  return res.json();
}

// 删除城市
export async function deleteCity(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/cities/${id}`, { method: 'DELETE' });
  return res.json();
}

// 添加线路
export async function addRoute(route: Omit<Route, 'id'>): Promise<Route> {
  const res = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route),
  });
  return res.json();
}

// 删除线路
export async function deleteRoute(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
  return res.json();
}
```

**解释：**
这些函数封装了基本的 CRUD 操作。使用 TypeScript 的 `Omit` 工具类型，表示添加时不需要提供 `id`（由后端生成）。所有函数都是 `async`，返回 Promise，方便使用 `await` 语法。

---

**批量操作：**

```typescript
// 批量替换所有城市（覆盖）
export async function replaceCities(cities: Omit<City, 'id'>[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/cities/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cities),
  });
  return res.json();
}

// 批量替换所有线路（覆盖）
export async function replaceRoutes(routes: Omit<Route, 'id'>[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/routes/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(routes),
  });
  return res.json();
}
```

**解释：**
批量替换操作用于数据导入功能。一次性删除所有旧数据，导入新数据。返回成功状态和导入的数量。

---

**算法分析接口：**

```typescript
// 连通性分析
export async function analyzeConnectivity() {
  const res = await fetch('/api/analyze/connectivity');
  return res.json();
}

// 最短路径分析（从指定城市到所有其他城市）
export async function analyzeShortestPath(sourceId: string) {
  const res = await fetch(`/api/analyze/shortest-path/${sourceId}`);
  return res.json();
}

// 旅行商问题求解
export async function analyzeTSP(sourceId: string, mode: 'open' | 'closed' = 'open') {
  const res = await fetch(`/api/analyze/tsp/${mode}/${sourceId}`);
  return res.json();
}

// 施泰纳树问题求解
export async function analyzeSteiner() {
  const res = await fetch('/api/analyze/steiner');
  return res.json();
}
```

**解释：**
这些函数调用后端的算法 API。

- `analyzeConnectivity`：判断图是否连通，返回连通分量
- `analyzeShortestPath`：计算从起点到所有城市的最短路径
- `analyzeTSP`：求解旅行商问题，`mode` 参数控制是否返回起点（`closed` 表示回到起点）
- `analyzeSteiner`：计算最小生成树（施泰纳树）

---

#### 2.3 types.ts - TypeScript 类型定义

```typescript
export interface City {
  id: string;              // 城市唯一标识
  name: string;            // 城市名称
  x: number;               // X 坐标
  y: number;               // Y 坐标
  description?: string;    // 城市简介（可选）
}

export interface Route {
  id: string;              // 线路唯一标识
  source: string;          // 起点城市 ID
  target: string;          // 终点城市 ID
  type: 'normal' | 'trunk';  // 线路类型（普通/主干）
}

export interface PathResult {
  targetId: string;        // 目标城市 ID
  distance: number;        // 距离
  path: string[];          // 路径（城市 ID 数组）
}

export interface TSPResult {
  path: string[];          // 访问顺序（城市 ID 数组）
  distance: number;        // 总距离
}

export interface SteinerResult {
  edges: {                 // 最小生成树的边
    source: string;
    target: string;
    distance: number;
  }[];
  distance: number;        // 总距离
}

export interface ConnectivityResult {
  isConnected: boolean;    // 是否连通
  components?: number[][];  // 连通分量（如果不连通）
}
```

**解释：**
TypeScript 的类型定义提供了编译时的类型检查，避免运行时错误。这些接口定义了前后端交互的数据格式，确保类型一致性。

---

#### 2.4 CityManager.tsx - 城市管理页面

**页面功能：**
城市管理页面提供了完整的城市 CRUD 功能，包括添加、删除、修改城市，以及在地图上可视化显示。

**状态管理：**

```typescript
const [showImport, setShowImport] = useState(false);           // 是否显示导入弹窗
const [name, setName] = useState('');                          // 表单：城市名称
const [x, setX] = useState('');                                // 表单：X 坐标
const [y, setY] = useState('');                                // 表单：Y 坐标
const [desc, setDesc] = useState('');                          // 表单：简介
const [selectedCityId, setSelectedCityId] = useState<string | null>(null);  // 当前选中的城市 ID
const [cityType, setCityType] = useState<'key' | 'normal'>('normal');       // 城市类型（省会/普通）
const [filterType, setFilterType] = useState<'all' | 'key' | 'normal'>('all');  // 列表过滤类型
const [searchQuery, setSearchQuery] = useState('');            // 搜索关键词
const [mapHighlightedCity, setMapHighlightedCity] = useState<City | null>(null);  // 地图上高亮的城市
const [confirmDialog, setConfirmDialog] = useState({           // 确认对话框状态
  open: false,
  title: '',
  message: '',
  action: () => {},
});
```

**解释：**
这个组件的状态比较复杂，因为要同时管理表单、列表、地图、对话框等多个部分。`selectedCityId` 用于区分是添加新城市还是编辑现有城市。

---

**添加/更新城市：**

```typescript
const handleAddOrUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  // 自动补全描述
  let finalDesc = desc;
  if (!desc || desc.trim() === '') {
    finalDesc = cityType === 'key' ? '省会' : '地级市';
  } else if (cityType === 'key' && !desc.includes('省会') && !desc.includes('直辖市')) {
    finalDesc = `${desc}（省会）`;
  }

  const isUpdate = !!selectedCityId;
  const cityName = name;

  // 显示确认对话框
  setConfirmDialog({
    open: true,
    title: isUpdate ? '确认更新城市' : '确认添加城市',
    message: isUpdate
      ? `将更新城市「${cityName}」的信息，此操作会直接修改数据文件。`
      : `将添加新城市「${cityName}」(${x}, ${y})，此操作会直接写入数据文件。`,
    action: async () => {
      if (isUpdate) {
        await api.deleteCity(selectedCityId!);  // 先删除旧数据
      }
      await api.addCity({ name, x: parseInt(x), y: parseInt(y), description: finalDesc });

      // 清空表单
      setName('');
      setX('');
      setY('');
      setDesc('');
      setSelectedCityId(null);
      setCityType('normal');

      onUpdate();  // 通知父组件刷新数据
    },
  });
};
```

**解释：**
这个函数处理添加和更新两种情况。关键点：

1. 根据城市类型自动补全描述（省会/地级市）
2. 通过 `selectedCityId` 判断是添加还是更新
3. 更新操作实际上是"删除+添加"，因为后端没有单独的更新接口
4. 所有危险操作都要弹出确认对话框，避免误操作
5. 操作完成后清空表单，刷新数据

---

**删除城市：**

```typescript
const handleDelete = (id: string) => {
  const city = cities.find(c => c.id === id);
  setConfirmDialog({
    open: true,
    title: '确认删除城市',
    message: `将删除城市「${city?.name || '未知'}」，此操作不可恢复，会直接修改数据文件。`,
    action: async () => {
      await api.deleteCity(id);

      // 如果删除的是当前选中的城市，清空表单
      if (selectedCityId === id) {
        setName('');
        setX('');
        setY('');
        setDesc('');
        setSelectedCityId(null);
      }

      onUpdate();
    },
  });
};
```

**解释：**
删除操作也需要确认。如果删除的是当前正在编辑的城市，要清空表单，避免用户误以为还能保存。

---

**选择城市（从列表）：**

```typescript
const handleSelect = (city: City) => {
  setSelectedCityId(city.id);
  setMapHighlightedCity(city);  // 地图上高亮该城市

  // 填充表单
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
```

**解释：**
点击列表中的城市时：

1. 填充表单，进入编辑模式
2. 地图上高亮该城市
3. 自动滚动列表，让选中项可见
4. 根据描述自动识别城市类型（省会/普通）

`setTimeout` 是为了等待 DOM 更新后再滚动。

---

**选择城市（从地图）：**

```typescript
const handleMapCityClick = (city: City) => {
  setSelectedCityId(city.id);
  setMapHighlightedCity(city);

  // 填充表单
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
```

**解释：**
从地图点击城市时，功能和从列表选择类似，但要额外滚动左侧列表，实现列表和地图的联动。

---

**页面布局：**

```typescript
return (
  <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden h-full">
    {/* Header - 顶部工具栏 */}
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-semibold text-slate-800">城市节点配置</h2>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <input
            type="text"
            placeholder="搜索城市..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="apple-input pl-10 pr-4 py-2.5 w-64 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 导入按钮 */}
      <button onClick={() => setShowImport(true)} className="apple-button">
        <Download className="w-4 h-4" />
        导入数据
      </button>
    </header>

    {/* Main Content - 主内容区 */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - 城市列表 */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* 过滤器 */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'active' : ''}
            >
              全部 ({cities.length})
            </button>
            <button
              onClick={() => setFilterType('key')}
              className={filterType === 'key' ? 'active' : ''}
            >
              省会 ({cities.filter(c => c.description?.includes('省会')).length})
            </button>
            <button
              onClick={() => setFilterType('normal')}
              className={filterType === 'normal' ? 'active' : ''}
            >
              普通 ({cities.filter(c => !c.description?.includes('省会')).length})
            </button>
          </div>
        </div>

        {/* 城市列表 */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {filteredCities.map(city => (
            <div
              key={city.id}
              id={`city-item-${city.id}`}
              className={`city-item ${selectedCityId === city.id ? 'selected' : ''}`}
              onClick={() => handleSelect(city)}
            >
              <div className="font-medium">{city.name}</div>
              <div className="text-xs text-slate-500">
                ({city.x}, {city.y})
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(city.id);
                }}
                className="delete-button"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel - 地图 */}
      <div className="flex-1 bg-slate-100">
        <MapVisualizer
          cities={cities}
          routes={routes}
          highlightedCities={mapHighlightedCity ? [{ id: mapHighlightedCity.id, color: '#3b82f6' }] : []}
          onCityClick={handleMapCityClick}
        />
      </div>

      {/* Right Panel - 编辑表单 */}
      <div className="w-96 bg-white border-l border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          {selectedCityId ? '编辑城市' : '添加城市'}
        </h3>

        <form onSubmit={handleAddOrUpdate}>
          <input
            type="text"
            placeholder="城市名称"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="X 坐标"
            value={x}
            onChange={e => setX(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Y 坐标"
            value={y}
            onChange={e => setY(e.target.value)}
            required
          />
          <textarea
            placeholder="城市简介"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />

          <div className="flex gap-2">
            <button type="submit" className="apple-button-primary">
              {selectedCityId ? '更新' : '添加'}
            </button>
            {selectedCityId && (
              <button type="button" onClick={handleReset} className="apple-button">
                取消
              </button>
            )}
          </div>
        </form>
      </div>
    </div>

    {/* 确认对话框 */}
    <ConfirmDialog
      open={confirmDialog.open}
      title={confirmDialog.title}
      message={confirmDialog.message}
      onConfirm={confirmDialog.action}
      onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
    />

    {/* 导入弹窗 */}
    {showImport && (
      <ImportModal
        onClose={() => setShowImport(false)}
        onImport={onUpdate}
      />
    )}
  </div>
);
```

**解释：**
页面采用三栏布局：

1. **左侧栏（320px）**：城市列表，支持过滤和搜索
2. **中间区域（自适应）**：地图可视化
3. **右侧栏（384px）**：编辑表单

这种布局让用户可以同时看到列表、地图、表单，操作流畅。列表和地图是联动的，点击任意一个都会同步高亮。

---

#### 2.5 AnalysisViews.tsx - 算法分析页面

**页面功能：**
这是整个项目最复杂的页面，实现了图论算法的逐步可视化动画。包括连通性分析、最短路径、TSP、施泰纳树等算法。

**核心特性：**

- 逐步动画展示算法执行过程
- 支持播放/暂停/步进控制
- 可调节动画速度
- 实时日志显示算法状态
- 地图上高亮显示当前访问的节点和边

---

**连通性分析 - 生成遍历步骤：**

```typescript
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
        u = stack.pop()!;  // DFS：后进先出（栈）
      } else {
        u = stack.shift()!;  // BFS：先进先出（队列）
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
          stack.push(v);
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
```

**解释：**
这个函数是算法可视化的核心。它不是直接执行算法，而是生成一系列"快照"，每个快照记录算法在某一时刻的状态。

关键点：

1. **步骤类型**：`init`（初始化）、`component_start`（发现新连通分量）、`visit`（访问节点）、`edge_skip`（跳过已访问边）、`edge_explore`（探索新边）、`component_done`（连通分量完成）、`complete`（全部完成）
2. **状态快照**：每个步骤记录当前已访问的节点集合、当前节点、当前边、日志消息
3. **DFS vs BFS**：唯一区别是取元素的方式，DFS 用 `pop()`（栈），BFS 用 `shift()`（队列）
4. **边的分类**：已访问的边标记为灰色（跳过），新边标记为绿色（探索）

这种设计让动画可以暂停、步进、回退，因为所有状态都预先计算好了。

---

**动画播放控制：**

```typescript
const runAnimationStep = useCallback(async (stepIndex: number) => {
  if (stepIndex >= stepsRef.current.length) {
    // 动画结束
    setIsAnimating(false);
    setIsPaused(false);

    // 显示最终结果
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
  setCurrentStep(stepIndex);

  // 更新可视化状态
  setCurrentNode(step.currentNode || '-');

  // 添加日志消息
  setLogMessages(prev => [...prev, `[步骤 ${stepIndex + 1}] ${step.message}`]);

  // 继续下一步（如果没有暂停）
  if (!isPaused) {
    animationRef.current = setTimeout(() => {
      runAnimationStep(stepIndex + 1);
    }, speed);
  }
}, [speed, isPaused]);
```

**解释：**
这个函数递归执行动画的每一步。

流程：

1. 检查是否到达最后一步，如果是则显示最终结果
2. 取出当前步骤的状态快照
3. 更新 UI（当前节点、日志消息）
4. 如果没有暂停，延迟 `speed` 毫秒后执行下一步

使用 `setTimeout` 而不是循环，是为了让 React 有机会重新渲染 UI。`animationRef` 保存定时器 ID，用于暂停时清除定时器。

---

**动画控制按钮：**

```typescript
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

const handlePause = () => {
  setIsPaused(true);
  if (animationRef.current) {
    clearTimeout(animationRef.current);
    animationRef.current = null;
  }
};

const handleResume = () => {
  setIsPaused(false);
  runAnimationStep(currentStep + 1);
};

const handleStepForward = () => {
  if (currentStep < totalSteps - 1) {
    runAnimationStep(currentStep + 1);
  }
};

const handleStepBackward = () => {
  if (currentStep > 0) {
    setCurrentStep(currentStep - 1);
    const step = stepsRef.current[currentStep - 1];
    setCurrentNode(step.currentNode || '-');
    // 重建日志（截取到当前步骤）
    const newLogs = stepsRef.current
      .slice(0, currentStep)
      .map((s, i) => `[步骤 ${i + 1}] ${s.message}`);
    setLogMessages(newLogs);
  }
};

const stopAnimation = () => {
  setIsAnimating(false);
  setIsPaused(false);
  if (animationRef.current) {
    clearTimeout(animationRef.current);
    animationRef.current = null;
  }
};

const resetAnimation = () => {
  setCurrentStep(0);
  setLogMessages([]);
  setCurrentNode('-');
  stepsRef.current = [];
};
```

**解释：**
完整的动画控制功能：

- **播放**：生成步骤，开始动画
- **暂停**：清除定时器，停止自动播放
- **继续**：从当前步骤继续播放
- **步进**：手动前进/后退一步
- **停止**：完全停止动画
- **重置**：清空所有状态

步进后退时要重建日志，只显示到当前步骤的消息。

---

**地图高亮显示：**

```typescript
// 根据当前步骤生成高亮数据
const currentStepData = stepsRef.current[currentStep];
const highlightedCities = currentStepData
  ? Array.from(currentStepData.visited).map(id => ({
      id,
      color: id === currentStepData.currentNode ? '#f59e0b' : '#10b981',  // 当前节点橙色，已访问绿色
      className: id === currentStepData.currentNode ? 'animate-pulse' : ''
    }))
  : [];

const highlightedRoutes = currentStepData?.currentEdge
  ? [{
      source: currentStepData.currentEdge.split('->')[0],
      target: currentStepData.currentEdge.split('->')[1],
      color: currentStepData.type === 'edge_skip' ? '#94a3b8' : '#10b981',  // 跳过的边灰色，探索的边绿色
      dashed: currentStepData.type === 'edge_skip'
    }]
  : [];

return (
  <MapVisualizer
    cities={cities}
    routes={routes}
    highlightedCities={highlightedCities}
    highlightedRoutes={highlightedRoutes}
    disableAutoZoom={true}
  />
);
```

**解释：**
根据当前步骤的状态，动态生成高亮数据传给地图组件。

颜色方案：

- **当前访问节点**：橙色 + 脉动动画
- **已访问节点**：绿色
- **当前探索边**：绿色实线
- **跳过的边**：灰色虚线

这样用户可以清楚地看到算法的执行过程。

---

**控制面板 UI：**

```typescript
<div className="control-panel">
  {/* 算法选择 */}
  <div className="flex gap-2">
    <button
      onClick={() => setAlgo('dfs')}
      className={algo === 'dfs' ? 'active' : ''}
    >
      深度优先 (DFS)
    </button>
    <button
      onClick={() => setAlgo('bfs')}
      className={algo === 'bfs' ? 'active' : ''}
    >
      广度优先 (BFS)
    </button>
  </div>

  {/* 速度控制 */}
  <div className="speed-control">
    <label>动画速度: {speed}ms</label>
    <input
      type="range"
      min="50"
      max="2000"
      step="50"
      value={speed}
      onChange={e => setSpeed(Number(e.target.value))}
    />
  </div>

  {/* 播放控制 */}
  <div className="flex gap-2">
    {!isAnimating ? (
      <button onClick={handleAnalyze} className="play-button">
        <Play className="w-4 h-4" />
        开始分析
      </button>
    ) : (
      <>
        {isPaused ? (
          <button onClick={handleResume}>
            <Play className="w-4 h-4" />
            继续
          </button>
        ) : (
          <button onClick={handlePause}>
            <Square className="w-4 h-4" />
            暂停
          </button>
        )}
        <button onClick={handleStepBackward} disabled={currentStep === 0}>
          ← 上一步
        </button>
        <button onClick={handleStepForward} disabled={currentStep >= totalSteps - 1}>
          下一步 →
        </button>
        <button onClick={stopAnimation}>
          停止
        </button>
      </>
    )}
  </div>

  {/* 进度显示 */}
  <div className="progress">
    步骤: {currentStep + 1} / {totalSteps}
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>
  </div>

  {/* 日志窗口 */}
  <div className="log-window">
    {logMessages.map((msg, i) => (
      <div key={i} className="log-message">{msg}</div>
    ))}
  </div>
</div>
```

**解释：**
控制面板提供了完整的交互功能：

1. **算法选择**：DFS 或 BFS
2. **速度滑块**：50ms 到 2000ms
3. **播放控制**：播放/暂停/步进/停止
4. **进度条**：显示当前执行到第几步
5. **日志窗口**：实时显示算法执行的文字描述

这种设计让用户可以完全控制动画的播放，方便学习和调试。

---

#### 2.6 主题系统 - ThemeContext.tsx

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // 从 localStorage 读取用户偏好
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

**解释：**
主题系统使用 React Context 实现全局状态管理：

1. **持久化**：主题偏好保存在 localStorage，刷新页面后保持
2. **CSS 变量**：通过 `data-theme` 属性切换 CSS 变量
3. **自定义 Hook**：`useTheme()` 让任何组件都能访问主题状态

在 CSS 中配合使用：

```css
:root[data-theme='light'] {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
}

:root[data-theme='dark'] {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}
```

---

## 第三部分：前后端通信

### 3.1 API 接口设计

后端提供 RESTful API，前端通过 fetch 调用：

| 方法   | 路径                       | 功能         | 请求体         | 响应                 |
| ------ | -------------------------- | ------------ | -------------- | -------------------- |
| GET    | `/api/cities`              | 获取所有城市 | -              | `City[]`             |
| POST   | `/api/cities`              | 添加城市     | `City`         | `{success: bool}`    |
| DELETE | `/api/cities/:id`          | 删除城市     | -              | `{success: bool}`    |
| GET    | `/api/routes`              | 获取所有线路 | -              | `Route[]`            |
| POST   | `/api/routes`              | 添加线路     | `Route`        | `{success: bool}`    |
| DELETE | `/api/routes/:id`          | 删除线路     | -              | `{success: bool}`    |
| POST   | `/api/algorithms/dijkstra` | 最短路径     | `{start, end}` | `{path, distance}`   |
| POST   | `/api/algorithms/kruskal`  | 最小生成树   | -              | `{edges, totalCost}` |
| POST   | `/api/algorithms/tsp`      | TSP 问题     | `{cities}`     | `{path, distance}`   |
| POST   | `/api/algorithms/steiner`  | 施泰纳树     | `{keyCities}`  | `{edges, totalCost}` |

---

### 3.2 前端 API 封装 - api.ts

```typescript
const API_BASE = 'http://localhost:8080/api';

// 获取所有城市
export async function getCities(): Promise<City[]> {
  const res = await fetch(`${API_BASE}/cities`);
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
}

// 添加城市
export async function addCity(city: Omit<City, 'id'>): Promise<void> {
  const res = await fetch(`${API_BASE}/cities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(city),
  });
  if (!res.ok) throw new Error('Failed to add city');
}

// 删除城市
export async function deleteCity(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cities/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete city');
}

// 执行 Dijkstra 算法
export async function runDijkstra(start: string, end: string) {
  const res = await fetch(`${API_BASE}/algorithms/dijkstra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end }),
  });
  if (!res.ok) throw new Error('Dijkstra failed');
  return res.json();
}
```

**解释：**
API 封装层的好处：

1. **统一错误处理**：所有请求失败都抛出异常
2. **类型安全**：TypeScript 确保请求/响应类型正确
3. **易于维护**：修改 API 只需改一处
4. **可测试性**：可以 mock 这些函数进行单元测试

---

### 3.3 后端 HTTP 服务器 - ApiServer.cpp

```cpp
void ApiServer::handleRequest(const std::string& method, const std::string& path,
                              const std::string& body, std::string& response) {
    // 路由分发
    if (path == "/api/cities" && method == "GET") {
        handleGetCities(response);
    } else if (path == "/api/cities" && method == "POST") {
        handleAddCity(body, response);
    } else if (path.find("/api/cities/") == 0 && method == "DELETE") {
        std::string id = path.substr(12); // 提取 ID
        handleDeleteCity(id, response);
    } else if (path == "/api/algorithms/dijkstra" && method == "POST") {
        handleDijkstra(body, response);
    } else {
        response = "HTTP/1.1 404 Not Found\r\n\r\n{\"error\":\"Not Found\"}";
    }
}

void ApiServer::handleGetCities(std::string& response) {
    json result = json::array();
    for (const auto& city : graph->getCities()) {
        result.push_back({
            {"id", city.id},
            {"name", city.name},
            {"x", city.x},
            {"y", city.y},
            {"description", city.description}
        });
    }

    response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: application/json\r\n";
    response += "Access-Control-Allow-Origin: *\r\n\r\n";
    response += result.dump();
}
```

**解释：**
这是一个简单的 HTTP 服务器实现：

1. **路由匹配**：根据 method 和 path 分发到不同处理函数
2. **JSON 序列化**：使用 nlohmann/json 库转换 C++ 对象
3. **CORS 支持**：添加 `Access-Control-Allow-Origin` 头允许跨域

---

## 第四部分：核心算法详解

### 4.1 Dijkstra 最短路径算法

**算法原理：**
Dijkstra 算法用于求单源最短路径，适用于边权非负的图。核心思想是贪心策略：每次选择距离起点最近的未访问节点。

**代码实现：**

```cpp
std::vector<int> Dijkstra::findShortestPath(Graph* graph, int startId, int endId) {
    auto cities = graph->getCities();
    int n = cities.size();

    // 初始化距离数组和前驱数组
    std::vector<int> dist(n, INT_MAX);
    std::vector<int> prev(n, -1);
    std::vector<bool> visited(n, false);

    int startIdx = graph->cityIdToIdx(startId);
    int endIdx = graph->cityIdToIdx(endId);

    dist[startIdx] = 0;

    // 优先队列：pair<距离, 节点索引>
    std::priority_queue<std::pair<int, int>,
                        std::vector<std::pair<int, int>>,
                        std::greater<std::pair<int, int>>> pq;
    pq.push({0, startIdx});

    while (!pq.empty()) {
        int u = pq.top().second;
        pq.pop();

        if (visited[u]) continue;
        visited[u] = true;

        // 松弛操作
        for (auto& [v, weight] : graph->getNeighbors(u)) {
            if (!visited[v] && dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                prev[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    // 回溯路径
    std::vector<int> path;
    for (int at = endIdx; at != -1; at = prev[at]) {
        path.push_back(cities[at].id);
    }
    std::reverse(path.begin(), path.end());

    return path;
}
```

**时间复杂度：** O((V + E) log V)，其中 V 是节点数，E 是边数。

**关键点：**

1. **优先队列优化**：使用最小堆快速找到最近节点
2. **松弛操作**：如果通过 u 到 v 的距离更短，就更新 dist[v]
3. **路径回溯**：通过 prev 数组从终点回溯到起点

---

### 4.2 Kruskal 最小生成树算法

**算法原理：**
Kruskal 算法用于求最小生成树（MST），核心思想是贪心选择：按边权从小到大排序，依次加入不形成环的边。

**代码实现：**

```cpp
std::vector<Edge> Kruskal::findMST(Graph* graph) {
    std::vector<Edge> allEdges = graph->getAllEdges();

    // 按边权排序
    std::sort(allEdges.begin(), allEdges.end(),
              [](const Edge& a, const Edge& b) { return a.length < b.length; });

    UnionFind uf(graph->getCities().size());
    std::vector<Edge> mst;

    for (const auto& edge : allEdges) {
        int uIdx = graph->cityIdToIdx(edge.from);
        int vIdx = graph->cityIdToIdx(edge.to);

        // 如果两个节点不在同一集合，加入这条边
        if (uf.find(uIdx) != uf.find(vIdx)) {
            uf.unite(uIdx, vIdx);
            mst.push_back(edge);
        }

        // 已经有 n-1 条边，MST 完成
        if (mst.size() == graph->getCities().size() - 1) {
            break;
        }
    }

    return mst;
}
```

**并查集实现：**

```cpp
class UnionFind {
private:
    std::vector<int> parent;
    std::vector<int> rank;

public:
    UnionFind(int n) : parent(n), rank(n, 0) {
        for (int i = 0; i < n; i++) {
            parent[i] = i;  // 初始时每个节点是自己的父节点
        }
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // 路径压缩
        }
        return parent[x];
    }

    void unite(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);

        if (rootX == rootY) return;

        // 按秩合并
        if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;
        }
    }
};
```

**时间复杂度：** O(E log E)，主要是排序的开销。

**关键点：**

1. **并查集**：高效判断两个节点是否连通，防止成环
2. **路径压缩**：find 操作时将节点直接连到根节点，加速后续查询
3. **按秩合并**：将较小的树合并到较大的树，保持树的平衡

---

### 4.3 TSP 旅行商问题

**算法原理：**
TSP 是 NP-hard 问题，这里使用贪心近似算法：每次选择距离当前城市最近的未访问城市。

**代码实现：**

```cpp
std::vector<int> TSP::findTour(Graph* graph, const std::vector<int>& cityIds) {
    if (cityIds.empty()) return {};

    std::vector<int> tour;
    std::set<int> unvisited(cityIds.begin(), cityIds.end());

    int current = cityIds[0];
    tour.push_back(current);
    unvisited.erase(current);

    while (!unvisited.empty()) {
        int nearest = -1;
        int minDist = INT_MAX;

        // 找到距离当前城市最近的未访问城市
        for (int cityId : unvisited) {
            int dist = graph->getDistance(current, cityId);
            if (dist < minDist) {
                minDist = dist;
                nearest = cityId;
            }
        }

        tour.push_back(nearest);
        unvisited.erase(nearest);
        current = nearest;
    }

    // 回到起点形成环路
    tour.push_back(tour[0]);

    return tour;
}
```

**时间复杂度：** O(n²)，其中 n 是城市数量。

**注意：**
这是贪心近似算法，不保证找到最优解，但速度快。对于小规模问题（n < 20），可以用动态规划求精确解。

---

### 4.4 施泰纳树算法

**算法原理：**
施泰纳树问题：给定关键节点集合，找到连接这些节点的最小代价树（可以包含非关键节点）。

**代码实现：**

```cpp
SteinerTreeResult SteinerTree::solve(Graph* graph, const std::vector<int>& keyIds) {
    SteinerTreeResult result;

    if (keyIds.empty()) return result;

    // 第一步：计算关键节点之间的最短路径
    std::map<std::pair<int, int>, std::vector<int>> shortestPaths;
    for (size_t i = 0; i < keyIds.size(); i++) {
        for (size_t j = i + 1; j < keyIds.size(); j++) {
            auto path = Dijkstra::findShortestPath(graph, keyIds[i], keyIds[j]);
            shortestPaths[{keyIds[i], keyIds[j]}] = path;
        }
    }

    // 第二步：构建完全图（关键节点之间的距离）
    std::vector<Edge> completeGraphEdges;
    for (const auto& [pair, path] : shortestPaths) {
        int dist = 0;
        for (size_t i = 0; i < path.size() - 1; i++) {
            dist += graph->getDistance(path[i], path[i + 1]);
        }
        completeGraphEdges.push_back(Edge(pair.first, pair.second, dist));
    }

    // 第三步：在完全图上运行 Kruskal 算法
    Graph completeGraph;
    for (int id : keyIds) {
        completeGraph.addCity(graph->getCityById(id));
    }
    for (const auto& edge : completeGraphEdges) {
        completeGraph.addRoute(edge.from, edge.to);
    }

    auto mstEdges = Kruskal::findMST(&completeGraph);

    // 第四步：将 MST 的边展开为原图中的路径
    std::set<Edge> steinerEdges;
    for (const auto& edge : mstEdges) {
        auto path = shortestPaths[{edge.from, edge.to}];
        for (size_t i = 0; i < path.size() - 1; i++) {
            int from = path[i];
            int to = path[i + 1];
            int dist = graph->getDistance(from, to);
            steinerEdges.insert(Edge(from, to, dist));
        }
    }

    result.edges.assign(steinerEdges.begin(), steinerEdges.end());
    result.totalDistance = 0;
    for (const auto& edge : result.edges) {
        result.totalDistance += edge.length;
    }

    return result;
}
```

**时间复杂度：** O(k² · V log V + E log E)，其中 k 是关键节点数。

**算法步骤：**

1. 计算所有关键节点对之间的最短路径（Dijkstra）
2. 构建关键节点的完全图
3. 在完全图上求最小生成树（Kruskal）
4. 将 MST 的边展开为原图中的实际路径

---

## 第五部分：项目总结

### 5.1 技术亮点

1. **双数据结构设计**：邻接表 + 邻接矩阵，兼顾不同算法的性能需求
2. **PixiJS 高性能渲染**：WebGL 加速，流畅显示 200+ 节点
3. **完整的算法可视化**：逐步动画展示算法执行过程
4. **苹果风格 UI**：毛玻璃效果、流畅动画、精致交互
5. **前后端分离**：RESTful API，易于扩展和维护

### 5.2 可能的改进方向

1. **算法优化**：TSP 可以改用动态规划或遗传算法
2. **数据持久化**：改用 SQLite 数据库替代 JSON 文件
3. **多用户支持**：添加用户认证和权限管理
4. **更多算法**：添加 Floyd-Warshall、Bellman-Ford 等
5. **性能监控**：添加算法执行时间统计和性能分析

### 5.3 学习要点

通过这个项目，你应该掌握：

1. **图论基础**：图的表示、遍历、最短路径、最小生成树
2. **数据结构**：邻接表、邻接矩阵、并查集、优先队列
3. **算法设计**：贪心、动态规划、回溯
4. **前端开发**：React、TypeScript、Canvas/WebGL 渲染
5. **后端开发**：C++ HTTP 服务器、JSON 处理
6. **软件工程**：模块化设计、API 设计、错误处理

---
