export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
}

export interface Route {
  id: string;
  source: string;
  target: string;
  type?: 'trunk' | 'normal'; // 线路类型：trunk(主干光缆) | normal(普通线路)
}
