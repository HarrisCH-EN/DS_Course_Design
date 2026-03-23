#ifndef APISERVER_H
#define APISERVER_H

#include "SimpleHttpServer.h"
#include "graph/Graph.h"
#include <string>
#include <memory>

class ApiServer {
private:
    std::unique_ptr<SimpleHttpServer> server;
    Graph graph;
    std::string dataDir;
    int nextCityId;
    int nextRouteId;

    void setupRoutes();
    
    // Helper methods
    std::string toJson(const City& city);
    std::string toJson(const Edge& edge, int routeId);
    std::string citiesToJson();
    std::string routesToJson();
    int parseId(const std::string& idStr);
    std::string extractIdFromPath(const std::string& path);

public:
    ApiServer(const std::string& dataDir = "..\\data");
    
    bool loadData();
    bool saveData();
    
    void start(int port = 3001);
    void stop();
};

#endif