#ifndef STEINERTREE_H
#define STEINERTREE_H

#include "../graph/Graph.h"
#include <vector>
#include <map>

struct SteinerPoint {
    int id;        // 负ID
    double x;
    double y;
};

struct SteinerTreeResult {
    std::vector<Edge> edges;
    std::vector<SteinerPoint> steinerPoints;
    int totalDistance;
};

class SteinerTree {
public:
    static SteinerTreeResult solve(const Graph& graph);

    static int getTotalLength(const std::vector<Edge>& edges);

private:
    struct FermatResult {
        double x;
        double y;
        bool isVertex;  // true if Fermat point is one of the vertices
    };

    static FermatResult computeFermatPoint(double ax, double ay, double bx, double by, double cx, double cy);
};

#endif
