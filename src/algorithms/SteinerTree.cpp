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

SteinerTree::FermatResult SteinerTree::computeFermatPoint(
    double ax, double ay, double bx, double by, double cx, double cy) {

    // Edge lengths
    double a = std::sqrt((cx - bx) * (cx - bx) + (cy - by) * (cy - by));
    double b = std::sqrt((cx - ax) * (cx - ax) + (cy - ay) * (cy - ay));
    double c = std::sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));

    // Handle degenerate triangles
    if (a < 1e-10 || b < 1e-10 || c < 1e-10) {
        return {(ax + bx + cx) / 3.0, (ay + by + cy) / 3.0, false};
    }

    // Cosine of each angle using law of cosines
    double cosA = (b * b + c * c - a * a) / (2.0 * b * c);
    double cosB = (a * a + c * c - b * b) / (2.0 * a * c);
    double cosC = (a * a + b * b - c * c) / (2.0 * a * b);

    // Clamp values to avoid NaN due to floating point errors
    cosA = std::max(-1.0, std::min(1.0, cosA));
    cosB = std::max(-1.0, std::min(1.0, cosB));
    cosC = std::max(-1.0, std::min(1.0, cosC));

    // If any angle >= 120 degrees (cos <= -0.5), Fermat point is that vertex
    if (cosA <= -0.5) return {ax, ay, true};
    if (cosB <= -0.5) return {bx, by, true};
    if (cosC <= -0.5) return {cx, cy, true};

    // Compute Fermat point using rotation method
    const double PI = 3.14159265358979323846;
    double angle = PI / 3.0; // 60 degrees

    // Rotate point C around B by 60 degrees to get C'
    double cpx = bx + (cx - bx) * std::cos(angle) - (cy - by) * std::sin(angle);
    double cpy = by + (cx - bx) * std::sin(angle) + (cy - by) * std::cos(angle);

    double dxAC = cpx - ax;
    double dyAC = cpy - ay;
    double dxBC = cx - bx;
    double dyBC = cy - by;

    double denom = dxAC * dyBC - dyAC * dxBC;
    if (std::abs(denom) < 1e-10) {
        return {(ax + bx + cx) / 3.0, (ay + by + cy) / 3.0, false};
    }

    double t = ((bx - ax) * dyBC - (by - ay) * dxBC) / denom;
    double fx = ax + t * dxAC;
    double fy = ay + t * dyAC;

    return {fx, fy, false};
}

