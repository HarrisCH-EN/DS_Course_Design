#ifndef TSP_H
#define TSP_H

#include "../graph/Graph.h"
#include <vector>
#include <climits>

struct TSPResult {
    std::vector<int> path;
    int totalDistance;
    bool returnToStart;

    TSPResult() : totalDistance(INT_MAX), returnToStart(false) {}
};

class TSP {
public:
    static TSPResult solveFromCity(const Graph& graph, int startCityId, bool returnToStart = false);

private:
    static TSPResult dpSolution(const Graph& graph, int startCityId, bool returnToStart);

    static TSPResult nearestNeighbor(const Graph& graph, int startCityId, bool returnToStart);

    static void twoOptImprove(TSPResult& result, const Graph& graph);
};

#endif
