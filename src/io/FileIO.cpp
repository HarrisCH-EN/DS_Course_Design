#include "FileIO.h"
#include <fstream>
#include <sstream>
#include <iostream>

// ==================== 文本格式读写（保留兼容性）====================

bool FileIO::saveCities(const Graph& graph, const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::vector<City> cities = graph.getAllCities();
    file << cities.size() << "\n";

    for (const auto& city : cities) {
        file << city.id << " " << city.name << " " << city.x << " " << city.y << " " << city.description << "\n";
    }

    file.close();
    return true;
}

bool FileIO::saveRoutes(const Graph& graph, const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::vector<Edge> edges = graph.getAllEdges();
    file << edges.size() << "\n";

    for (const auto& edge : edges) {
        file << edge.from << " " << edge.to << "\n";
    }

    file.close();
    return true;
}

bool FileIO::loadCities(Graph& graph, const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    int count;
    file >> count;
    file.ignore();

    for (int i = 0; i < count; i++) {
        std::string line;
        std::getline(file, line);
        std::istringstream iss(line);

        int id, x, y;
        std::string name, description;

        iss >> id >> name >> x >> y;
        std::getline(iss, description);

        if (!description.empty() && description[0] == ' ') {
            description = description.substr(1);
        }

        City city(id, name, x, y, description);
        graph.addCity(city);
    }

    file.close();
    return true;
}

bool FileIO::loadRoutes(Graph& graph, const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    int count;
    file >> count;

    for (int i = 0; i < count; i++) {
        int from, to;
        file >> from >> to;
        graph.addEdge(from, to);
    }

    file.close();
    return true;
}

bool FileIO::saveAll(const Graph& graph, const std::string& cityFile, const std::string& routeFile) {
    return saveCities(graph, cityFile) && saveRoutes(graph, routeFile);
}

bool FileIO::loadAll(Graph& graph, const std::string& cityFile, const std::string& routeFile) {
    return loadCities(graph, cityFile) && loadRoutes(graph, routeFile);
}

// ==================== JSON 格式读写（新增）====================

// 简单的 JSON 解析辅助函数
static std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, last - first + 1);
}

static std::string extractValue(const std::string& line, const std::string& key) {
    size_t pos = line.find("\"" + key + "\"");
    if (pos == std::string::npos) return "";

    pos = line.find(":", pos);
    if (pos == std::string::npos) return "";

    size_t start = pos + 1;
    size_t end = line.find_first_of(",}", start);
    if (end == std::string::npos) end = line.length();

    std::string value = trim(line.substr(start, end - start));
    
    // 移除值的引号
    if (value.length() >= 2 && value.front() == '"' && value.back() == '"') {
        value = value.substr(1, value.length() - 2);
    }
    
    return value;
}

bool FileIO::loadCitiesJSON(Graph& graph, const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::string line;
    bool inObject = false;
    int id = 0;
    std::string name, description;
    int x = 0, y = 0;

    while (std::getline(file, line)) {
        line = trim(line);

        // 检测对象开始
        if (line.find("{") != std::string::npos) {
            inObject = true;
            id = 0;
            name = "";
            description = "";
            x = y = 0;
        }

        if (inObject) {
            std::string idStr = extractValue(line, "id");
            if (!idStr.empty()) {
                id = std::stoi(idStr);
            }

            std::string nameStr = extractValue(line, "name");
            if (!nameStr.empty()) {
                name = nameStr;
            }

            std::string xStr = extractValue(line, "x");
            if (!xStr.empty()) x = std::stoi(xStr);

            std::string yStr = extractValue(line, "y");
            if (!yStr.empty()) y = std::stoi(yStr);

            std::string descStr = extractValue(line, "description");
            if (!descStr.empty()) description = descStr;
        }

        // 检测对象结束
        if (line.find("}") != std::string::npos && inObject) {
            if (id > 0 && !name.empty()) {
                City city(id, name, x, y, description);
                graph.addCity(city);
            }
            inObject = false;
        }
    }

    file.close();
    return true;
}

bool FileIO::loadRoutesJSON(Graph& graph, const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::string line;
    bool inObject = false;
    int source = 0, target = 0;

    while (std::getline(file, line)) {
        line = trim(line);

        if (line.find("{") != std::string::npos) {
            inObject = true;
            source = target = 0;
        }

        if (inObject) {
            std::string sourceStr = extractValue(line, "source");
            if (!sourceStr.empty()) source = std::stoi(sourceStr);

            std::string targetStr = extractValue(line, "target");
            if (!targetStr.empty()) target = std::stoi(targetStr);
        }

        if (line.find("}") != std::string::npos && inObject) {
            if (source > 0 && target > 0) {
                graph.addEdge(source, target);
            }
            inObject = false;
        }
    }

    file.close();
    return true;
}

bool FileIO::loadAllJSON(Graph& graph, const std::string& cityFile, const std::string& routeFile) {
    return loadCitiesJSON(graph, cityFile) && loadRoutesJSON(graph, routeFile);
}

bool FileIO::saveCitiesJSON(const Graph& graph, const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::vector<City> cities = graph.getAllCities();
    file << "[\n";

    for (size_t i = 0; i < cities.size(); i++) {
        const City& city = cities[i];
        file << "  {\n";
        file << "    \"id\": \"" << city.id << "\",\n";
        file << "    \"name\": \"" << city.name << "\",\n";
        file << "    \"x\": " << city.x << ",\n";
        file << "    \"y\": " << -city.y << ",\n";  // Y轴取反
        file << "    \"description\": \"" << city.description << "\"\n";
        file << "  }";
        if (i < cities.size() - 1) file << ",";
        file << "\n";
    }

    file << "]\n";
    file.close();
    return true;
}

bool FileIO::saveRoutesJSON(const Graph& graph, const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }

    std::vector<Edge> edges = graph.getAllEdges();
    file << "[\n";

    for (size_t i = 0; i < edges.size(); i++) {
        const Edge& edge = edges[i];
        file << "  {\n";
        file << "    \"id\": \"r" << (i + 1) << "\",\n";
        file << "    \"source\": \"" << edge.from << "\",\n";
        file << "    \"target\": \"" << edge.to << "\"\n";
        file << "  }";
        if (i < edges.size() - 1) file << ",";
        file << "\n";
    }

    file << "]\n";
    file.close();
    return true;
}

bool FileIO::saveAllJSON(const Graph& graph, const std::string& cityFile, const std::string& routeFile) {
    return saveCitiesJSON(graph, cityFile) && saveRoutesJSON(graph, routeFile);
}
