#include "Graph.h"
#include <algorithm>
#include <limits>

Graph::Graph() {}

void Graph::addCity(const City& city) {
    // 如果城市已存在，直接返回
    if (cityIdToIndex.find(city.id) != cityIdToIndex.end()) {
        return;
    }

    int idx = cities.size();           // 新城市的索引就是当前数组大小
    cities.push_back(city);            // 添加到城市列表
    cityIdToIndex[city.id] = idx;      // 建立 ID 到索引的映射

    adjList.resize(cities.size());     // 邻接表扩容

    // 邻接矩阵扩容：新增一行一列
    adjMatrix.resize(cities.size());
    for (auto& row : adjMatrix) {
        row.resize(cities.size(), -1); // -1 表示没有边
    }
}

bool Graph::removeCity(int cityId) {
    if (cityIdToIndex.find(cityId) == cityIdToIndex.end()) {
        return false;  // 城市不存在
    }

    int idx = cityIdToIndex[cityId];

    // 从三个数据结构中删除
    cities.erase(cities.begin() + idx);
    adjList.erase(adjList.begin() + idx);
    adjMatrix.erase(adjMatrix.begin() + idx);  // 删除对应行

    // 删除邻接矩阵的对应列
    for (auto& row : adjMatrix) {
        row.erase(row.begin() + idx);
    }

    // 更新邻接表中的索引引用
    for (auto& neighbors : adjList) {
        // 删除指向被删除城市的边
        neighbors.erase(
            std::remove_if(neighbors.begin(), neighbors.end(),
                [idx](const std::pair<int, int>& p) { return p.first == idx; }),
            neighbors.end()
        );

        // 所有大于 idx 的索引都要减 1（因为数组元素前移了）
        for (auto& p : neighbors) {
            if (p.first > idx) p.first--;
        }
    }

    // 重建 ID 到索引的映射
    cityIdToIndex.clear();
    for (int i = 0; i < (int)cities.size(); i++) {
        cityIdToIndex[cities[i].id] = i;
    }

    return true;
}

bool Graph::updateCity(const City& city) {
    if (cityIdToIndex.find(city.id) == cityIdToIndex.end()) {
        return false;
    }

    int idx = cityIdToIndex[city.id];
    cities[idx] = city;
    return true;
}

bool Graph::addEdge(int fromId, int toId) {
    // 检查两个城市是否存在
    if (cityIdToIndex.find(fromId) == cityIdToIndex.end() ||
        cityIdToIndex.find(toId) == cityIdToIndex.end()) {
        return false;
    }

    int fromIdx = cityIdToIndex[fromId];
    int toIdx = cityIdToIndex[toId];

    // 根据两城市坐标计算欧几里得距离
    const City& c1 = cities[fromIdx];
    const City& c2 = cities[toIdx];
    int dist = calculateDistance(c1.x, c1.y, c2.x, c2.y);

    // 无向图：双向添加
    adjList[fromIdx].push_back({toIdx, dist});
    adjList[toIdx].push_back({fromIdx, dist});

    adjMatrix[fromIdx][toIdx] = dist;
    adjMatrix[toIdx][fromIdx] = dist;

    return true;
}

bool Graph::removeEdge(int fromId, int toId) {
    if (cityIdToIndex.find(fromId) == cityIdToIndex.end() ||
        cityIdToIndex.find(toId) == cityIdToIndex.end()) {
        return false;
    }

    int fromIdx = cityIdToIndex[fromId];
    int toIdx = cityIdToIndex[toId];

    adjList[fromIdx].erase(
        std::remove_if(adjList[fromIdx].begin(), adjList[fromIdx].end(),
            [toIdx](const std::pair<int, int>& p) { return p.first == toIdx; }),
        adjList[fromIdx].end()
    );

    adjList[toIdx].erase(
        std::remove_if(adjList[toIdx].begin(), adjList[toIdx].end(),
            [fromIdx](const std::pair<int, int>& p) { return p.first == fromIdx; }),
        adjList[toIdx].end()
    );

    adjMatrix[fromIdx][toIdx] = -1;
    adjMatrix[toIdx][fromIdx] = -1;

    return true;
}

City* Graph::getCityById(int id) {
    if (cityIdToIndex.find(id) == cityIdToIndex.end()) {
        return nullptr;
    }
    return &cities[cityIdToIndex[id]];
}

const City* Graph::getCityById(int id) const {
    auto it = cityIdToIndex.find(id);
    if (it == cityIdToIndex.end()) {
        return nullptr;
    }
    return &cities[it->second];
}

std::vector<City> Graph::getAllCities() const {
    return cities;
}

std::vector<Edge> Graph::getAllEdges() const {
    std::vector<Edge> edges;
    for (int i = 0; i < cities.size(); i++) {
        for (const auto& neighbor : adjList[i]) {
            if (i < neighbor.first) {
                edges.push_back(Edge(cities[i].id, cities[neighbor.first].id, neighbor.second));
            }
        }
    }
    return edges;
}

int Graph::getDistance(int fromId, int toId) const {
    if (cityIdToIndex.find(fromId) == cityIdToIndex.end() ||
        cityIdToIndex.find(toId) == cityIdToIndex.end()) {
        return -1;
    }

    int fromIdx = cityIdToIndex.at(fromId);
    int toIdx = cityIdToIndex.at(toId);
    return adjMatrix[fromIdx][toIdx];
}

int Graph::getCityCount() const {
    return cities.size();
}

int Graph::getEdgeCount() const {
    int count = 0;
    for (const auto& neighbors : adjList) {
        count += neighbors.size();
    }
    return count / 2;
}

int Graph::calculateDistance(int x1, int y1, int x2, int y2) const {
    double dist = std::sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    return static_cast<int>(std::round(dist));
}

const std::vector<std::pair<int, int>>& Graph::getNeighborsByIndex(int idx) const {
    static const std::vector<std::pair<int, int>> empty;
    if (idx < 0 || idx >= (int)adjList.size()) {
        return empty;
    }
    return adjList[idx];
}

int Graph::cityIdToIdx(int cityId) const {
    auto it = cityIdToIndex.find(cityId);
    return (it != cityIdToIndex.end()) ? it->second : -1;
}

int Graph::idxToCityId(int idx) const {
    return (idx >= 0 && idx < cities.size()) ? cities[idx].id : -1;
}

void Graph::clearAll() {
    cities.clear();
    cityIdToIndex.clear();
    adjList.clear();
    adjMatrix.clear();
}
