import { City, Route } from './types';

export async function getData(): Promise<{ cities: City[]; routes: Route[] }> {
  const res = await fetch('/api/data');
  return res.json();
}

export async function addCity(city: Omit<City, 'id'>): Promise<City> {
  const res = await fetch('/api/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(city),
  });
  return res.json();
}

export async function deleteCity(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/cities/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function addRoute(route: Omit<Route, 'id'>): Promise<Route> {
  const res = await fetch('/api/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route),
  });
  return res.json();
}

export async function deleteRoute(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
  return res.json();
}

// 批量替换所有城市（覆盖）
export async function replaceCities(cities: Omit<City, 'id'>[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/cities/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cities),
  });
  return res.json();
}

// 批量替换所有线路（覆盖）
export async function replaceRoutes(routes: Omit<Route, 'id'>[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/routes/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(routes),
  });
  return res.json();
}

export async function analyzeConnectivity() {
  const res = await fetch('/api/analyze/connectivity');
  return res.json();
}

export async function analyzeShortestPath(sourceId: string) {
  const res = await fetch(`/api/analyze/shortest-path/${sourceId}`);
  return res.json();
}

export async function analyzeTSP(sourceId: string, mode: 'open' | 'closed' = 'open') {
  const res = await fetch(`/api/analyze/tsp/${mode}/${sourceId}`);
  return res.json();
}

export async function analyzeSteiner() {
  const res = await fetch('/api/analyze/steiner');
  return res.json();
}
