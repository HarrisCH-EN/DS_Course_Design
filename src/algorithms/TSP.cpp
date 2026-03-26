#include "TSP.h"
#include <algorithm>
#include <limits>
#include <queue>
#include <map>
#include <set>
#include <vector>
#include <climits>

// 计算两点间最短路径（Dijkstra）
static std::pair<std::vector<int>, int> dijkstraPath(const Graph& graph, int start, int end) {
    if (start == end) {
        return {{start}, 0};
    }

    auto cities = graph.getAllCities();
    std::set<int> allCities;
    for (const auto& city : cities) {
        allCities.insert(city.id);
    }

    if (allCities.find(start) == allCities.end() || allCities.find(end) == allCities.end()) {
        return {{}, -1};
    }

    // 构建邻接表
    std::map<int, std::vector<std::pair<int, int>>> adjList;
    for (int city : allCities) {
        adjList[city] = std::vector<std::pair<int, int>>();
    }

    auto edges = graph.getAllEdges();
    for (const auto& edge : edges) {
        adjList[edge.from].push_back({edge.to, edge.length});
        adjList[edge.to].push_back({edge.from, edge.length});
    }

    // Dijkstra
    std::map<int, int> dist;
    std::map<int, int> parent;
    std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<std::pair<int, int>>> pq;

    for (int city : allCities) {
        dist[city] = std::numeric_limits<int>::max();
    }

    dist[start] = 0;
    pq.push({0, start});

    while (!pq.empty()) {
        auto top = pq.top(); pq.pop();
        int d = top.first;
        int u = top.second;

        if (d > dist[u]) continue;
        if (u == end) break;

        auto adjIt = adjList.find(u);
        if (adjIt == adjList.end()) continue;
        for (const auto& neighbor : adjIt->second) {
            int v = neighbor.first;
            int w = neighbor.second;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    if (dist[end] == std::numeric_limits<int>::max()) {
        return {{}, -1};
    }

    // 重建路径
    std::vector<int> path;
    int current = end;
    while (current != start) {
        path.push_back(current);
        current = parent[current];
    }
    path.push_back(start);
    std::reverse(path.begin(), path.end());

    return {path, dist[end]};
}

// ==================== 距离缓存 ====================
struct DistanceCache {
    std::map<std::pair<int, int>, int> cache;
    const Graph* graph;
    std::map<int, std::vector<std::pair<int, int>>> adjList;
    std::set<int> allCities;

    DistanceCache(const Graph* g) : graph(g) {
        auto cities = graph->getAllCities();
        for (const auto& city : cities) {
            allCities.insert(city.id);
            adjList[city.id] = std::vector<std::pair<int, int>>();
        }
        auto edges = graph->getAllEdges();
        for (const auto& edge : edges) {
            adjList[edge.from].push_back({edge.to, edge.length});
            adjList[edge.to].push_back({edge.from, edge.length});
        }
    }

    int get(int u, int v) {
        if (u == v) return 0;
        if (allCities.find(u) == allCities.end() || allCities.find(v) == allCities.end()) {
            return INT_MAX;
        }
        auto key = std::make_pair(u, v);
        auto it = cache.find(key);
        if (it != cache.end()) return it->second;

        // Dijkstra 最短距离
        std::map<int, int> dist;
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<std::pair<int, int>>> pq;

        for (int city : allCities) {
            dist[city] = INT_MAX;
        }
        dist[u] = 0;
        pq.push({0, u});

        while (!pq.empty()) {
            auto top = pq.top(); pq.pop();
            int d = top.first;
            int node = top.second;
            if (d > dist[node]) continue;
            if (node == v) break;
            auto adjIt = adjList.find(node);
            if (adjIt == adjList.end()) continue;
            for (const auto& neighbor : adjIt->second) {
                int vv = neighbor.first;
                int w = neighbor.second;
                if (dist[node] + w < dist[vv]) {
                    dist[vv] = dist[node] + w;
                    pq.push({dist[vv], vv});
                }
            }
        }

        int d = dist[v];
        if (d == INT_MAX) {
            cache[key] = INT_MAX;
            return INT_MAX;
        }
        cache[key] = d;
        return d;
    }
};

// 计算路径总距离
static int computeTotalDistance(const std::vector<int>& path, DistanceCache& distCache) {
    if (path.size() <= 1) return 0;
    int total = 0;
    for (size_t i = 1; i < path.size(); i++) {
        int d = distCache.get(path[i-1], path[i]);
        if (d == INT_MAX) return INT_MAX;
        total += d;
    }
    return total;
}

TSPResult TSP::solveFromCity(const Graph& graph, int startCityId, bool returnToStart) {
    TSPResult result = nearestNeighbor(graph, startCityId, returnToStart);
    if (result.totalDistance != INT_MAX) {
        twoOptImprove(result, graph);
    }
    return result;
}

TSPResult TSP::dpSolution(const Graph& graph, int startCityId, bool returnToStart) {
    // 目前仍调用最近邻，但标记为dpSolution（未来可扩展）
    TSPResult result = nearestNeighbor(graph, startCityId, returnToStart);
    if (result.totalDistance != INT_MAX) {
        twoOptImprove(result, graph);
    }
    return result;
}

TSPResult TSP::nearestNeighbor(const Graph& graph, int startCityId, bool returnToStart) {
    int n = graph.getCityCount();
    std::vector<City> cities = graph.getAllCities();

    if (n == 0) {
        return TSPResult();
    }

    // 构建邻接表（只使用已有直接路线）
    std::map<int, std::vector<std::pair<int, int>>> adjList;
    for (const auto& city : cities) {
        adjList[city.id] = std::vector<std::pair<int, int>>();
    }

    // 添加所有已有路线
    std::vector<Edge> edges = graph.getAllEdges();
    for (const auto& edge : edges) {
        adjList[edge.from].push_back({edge.to, edge.length});
        adjList[edge.to].push_back({edge.from, edge.length});
    }

    // 检查起点是否存在
    if (adjList.find(startCityId) == adjList.end()) {
        return TSPResult();
    }

    // 收集所有城市ID
    std::set<int> allCities;
    for (const auto& city : cities) {
        allCities.insert(city.id);
    }

    // 使用 Dijkstra 找最短路径（只通过已有边）
    auto dijkstraFindPath = [&](int start, int end) -> std::pair<std::vector<int>, int> {
        if (start == end) {
            return {{start}, 0};
        }

        std::map<int, int> dist;
        std::map<int, int> parent;
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<std::pair<int, int>>> pq;

        for (const auto& city : allCities) {
            dist[city] = std::numeric_limits<int>::max();
        }

        dist[start] = 0;
        pq.push(std::make_pair(0, start));

        while (!pq.empty()) {
            std::pair<int, int> top = pq.top();
            pq.pop();
            int d = top.first;
            int u = top.second;

            if (d > dist[u]) continue;
            if (u == end) break;

            for (const auto& neighbor : adjList[u]) {
                int v = neighbor.first;
                int w = neighbor.second;
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.push(std::make_pair(dist[v], v));
                }
            }
        }

        if (dist[end] == std::numeric_limits<int>::max()) {
            return {{}, -1};
        }

        // 重建路径
        std::vector<int> path;
        int current = end;
        while (current != start) {
            path.push_back(current);
            current = parent[current];
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());

        return {path, dist[end]};
    };

    // 最近邻算法
    std::set<int> visited;
    std::vector<int> path;
    int totalDist = 0;

    int current = startCityId;
    path.push_back(current);
    visited.insert(current);

    while ((int)visited.size() < n) {
        int nearest = -1;
        int minDist = std::numeric_limits<int>::max();
        std::vector<int> bestPath;

        // 遍历所有未访问城市，找最近的（距离相同时选ID最小的）
        for (int target : allCities) {
            if (visited.count(target)) continue;

            std::pair<std::vector<int>, int> result = dijkstraFindPath(current, target);
            std::vector<int> pathToTarget = result.first;
            int dist = result.second;
            if (dist >= 0 && (dist < minDist || (dist == minDist && target < nearest))) {
                minDist = dist;
                nearest = target;
                bestPath = pathToTarget;
            }
        }

        if (nearest != -1 && !bestPath.empty()) {
            // 添加路径（跳过第一个，因为已在 path 中）
            for (size_t i = 1; i < bestPath.size(); i++) {
                int cityId = bestPath[i];
                path.push_back(cityId);
            }
            // 只标记目标城市为已访问，中间节点可作为后续目标
            visited.insert(nearest);
            totalDist += minDist;
            current = nearest;
        } else {
            break; // 无法到达更多城市
        }
    }

    // 如果需要返回起点
    if (returnToStart && current != startCityId) {
        std::pair<std::vector<int>, int> returnResult = dijkstraFindPath(current, startCityId);
        std::vector<int> returnPath = returnResult.first;
        int returnDist = returnResult.second;
        if (returnDist >= 0 && !returnPath.empty()) {
            for (size_t i = 1; i < returnPath.size(); i++) {
                path.push_back(returnPath[i]);
            }
            totalDist += returnDist;
        }
    }

    TSPResult result;
    result.path = path;
    result.totalDistance = totalDist;
    result.returnToStart = returnToStart;
    return result;
}

void TSP::twoOptImprove(TSPResult& result, const Graph& graph) {
    std::vector<int>& path = result.path;
    if (path.size() <= 3) return; // 太少顶点，无需优化

    // 构建距离缓存
    DistanceCache distCache(&graph);

    // 计算当前距离
    int bestDist = computeTotalDistance(path, distCache);
    if (bestDist == INT_MAX) return; // 路径无效

    bool improved = true;
    int maxIterations = 1000; // 防止死循环
    int iterations = 0;

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        // 遍历所有可能的边对 (i,i+1) 和 (j,j+1)，要求 i+1 < j
        // 注意：起点固定（索引0），所以 i 从 0 开始，但通常保留起点边不变
        for (int i = 0; i < (int)path.size() - 2; i++) {
            for (int j = i + 2; j < (int)path.size() - 1; j++) {
                // 2-opt 交换：移除边 (i,i+1) 和 (j,j+1)，添加 (i,j) 和 (i+1,j+1)
                // 并将路径中间段 [i+1, j] 反序
                int a = path[i];
                int b = path[i+1];
                int c = path[j];
                int d = path[j+1];

                int oldEdgesDist = distCache.get(a, b) + distCache.get(c, d);
                int newEdgesDist = distCache.get(a, c) + distCache.get(b, d);

                // 如果新距离更小，则执行交换
                if (newEdgesDist < oldEdgesDist) {
                    // 反序 [i+1, j]
                    std::reverse(path.begin() + i + 1, path.begin() + j + 1);
                    bestDist = bestDist - oldEdgesDist + newEdgesDist;
                    improved = true;
                    break; // 跳出内层循环，从头开始
                }
            }
            if (improved) break; // 跳出外层循环
        }
    }

    result.totalDistance = bestDist;
}
