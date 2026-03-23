import React, { useState, useRef, useEffect } from 'react';
import { City, Route } from '../types';

interface Props {
  cities: City[];
  routes: Route[];
  highlightedRoutes?: { source: string; target: string; color?: string; dashed?: boolean }[];
  highlightedCities?: { id: string; color?: string; className?: string }[];
  disableAutoZoom?: boolean;  // 是否禁用自动缩放
  disablePopup?: boolean;  // 是否禁用弹出框
  showCoords?: boolean;  // 是否显示鼠标坐标
  onCityClick?: (city: City) => void;
  onRouteClick?: (route: Route) => void;
  onMapClick?: (x: number, y: number) => void;  // 点击空白处的坐标
}

export default function MapVisualizer({
  cities,
  routes,
  highlightedRoutes = [],
  highlightedCities = [],
  disableAutoZoom = false,
  disablePopup = false,
  showCoords = false,
  onCityClick,
  onRouteClick,
  onMapClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCity, setHoveredCity] = useState<City | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<Route | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  // 鼠标在地图上的数据坐标
  const [mouseDataCoord, setMouseDataCoord] = useState<{ x: number; y: number } | null>(null);
  const [mouseScreenPos, setMouseScreenPos] = useState({ x: 0, y: 0 });
  // 锁定状态 - 点击固定显示
  const [lockedCity, setLockedCity] = useState<City | null>(null);
  const [lockedRoute, setLockedRoute] = useState<Route | null>(null);

  // X坐标压缩比例（使地图比例更接近真实地理）
  const xScale = 0.12;

  // Center map on initial load
  useEffect(() => {
    if (cities.length === 0 || !svgRef.current) return;
    const padding = 50;
    
    // 反转y坐标（地理坐标y向上为正，SVG坐标y向下为正）
    // 压缩x坐标使比例更合理
    const yValues = cities.map(c => -c.y);
    const xValues = cities.map(c => c.x * xScale);
    
    const minX = Math.min(...xValues) - padding;
    const maxX = Math.max(...xValues) + padding;
    const minY = Math.min(...yValues) - padding;
    const maxY = Math.max(...yValues) + padding;
    const contentWidth = Math.max(maxX - minX, 100);
    const contentHeight = Math.max(maxY - minY, 100);

    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / contentWidth;
    const scaleY = svgRect.height / contentHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setTransform({
      x: svgRect.width / 2 - cx * scale,
      y: svgRect.height / 2 - cy * scale,
      scale: scale
    });
  }, [cities.length]); // Only re-center when city count changes

  // 监听高亮城市变化，自动缩放（未禁用时）
  const prevHighlightedCitiesRef = useRef<string[]>([]);
  useEffect(() => {
    if (disableAutoZoom) return;
    const currentIds = highlightedCities.map(h => h.id).join(',');
    const prevIds = prevHighlightedCitiesRef.current.join(',');

    if (currentIds !== prevIds && highlightedCities.length > 0 && highlightedCities[0]) {
      const city = cities.find(c => c.id === highlightedCities[0].id);
      if (city) {
        setTimeout(() => autoZoomToCity(city), 100);
      }
    }
    prevHighlightedCitiesRef.current = highlightedCities.map(h => h.id);
  }, [highlightedCities, disableAutoZoom, cities]);

  // 监听高亮线路变化，自动缩放（未禁用时）
  const prevHighlightedRoutesRef = useRef<string[]>([]);
  useEffect(() => {
    if (disableAutoZoom) return;
    const currentIds = highlightedRoutes.map(h => `${h.source}-${h.target}`).join(',');
    const prevIds = prevHighlightedRoutesRef.current.join(',');

    if (currentIds !== prevIds && highlightedRoutes.length > 0 && highlightedRoutes[0]) {
      const route: Route = {
        id: `hr-0`,
        source: highlightedRoutes[0].source,
        target: highlightedRoutes[0].target,
        type: highlightedRoutes[0].color === '#9333ea' ? 'trunk' : 'normal'
      };
      setTimeout(() => autoZoomToRoute(route), 100);
    }
    prevHighlightedRoutesRef.current = highlightedRoutes.map(h => `${h.source}-${h.target}`);
  }, [highlightedRoutes, disableAutoZoom, cities]);

  if (cities.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">暂无数据</div>;
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.max(0.1, Math.min(transform.scale * Math.exp(delta), 10));
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new translation to zoom towards mouse cursor
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // 拖拽地图
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // 更新悬浮框位置
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        setHoverPosition({ x: screenX, y: screenY });
        setMouseScreenPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

        // 计算鼠标所在的数据坐标
        if (showCoords) {
          const dataX = Math.round((screenX - transform.x) / (xScale * transform.scale));
          const dataY = Math.round(-(screenY - transform.y) / transform.scale);
          setMouseDataCoord({ x: dataX, y: dataY });
        }
      }
    }
  };

  const handleMouseLeave = () => {
    setMouseDataCoord(null);
    setHoveredCity(null);
    setHoveredRoute(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newScale = Math.min(transform.scale * 1.2, 10);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newX = cx - (cx - transform.x) * (newScale / transform.scale);
    const newY = cy - (cy - transform.y) * (newScale / transform.scale);
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleReset = () => {
    if (cities.length === 0 || !svgRef.current) return;
    const padding = 50;
    const minX = Math.min(...cities.map(c => c.x)) - padding;
    const maxX = Math.max(...cities.map(c => c.x)) + padding;
    const minY = Math.min(...cities.map(c => c.y)) - padding;
    const maxY = Math.max(...cities.map(c => c.y)) + padding;
    const contentWidth = Math.max(maxX - minX, 100);
    const contentHeight = Math.max(maxY - minY, 100);
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / contentWidth;
    const scaleY = svgRect.height / contentHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    setTransform({
      x: svgRect.width / 2 - cx * scale,
      y: svgRect.height / 2 - cy * scale,
      scale: scale
    });
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newScale = Math.max(transform.scale / 1.2, 0.1);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newX = cx - (cx - transform.x) * (newScale / transform.scale);
    const newY = cy - (cy - transform.y) * (newScale / transform.scale);
    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // 城市鼠标进入
  const handleCityMouseEnter = (e: React.MouseEvent, city: City) => {
    if (isDragging) return;
    e.stopPropagation();
    setHoveredCity(city);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 城市鼠标离开
  const handleCityMouseLeave = () => {
    setHoveredCity(null);
  };

  // 线路鼠标进入
  const handleRouteMouseEnter = (e: React.MouseEvent, route: Route) => {
    if (isDragging) return;
    e.stopPropagation();
    setHoveredRoute(route);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 线路鼠标离开
  const handleRouteMouseLeave = () => {
    setHoveredRoute(null);
  };

  // 自动缩放到合适的级别以显示城市及其标签
  const autoZoomToCity = (city: City) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const screenX = city.x * xScale * transform.scale + transform.x;
    const screenY = -city.y * transform.scale + transform.y;

    // 目标：城市标签清晰可见（字体至少 12px 屏幕尺寸）
    const desiredFontSize = 12; // 屏幕像素
    const currentFontSize = fontSizeScreen / transform.scale;

    // 如果当前字体已经足够大，不需要缩放
    if (currentFontSize >= desiredFontSize) return;

    // 计算需要的缩放比例
    const scaleFactor = desiredFontSize / currentFontSize;
    const newScale = Math.min(transform.scale * scaleFactor, 10); // 最大缩放限制

    // 计算新的平移，使城市保持在屏幕中心附近
    const targetX = rect.width / 2 - city.x * xScale * newScale;
    const targetY = rect.height / 2 - (-city.y) * newScale;

    // 平滑动画过渡
    const duration = 500; // ms
    const startTime = performance.now();
    const startTransform = { ...transform };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // 使用缓动函数
      const eased = 1 - Math.pow(1 - progress, 3);

      setTransform({
        x: startTransform.x + (targetX - startTransform.x) * eased,
        y: startTransform.y + (targetY - startTransform.y) * eased,
        scale: startTransform.scale + (newScale - startTransform.scale) * eased
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  // 自动缩放到合适的级别以显示线路（居中和尺寸适配）
  const autoZoomToRoute = (route: Route) => {
    if (!svgRef.current) return;

    const c1 = cities.find(c => c.id === route.source);
    const c2 = cities.find(c => c.id === route.target);
    if (!c1 || !c2) return;

    const rect = svgRef.current.getBoundingClientRect();

    // 目标：线路长度在 120-180px 之间（最佳可视范围）
    const minLength = 120;
    const maxLength = 180;
    const targetLength = (minLength + maxLength) / 2; // 150px

    // 计算当前线路的逻辑长度（世界坐标）
    const logicalDx = (c2.x - c1.x) * xScale;
    const logicalDy = c2.y - c1.y;
    const LogicalLength = Math.sqrt(logicalDx * logicalDx + logicalDy * logicalDy);

    // 计算当前的屏幕长度
    const screenX1 = c1.x * xScale * transform.scale + transform.x;
    const screenY1 = -c1.y * transform.scale + transform.y;
    const screenX2 = c2.x * xScale * transform.scale + transform.x;
    const screenY2 = -c2.y * transform.scale + transform.y;
    const currentLength = Math.sqrt(Math.pow(screenX2 - screenX1, 2) + Math.pow(screenY2 - screenY1, 2));

    // 计算需要的缩放比例
    let newScale = transform.scale;
    if (currentLength < minLength) {
      // 太短，放大
      const scaleFactor = targetLength / currentLength;
      newScale = Math.min(transform.scale * scaleFactor, 10);
    } else if (currentLength > maxLength) {
      // 太长，缩小
      const scaleFactor = targetLength / currentLength;
      newScale = Math.max(transform.scale * scaleFactor, 0.5);
    } else {
      // 长度合适，只居中，不改变缩放
      newScale = transform.scale;
    }

    // 计算线路中点，将其居中到屏幕中心
    const midX = (c1.x + c2.x) / 2 * xScale;
    const midY = (c1.y + c2.y) / 2;
    const targetX = rect.width / 2 - midX * newScale;
    const targetY = rect.height / 2 - (-midY) * newScale;

    // 平滑动画过渡
    const duration = 500;
    const startTime = performance.now();
    const startTransform = { ...transform };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setTransform({
        x: startTransform.x + (targetX - startTransform.x) * eased,
        y: startTransform.y + (targetY - startTransform.y) * eased,
        scale: startTransform.scale + (newScale - startTransform.scale) * eased
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const width = 1000; // Base reference width for stroke sizing

  // Calculate visible labels to avoid overlap
  const fontSizeScreen = 14;
  const fontSize = fontSizeScreen / transform.scale;

  // 固定节点大小：统一 5px，不随缩放变化
  const radius = 5 / transform.scale;
  // 省会/直辖市半径稍大（6px），但保持统一小圆点风格
  const keyCityRadius = 6 / transform.scale;

  const visibleLabels = new Set<string>();
  const boxes: { left: number, right: number, top: number, bottom: number }[] = [];

  // Add all icons to boxes to prevent text from overlapping icons
  for (const c of cities) {
    const screenX = c.x * xScale * transform.scale + transform.x;
    const screenY = -c.y * transform.scale + transform.y;
    // 判断是否为省会/直辖市
    const desc = c.description || "";
    const isKeyCity = desc.includes('省会') || desc.includes('直辖市');
    const cityRadius = isKeyCity ? keyCityRadius : radius;
    const screenRadius = cityRadius * transform.scale; // This is the actual size on screen

    boxes.push({
      left: screenX - screenRadius,
      right: screenX + screenRadius,
      top: screenY - screenRadius,
      bottom: screenY + screenRadius
    });
  }

  const sortedCities = [...cities].sort((a, b) => {
    const aHigh = highlightedCities.some(hc => hc.id === a.id) ? 1 : 0;
    const bHigh = highlightedCities.some(hc => hc.id === b.id) ? 1 : 0;
    return bHigh - aHigh;
  });

  for (const c of sortedCities) {
    const screenX = c.x * xScale * transform.scale + transform.x;
    const screenY = -c.y * transform.scale + transform.y;
    // 判断是否为省会/直辖市
    const desc = c.description || "";
    const isKeyCity = desc.includes('省会') || desc.includes('直辖市');
    const cityRadius = isKeyCity ? keyCityRadius : radius;
    const screenRadius = cityRadius * transform.scale;

    // Approximate text dimensions on screen
    const textWidthScreen = c.name.length * fontSizeScreen * 1.1;
    const textHeightScreen = fontSizeScreen * 1.2;

    const textScreenY = screenY - screenRadius - 4; // 4px gap
    
    const padding = 2;
    const box = {
      left: screenX - textWidthScreen / 2 - padding,
      right: screenX + textWidthScreen / 2 + padding,
      top: textScreenY - textHeightScreen - padding,
      bottom: textScreenY + padding
    };
    
    let collision = false;
    for (const b of boxes) {
      if (!(box.right < b.left || box.left > b.right || box.bottom < b.top || box.top > b.bottom)) {
        collision = true;
        break;
      }
    }
    
    if (!collision) {
      visibleLabels.add(c.id);
      boxes.push(box);
    }
  }

  // 点击空白处清除锁定，并返回坐标
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 如果点击的是城市或线路（有 stopPropagation），不会到达这里
    setLockedCity(null);
    setLockedRoute(null);

    if (onMapClick && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const dataX = Math.round((screenX - transform.x) / (xScale * transform.scale));
      const dataY = Math.round(-(screenY - transform.y) / transform.scale);
      onMapClick(dataX, dataY);
    }
  };

  // 获取当前显示的信息（锁定时只显示锁定内容，否则显示悬停）
  const isLocked = lockedCity !== null || lockedRoute !== null;
  const displayedCity = isLocked ? lockedCity : hoveredCity;
  const displayedRoute = isLocked ? lockedRoute : hoveredRoute;

  // 构建高亮路线快速查找表（双向）
  const highlightedRouteMap = new Map<string, string>();
  highlightedRoutes.forEach(hr => {
    highlightedRouteMap.set(`${hr.source}-${hr.target}`, hr.color || 'var(--color-primary)');
    highlightedRouteMap.set(`${hr.target}-${hr.source}`, hr.color || 'var(--color-primary)');
  });

  // 动态计算文本框位置 - 始终在点/线的右侧
  const getDisplayedPosition = () => {
    if (lockedCity) {
      // 城市：计算当前屏幕坐标（使用xScale和-y变换）
      return {
        x: lockedCity.x * xScale * transform.scale + transform.x,
        y: -lockedCity.y * transform.scale + transform.y
      };
    }
    if (lockedRoute) {
      // 线路：计算中点的屏幕坐标（使用xScale和-y变换）
      const c1 = cities.find(c => c.id === lockedRoute.source);
      const c2 = cities.find(c => c.id === lockedRoute.target);
      if (c1 && c2) {
        return {
          x: ((c1.x + c2.x) / 2) * xScale * transform.scale + transform.x,
          y: (-(c1.y + c2.y) / 2) * transform.scale + transform.y
        };
      }
    }
    // 悬停状态：跟随鼠标
    return hoverPosition;
  };
  const displayedPosition = getDisplayedPosition();

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-800" onClick={handleBackgroundClick}>
      <svg
        ref={svgRef}
        className={`w-full h-full ${isDragging ? 'cursor-crosshair' : 'cursor-crosshair'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Base Routes */}
          {routes.map(r => {
            const c1 = cities.find(c => c.id === r.source);
            const c2 = cities.find(c => c.id === r.target);
            if (!c1 || !c2) return null;
            // 颜色逻辑：
            // 1. 如果路线在highlightedRoutes中，使用其指定的颜色（或默认颜色）
            // 2. 否则，如果存在高亮路线（即有动画），显示为浅灰色
            // 3. 否则，根据线路类型显示原本颜色
            const routeKey = `${r.source}-${r.target}`;
            const reverseKey = `${r.target}-${r.source}`;
            const isHighlighted = highlightedRouteMap.has(routeKey) || highlightedRouteMap.has(reverseKey);
            const defaultColor = r.type === 'trunk' ? '#9333ea' : (r.type === 'normal' ? 'var(--color-primary)' : '#cbd5e1');
            const strokeColor = isHighlighted
              ? (highlightedRouteMap.get(routeKey) || highlightedRouteMap.get(reverseKey) || defaultColor)
              : (highlightedRoutes.length > 0 ? '#cbd5e1' : defaultColor); // 有高亮时，非高亮路线变灰色
            // 如果这条路线已经在 highlightedRoutes 中，交给后面的 Highlighted Routes 渲染，避免重复
            if (isHighlighted) {
              return null;
            }
            const isHovered = hoveredRoute?.id === r.id || lockedRoute?.id === r.id;
            return (
              <line
                key={r.id}
                x1={c1.x * xScale} y1={-c1.y} x2={c2.x * xScale} y2={-c2.y}
                stroke={isHovered ? '#ff886f' : strokeColor}
                strokeWidth={isHovered ? Math.max(2, width/200) / transform.scale : Math.max(0.5, width/400) / transform.scale}
                strokeLinecap="round"
                onMouseEnter={(e) => handleRouteMouseEnter(e, r)}
                onMouseLeave={handleRouteMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  setLockedRoute(r);
                  setLockedCity(null);
                  onRouteClick?.(r);
                  autoZoomToRoute(r);
                }}
                style={{
                  transition: 'stroke 0.2s, stroke-width 0.2s'
                }}
              />
            );
          })}

          {/* Highlighted Routes */}
          {highlightedRoutes.map((hr, idx) => {
            const c1 = cities.find(c => c.id === hr.source);
            const c2 = cities.find(c => c.id === hr.target);
            if (!c1 || !c2) return null;
            // 高亮线路也被视为特殊类型
            const pseudoRoute: Route = {
              id: `hr-${idx}`,
              source: hr.source,
              target: hr.target,
              type: hr.color === '#9333ea' ? 'trunk' : 'normal'
            };
            const isHovered = hoveredRoute?.id === pseudoRoute.id || lockedRoute?.id === pseudoRoute.id;
            return (
              <line
                key={`hr-${hr.source}-${hr.target}`}
                x1={c1.x * xScale} y1={-c1.y} x2={c2.x * xScale} y2={-c2.y}
                stroke={isHovered ? '#ff886f' : (hr.color || "var(--color-primary)")}
                strokeWidth={isHovered ? Math.max(2, width/250) / transform.scale : Math.max(1, width/300) / transform.scale}
                strokeDasharray={hr.dashed ? `${8/transform.scale},${4/transform.scale}` : "none"}
                strokeLinecap="round"
                onMouseEnter={(e) => handleRouteMouseEnter(e, pseudoRoute)}
                onMouseLeave={handleRouteMouseLeave}
                onClick={() => {
                  onRouteClick?.(pseudoRoute);
                  // 使用高亮线路的source和target字段进行缩放
                  autoZoomToRoute(pseudoRoute);
                }}
                style={{
                  transition: 'stroke 0.2s, stroke-width 0.2s',
                  cursor: 'pointer'
                }}
              />
            );
          })}

          {/* Cities */}
          {cities.map(c => {
            const highlight = highlightedCities.find(hc => hc.id === c.id);
            // 高亮时使用指定颜色，否则使用浅灰色 var(--color-primary)
            const fillColor = highlight ? (highlight.color || "#ff886f") : "var(--color-primary)";
            const className = highlight?.className || "";
            const showLabel = visibleLabels.has(c.id);

            // 判断是否为省会/直辖市（描述中包含"省会"或"直辖市"）
            const desc = c.description || "";
            const isKeyCity = desc.includes('省会') || desc.includes('直辖市');
            const cityRadius = isKeyCity ? keyCityRadius : radius;

            // 省会/直辖市不透明，其他城市半透明
            const opacity = highlight ? 1 : (isKeyCity ? 1 : 0.4);

            // 判断是否被鼠标悬停或锁定
            const isHovered = hoveredCity?.id === c.id || lockedCity?.id === c.id;
            const hoverFillColor = isHovered ? '#ff886f' : fillColor;
            const hoverStrokeColor = isHovered ? '#fff' : '#fff';
            const hoverStrokeWidth = isHovered ? cityRadius / 2 : cityRadius / 4;
            const hoverRadius = isHovered ? cityRadius * 1.3 : cityRadius;

            return (
              <g key={c.id}>
                <circle
                  cx={c.x * xScale} cy={-c.y} r={hoverRadius}
                  fill={hoverFillColor}
                  stroke={hoverStrokeColor}
                  strokeWidth={hoverStrokeWidth}
                  className={className}
                style={{
                  transformOrigin: 'center',
                  transformBox: 'fill-box',
                  opacity: isHovered ? 1 : opacity,
                  transition: 'r 0.2s, fill 0.2s, stroke 0.2s',
                  cursor: 'pointer'
                }}
                  onMouseEnter={(e) => handleCityMouseEnter(e, c)}
                  onMouseLeave={handleCityMouseLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disablePopup) {
                      setLockedCity(c);
                      setLockedRoute(null);
                    }
                    onCityClick?.(c);
                  }}
                />
                {showLabel && (
                  <text
                    x={c.x * xScale}
                    y={-c.y - hoverRadius - 4/transform.scale}
                    fontSize={fontSize}
                    fill={isHovered ? '#ff886f' : "#475569"}
                    textAnchor="middle"
                    fontWeight={isHovered ? 'bold' : 'bold'}
                    className="dark:fill-slate-300 pointer-events-none"
                    style={{
                      transition: 'fill 0.2s'
                    }}
                  >
                    {c.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

      </svg>

      {/* 悬浮信息框 - 锁定时固定，悬停时跟随鼠标 */}
      {displayedCity && (
        <div
          className="absolute z-50 pointer-events-none select-none"
          style={{
            left: displayedPosition.x + 12,
            top: displayedPosition.y - 10,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            boxShadow: isLocked
              ? '0 8px 32px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
              : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: isLocked
              ? '2px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(226, 232, 240, 0.8)',
            padding: '12px 16px',
            minWidth: '180px',
            maxWidth: '220px'
          }}>
            <div>
              {/* 城市标题 */}
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ff886f',
                  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)'
                }}></span>
                {displayedCity.name}
              </div>
              {/* 城市详细信息 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>坐标</span>
                  <span style={{ fontFamily: 'SF Mono, Monaco, monospace', color: '#475569', fontSize: '11px' }}>
                    ({displayedCity.x}, {displayedCity.y})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>类型</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: displayedCity.description?.includes('省会') || displayedCity.description?.includes('直辖市')
                      ? '#dbeafe' : '#dcfce7',
                    color: displayedCity.description?.includes('省会') || displayedCity.description?.includes('直辖市')
                      ? '#1d4ed8' : '#16a34a'
                  }}>
                    {displayedCity.description?.includes('省会') || displayedCity.description?.includes('直辖市')
                      ? '省会/直辖市' : '地级市'}
                  </span>
                </div>
                {displayedCity.description && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>描述</span>
                    <span style={{
                      color: '#475569',
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {displayedCity.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {displayedRoute && (() => {
        const c1 = cities.find(c => c.id === displayedRoute.source);
        const c2 = cities.find(c => c.id === displayedRoute.target);
        const distance = c1 && c2
          ? Math.round(Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2)))
          : 0;
        return (
          <div
            className="absolute z-50 pointer-events-none select-none"
            style={{
              left: displayedPosition.x + 12,
              top: displayedPosition.y - 10,
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '12px',
              boxShadow: isLocked
                ? '0 8px 32px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)'
                : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
              border: isLocked
                ? '2px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(226, 232, 240, 0.8)',
              padding: '12px 16px',
              minWidth: '180px',
              maxWidth: '220px'
            }}>
              <div>
                {/* 线路标题 */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ff886f',
                    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)'
                  }}></span>
                  {c1?.name || '未知'}
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>→</span>
                  {c2?.name || '未知'}
                </div>
                {/* 线路详细信息 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>距离</span>
                    <span style={{ fontFamily: 'SF Mono, Monaco, monospace', color: '#475569', fontSize: '11px' }}>
                      {distance} km
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8' }}>类型</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: displayedRoute.type === 'trunk' ? '#faf5ff' : '#dbeafe',
                      color: displayedRoute.type === 'trunk' ? '#9333ea' : '#1d4ed8'
                    }}>
                      {displayedRoute.type === 'trunk' ? '主干' : '普通'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 悬浮提示动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* 坐标跟随提示 */}
      {showCoords && mouseDataCoord && !isDragging && !hoveredCity && !hoveredRoute && (
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: mouseScreenPos.x + 16,
            top: mouseScreenPos.y - 8,
          }}
        >
          <div className="bg-slate-900/90 backdrop-blur text-white text-[11px] font-mono px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            <span className="text-slate-400">X:</span> {mouseDataCoord.x}
            <span className="text-slate-500 mx-1.5">|</span>
            <span className="text-slate-400">Y:</span> {mouseDataCoord.y}
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="bg-white dark:bg-slate-700 p-2 rounded shadow hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-200" title="放大">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>
        <button onClick={handleZoomOut} className="bg-white dark:bg-slate-700 p-2 rounded shadow hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-200" title="缩小">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6"></path></svg>
        </button>
        <button onClick={handleReset} className="bg-white dark:bg-slate-700 p-2 rounded shadow hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-200" title="复位视图">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        </button>
      </div>
    </div>
  );
}
