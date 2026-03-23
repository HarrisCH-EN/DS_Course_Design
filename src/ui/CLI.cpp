#include "CLI.h"
#include "../io/FileIO.h"
#include "../algorithms/Connectivity.h"
#include "../algorithms/ShortestPath.h"
#include "../algorithms/TSP.h"
#include "../algorithms/MST.h"
#include "../algorithms/SteinerTree.h"
#include <iostream>
#include <iomanip>
#include <climits>

CLI::CLI(const std::string& cityFile, const std::string& routeFile)
    : cityFile(cityFile), routeFile(routeFile) {
    // 优先尝试加载 JSON 格式，失败则尝试文本格式
    if (!FileIO::loadAllJSON(graph, cityFile, routeFile)) {
        FileIO::loadAll(graph, cityFile, routeFile);
    }
}

void CLI::displayMenu() {
    std::cout << "\n=== 通信网络设计系统 ===\n";
    std::cout << "1. 添加城市\n";
    std::cout << "2. 删除城市\n";
    std::cout << "3. 修改城市\n";
    std::cout << "4. 添加线路\n";
    std::cout << "5. 删除线路\n";
    std::cout << "6. 显示所有城市和线路\n";
    std::cout << "7. 判断连通性\n";
    std::cout << "8. 设计最小连通方案\n";
    std::cout << "9. 查询最短路径\n";
    std::cout << "10. 旅行商问题求解\n";
    std::cout << "11. 施泰纳树问题求解\n";
    std::cout << "12. 保存数据\n";
    std::cout << "13. 加载数据\n";
    std::cout << "0. 退出\n";
    std::cout << "请选择: ";
}

void CLI::addCityMenu() {
    int id, x, y;
    std::string name, description;

    std::cout << "\n=== 添加城市 ===\n";
    std::cout << "城市编号: ";
    std::cin >> id;
    std::cout << "城市名称: ";
    std::cin >> name;
    std::cout << "X坐标: ";
    std::cin >> x;
    std::cout << "Y坐标: ";
    std::cin >> y;
    std::cin.ignore();
    std::cout << "简介: ";
    std::getline(std::cin, description);

    City city(id, name, x, y, description);
    graph.addCity(city);
    std::cout << "城市添加成功！\n";
}

void CLI::removeCityMenu() {
    int id;
    std::cout << "\n=== 删除城市 ===\n";
    std::cout << "城市编号: ";
    std::cin >> id;

    if (graph.removeCity(id)) {
        std::cout << "城市删除成功！\n";
    } else {
        std::cout << "城市不存在！\n";
    }
}

void CLI::updateCityMenu() {
    int id, x, y;
    std::string name, description;

    std::cout << "\n=== 修改城市 ===\n";
    std::cout << "城市编号: ";
    std::cin >> id;

    City* existing = graph.getCityById(id);
    if (!existing) {
        std::cout << "城市不存在！\n";
        return;
    }

    std::cout << "新名称 (当前: " << existing->name << "): ";
    std::cin >> name;
    std::cout << "新X坐标 (当前: " << existing->x << "): ";
    std::cin >> x;
    std::cout << "新Y坐标 (当前: " << existing->y << "): ";
    std::cin >> y;
    std::cin.ignore();
    std::cout << "新简介 (当前: " << existing->description << "): ";
    std::getline(std::cin, description);

    City city(id, name, x, y, description);
    graph.updateCity(city);
    std::cout << "城市修改成功！\n";
}

void CLI::addRouteMenu() {
    int from, to;
    std::cout << "\n=== 添加线路 ===\n";
    std::cout << "起点城市编号: ";
    std::cin >> from;
    std::cout << "终点城市编号: ";
    std::cin >> to;

    if (graph.addEdge(from, to)) {
        std::cout << "线路添加成功！\n";
    } else {
        std::cout << "添加失败，请检查城市编号！\n";
    }
}

void CLI::removeRouteMenu() {
    int from, to;
    std::cout << "\n=== 删除线路 ===\n";
    std::cout << "起点城市编号: ";
    std::cin >> from;
    std::cout << "终点城市编号: ";
    std::cin >> to;

    if (graph.removeEdge(from, to)) {
        std::cout << "线路删除成功！\n";
    } else {
        std::cout << "删除失败，请检查城市编号！\n";
    }
}

void CLI::displayAllMenu() {
    std::cout << "\n=== 所有城市 ===\n";
    std::vector<City> cities = graph.getAllCities();
    for (const auto& city : cities) {
        std::cout << "ID: " << city.id << ", 名称: " << city.name
                  << ", 坐标: (" << city.x << ", " << city.y << ")"
                  << ", 简介: " << city.description << "\n";
    }

    std::cout << "\n=== 所有线路 ===\n";
    std::vector<Edge> edges = graph.getAllEdges();
    for (const auto& edge : edges) {
        std::cout << edge.from << " <-> " << edge.to << " (距离: " << edge.length << ")\n";
    }
}

void CLI::checkConnectivityMenu() {
    std::cout << "\n=== 连通性判断 ===\n";
    if (Connectivity::isConnected(graph)) {
        std::cout << "该国所有城市构成连通图。\n";
    } else {
        std::cout << "该国所有城市不构成连通图。\n";
        std::vector<std::vector<int>> components = Connectivity::findConnectedComponents(graph);
        std::cout << "共有 " << components.size() << " 个连通分量。\n";
    }
}

