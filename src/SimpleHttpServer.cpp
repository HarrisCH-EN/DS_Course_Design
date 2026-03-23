#include "SimpleHttpServer.h"
#include <iostream>
#include <sstream>
#include <thread>
#include <algorithm>

SimpleHttpServer::SimpleHttpServer(int port) : port(port), running(false), serverSocket(INVALID_SOCKET) {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
}

SimpleHttpServer::~SimpleHttpServer() {
    stop();
    WSACleanup();
}

void SimpleHttpServer::Get(const std::string& path, std::function<std::string(const std::string&)> handler) {
    getHandlers[path] = handler;
}

void SimpleHttpServer::Post(const std::string& path, std::function<std::string(const std::string&)> handler) {
    postHandlers[path] = handler;
}

void SimpleHttpServer::Delete(const std::string& path, std::function<std::string(const std::string&)> handler) {
    deleteHandlers[path] = handler;
}

std::string SimpleHttpServer::parseRequest(const std::string& request, std::string& method, std::string& path, std::string& body) {
    std::istringstream stream(request);
    std::string line;
    
    // Parse first line
    if (std::getline(stream, line)) {
        std::istringstream firstLine(line);
        std::string version;
        firstLine >> method >> path >> version;
    }
    
    // Find body
    size_t bodyStart = request.find("\r\n\r\n");
    if (bodyStart != std::string::npos) {
        body = request.substr(bodyStart + 4);
    }
    
    return "";
}

std::string SimpleHttpServer::buildResponse(int statusCode, const std::string& contentType, const std::string& body) {
    std::string statusText;
    switch (statusCode) {
        case 200: statusText = "OK"; break;
        case 404: statusText = "Not Found"; break;
        case 400: statusText = "Bad Request"; break;
        case 500: statusText = "Internal Server Error"; break;
        default: statusText = "Unknown"; break;
    }
    
    std::ostringstream response;
    response << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
    response << "Content-Type: " << contentType << "; charset=utf-8\r\n";
    response << "Content-Length: " << body.length() << "\r\n";
    response << "Access-Control-Allow-Origin: *\r\n";
    response << "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n";
    response << "Access-Control-Allow-Headers: Content-Type\r\n";
    response << "Connection: close\r\n";
    response << "\r\n";
    response << body;
    
    return response.str();
}

