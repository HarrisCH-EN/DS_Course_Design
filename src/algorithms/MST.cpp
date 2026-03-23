#include "MST.h"
#include <algorithm>

MST::UnionFind::UnionFind(int n) : parent(n), rank(n, 0) {
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
}

int MST::UnionFind::find(int x) {
    if (parent[x] != x) {
        parent[x] = find(parent[x]);
    }
    return parent[x];
}

bool MST::UnionFind::unite(int x, int y) {
    int rootX = find(x);
    int rootY = find(y);

    if (rootX == rootY) return false;

    if (rank[rootX] < rank[rootY]) {
        parent[rootX] = rootY;
    } else if (rank[rootX] > rank[rootY]) {
        parent[rootY] = rootX;
    } else {
        parent[rootY] = rootX;
        rank[rootX]++;
    }
    return true;
}

std::vector<Edge> MST::kruskal(const Graph& graph) {
    int n = graph.getCityCount();
    std::vector<City> cities = graph.getAllCities();

    std::vector<Edge> allEdges;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int dist = graph.calculateDistance(cities[i].x, cities[i].y, cities[j].x, cities[j].y);
            allEdges.push_back(Edge(cities[i].id, cities[j].id, dist));
        }
    }

    std::sort(allEdges.begin(), allEdges.end());

    UnionFind uf(n);
    std::vector<Edge> mstEdges;

    for (const auto& edge : allEdges) {
        int idxFrom = graph.cityIdToIdx(edge.from);
        int idxTo = graph.cityIdToIdx(edge.to);

        if (uf.unite(idxFrom, idxTo)) {
            mstEdges.push_back(edge);
            if (mstEdges.size() == n - 1) break;
        }
    }

    return mstEdges;
}

int MST::getTotalWeight(const std::vector<Edge>& edges) {
    int total = 0;
    for (const auto& edge : edges) {
        total += edge.length;
    }
    return total;
}
