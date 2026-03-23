#ifndef SHORTESTPATH_H
#define SHORTESTPATH_H

#include "../graph/Graph.h"
#include <vector>
#include <utility>

struct PathResult {
    int targetId;
    int distance;
    std::vector<int> path;

    bool operator<(const PathResult& other) const {
        return distance < other.distance;
    }
};

class ShortestPath {
public:
    static std::vector<PathResult> dijkstraFromCity(const Graph& graph, int startCityId);

    static PathResult dijkstraBetween(const Graph& graph, int startCityId, int endCityId);
};

#endif
