#include "SteinerTree.h"
#include "MST.h"
#include <cmath>
#include <algorithm>
#include <numeric>
#include <set>
#include <map>
#include <vector>
#include <queue>
#include <climits>

// 检查两边是否是同一条无向边
static bool isSameEdge(const Edge& e1, int u, int v) {
    return (e1.from == u && e1.to == v) || (e1.from == v && e1.to == u);
}

// 检查图的连通性
static bool isConnected(const std::vector<Edge>& edges, const std::set<int>& cityIdSet) {
    if (cityIdSet.empty() || cityIdSet.size() == 1) return true;

    std::map<int, std::vector<int>> adj;
    for (const auto& e : edges) {
        adj[e.from].push_back(e.to);
        adj[e.to].push_back(e.from);
    }

    int start = *cityIdSet.begin();
    std::set<int> visited;
    std::queue<int> q;
    q.push(start);
    visited.insert(start);

    while (!q.empty()) {
        int u = q.front(); q.pop();
        auto it = adj.find(u);
        if (it == adj.end()) continue;
        for (int v : it->second) {
            if (cityIdSet.count(v) && !visited.count(v)) {
                visited.insert(v);
                q.push(v);
            }
        }
    }

    return visited.size() == cityIdSet.size();
}

// 计算总权重
static int computeTotalWeight(const std::vector<Edge>& edges) {
    int total = 0;
    for (const auto& e : edges) {
        total += e.length;
    }
    return total;
}

// 计算费马点 (使用夹角判定 + Weiszfeld 迭代算法，稳定无bug)
SteinerTree::FermatResult SteinerTree::computeFermatPoint(
    double ax, double ay, double bx, double by, double cx, double cy) {

    // 边长计算
    double a = std::hypot(cx - bx, cy - by);
    double b = std::hypot(cx - ax, cy - ay);
    double c = std::hypot(bx - ax, by - ay);

    // 处理退化三角形（三点重合或极近）
    if (a < 1e-7 || b < 1e-7 || c < 1e-7) {
        return {(ax + bx + cx) / 3.0, (ay + by + cy) / 3.0, true};
    }

    // 余弦定理求角
    double cosA = (b * b + c * c - a * a) / (2.0 * b * c);
    double cosB = (a * a + c * c - b * b) / (2.0 * a * c);
    double cosC = (a * a + b * b - c * c) / (2.0 * a * b);

    // 限制在[-1, 1]防止浮点误差导致 NaN
    cosA = std::max(-1.0, std::min(1.0, cosA));
    cosB = std::max(-1.0, std::min(1.0, cosB));
    cosC = std::max(-1.0, std::min(1.0, cosC));

    // 如果任何一个角 >= 120 度 (cos <= -0.5)，费马点就是该顶点
    if (cosA <= -0.5) return {ax, ay, true};
    if (cosB <= -0.5) return {bx, by, true};
    if (cosC <= -0.5) return {cx, cy, true};

    // Weiszfeld 算法迭代求解费马点（梯度下降），对任意三点非常稳定
    double fx = (ax + bx + cx) / 3.0;
    double fy = (ay + by + cy) / 3.0;

    for (int iter = 0; iter < 100; ++iter) {
        double d1 = std::hypot(fx - ax, fy - ay);
        double d2 = std::hypot(fx - bx, fy - by);
        double d3 = std::hypot(fx - cx, fy - cy);

        if (d1 < 1e-9 || d2 < 1e-9 || d3 < 1e-9) break;

        double weight1 = 1.0 / d1;
        double weight2 = 1.0 / d2;
        double weight3 = 1.0 / d3;
        double totalWeight = weight1 + weight2 + weight3;

        double next_x = (ax * weight1 + bx * weight2 + cx * weight3) / totalWeight;
        double next_y = (ay * weight1 + by * weight2 + cy * weight3) / totalWeight;

        // 如果移动距离极小，视为收敛
        if (std::hypot(next_x - fx, next_y - fy) < 1e-7) {
            fx = next_x;
            fy = next_y;
            break;
        }
        fx = next_x;
        fy = next_y;
    }

    return {fx, fy, false};
}


