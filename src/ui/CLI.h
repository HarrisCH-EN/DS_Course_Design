#ifndef CLI_H
#define CLI_H

#include "../graph/Graph.h"
#include <string>

class CLI {
private:
    Graph graph;
    std::string cityFile;
    std::string routeFile;

    void displayMenu();
    void addCityMenu();
    void removeCityMenu();
    void updateCityMenu();
    void addRouteMenu();
    void removeRouteMenu();
    void displayAllMenu();
    void checkConnectivityMenu();
    void makeConnectedMenu();
    void shortestPathMenu();
    void tspMenu();
    void steinerTreeMenu();
    void saveDataMenu();
    void loadDataMenu();

public:
    CLI(const std::string& cityFile = "data/cities.json",
        const std::string& routeFile = "data/routes.json");

    void run();
};

#endif
