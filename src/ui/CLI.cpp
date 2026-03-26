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
#include <string>
#include <vector>
#include <algorithm>

// 获取城市名称的辅助函数
static std::string getCityName(const Graph& graph, int cityId) {
    const City* city = graph.getCityById(cityId);
    return city ? city->name : "未知城市(" + std::to_string(cityId) + ")";
}

// 表格打印辅助函数
static void printTableLine(int width) {
    std::cout << "+" << std::string(width, '-') << "+" << std::endl;
}

static void printTableHeader(const std::vector<std::string>& headers,
                             const std::vector<int>& widths) {
    printTableLine(0);
    for (size_t i = 0; i < headers.size(); ++i) {
        int w = widths[i];
        std::cout << "| " << std::left << std::setw(w-2) << headers[i] << " ";
    }
    std::cout << "|" << std::endl;
    std::cout << "+";
    for (size_t i = 0; i < widths.size(); ++i) {
        std::cout << std::string(widths[i], '-') << "+";
    }
    std::cout << std::endl;
}

static void printTableRow(const std::vector<std::string>& cells,
                          const std::vector<int>& widths) {
    for (size_t i = 0; i < cells.size(); ++i) {
        int w = widths[i];
        std::cout << "| " << std::left << std::setw(w-2) << cells[i] << " ";
    }
    std::cout << "|" << std::endl;
}

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
    std::vector<City> cities = graph.getAllCities();
    std::vector<Edge> edges = graph.getAllEdges();

    // 城市表格
    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                        所有城市信息表                               ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (cities.empty()) {
        std::cout << "\n暂无城市数据。\n";
    } else {
        // 计算列宽
        int idWidth = 6;
        int nameWidth = 16;
        int coordWidth = 18;
        int descWidth = std::max(30, static_cast<int>(80 - idWidth - nameWidth - coordWidth - 15));

        std::vector<std::string> headers = {"ID", "城市名称", "坐标", "简介"};
        std::vector<int> widths = {idWidth, nameWidth, coordWidth, descWidth};

        printTableHeader(headers, widths);

        for (const auto& city : cities) {
            std::vector<std::string> row;
            row.push_back(std::to_string(city.id));
            row.push_back(city.name);
            row.push_back("(" + std::to_string(city.x) + ", " + std::to_string(city.y) + ")");
            row.push_back(city.description);
            printTableRow(row, widths);
        }

        printTableLine(0);
        std::cout << "\n总计: " << cities.size() << " 个城市\n";
    }

    // 线路表格
    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                        所有线路信息表                               ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (edges.empty()) {
        std::cout << "\n暂无线路数据。\n";
    } else {
        // 计算列宽
        int fromWidth = 12;
        int toWidth = 12;
        int distWidth = 10;
        int totalWidth = fromWidth + toWidth + distWidth + 9; // 3个|和空格

        std::vector<std::string> headers = {"起点城市", "终点城市", "距离(km)"};
        std::vector<int> widths = {fromWidth, toWidth, distWidth};

        printTableHeader(headers, widths);

        for (const auto& edge : edges) {
            std::string fromName = getCityName(graph, edge.from);
            std::string toName = getCityName(graph, edge.to);

            std::vector<std::string> row;
            row.push_back(fromName);
            row.push_back(toName);
            row.push_back(std::to_string(edge.length));
            printTableRow(row, widths);
        }

        printTableLine(0);
        std::cout << "\n总计: " << edges.size() << " 条线路\n";
    }
}

void CLI::checkConnectivityMenu() {
    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                         连通性判断分析                               ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (Connectivity::isConnected(graph)) {
        std::cout << "\n✓ 该国所有城市构成连通图。\n";
        std::cout << "  状态: 所有城市之间都有路径可达\n";
    } else {
        std::vector<std::vector<int>> components = Connectivity::findConnectedComponents(graph);

        std::cout << "\n✗ 该国所有城市不构成连通图。\n";
        std::cout << "  状态: 图被分割为 " << components.size() << " 个互不连通的区域\n\n";

        // 显示各连通分量的城市
        for (size_t i = 0; i < components.size(); ++i) {
            std::cout << "  第 " << (i + 1) << " 个连通分量（包含 " << components[i].size() << " 个城市）:" << std::endl;
            std::cout << "    ";
            for (size_t j = 0; j < components[i].size(); ++j) {
                std::string cityName = getCityName(graph, components[i][j]);
                std::cout << cityName;
                if (j < components[i].size() - 1) {
                    std::cout << ", ";
                }
                // 每行显示5个城市
                if ((j + 1) % 5 == 0 && j < components[i].size() - 1) {
                    std::cout << "\n    ";
                }
            }
            std::cout << std::endl;
        }
    }
}

