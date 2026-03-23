#include "Connectivity.h"
#include <algorithm>
#include <limits>

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
    if (n == 0) return true;

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

    std::vector<bool> visited(n, false);
    dfs(0, adjList, visited);

    for (bool v : visited) {
        if (!v) return false;
    }
    return true;
}

std::vector<std::vector<int>> Connectivity::findConnectedComponents(const Graph& graph) {
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