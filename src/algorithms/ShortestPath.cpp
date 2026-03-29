// Dijkstra 是经典的单源最短路径算法，适用于边权非负的图。
// 核心思想：
// 1. 维护一个距离数组 `dist[]`，记录起点到每个节点的当前最短距离
// 2. 用优先队列每次取出距离最小的未访问节点
// 3. 对该节点的所有邻居进行"松弛"操作：如果通过当前节点到邻居的距离更短，就更新邻居的距离
// 4. 重复直到所有节点都被访问
//时间复杂度：O((V+E)logV)，V 是节点数，E 是边数。优先队列保证了每次都处理距离最小的节点，这是算法正确性的关键。
// 路径回溯：通过 `parent[]` 数组记录每个节点是从哪个节点更新来的，最后从终点沿着父节点链回溯到起点，就得到了完整路径。


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

    using P = std::pair<int, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0, startIdx});

    while (!pq.empty()) {
        int u = pq.top().second;
        pq.pop();

        if (visited[u]) continue;
        visited[u] = true;

        //修复: 只遍历邻接节点，而非所有节点
        const auto& neighbors = graph.getNeighborsByIndex(u);
        for (const auto& neighbor : neighbors) {
            int v = neighbor.first;
            int w = neighbor.second;
            if (!visited[v]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
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