void CLI::makeConnectedMenu() {
    std::cout << "\n=== 设计最小连通方案 ===\n";
    if (Connectivity::isConnected(graph)) {
        std::cout << "\n√ 图已经是连通的，无需添加线路。\n";
        return;
    }

    std::vector<Edge> newEdges = Connectivity::makeConnected(graph);

    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                  需要添加的线路（连通各分量）                         ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (newEdges.empty()) {
        std::cout << "\n无法确定需要添加的线路。\n";
        return;
    }

    int totalLength = 0;

    // 表格显示
    int fromWidth = 16;
    int toWidth = 16;
    int distWidth = 12;

    std::vector<std::string> headers = {"起点城市", "终点城市", "距离(km)"};
    std::vector<int> widths = {fromWidth, toWidth, distWidth};

    printTableHeader(headers, widths);

    for (const auto& edge : newEdges) {
        std::vector<std::string> row;
        row.push_back(getCityName(graph, edge.from));
        row.push_back(getCityName(graph, edge.to));
        row.push_back(std::to_string(edge.length));
        printTableRow(row, widths);
        totalLength += edge.length;
    }

    printTableLine(0);
    std::cout << "\n需要添加线路数量: " << newEdges.size() << " 条" << std::endl;
    std::cout << "总添加长度: " << totalLength << " km" << std::endl;

    std::cout << "\n是否应用这些线路？(y/n): ";
    char choice;
    std::cin >> choice;
    if (choice == 'y' || choice == 'Y') {
        for (const auto& edge : newEdges) {
            graph.addEdge(edge.from, edge.to);
        }
        std::cout << "\n√ 线路已添加成功！\n";
    }
}