SteinerTreeResult SteinerTree::solve(const Graph& graph) {
    SteinerTreeResult result;
    int n = graph.getCityCount();
    if (n <= 1) {
        result.totalDistance = 0;
        return result;
    }

    std::vector<City> cities = graph.getAllCities();
    std::set<int> cityIdSet;
    // 使用 posMap 缓存所有点的坐标（包括城市和新生成的斯坦纳点）
    std::map<int, std::pair<double, double>> posMap;
    
    for (const auto& city : cities) {
        cityIdSet.insert(city.id);
        posMap[city.id] = {city.x, city.y};
    }

    // 第一步：在完全图上生成最小生成树(MST)
    std::vector<Edge> bestEdges = MST::kruskal(graph);
    std::vector<SteinerPoint> steinerPoints;

    if (n < 3) {
        result.edges = bestEdges;
        result.steinerPoints = {};
        result.totalDistance = computeTotalWeight(bestEdges);
        return result;
    }

    // 第二步：使用局部启发式（3端点插入法）进行斯坦纳点优化
    bool improved = true;
    int maxIterations = n * 10;
    int iteration = 0;
    int nextSteinerId = -1; // 斯坦纳点从 -1 开始递减

    while (improved && iteration < maxIterations) {
        improved = false;
        iteration++;

        // 构建当前边集的邻接表
        std::map<int, std::vector<int>> adj;
        for (const auto& e : bestEdges) {
            adj[e.from].push_back(e.to);
            adj[e.to].push_back(e.from);
        }

        // 遍历每个度数 >= 3 的节点（作为中心节点 u）
        // 只有度数>=3的顶点才可能通过添加Steiner点优化（三棱锥结构）
        for (const auto& kv : adj) {
            int u = kv.first;
            const std::vector<int>& neighbors = kv.second;

            if (neighbors.size() < 3) continue;

            // 尝试 u 的任意两个邻居组合 (v1, v2)
            bool nodeImproved = false;
            for (size_t i = 0; i < neighbors.size() && !nodeImproved; i++) {
                for (size_t j = i + 1; j < neighbors.size() && !nodeImproved; j++) {
                    int v1 = neighbors[i];
                    int v2 = neighbors[j];

                    // 获取三点坐标
                    if (!posMap.count(u) || !posMap.count(v1) || !posMap.count(v2)) continue;
                    double ux = posMap[u].first, uy = posMap[u].second;
                    double v1x = posMap[v1].first, v1y = posMap[v1].second;
                    double v2x = posMap[v2].first, v2y = posMap[v2].second;

                    // 计算 u, v1, v2 的费马点
                    FermatResult fermat = computeFermatPoint(ux, uy, v1x, v1y, v2x, v2y);
                    
                    // 如果费马点落在已有顶点上，说明没有优化空间
                    if (fermat.isVertex) continue;

                    // 使用精确的双精度浮点计算长度，避免整型抹除微小优化
                    double oldDist = std::hypot(ux - v1x, uy - v1y) + std::hypot(ux - v2x, uy - v2y);
                    double newDist = std::hypot(fermat.x - ux, fermat.y - uy) + 
                                     std::hypot(fermat.x - v1x, fermat.y - v1y) + 
                                     std::hypot(fermat.x - v2x, fermat.y - v2y);

                    // 如果新连接方式更短（留出 1e-4 的裕度防止浮点波动）
                    if (newDist < oldDist - 1e-4) {
                        
                        // 生成新图边集
                        std::vector<Edge> newEdges;
                        for (const auto& e : bestEdges) {
                            // 剔除旧的两条边 (u, v1) 和 (u, v2)
                            if (!isSameEdge(e, u, v1) && !isSameEdge(e, u, v2)) {
                                newEdges.push_back(e);
                            }
                        }

                        // 注册新的斯坦纳点
                        int sId = nextSteinerId--;
                        posMap[sId] = {fermat.x, fermat.y};

                        // 增加新的三条边连向费马点
                        newEdges.push_back(Edge(sId, u, (int)std::round(std::hypot(fermat.x - ux, fermat.y - uy))));
                        newEdges.push_back(Edge(sId, v1, (int)std::round(std::hypot(fermat.x - v1x, fermat.y - v1y))));
                        newEdges.push_back(Edge(sId, v2, (int)std::round(std::hypot(fermat.x - v2x, fermat.y - v2y))));

                        // 标准替换操作数学上能绝对保证连通性，直接应用更新
                        bestEdges = newEdges;
                        improved = true;
                        nodeImproved = true;
                        break;
                    }
                }
            }
            if (improved) break; // 若图被修改，打断当前邻接表遍历，重构最新拓扑
        }
    }

    // 最终全局连通性保险验证（如果由于极端异常断开，则回退到原生MST）
    if (!isConnected(bestEdges, cityIdSet)) {
        bestEdges = MST::kruskal(graph);
        // 清除所有生成的斯坦纳点标记
        std::map<int, std::pair<double, double>> cleanMap;
        for (const auto& kv : posMap) if (kv.first >= 0) cleanMap[kv.first] = kv.second;
        posMap = cleanMap;
    }

    // 从边集中提取实际保留在图里的 Steiner 点 (ID < 0)
    std::set<int> activeSteinerIds;
    for (const auto& e : bestEdges) {
        if (e.from < 0) activeSteinerIds.insert(e.from);
        if (e.to < 0) activeSteinerIds.insert(e.to);
    }
    
    for (int sId : activeSteinerIds) {
        SteinerPoint sp;
        sp.id = sId;
        sp.x = posMap[sId].first;
        sp.y = posMap[sId].second;
        steinerPoints.push_back(sp);
    }

    result.edges = bestEdges;
    result.steinerPoints = steinerPoints;
    result.totalDistance = computeTotalWeight(bestEdges);
    return result;
}

int SteinerTree::getTotalLength(const std::vector<Edge>& edges) {
    return computeTotalWeight(edges);
}