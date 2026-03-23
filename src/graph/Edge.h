#ifndef EDGE_H
#define EDGE_H

struct Edge {
    int from;
    int to;
    int length;

    Edge() : from(0), to(0), length(0) {}
    Edge(int from, int to, int length) : from(from), to(to), length(length) {}

    bool operator<(const Edge& other) const {
        return length < other.length;
    }
};

#endif
