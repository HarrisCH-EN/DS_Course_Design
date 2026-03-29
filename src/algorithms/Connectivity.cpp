// 1. 检查连通性:isConnected()判断图是否连通

// 2. 找连通分量:findConnectedComponents()返回每个连通分量的节点列表

// 3. 连通图补全:makeConnected()
// 解释:
// 这个算法解决的问题是：如果图不连通，怎么用最少的线路总长度把它连起来？
// 步骤：
// 1. 先找出所有连通分量（比如 3 个孤立的城市群）
// 2. 计算每两个连通分量之间的最短连接边（暴力枚举所有城市对）
// 3. 把这些边按长度排序
// 4. 用 Kruskal 算法（基于并查集）贪心选择最短边，直到所有连通分量连成一个整体
// 并查集的作用是快速判断两个连通分量是否已经连通，避免形成环。
 


#include "Connectivity.h"
#include <algorithm>
#include <limits>

// 构建邻接表的辅助函数（所有城市必须是有效的图节点）
std::vector<std::vector<std::pair<int, int>>> Connectivity::buildAdjList(const Graph& graph) {
    int n = graph.getCityCount();
    std::vector<City> cities = graph.getAllCities();
    std::vector<std::vector<std::pair<int, int>>> adjList(n);

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int dist = graph.getDistance(cities[i].id, cities[j].id);
            if (dist > 0) {
                adjList[i].push_back({j, dist});
                adjList[j].push_back({i, dist});
            }
        }
    }

    return adjList;
}

void Connectivity::dfs(int node, const std::vector<std::vector<std::pair<int, int>>>& adjList,
                       std::vector<bool>& visited) {
    visited[node] = true;
    for (const auto& neighbor : adjList[node]) {
        if (!visited[neighbor.first]) {
            dfs(neighbor.first, adjList, visited);
        }
    }
}

bool Connectivity::isConnected(const Graph& graph) {
    int n = graph.getCityCount();
    if (n == 0) return true;  // 空图认为是连通的

    // 优化: 复用邻接表构建
    std::vector<std::vector<std::pair<int, int>>> adjList = buildAdjList(graph);

    std::vector<bool> visited(n, false);

    dfs(0, adjList, visited);  // 从节点 0 开始 DFS

    // 检查是否所有节点都被访问到
    for (bool v : visited) {
        if (!v) return false;  // 有节点未访问，说明不连通
    }
    return true;
}

std::vector<std::vector<int>> Connectivity::findConnectedComponents(const Graph& graph) {
    int n = graph.getCityCount();
    // 优化: 复用邻接表构建
    std::vector<std::vector<std::pair<int, int>>> adjList = buildAdjList(graph);

    std::vector<bool> visited(n, false);
    std::vector<std::vector<int>> components;

    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            std::vector<int> component;
            std::vector<int> stack = {i};
            visited[i] = true;

            while (!stack.empty()) {
                int node = stack.back();
                stack.pop_back();
                component.push_back(node);

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

std::vector<Edge> Connectivity::makeConnected(const Graph& graph) {
    std::vector<std::vector<int>> components = findConnectedComponents(graph);
    std::vector<Edge> newEdges;

    if (components.size() <= 1) {
        return newEdges;
    }

    std::vector<City> cities = graph.getAllCities();
    int numComponents = components.size();

    // 构建连通分量之间的最小距离边
    struct ComponentEdge {
        int fromComp;
        int toComp;
        int fromCity;
        int toCity;
        int distance;
    };

    std::vector<ComponentEdge> allComponentEdges;

    // 计算每对连通分量之间的最小距离边
    for (int i = 0; i < numComponents; i++) {
        for (int j = i + 1; j < numComponents; j++) {
            int minDist = std::numeric_limits<int>::max();
            int bestFrom = -1, bestTo = -1;

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

    // 按距离排序
    std::sort(allComponentEdges.begin(), allComponentEdges.end(),
        [](const ComponentEdge& a, const ComponentEdge& b) {
            return a.distance < b.distance;
        });

    // 使用 Kruskal 算法构建连通分量之间的最小生成树
    std::vector<int> parent(numComponents);
    for (int i = 0; i < numComponents; i++) {
        parent[i] = i;
    }

    auto find = [&parent](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    auto unite = [&find, &parent](int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) return false;
        parent[rootY] = rootX;
        return true;
    };

    for (const auto& edge : allComponentEdges) {
        if (unite(edge.fromComp, edge.toComp)) {
            newEdges.push_back(Edge(edge.fromCity, edge.toCity, edge.distance));
            if (newEdges.size() == numComponents - 1) {
                break;
            }
        }
    }

    return newEdges;
}