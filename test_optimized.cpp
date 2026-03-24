#include "../src/graph/Graph.h"
#include "../src/algorithms/ShortestPath.h"
#include "../src/algorithms/MST.h"
#include "../src/algorithms/Connectivity.h"
#include <iostream>

int main() {
    Graph g;

    // 添加5个测试城市
    g.addCity(City{1, "A", 0, 0});
    g.addCity(City{2, "B", 100, 0});
    g.addCity(City{3, "C", 0, 100});
    g.addCity(City{4, "D", 100, 100});
    g.addCity(City{5, "E", 50, 50});

    // 手动添加一些边（如果不确定，计算器会自动计算欧氏距离）
    g.addEdge(1, 2);
    g.addEdge(1, 3);
    g.addEdge(2, 4);
    g.addEdge(3, 4);
    g.addEdge(4, 5);

    std::cout << "=== 测试连通性 ===" << std::endl;
    bool connected = Connectivity::isConnected(g);
    std::cout << "图是否连通: " << (connected ? "是" : "否") << std::endl;

    auto components = Connectivity::findConnectedComponents(g);
    std::cout << "连通分量数量: " << components.size() << std::endl;

    std::cout << "\n=== 测试最短路径（修复后）===" << std::endl;
    auto results = ShortestPath::dijkstraFromCity(g, 1);
    for (const auto& r : results) {
        std::cout << "到城市 " << r.targetId << ": 距离=" << r.distance;
        if (!r.path.empty()) {
            std::cout << ", 路径: ";
            for (size_t i = 0; i < r.path.size(); i++) {
                std::cout << r.path[i] << (i + 1 < r.path.size() ? "->" : "");
            }
        }
        std::cout << std::endl;
    }

    std::cout << "\n=== 测试MST ===" << std::endl;
    auto mst = MST::kruskal(g);
    int totalWeight = MST::getTotalWeight(mst);
    std::cout << "MST边数: " << mst.size() << ", 总权重: " << totalWeight << std::endl;

    std::cout << "\n✅ 所有算法执行成功！" << std::endl;
    return 0;
}
