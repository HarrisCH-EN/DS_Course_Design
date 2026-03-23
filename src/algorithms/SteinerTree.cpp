#include "SteinerTree.h"
#include "MST.h"
#include <cmath>
#include <algorithm>
#include <numeric>
#include <set>

SteinerTree::FermatResult SteinerTree::computeFermatPoint(
    double ax, double ay, double bx, double by, double cx, double cy) {
    
    // Edge lengths
    double a = std::sqrt((cx - bx) * (cx - bx) + (cy - by) * (cy - by));
    double b = std::sqrt((cx - ax) * (cx - ax) + (cy - ay) * (cy - ay));
    double c = std::sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
    
    // Cosine of each angle using law of cosines
    double cosA = (b * b + c * c - a * a) / (2.0 * b * c);
    double cosB = (a * a + c * c - b * b) / (2.0 * a * c);
    double cosC = (a * a + b * b - c * c) / (2.0 * a * b);
    
    // If any angle >= 120 degrees, Fermat point is that vertex
    if (cosA <= -0.5) return {ax, ay, true};
    if (cosB <= -0.5) return {bx, by, true};
    if (cosC <= -0.5) return {cx, cy, true};
    
    // Compute Fermat point using rotation method
    const double PI = 3.14159265358979323846;
    double angle = PI / 3.0; // 60 degrees
    
    // Rotate BC around B by 60 degrees to get C'
    double cpx = bx + (cx - bx) * std::cos(angle) - (cy - by) * std::sin(angle);
    double cpy = by + (cx - bx) * std::sin(angle) + (cy - by) * std::cos(angle);
    
    // Fermat point is intersection of AC' and a line from B
    double denom = (ax - cpx) * (by - cpy) - (ay - cpy) * (bx - cpx);
    if (std::abs(denom) < 1e-10) {
        // Degenerate case, return centroid
        return {(ax + bx + cx) / 3.0, (ay + by + cy) / 3.0, false};
    }
    
    double t = ((ax - bx) * (ay - cpy) - (ay - by) * (ax - cpx)) / denom;
    double fx = ax + t * (cpx - ax);
    double fy = ay + t * (cpy - ay);
    
    return {fx, fy, false};
}

std::vector<Edge> SteinerTree::solve(const Graph& graph) {
    int n = graph.getCityCount();
    if (n <= 1) return {};
    
    std::vector<City> cities = graph.getAllCities();
    
    // Step 1: Compute MST on complete graph (all pairs)
    std::vector<Edge> mstEdges = MST::kruskal(graph);
    
    if (n < 3) return mstEdges;
    
    // Step 2: Try to optimize using Fermat points
    // Build adjacency from MST edges
    std::map<int, std::vector<int>> adj;
    for (const auto& e : mstEdges) {
        adj[e.from].push_back(e.to);
        adj[e.to].push_back(e.from);
    }
    
    // Find vertices with degree >= 3
    std::vector<Edge> optimizedEdges = mstEdges;
    
    for (int i = 0; i < n; i++) {
        int cityId = cities[i].id;
        if (adj[cityId].size() < 3) continue;
        
        // Take 3 neighbors
        int n1 = adj[cityId][0];
        int n2 = adj[cityId][1];
        int n3 = adj[cityId][2];
        
        const City* c1 = graph.getCityById(n1);
        const City* c2 = graph.getCityById(n2);
        const City* c3 = graph.getCityById(n3);
        if (!c1 || !c2 || !c3) continue;
        
        // Compute Fermat point of triangle (n1, n2, n3)
        FermatResult fermat = computeFermatPoint(
            c1->x, c1->y, c2->x, c2->y, c3->x, c3->y);
        
        if (fermat.isVertex) continue; // Fermat point is a vertex, no optimization
        
        // Calculate new weight: connect Fermat point to n1, n2, n3
        double d1 = std::sqrt((fermat.x - c1->x) * (fermat.x - c1->x) + 
                              (fermat.y - c1->y) * (fermat.y - c1->y));
        double d2 = std::sqrt((fermat.x - c2->x) * (fermat.x - c2->x) + 
                              (fermat.y - c2->y) * (fermat.y - c2->y));
        double d3 = std::sqrt((fermat.x - c3->x) * (fermat.x - c3->x) + 
                              (fermat.y - c3->y) * (fermat.y - c3->y));
        double newWeight = d1 + d2 + d3;
        
        // Calculate old weight: edges from cityId to n1, n2, n3
        double oldWeight = 0;
        for (const auto& e : optimizedEdges) {
            if ((e.from == cityId && (e.to == n1 || e.to == n2 || e.to == n3)) ||
                (e.to == cityId && (e.from == n1 || e.from == n2 || e.from == n3))) {
                oldWeight += e.length;
            }
        }
        
        if (newWeight < oldWeight) {
            // Replace edges: remove cityId-n1, cityId-n2, cityId-n3
            // Add Fermat-n1, Fermat-n2, Fermat-n3
            // Also keep cityId connected to remaining neighbors
            std::vector<Edge> newEdges;
            for (const auto& e : optimizedEdges) {
                bool isReplaced = false;
                if ((e.from == cityId && (e.to == n1 || e.to == n2 || e.to == n3)) ||
                    (e.to == cityId && (e.from == n1 || e.from == n2 || e.from == n3))) {
                    isReplaced = true;
                }
                if (!isReplaced) {
                    newEdges.push_back(e);
                }
            }
            // Add edges from Fermat point to the 3 neighbors
            // We encode Fermat point as a special ID (negative) since we don't have real nodes
            // For simplicity, we just add the 3 edges with computed distances
            int fermatId = -(int)newEdges.size() - 1; // Temporary negative ID
            newEdges.push_back(Edge(n1, fermatId, (int)std::round(d1)));
            newEdges.push_back(Edge(n2, fermatId, (int)std::round(d2)));
            newEdges.push_back(Edge(n3, fermatId, (int)std::round(d3)));
            
            // Reconnect cityId to its other neighbors through the closest neighbor
            // (skip for now, just keep the optimized edges)
            
            // Check if we still span all cities
            // Count unique non-negative city IDs in edges
            std::set<int> spannedCities;
            for (const auto& e : newEdges) {
                if (e.from > 0) spannedCities.insert(e.from);
                if (e.to > 0) spannedCities.insert(e.to);
            }
            
            if ((int)spannedCities.size() == n) {
                optimizedEdges = newEdges;
            }
        }
    }
    
    return optimizedEdges;
}

int SteinerTree::getTotalLength(const std::vector<Edge>& edges) {
    return MST::getTotalWeight(edges);
}
