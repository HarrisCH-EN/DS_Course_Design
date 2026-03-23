#include "TSP.h"
#include <algorithm>
#include <limits>
#include <queue>
#include <map>
#include <set>

TSPResult TSP::solveFromCity(const Graph& graph, int startCityId, bool returnToStart) {
    TSPResult result = nearestNeighbor(graph, startCityId, returnToStart);
    return result;
}

TSPResult TSP::dpSolution(const Graph& graph, int startCityId, bool returnToStart) {
    return nearestNeighbor(graph, startCityId, returnToStart);
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
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<>> pq;
        
        for (const auto& city : allCities) {
            dist[city] = std::numeric_limits<int>::max();
        }
        
        dist[start] = 0;
        pq.push({0, start});
        
        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();
            
            if (d > dist[u]) continue;
            if (u == end) break;
            
            for (const auto& [v, w] : adjList[u]) {
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
        
        // 遍历所有未访问城市，找最近的
        for (int target : allCities) {
            if (visited.count(target)) continue;
            
            auto [pathToTarget, dist] = dijkstraFindPath(current, target);
            if (dist >= 0 && dist < minDist) {
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
        auto [returnPath, returnDist] = dijkstraFindPath(current, startCityId);
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
    // 不进行 2-opt 优化
    (void)result;
    (void)graph;
}
