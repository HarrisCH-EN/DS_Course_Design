#ifndef CITY_H
#define CITY_H

#include <string>

struct City {
    int id;
    std::string name;
    int x;
    int y;
    std::string description;

    City() : id(0), x(0), y(0) {}
    City(int id, const std::string& name, int x, int y, const std::string& desc = "")
        : id(id), name(name), x(x), y(y), description(desc) {}
};

#endif