void CLI::makeConnectedMenu() {
    std::cout << "\n=== 设计最小连通方案 ===\n";
    if (Connectivity::isConnected(graph)) {
        std::cout << "图已经是连通的，无需添加线路。\n";
        return;
    }

    std::vector<Edge> newEdges = Connectivity::makeConnected(graph);
    std::cout << "需要添加以下线路使图连通：\n";
    int totalLength = 0;
    for (const auto& edge : newEdges) {
        std::cout << edge.from << " <-> " << edge.to << " (距离: " << edge.length << ")\n";
        totalLength += edge.length;
    }
    std::cout << "总长度: " << totalLength << "\n";

    std::cout << "是否应用这些线路？(y/n): ";
    char choice;
    std::cin >> choice;
    if (choice == 'y' || choice == 'Y') {
        for (const auto& edge : newEdges) {
            graph.addEdge(edge.from, edge.to);
        }
        std::cout << "线路已添加！\n";
    }
}

void CLI::shortestPathMenu() {
    int startId;
    std::cout << "\n=== 查询最短路径 ===\n";
    std::cout << "起始城市编号: ";
    std::cin >> startId;

    std::vector<PathResult> results = ShortestPath::dijkstraFromCity(graph, startId);

    std::cout << "\n从城市 " << startId << " 到其他城市的最短路径：\n";
    std::cout << std::setw(10) << "目标城市" << std::setw(10) << "距离" << "  路径\n";
    std::cout << std::string(50, '-') << "\n";

    for (const auto& result : results) {
        std::cout << std::setw(10) << result.targetId << std::setw(10);
        if (result.distance == INT_MAX) {
            std::cout << "不可达\n";
        } else {
            std::cout << result.distance << "  ";
            for (int i = 0; i < result.path.size(); i++) {
                std::cout << result.path[i];
                if (i < result.path.size() - 1) std::cout << " -> ";
            }
            std::cout << "\n";
        }
    }
}

void CLI::tspMenu() {
    int startId;
    char returnChoice;

    std::cout << "\n=== 旅行商问题求解 ===\n";
    std::cout << "起始城市编号: ";
    std::cin >> startId;
    std::cout << "是否返回起点？(y/n): ";
    std::cin >> returnChoice;

    bool returnToStart = (returnChoice == 'y' || returnChoice == 'Y');

    std::cout << "正在计算，请稍候...\n";
    TSPResult result = TSP::solveFromCity(graph, startId, returnToStart);

    std::cout << "\n最短路线：\n";
    for (int i = 0; i < result.path.size(); i++) {
        std::cout << result.path[i];
        if (i < result.path.size() - 1) std::cout << " -> ";
    }
    std::cout << "\n总距离: " << result.totalDistance << "\n";
}

void CLI::steinerTreeMenu() {
    std::cout << "\n=== 施泰纳树问题求解 ===\n";
    std::cout << "正在计算最短通信线路布线方案...\n";

    std::vector<Edge> mst = SteinerTree::solve(graph);

    std::cout << "\n最短布线方案：\n";
    for (const auto& edge : mst) {
        std::cout << edge.from << " <-> " << edge.to << " (距离: " << edge.length << ")\n";
    }
    std::cout << "总长度: " << SteinerTree::getTotalLength(mst) << "\n";
}

void CLI::saveDataMenu() {
    // 同时保存为 JSON 和文本格式
    bool jsonSuccess = FileIO::saveAllJSON(graph, cityFile, routeFile);
    bool txtSuccess = FileIO::saveAll(graph, cityFile, routeFile);

    if (jsonSuccess || txtSuccess) {
        std::cout << "数据保存成功！";
        if (jsonSuccess) std::cout << " (JSON格式)";
        if (txtSuccess) std::cout << " (文本格式)";
        std::cout << "\n";
    } else {
        std::cout << "数据保存失败！\n";
    }
}

void CLI::loadDataMenu() {
    Graph newGraph;
    // 优先尝试加载 JSON 格式，失败则尝试文本格式
    bool success = FileIO::loadAllJSON(newGraph, cityFile, routeFile);
    if (!success) {
        success = FileIO::loadAll(newGraph, cityFile, routeFile);
    }

    if (success) {
        graph = newGraph;
        std::cout << "数据加载成功！\n";
    } else {
        std::cout << "数据加载失败！\n";
    }
}

void CLI::run() {
    int choice;
    while (true) {
        displayMenu();
        std::cin >> choice;

        switch (choice) {
            case 1: addCityMenu(); break;
            case 2: removeCityMenu(); break;
            case 3: updateCityMenu(); break;
            case 4: addRouteMenu(); break;
            case 5: removeRouteMenu(); break;
            case 6: displayAllMenu(); break;
            case 7: checkConnectivityMenu(); break;
            case 8: makeConnectedMenu(); break;
            case 9: shortestPathMenu(); break;
            case 10: tspMenu(); break;
            case 11: steinerTreeMenu(); break;
            case 12: saveDataMenu(); break;
            case 13: loadDataMenu(); break;
            case 0:
                std::cout << "退出系统。\n";
                return;
            default:
                std::cout << "无效选择，请重试。\n";
        }
    }
}