void SimpleHttpServer::handleClient(SOCKET clientSocket) {
    // 使用更大的 buffer 并支持循环读取完整请求
    char buffer[65536];
    std::string request;
    
    // 第一次读取，获取 headers
    int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
    if (bytesReceived <= 0) {
        closesocket(clientSocket);
        return;
    }
    buffer[bytesReceived] = '\0';
    request = buffer;
    
    // 检查 Content-Length，继续读取剩余 body
    size_t headerEnd = request.find("\r\n\r\n");
    if (headerEnd != std::string::npos) {
        // 查找 Content-Length
        int contentLength = 0;
        size_t clPos = request.find("Content-Length: ");
        if (clPos == std::string::npos) clPos = request.find("content-length: ");
        if (clPos != std::string::npos) {
            size_t clStart = request.find(":", clPos) + 1;
            while (clStart < request.length() && request[clStart] == ' ') clStart++;
            size_t clEnd = request.find("\r\n", clStart);
            if (clEnd != std::string::npos) {
                contentLength = std::stoi(request.substr(clStart, clEnd - clStart));
            }
        }
        
        // 计算已接收的 body 长度
        int bodyReceived = (int)request.length() - (int)headerEnd - 4;
        
        // 继续读取剩余的 body
        while (bodyReceived < contentLength) {
            int remaining = contentLength - bodyReceived;
            int toRead = std::min(remaining, (int)sizeof(buffer) - 1);
            bytesReceived = recv(clientSocket, buffer, toRead, 0);
            if (bytesReceived <= 0) break;
            buffer[bytesReceived] = '\0';
            request += buffer;
            bodyReceived += bytesReceived;
        }
    }
    
    std::string method, path, body;
    parseRequest(request, method, path, body);
    
    std::string response;
        
        // Handle CORS preflight
        if (method == "OPTIONS") {
            response = buildResponse(200, "text/plain", "");
        }
        // Handle GET requests
        else if (method == "GET") {
            auto it = getHandlers.find(path);
            if (it != getHandlers.end()) {
                try {
                    std::string result = it->second(body);
                    response = buildResponse(200, "application/json", result);
                } catch (...) {
                    response = buildResponse(500, "application/json", "{\"error\":\"Internal server error\"}");
                }
            } else {
                // Try to find handler with path parameters
                bool found = false;
                for (const auto& handler : getHandlers) {
                    std::string pattern = handler.first;
                    if (pattern.find(":") != std::string::npos) {
                        // Simple pattern matching for /api/analyze/shortest-path/:sourceId
                        std::string basePattern = pattern.substr(0, pattern.find(":"));
                        if (path.find(basePattern) == 0) {
                            try {
                                std::string result = handler.second(path);
                                response = buildResponse(200, "application/json", result);
                                found = true;
                                break;
                            } catch (...) {
                                response = buildResponse(500, "application/json", "{\"error\":\"Internal server error\"}");
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (!found) {
                    response = buildResponse(404, "application/json", "{\"error\":\"Not found\"}");
                }
            }
        }
        // Handle POST requests
        else if (method == "POST") {
            auto it = postHandlers.find(path);
            if (it != postHandlers.end()) {
                try {
                    std::string result = it->second(body);
                    response = buildResponse(200, "application/json", result);
                } catch (...) {
                    response = buildResponse(500, "application/json", "{\"error\":\"Internal server error\"}");
                }
            } else {
                response = buildResponse(404, "application/json", "{\"error\":\"Not found\"}");
            }
        }
        // Handle DELETE requests
        else if (method == "DELETE") {
            auto it = deleteHandlers.find(path);
            if (it != deleteHandlers.end()) {
                try {
                    std::string result = it->second(path);
                    response = buildResponse(200, "application/json", result);
                } catch (...) {
                    response = buildResponse(500, "application/json", "{\"error\":\"Internal server error\"}");
                }
            } else {
                // Try to find handler with path parameters
                bool found = false;
                for (const auto& handler : deleteHandlers) {
                    std::string pattern = handler.first;
                    if (pattern.find(":") != std::string::npos) {
                        std::string basePattern = pattern.substr(0, pattern.find(":"));
                        if (path.find(basePattern) == 0) {
                            try {
                                std::string result = handler.second(path);
                                response = buildResponse(200, "application/json", result);
                                found = true;
                                break;
                            } catch (...) {
                                response = buildResponse(500, "application/json", "{\"error\":\"Internal server error\"}");
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (!found) {
                    response = buildResponse(404, "application/json", "{\"error\":\"Not found\"}");
                }
            }
        }
        else {
            response = buildResponse(400, "application/json", "{\"error\":\"Bad request\"}");
        }
        
        send(clientSocket, response.c_str(), response.length(), 0);
    
    closesocket(clientSocket);
}

bool SimpleHttpServer::start() {
    serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Failed to create socket" << std::endl;
        return false;
    }
    
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);
    
    if (bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Failed to bind to port " << port << std::endl;
        closesocket(serverSocket);
        return false;
    }
    
    if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Failed to listen on socket" << std::endl;
        closesocket(serverSocket);
        return false;
    }
    
    running = true;
    std::cout << "Server listening on port " << port << std::endl;
    
    while (running) {
        sockaddr_in clientAddr;
        int clientAddrSize = sizeof(clientAddr);
        SOCKET clientSocket = accept(serverSocket, (sockaddr*)&clientAddr, &clientAddrSize);
        
        if (clientSocket != INVALID_SOCKET) {
            std::thread([this, clientSocket]() {
                handleClient(clientSocket);
            }).detach();
        }
    }
    
    return true;
}

void SimpleHttpServer::stop() {
    running = false;
    if (serverSocket != INVALID_SOCKET) {
        closesocket(serverSocket);
        serverSocket = INVALID_SOCKET;
    }
}