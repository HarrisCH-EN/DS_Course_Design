#ifndef GRAPH_H
#define GRAPH_H

#include "City.h"
#include "Edge.h"
#include <vector>
#include <map>
#include <cmath>

class Graph {
private:
    std::vector<City> cities;                              // 存储所有城市
    std::map<int, int> cityIdToIndex;                      // 城市ID到数组索引的映射
    std::vector<std::vector<std::pair<int, int>>> adjList; // 邻接表：每个城市的邻居列表
    std::vector<std::vector<int>> adjMatrix;               // 邻接矩阵：存储城市间距离

public:
    Graph();

    void addCity(const City& city);
    bool removeCity(int cityId);
    bool updateCity(const City& city);

    bool addEdge(int fromId, int toId);
    bool removeEdge(int fromId, int toId);

    City* getCityById(int id);
    const City* getCityById(int id) const;
    std::vector<City> getAllCities() const;
    std::vector<Edge> getAllEdges() const;

    int getDistance(int fromId, int toId) const;

    // 获取节点的邻接列表（索引和权重），用于高效的图遍历
    const std::vector<std::pair<int, int>>& getNeighborsByIndex(int idx) const;

    int getCityCount() const;
    int getEdgeCount() const;

    int calculateDistance(int x1, int y1, int x2, int y2) const;

    int cityIdToIdx(int cityId) const;
    int idxToCityId(int idx) const;

    void clearAll();  // 清空所有数据
};

#endif
