#ifndef SIMPLE_HTTP_SERVER_H
#define SIMPLE_HTTP_SERVER_H

#include <string>
#include <functional>
#include <map>
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

class SimpleHttpServer {
private:
    SOCKET serverSocket;
    int port;
    bool running;
    
    std::map<std::string, std::function<std::string(const std::string&)>> getHandlers;
    std::map<std::string, std::function<std::string(const std::string&)>> postHandlers;
    std::map<std::string, std::function<std::string(const std::string&)>> deleteHandlers;
    
    void handleClient(SOCKET clientSocket);
    std::string parseRequest(const std::string& request, std::string& method, std::string& path, std::string& body);
    std::string buildResponse(int statusCode, const std::string& contentType, const std::string& body);
    
public:
    SimpleHttpServer(int port = 3001);
    ~SimpleHttpServer();
    
    void Get(const std::string& path, std::function<std::string(const std::string&)> handler);
    void Post(const std::string& path, std::function<std::string(const std::string&)> handler);
    void Delete(const std::string& path, std::function<std::string(const std::string&)> handler);
    
    bool start();
    void stop();
};

#endif