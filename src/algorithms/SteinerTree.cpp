#include "SteinerTree.h"
#include "MST.h"

#include <cmath>
#include <algorithm>
#include <vector>
#include <map>
#include <set>
#include <queue>

using namespace std;

// ================= 工具函数 =================

// 判断是否同一无向边
static bool isSameEdge(const Edge& e, int u, int v) {
    return (e.from == u && e.to == v) || (e.from == v && e.to == u);
}

// 计算两点距离
static double dist(double x1, double y1, double x2, double y2) {
    return hypot(x1 - x2, y1 - y2);
}

// 计算总权重
static int totalWeight(const vector<Edge>& edges) {
    int s = 0;
    for (auto& e : edges) s += e.length;
    return s;
}

// 连通性检查
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

// ================= 费马点 =================

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

    // Weiszfeld
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

// ================= 主算法 =================

SteinerTreeResult SteinerTree::solve(const Graph& graph) {
    SteinerTreeResult res;

    auto cities = graph.getAllCities();
    int n = cities.size();

    if (n <= 1) return res;

    // 坐标表
    map<int, pair<double,double>> pos;
    set<int> citySet;

    for (auto& c : cities) {
        pos[c.id] = {c.x, c.y};
        citySet.insert(c.id);
    }

    // 初始 MST
    vector<Edge> edges = MST::kruskal(graph);

    int nextSteiner = -1;

    bool improved = true;
    int iter = 0;

    while (improved && iter < 50) {
        improved = false;
        iter++;

        // 构建邻接
        map<int, vector<int>> adj;
        for (auto& e : edges) {
            adj[e.from].push_back(e.to);
            adj[e.to].push_back(e.from);
        }

        for (auto& [u, nbrs] : adj) {
            if (nbrs.size() < 3) continue;

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

                        auto f = computeFermatPoint(x1,y1,x2,y2,x3,y3);
                        if (f.isVertex) continue;

                        double oldLen =
                            dist(ux,uy,x1,y1) +
                            dist(ux,uy,x2,y2) +
                            dist(ux,uy,x3,y3);

                        double newLen =
                            dist(f.x,f.y,x1,y1) +
                            dist(f.x,f.y,x2,y2) +
                            dist(f.x,f.y,x3,y3);

                        if (newLen >= oldLen - 1e-6) continue;

                        // 构造新图
                        vector<Edge> newEdges;

                        for (auto& e : edges) {
                            if (isSameEdge(e,u,v1) ||
                                isSameEdge(e,u,v2) ||
                                isSameEdge(e,u,v3)) continue;
                            newEdges.push_back(e);
                        }

                        int s = nextSteiner--;
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

                        // 连通性检查
                        if (!isConnected(newEdges, citySet)) continue;

                        edges = newEdges;
                        improved = true;
                        goto NEXT_ITER;
                    }
                }
            }
        }

        NEXT_ITER:;
    }

    // 收集 Steiner 点
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

int SteinerTree::getTotalLength(const vector<Edge>& edges) {
    return totalWeight(edges);
}