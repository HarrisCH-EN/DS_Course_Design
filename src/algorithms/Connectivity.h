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
    static void dfs(int node, const std::vector<std::vector<std::pair<int, int>>>& adjList,
                    std::vector<bool>& visited);
};

#endif
