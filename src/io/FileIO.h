#ifndef FILEIO_H
#define FILEIO_H

#include "../graph/Graph.h"
#include <string>

class FileIO {
public:
    // 文本格式读写（保留兼容性）
    static bool saveCities(const Graph& graph, const std::string& filename);
    static bool saveRoutes(const Graph& graph, const std::string& filename);
    static bool loadCities(Graph& graph, const std::string& filename);
    static bool loadRoutes(Graph& graph, const std::string& filename);
    static bool saveAll(const Graph& graph, const std::string& cityFile, const std::string& routeFile);
    static bool loadAll(Graph& graph, const std::string& cityFile, const std::string& routeFile);

    // JSON 格式读写（新增）
    static bool loadCitiesJSON(Graph& graph, const std::string& filename);
    static bool loadRoutesJSON(Graph& graph, const std::string& filename);
    static bool loadAllJSON(Graph& graph, const std::string& cityFile, const std::string& routeFile);
    static bool saveCitiesJSON(const Graph& graph, const std::string& filename);
    static bool saveRoutesJSON(const Graph& graph, const std::string& filename);
    static bool saveAllJSON(const Graph& graph, const std::string& cityFile, const std::string& routeFile);
};

#endif
