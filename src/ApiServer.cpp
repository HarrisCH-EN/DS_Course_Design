#include "ApiServer.h"
#include "io/FileIO.h"
#include "algorithms/Connectivity.h"
#include "algorithms/ShortestPath.h"
#include "algorithms/TSP.h"
#include "algorithms/SteinerTree.h"
#include <fstream>
#include <sstream>
#include <iostream>

ApiServer::ApiServer(const std::string& dataDir)
    : dataDir(dataDir), nextCityId(1), nextRouteId(1) {
    // C++11 compatible: use reset(new ...) instead of make_unique
    server.reset(new SimpleHttpServer(3001));
    setupRoutes();
}

std::string ApiServer::extractIdFromPath(const std::string& path) {
    // Extract ID from paths like /api/cities/123 or /api/analyze/shortest-path/123
    size_t lastSlash = path.find_last_of('/');
    if (lastSlash != std::string::npos) {
        return path.substr(lastSlash + 1);
    }
    return "";
}

void ApiServer::setupRoutes() {
    // GET /api/data
    server->Get("/api/data", [this](const std::string& body) {
        std::string json = "{\"cities\":" + citiesToJson() + ",\"routes\":" + routesToJson() + "}";
        return json;
    });

    // POST /api/cities
    server->Post("/api/cities", [this](const std::string& body) {
        try {
            // Simple JSON parsing for city
            std::string name, description;
            int x = 0, y = 0;
            
            size_t pos = body.find("\"name\"");
            if (pos != std::string::npos) {
                size_t start = body.find("\"", pos + 6) + 1;
                size_t end = body.find("\"", start);
                name = body.substr(start, end - start);
            }
            
            pos = body.find("\"x\"");
            if (pos != std::string::npos) {
                size_t start = body.find(":", pos) + 1;
                size_t end = body.find_first_of(",}", start);
                x = std::stoi(body.substr(start, end - start));
            }
            
            pos = body.find("\"y\"");
            if (pos != std::string::npos) {
                size_t start = body.find(":", pos) + 1;
                size_t end = body.find_first_of(",}", start);
                y = std::stoi(body.substr(start, end - start));
            }
            
            pos = body.find("\"description\"");
            if (pos != std::string::npos) {
                size_t start = body.find("\"", pos + 13) + 1;
                size_t end = body.find("\"", start);
                description = body.substr(start, end - start);
            }
            
            int newId = nextCityId++;
            City city(newId, name, x, y, description);
            graph.addCity(city);
            saveData();
            
            return toJson(city);
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // DELETE /api/cities/:id
    server->Delete("/api/cities/:id", [this](const std::string& path) {
        try {
            std::string idStr = extractIdFromPath(path);
            int id = parseId(idStr);
            if (graph.removeCity(id)) {
                saveData();
                return std::string("{\"success\":true}");
            } else {
                return std::string("{\"error\":\"City not found\"}");
            }
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // POST /api/routes
    server->Post("/api/routes", [this](const std::string& body) {
        try {
            std::string source, target, type = "normal";
            
            size_t pos = body.find("\"source\"");
            if (pos != std::string::npos) {
                size_t start = body.find("\"", pos + 8) + 1;
                size_t end = body.find("\"", start);
                source = body.substr(start, end - start);
            }
            
            pos = body.find("\"target\"");
            if (pos != std::string::npos) {
                size_t start = body.find("\"", pos + 8) + 1;
                size_t end = body.find("\"", start);
                target = body.substr(start, end - start);
            }
            
            pos = body.find("\"type\"");
            if (pos != std::string::npos) {
                size_t start = body.find("\"", pos + 6) + 1;
                size_t end = body.find("\"", start);
                type = body.substr(start, end - start);
            }
            
            int fromId = parseId(source);
            int toId = parseId(target);
            
            if (graph.addEdge(fromId, toId)) {
                saveData();
                int newRouteId = nextRouteId++;
                std::string json = "{\"id\":\"r" + std::to_string(newRouteId) + 
                                  "\",\"source\":\"" + source + 
                                  "\",\"target\":\"" + target + 
                                  "\",\"type\":\"" + type + "\"}";
                return json;
            } else {
                return std::string("{\"error\":\"Invalid route\"}");
            }
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // DELETE /api/routes/:id
    server->Delete("/api/routes/:id", [this](const std::string& path) {
        try {
            // 从路径中提取路由ID (如 /api/routes/r1 -> r1)
            std::string idStr = extractIdFromPath(path);
            // 去掉 'r' 前缀得到数字索引
            int routeIndex = 0;
            if (idStr.length() > 1 && idStr[0] == 'r') {
                routeIndex = std::stoi(idStr.substr(1)) - 1; // 转为0-based索引
            } else {
                routeIndex = std::stoi(idStr) - 1;
            }

            // 获取所有边
            std::vector<Edge> edges = graph.getAllEdges();
            if (routeIndex >= 0 && routeIndex < (int)edges.size()) {
                // 删除指定索引的边
                graph.removeEdge(edges[routeIndex].from, edges[routeIndex].to);
                saveData();
                return std::string("{\"success\":true}");
            } else {
                return std::string("{\"error\":\"Route not found\"}");
            }
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // POST /api/cities/replace - 批量替换所有城市
    server->Post("/api/cities/replace", [this](const std::string& body) {
        try {
            // 清空所有城市
            graph.clearAll();
            nextCityId = 1;

            // 解析 JSON 数组 - 按每个 { 开始的对象解析
            size_t pos = 0;
            int count = 0;
            while ((pos = body.find("{", pos)) != std::string::npos) {
                // 找到匹配的结束 }
                int depth = 1;
                size_t end = pos + 1;
                while (end < body.length() && depth > 0) {
                    if (body[end] == '{') depth++;
                    else if (body[end] == '}') depth--;
                    end++;
                }
                if (depth != 0) break;

                std::string item = body.substr(pos, end - pos);

                // 只处理包含 name 字段的对象
                if (item.find("\"name\"") == std::string::npos && item.find("\"name\"") == std::string::npos) {
                    pos = end;
                    continue;
                }

                std::string name, description;
                int x = 0, y = 0;

                auto extractString = [&](const std::string& key) -> std::string {
                    size_t keyPos = item.find("\"" + key + "\"");
                    if (keyPos == std::string::npos) return "";
                    size_t colonPos = item.find(":", keyPos);
                    if (colonPos == std::string::npos) return "";
                    // 跳过空白
                    size_t start = item.find("\"", colonPos + 1);
                    if (start == std::string::npos) return "";
                    start++;
                    size_t valueEnd = item.find("\"", start);
                    if (valueEnd == std::string::npos) return "";
                    return item.substr(start, valueEnd - start);
                };

                auto extractInt = [&](const std::string& key) -> int {
                    size_t keyPos = item.find("\"" + key + "\"");
                    if (keyPos == std::string::npos) return 0;
                    size_t colonPos = item.find(":", keyPos);
                    if (colonPos == std::string::npos) return 0;
                    size_t start = colonPos + 1;
                    while (start < item.length() && (item[start] == ' ' || item[start] == '\t')) start++;
                    size_t valueEnd = item.find_first_of(",} \t\n\r", start);
                    if (valueEnd == std::string::npos) valueEnd = item.length();
                    std::string numStr = item.substr(start, valueEnd - start);
                    try { return std::stoi(numStr); } catch (...) { return 0; }
                };

                name = extractString("name");
                description = extractString("description");
                x = extractInt("x");
                y = extractInt("y");

                if (!name.empty()) {
                    City city(nextCityId++, name, x, y, description);
                    graph.addCity(city);
                    count++;
                }
                pos = end;
            }

            saveData();
            return "{\"success\":true,\"count\":" + std::to_string(count) + "}";
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // POST /api/routes/replace - 批量替换所有线路
    server->Post("/api/routes/replace", [this](const std::string& body) {
        try {
            // 清空所有边
            std::vector<Edge> edges = graph.getAllEdges();
            for (const auto& e : edges) {
                graph.removeEdge(e.from, e.to);
            }

            // 解析 JSON 数组 - 按每个 { 开始的对象解析
            size_t pos = 0;
            int count = 0;
            while ((pos = body.find("{", pos)) != std::string::npos) {
                int depth = 1;
                size_t end = pos + 1;
                while (end < body.length() && depth > 0) {
                    if (body[end] == '{') depth++;
                    else if (body[end] == '}') depth--;
                    end++;
                }
                if (depth != 0) break;

                std::string item = body.substr(pos, end - pos);

                if (item.find("\"source\"") == std::string::npos) {
                    pos = end;
                    continue;
                }

                auto extractString = [&](const std::string& key) -> std::string {
                    size_t keyPos = item.find("\"" + key + "\"");
                    if (keyPos == std::string::npos) return "";
                    size_t colonPos = item.find(":", keyPos);
                    if (colonPos == std::string::npos) return "";
                    size_t start = item.find("\"", colonPos + 1);
                    if (start == std::string::npos) return "";
                    start++;
                    size_t valueEnd = item.find("\"", start);
                    if (valueEnd == std::string::npos) return "";
                    return item.substr(start, valueEnd - start);
                };

                std::string sourceStr = extractString("source");
                std::string targetStr = extractString("target");

                int source = 0, target = 0;
                try { source = std::stoi(sourceStr); } catch (...) {}
                try { target = std::stoi(targetStr); } catch (...) {}

                if (source > 0 && target > 0) {
                    graph.addEdge(source, target);
                    count++;
                }
                pos = end;
            }

            saveData();
            return "{\"success\":true,\"count\":" + std::to_string(count) + "}";
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // GET /api/analyze/connectivity
    server->Get("/api/analyze/connectivity", [this](const std::string& body) {
        bool connected = Connectivity::isConnected(graph);
        std::vector<std::vector<int>> components = Connectivity::findConnectedComponents(graph);
        std::vector<Edge> missingEdges = Connectivity::makeConnected(graph);
        
        std::string json = "{\"connected\":" + std::string(connected ? "true" : "false") + 
                          ",\"components\":[";
        
        for (size_t i = 0; i < components.size(); i++) {
            json += "[";
            for (size_t j = 0; j < components[i].size(); j++) {
                json += "\"" + std::to_string(components[i][j]) + "\"";
                if (j < components[i].size() - 1) json += ",";
            }
            json += "]";
            if (i < components.size() - 1) json += ",";
        }
        
        json += "],\"missingEdges\":[";
        for (size_t i = 0; i < missingEdges.size(); i++) {
            json += "{\"source\":\"" + std::to_string(missingEdges[i].from) + 
                   "\",\"target\":\"" + std::to_string(missingEdges[i].to) + 
                   "\",\"distance\":" + std::to_string(missingEdges[i].length) + "}";
            if (i < missingEdges.size() - 1) json += ",";
        }
        json += "]}";
        
        return json;
    });

    // GET /api/analyze/shortest-path/:sourceId
    server->Get("/api/analyze/shortest-path/:sourceId", [this](const std::string& path) {
        try {
            std::string idStr = extractIdFromPath(path);
            int sourceId = parseId(idStr);
            std::vector<PathResult> results = ShortestPath::dijkstraFromCity(graph, sourceId);
            
            std::string json = "[";
            for (size_t i = 0; i < results.size(); i++) {
                if (results[i].targetId == sourceId) continue;
                
                json += "{\"target\":\"" + std::to_string(results[i].targetId) + 
                       "\",\"distance\":" + std::to_string(results[i].distance) + 
                       ",\"path\":[";
                
                for (size_t j = 0; j < results[i].path.size(); j++) {
                    json += "\"" + std::to_string(results[i].path[j]) + "\"";
                    if (j < results[i].path.size() - 1) json += ",";
                }
                json += "]}";
                if (i < results.size() - 1) json += ",";
            }
            json += "]";
            
            return json;
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // GET /api/analyze/tsp/open/:sourceId (开放路径，不返回起点)
    server->Get("/api/analyze/tsp/open/:sourceId", [this](const std::string& path) {
        try {
            std::string idStr = extractIdFromPath(path);
            int sourceId = parseId(idStr);
            TSPResult result = TSP::solveFromCity(graph, sourceId, false);
            
            std::string json = "{\"path\":[";
            for (size_t i = 0; i < result.path.size(); i++) {
                json += "\"" + std::to_string(result.path[i]) + "\"";
                if (i < result.path.size() - 1) json += ",";
            }
            json += "],\"distance\":" + std::to_string(result.totalDistance) + "}";
            
            return json;
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // GET /api/analyze/tsp/closed/:sourceId (闭合路径，返回起点)
    server->Get("/api/analyze/tsp/closed/:sourceId", [this](const std::string& path) {
        try {
            std::string idStr = extractIdFromPath(path);
            int sourceId = parseId(idStr);
            TSPResult result = TSP::solveFromCity(graph, sourceId, true);
            
            std::string json = "{\"path\":[";
            for (size_t i = 0; i < result.path.size(); i++) {
                json += "\"" + std::to_string(result.path[i]) + "\"";
                if (i < result.path.size() - 1) json += ",";
            }
            json += "],\"distance\":" + std::to_string(result.totalDistance) + "}";
            
            return json;
        } catch (const std::exception& e) {
            return std::string("{\"error\":\"Invalid request\"}");
        }
    });

    // GET /api/analyze/steiner
    server->Get("/api/analyze/steiner", [this](const std::string& body) {
        SteinerTreeResult result = SteinerTree::solve(graph);
        std::vector<Edge> edges = result.edges;
        int totalDistance = result.totalDistance;
        
        std::string json = "{\"edges\":[";
        for (size_t i = 0; i < edges.size(); i++) {
            json += "{\"source\":\"" + std::to_string(edges[i].from) + 
                   "\",\"target\":\"" + std::to_string(edges[i].to) + 
                   "\",\"distance\":" + std::to_string(edges[i].length) + "}";
            if (i < edges.size() - 1) json += ",";
        }
        json += "],\"distance\":" + std::to_string(totalDistance) + "}";
        
        return json;
    });
}

std::string ApiServer::toJson(const City& city) {
    return "{\"id\":\"" + std::to_string(city.id) + 
           "\",\"name\":\"" + city.name + 
           "\",\"x\":" + std::to_string(city.x) + 
           ",\"y\":" + std::to_string(city.y) + 
           ",\"description\":\"" + city.description + "\"}";
}

std::string ApiServer::toJson(const Edge& edge, int routeId) {
    return "{\"id\":\"r" + std::to_string(routeId) + 
           "\",\"source\":\"" + std::to_string(edge.from) + 
           "\",\"target\":\"" + std::to_string(edge.to) + 
           "\",\"type\":\"normal\"}";
}

std::string ApiServer::citiesToJson() {
    std::vector<City> cities = graph.getAllCities();
    std::string json = "[";
    for (size_t i = 0; i < cities.size(); i++) {
        json += toJson(cities[i]);
        if (i < cities.size() - 1) json += ",";
    }
    json += "]";
    return json;
}

std::string ApiServer::routesToJson() {
    std::vector<Edge> edges = graph.getAllEdges();
    std::string json = "[";
    int routeId = 1;
    for (size_t i = 0; i < edges.size(); i++) {
        json += toJson(edges[i], routeId++);
        if (i < edges.size() - 1) json += ",";
    }
    json += "]";
    return json;
}

int ApiServer::parseId(const std::string& idStr) {
    try {
        return std::stoi(idStr);
    } catch (...) {
        return 0;
    }
}

bool ApiServer::loadData() {
    std::string cityFile = dataDir + "/cities.json";
    std::string routeFile = dataDir + "/routes.json";
    
    std::cout << "Loading cities from: " << cityFile << std::endl;
    std::cout << "Loading routes from: " << routeFile << std::endl;
    
    // Try to load JSON files
    if (FileIO::loadAllJSON(graph, cityFile, routeFile)) {
        // Find max IDs for next IDs
        std::vector<City> cities = graph.getAllCities();
        std::cout << "Loaded " << cities.size() << " cities" << std::endl;
        for (const auto& city : cities) {
            if (city.id >= nextCityId) nextCityId = city.id + 1;
        }
        
        std::vector<Edge> edges = graph.getAllEdges();
        std::cout << "Loaded " << edges.size() << " edges" << std::endl;
        nextRouteId = edges.size() + 1;
        
        return true;
    }
    
    // Try to load text files
    std::string cityTxtFile = dataDir + "/cities.txt";
    std::string routeTxtFile = dataDir + "/routes.txt";
    
    if (FileIO::loadAll(graph, cityTxtFile, routeTxtFile)) {
        std::vector<City> cities = graph.getAllCities();
        for (const auto& city : cities) {
            if (city.id >= nextCityId) nextCityId = city.id + 1;
        }
        
        std::vector<Edge> edges = graph.getAllEdges();
        nextRouteId = edges.size() + 1;
        
        return true;
    }
    
    return false;
}

bool ApiServer::saveData() {
    std::string cityFile = dataDir + "/cities.json";
    std::string routeFile = dataDir + "/routes.json";
    
    return FileIO::saveAllJSON(graph, cityFile, routeFile);
}

void ApiServer::start(int port) {
    std::cout << "API Server starting on port " << port << std::endl;
    // C++11 compatible: use reset(new ...) instead of make_unique
    server.reset(new SimpleHttpServer(port));
    setupRoutes();
    server->start();
}

void ApiServer::stop() {
    if (server) {
        server->stop();
    }
}