void CLI::shortestPathMenu() {
    int startId;
    std::cout << "\n=== 查询最短路径 ===\n";
    std::cout << "起始城市编号: ";
    std::cin >> startId;

    City* startCity = graph.getCityById(startId);
    if (!startCity) {
        std::cout << "城市不存在！\n";
        return;
    }

    std::vector<PathResult> results = ShortestPath::dijkstraFromCity(graph, startId);

    // 过滤掉自身（起点到起点）
    std::vector<PathResult> filteredResults;
    for (const auto& result : results) {
        if (result.targetId != startId) {
            filteredResults.push_back(result);
        }
    }

    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║              从 " << std::left << std::setw(20) << startCity->name << "出发的最短路径                 ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (filteredResults.empty()) {
        std::cout << "\n图中只有起点城市。\n";
        return;
    }

    // 按距离排序
    std::sort(filteredResults.begin(), filteredResults.end(),
              [](const PathResult& a, const PathResult& b) { return a.distance < b.distance; });

    // 计算列宽
    int targetWidth = 16;
    int distWidth = 12;
    int pathWidth = std::max(40, static_cast<int>(80 - targetWidth - distWidth - 15));

    std::vector<std::string> headers = {"目标城市", "距离(km)", "路径"};
    std::vector<int> widths = {targetWidth, distWidth, pathWidth};

    printTableHeader(headers, widths);

    for (const auto& result : filteredResults) {
        std::vector<std::string> row;
        City* targetCity = graph.getCityById(result.targetId);
        row.push_back(targetCity ? targetCity->name : "未知城市");

        if (result.distance == INT_MAX) {
            row.push_back("不可达");
            row.push_back("-");
        } else {
            row.push_back(std::to_string(result.distance));

            // 构建路径字符串（显示城市名称）
            std::string pathStr;
            for (size_t i = 0; i < result.path.size(); ++i) {
                City* city = graph.getCityById(result.path[i]);
                std::string cityName = city ? city->name : std::to_string(result.path[i]);
                pathStr += cityName;
                if (i < result.path.size() - 1) {
                    pathStr += " → ";
                }
            }
            row.push_back(pathStr);
        }
        printTableRow(row, widths);
    }

    printTableLine(0);
    std::cout << "\n总计: " << filteredResults.size() << " 个目标城市" << std::endl;
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

    City* startCity = graph.getCityById(startId);
    if (!startCity) {
        std::cout << "城市不存在！\n";
        return;
    }

    std::cout << "正在计算，请稍候...\n";
    TSPResult result = TSP::solveFromCity(graph, startId, returnToStart);

    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                         旅行商问题求解结果                           ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (result.totalDistance == INT_MAX) {
        std::cout << "\n无法找到完整路径！图可能不连通。\n";
        return;
    }

    std::cout << "\n起点城市: " << startCity->name << std::endl;
    std::cout << "是否返回起点: " << (returnToStart ? "是" : "否") << std::endl;

    // 计算列宽
    int stepWidth = 8;
    int cityWidth = 24;
    int accumulatedWidth = 16; // "累计距离" 列

    std::vector<std::string> headers = {"步序", "城市", "累计距离(km)"};
    std::vector<int> widths = {stepWidth, cityWidth, accumulatedWidth};

    printTableHeader(headers, widths);

    int accumulatedDist = 0;
    for (size_t i = 0; i < result.path.size(); ++i) {
        std::vector<std::string> row;
        row.push_back(std::to_string(i + 1));

        City* city = graph.getCityById(result.path[i]);
        row.push_back(city ? city->name : "未知城市");

        if (i > 0) {
            // 计算到上一个城市的距离
            int prevId = result.path[i-1];
            int currId = result.path[i];
            int dist = graph.getDistance(prevId, currId);
            accumulatedDist += dist;
        }
        row.push_back(std::to_string(accumulatedDist));

        printTableRow(row, widths);
    }

    printTableLine(0);

    // 计算总城市数
    int cityCount = result.path.size();
    std::cout << "\n访问城市数量: " << cityCount << " 个";
    if (returnToStart) {
        std::cout << "（包含返回起点）";
    }
    std::cout << std::endl;
    std::cout << "总旅行距离: " << result.totalDistance << " km" << std::endl;
}

void CLI::steinerTreeMenu() {
    std::cout << "\n=== 施泰纳树问题求解 ===\n";
    std::cout << "正在计算最短通信线路布线方案...\n";

    SteinerTreeResult result = SteinerTree::solve(graph);

    std::cout << "\n╔══════════════════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║                     最短通信线路布线方案（最小生成树）                ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝" << std::endl;

    if (result.edges.empty()) {
        std::cout << "\n图中没有足够的城市构成生成树。\n";
    } else {
        // 表格显示线路
        int fromWidth = 16;
        int toWidth = 16;
        int distWidth = 12;

        std::vector<std::string> headers = {"起点城市", "终点城市", "距离(km)"};
        std::vector<int> widths = {fromWidth, toWidth, distWidth};

        printTableHeader(headers, widths);

        for (const auto& edge : result.edges) {
            std::vector<std::string> row;
            row.push_back(getCityName(graph, edge.from));
            row.push_back(getCityName(graph, edge.to));
            row.push_back(std::to_string(edge.length));
            printTableRow(row, widths);
        }

        printTableLine(0);
        std::cout << "\n线路总数: " << result.edges.size() << " 条" << std::endl;
        std::cout << "总布线长度: " << result.totalDistance << " km" << std::endl;

        if (!result.steinerPoints.empty()) {
            std::cout << "\n" << std::string(70, '-') << std::endl;
            std::cout << "施泰纳点(Steiner 点)信息：" << std::endl;
            std::cout << std::string(70, '-') << std::endl;
            for (const auto& point : result.steinerPoints) {
                std::cout << "  位置: (" << point.x << ", " << point.y
                          << ") - 连接了三个方向的线路" << std::endl;
            }
        }
    }
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