// 检查图的连通性
static bool isConnected(const std::vector<Edge>& edges, const std::set<int>& cityIdSet) {
    if (cityIdSet.empty()) return true;
    if (cityIdSet.size() == 1) return true;

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

// 构建邻接表
static std::map<int, std::vector<int>> buildAdjacency(const std::vector<Edge>& edges) {
    std::map<int, std::vector<int>> adj;
    for (const auto& e : edges) {
        adj[e.from].push_back(e.to);
        adj[e.to].push_back(e.from);
    }
    return adj;
}

// 计算总权重
static int computeTotalWeight(const std::vector<Edge>& edges) {
    int total = 0;
    for (const auto& e : edges) {
        total += e.length;
    }
    return total;
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
    for (const auto& city : cities) {
        cityIdSet.insert(city.id);
    }

    // Step 1: Compute MST on complete graph
    std::vector<Edge> bestEdges = MST::kruskal(graph);
    std::vector<SteinerPoint> steinerPoints;

    if (n < 3) {
        result.edges = bestEdges;
        result.steinerPoints = {};
        result.totalDistance = computeTotalWeight(bestEdges);
        return result;
    }

    // Step 2: Try to optimize using Fermat points
    bool improved = true;
    int maxIterations = n * 10;
    int iteration = 0;

    while (improved && iteration < maxIterations) {
        improved = false;
        iteration++;

        std::map<int, std::vector<int>> adj = buildAdjacency(bestEdges);

        // 对每个度>=3的原始城市顶点
        for (const auto& city : cities) {
            int cityId = city.id;
            auto it = adj.find(cityId);
            if (it == adj.end() || it->second.size() < 3) continue;

            const std::vector<int>& neighbors = it->second;

            // 只考虑原始城市（正ID）作为邻居
            std::vector<int> originalNeighbors;
            for (int nid : neighbors) {
                if (cityIdSet.count(nid)) {
                    originalNeighbors.push_back(nid);
                }
            }

            if (originalNeighbors.size() < 3) continue;

            // 尝试所有3个邻居的组合
            bool cityImproved = false;
            for (size_t i = 0; i < originalNeighbors.size() && !cityImproved; i++) {
                for (size_t j = i + 1; j < originalNeighbors.size() && !cityImproved; j++) {
                    for (size_t k = j + 1; k < originalNeighbors.size() && !cityImproved; k++) {
                        int n1 = originalNeighbors[i];
                        int n2 = originalNeighbors[j];
                        int n3 = originalNeighbors[k];

                        const City* c1 = graph.getCityById(n1);
                        const City* c2 = graph.getCityById(n2);
                        const City* c3 = graph.getCityById(n3);
                        if (!c1 || !c2 || !c3) continue;

                        // 计算费马点
                        FermatResult fermat = computeFermatPoint(
                            c1->x, c1->y, c2->x, c2->y, c3->x, c3->y);

                        if (fermat.isVertex) continue;

                        // 新权重
                        double d1 = std::sqrt((fermat.x - c1->x) * (fermat.x - c1->x) +
                                              (fermat.y - c1->y) * (fermat.y - c1->y));
                        double d2 = std::sqrt((fermat.x - c2->x) * (fermat.x - c2->x) +
                                              (fermat.y - c2->y) * (fermat.y - c2->y));
                        double d3 = std::sqrt((fermat.x - c3->x) * (fermat.x - c3->x) +
                                              (fermat.y - c3->y) * (fermat.y - c3->y));
                        int newWeight = (int)std::round(d1 + d2 + d3);

                        // 旧权重
                        int oldWeight = 0;
                        std::vector<Edge> edgesToRemove;
                        for (const auto& e : bestEdges) {
                            if ((e.from == cityId && e.to == n1) || (e.to == cityId && e.from == n1)) {
                                oldWeight += e.length;
                                edgesToRemove.push_back(e);
                            } else if ((e.from == cityId && e.to == n2) || (e.to == cityId && e.from == n2)) {
                                oldWeight += e.length;
                                edgesToRemove.push_back(e);
                            } else if ((e.from == cityId && e.to == n3) || (e.to == cityId && e.from == n3)) {
                                oldWeight += e.length;
                                edgesToRemove.push_back(e);
                            }
                        }

                        if (edgesToRemove.size() != 3) continue;

                        if (newWeight >= oldWeight) continue;

                        // 构建新边集
                        std::vector<Edge> newEdges;
                        std::set<Edge> removedSet(edgesToRemove.begin(), edgesToRemove.end());
                        for (const auto& e : bestEdges) {
                            if (removedSet.count(e) == 0) {
                                newEdges.push_back(e);
                            }
                        }

                        // 分配Steiner点ID（负值）
                        int nextSteinerId = -1;
                        for (const auto& e : newEdges) {
                            if (e.from < nextSteinerId) nextSteinerId = e.from;
                            if (e.to < nextSteinerId) nextSteinerId = e.to;
                        }
                        int fermatId = nextSteinerId - 1;
                        if (fermatId >= 0) fermatId = -1;

                        newEdges.push_back(Edge(n1, fermatId, (int)std::round(d1)));
                        newEdges.push_back(Edge(n2, fermatId, (int)std::round(d2)));
                        newEdges.push_back(Edge(n3, fermatId, (int)std::round(d3)));

                        // 记录Steiner点
                        SteinerPoint sp;
                        sp.id = fermatId;
                        sp.x = fermat.x;
                        sp.y = fermat.y;
                        steinerPoints.push_back(sp);

                        // 验证连通性
                        if (!isConnected(newEdges, cityIdSet)) {
                            steinerPoints.pop_back();
                            continue;
                        }

                        bestEdges = newEdges;
                        improved = true;
                        cityImproved = true;
                        break;
                    }
                }
            }

            if (improved) break;
        }
    }

    // 最终验证
    if (!isConnected(bestEdges, cityIdSet)) {
        bestEdges = MST::kruskal(graph);
        steinerPoints.clear();
    }

    result.edges = bestEdges;
    result.steinerPoints = steinerPoints;
    result.totalDistance = computeTotalWeight(bestEdges);
    return result;
}

int SteinerTree::getTotalLength(const std::vector<Edge>& edges) {
    return MST::getTotalWeight(edges);
}
