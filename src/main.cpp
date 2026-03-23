#include "ui/CLI.h"
#include "ApiServer.h"
#include <windows.h>
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    SetConsoleOutputCP(CP_UTF8);
    
    // Check for --server flag
    bool startServer = false;
    int port = 3001;
    std::string dataDir = "data";  // Default data directory
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--server") {
            startServer = true;
        } else if (arg == "--port" && i + 1 < argc) {
            port = std::stoi(argv[++i]);
        } else if (arg == "--data" && i + 1 < argc) {
            dataDir = argv[++i];
        }
    }
    
    if (startServer) {
        std::cout << "Starting API Server on port " << port << "..." << std::endl;
        std::cout << "Data directory: " << dataDir << std::endl;
        ApiServer server(dataDir);
        
        std::cout << "Loading data..." << std::endl;
        if (!server.loadData()) {
            std::cout << "Warning: Could not load data files. Starting with empty graph." << std::endl;
        } else {
            std::cout << "Data loaded successfully." << std::endl;
        }
        
        std::cout << "Server starting..." << std::endl;
        server.start(port);
        std::cout << "Server stopped." << std::endl;
    } else {
        CLI cli;
        cli.run();
    }
    
    return 0;
}