#ifndef CONNECTIVITY_H
#define CONNECTIVITY_H

#include "../graph/Graph.h"
#include <vector>

class Connectivity {
public:
    static bool isConnected(const Graph& graph);

    static std::vector<std::vector<int>> findConnectedComponents(const Graph& graph);

    static std::vector<Edge> makeConnected(const Graph& graph);

private:
    // 构建基于索引的邻接表，避免重复计算
    static std::vector<std::vector<std::pair<int, int>>> buildAdjList(const Graph& graph);

    static void dfs(int node, const std::vector<std::vector<std::pair<int, int>>>& adjList,
                    std::vector<bool>& visited);
};

#endif
