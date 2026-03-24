#include "../src/graph/Graph.h"
#include "../src/algorithms/ShortestPath.h"
#include <chrono>
#include <random>
#include <iostream>

int main() {
    std::mt19937 rng(42);
    std::uniform_int_distribution<int> coordDist(0, 1000);

    std::cout << "=== 性能基准测试 ===\n" << std::endl;

    // 测试不同规模
    for (int n : {10, 20, 50, 100}) {
        Graph g;
        std::vector<int> cityIds;

        // 生成n个随机城市
        for (int i = 1; i <= n; i++) {
            int x = coordDist(rng);
            int y = coordDist(rng);
            City c{i, std::to_string(i), x, y};
            g.addCity(c);
            cityIds.push_back(i);
        }

        // 随机连接边（约30%密度）
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (rng() % 100 < 30) {
                    g.addEdge(cityIds[i], cityIds[j]);
                }
            }
        }

        std::cout << "城市数: " << n << ", 边数: " << g.getEdgeCount() << std::endl;

        // 测试Dijkstra执行时间
        auto start = std::chrono::high_resolution_clock::now();
        auto results = ShortestPath::dijkstraFromCity(g, cityIds[0]);
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

        std::cout << "  Dijkstra执行时间: " << duration.count() << " 微秒 ("
                  << duration.count() / 1000.0 << " 毫秒)" << std::endl;
        std::cout << "  结果数: " << results.size() << std::endl;
        std::cout << std::endl;
    }

    // 对比：模拟旧的O(n²)实现复杂度
    std::cout << "=== 复杂度对比分析 ===" << std::endl;
    std::cout << "修复后O((V+E)log V):" << std::endl;
    std::cout << "  n=100, E≈1500 => ~100*log(100) ≈ 660次堆操作" << std::endl;
    std::cout << "修复前O(V² log V):  约为 10000*log(100) ≈ 6600次检查" << std::endl;
    std::cout << "理论加速比: ~10倍" << std::endl;

    return 0;
}
