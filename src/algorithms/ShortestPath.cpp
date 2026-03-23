#include "ShortestPath.h"
#include <queue>
#include <algorithm>
#include <limits>
#include <climits>

std::vector<PathResult> ShortestPath::dijkstraFromCity(const Graph& graph, int startCityId) {
    int n = graph.getCityCount();
    std::vector<City> cities = graph.getAllCities();

    int startIdx = graph.cityIdToIdx(startCityId);
    if (startIdx == -1) {
        return {};
    }

    std::vector<int> dist(n, INT_MAX);
    std::vector<int> parent(n, -1);
    std::vector<bool> visited(n, false);

    dist[startIdx] = 0;

    std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<std::pair<int, int>>> pq;
    pq.push({0, startIdx});

    while (!pq.empty()) {
        int u = pq.top().second;
        pq.pop();

        if (visited[u]) continue;
        visited[u] = true;

        for (int v = 0; v < n; v++) {
            int edgeDist = graph.getDistance(cities[u].id, cities[v].id);
            if (edgeDist > 0 && !visited[v]) {
                if (dist[u] + edgeDist < dist[v]) {
                    dist[v] = dist[u] + edgeDist;
                    parent[v] = u;
                    pq.push({dist[v], v});
                }
            }
        }
    }

    std::vector<PathResult> results;
    for (int i = 0; i < n; i++) {
        if (i == startIdx) continue;

        PathResult result;
        result.targetId = cities[i].id;
        result.distance = dist[i];

        if (dist[i] != INT_MAX) {
            std::vector<int> path;
            int curr = i;
            while (curr != -1) {
                path.push_back(cities[curr].id);
                curr = parent[curr];
            }
            std::reverse(path.begin(), path.end());
            result.path = path;
        }

        results.push_back(result);
    }

    std::sort(results.begin(), results.end());
    return results;
}

PathResult ShortestPath::dijkstraBetween(const Graph& graph, int startCityId, int endCityId) {
    std::vector<PathResult> allResults = dijkstraFromCity(graph, startCityId);

    for (const auto& result : allResults) {
        if (result.targetId == endCityId) {
            return result;
        }
    }

    PathResult notFound;
    notFound.targetId = endCityId;
    notFound.distance = INT_MAX;
    return notFound;
}
