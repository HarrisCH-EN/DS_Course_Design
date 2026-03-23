#ifndef MST_H
#define MST_H

#include "../graph/Graph.h"
#include <vector>

class MST {
public:
    static std::vector<Edge> kruskal(const Graph& graph);

    static int getTotalWeight(const std::vector<Edge>& edges);

private:
    class UnionFind {
    private:
        std::vector<int> parent;
        std::vector<int> rank;

    public:
        UnionFind(int n);
        int find(int x);
        bool unite(int x, int y);
    };
};

#endif
