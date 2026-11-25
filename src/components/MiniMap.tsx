import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { MinimapState, PaletteCategory, PlaceableType, RoadStyle } from '../types/sandbox';

interface MiniMapProps {
  getMinimapState: () => MinimapState | null;
  onNavigatePoint: (x: number, z: number) => void;
  onFocusEntity: (kind: 'npc' | 'vehicle' | 'object', id: string) => void;
  shiftLeftForRightPanel?: boolean;
}

interface HoveredTarget {
  kind: 'npc' | 'vehicle' | 'object';
  id: string;
  label: string;
  sublabel: string;
  x: number;
  z: number;
  distM: number;
}

const CATEGORY_COLORS: Record<Exclude<PaletteCategory, 'roads' | 'npcs' | 'vehicles'>, string> = {
  buildings: '#d8b48a',
  bazaar: '#df8850',
  ancient: '#c7bfb0',
  middleEarth: '#a286de',
  summer: '#4fc3d9',
  leisure: '#6bc494',
  nature: '#4c8e53',
  lighting: '#f2c96b',
};

const ROAD_COLORS: Record<RoadStyle, { stroke: string; center?: string }> = {
  asphalt: { stroke: '#3a414d', center: '#d6dce6' },
  ancientStone: { stroke: '#b8a88c' },
  cobblestone: { stroke: '#7f7a72' },
  dirtRoad: { stroke: '#8c6d4a' },
  sidewalkPath: { stroke: '#aba496' },
};

const FLAT_TERRAIN_TYPES = new Set<PlaceableType>([
  'seaWaterPatch',
  'sandyBeachShore',
  'beachVolleyball',
  'swimmingPool',
]);

function getFootprintWorldSize(type: PlaceableType, radius: number, scale: number): [number, number] {
  switch (type) {
    case 'seaWaterPatch':
      return [20 * scale, 20 * scale];
    case 'sandyBeachShore':
      return [16 * scale, 14 * scale];
    case 'beachVolleyball':
      return [16 * scale, 9 * scale];
    case 'swimmingPool':
      return [11 * scale, 8 * scale];
    case 'woodenPier':
      return [14 * scale, 4.2 * scale];
    case 'summerVilla':
      return [11.6 * scale, 9.6 * scale];
    case 'ancientWall':
    case 'aqueductSpan':
      return [10.5 * scale, 2.5 * scale];
    default: {
      const side = Math.max(2.2, radius * 1.45 * scale);
      return [side, side];
    }
  }
}

export const MiniMap: React.FC<MiniMapProps> = ({
  getMinimapState,
  onNavigatePoint,
  onFocusEntity,
  shiftLeftForRightPanel = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [rotateWithHeading, setRotateWithHeading] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showNpcs, setShowNpcs] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [panOffset, setPanOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [hovered, setHovered] = useState<HoveredTarget | null>(null);
  const [coords, setCoords] = useState<{ x: number; z: number; mode: 'editor' | 'play' }>({
    x: 0,
    z: 0,
    mode: 'editor',
  });

  // Mutable refs for 60fps rAF draw loop without React re-renders
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rotateRef = useRef(rotateWithHeading);
  rotateRef.current = rotateWithHeading;
  const panRef = useRef(panOffset);
  panRef.current = panOffset;
  const filtersRef = useRef({ showBuildings, showNpcs, showVehicles });
  filtersRef.current = { showBuildings, showNpcs, showVehicles };
  const hoveredRef = useRef<HoveredTarget | null>(hovered);
  hoveredRef.current = hovered;

  const lastStateRef = useRef<MinimapState | null>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanZ: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanZ: 0,
  });

  const mapSize = expanded ? 336 : 214;
  const isPanned = Math.hypot(panOffset.x, panOffset.z) > 0.5;

  const getMapTransform = (state: MinimapState, size: number) => {
    const baseSpan = expanded ? 124 : 96;
    const ppm = (size * zoomRef.current) / baseSpan;
    const centerX = state.actorX + panRef.current.x;
    const centerZ = state.actorZ + panRef.current.z;
    const headingAngle = Math.atan2(state.camHeadingZ, state.camHeadingX);
    const mapRot = rotateRef.current ? -headingAngle - Math.PI / 2 : 0;
    return { ppm, centerX, centerZ, mapRot, half: size / 2 };
  };

  const screenToWorld = (clientX: number, clientY: number): { wx: number; wz: number } | null => {
    const canvas = canvasRef.current;
    const state = lastStateRef.current;
    if (!canvas || !state) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { ppm, centerX, centerZ, mapRot, half } = getMapTransform(state, rect.width);
    const dx = (sx - half) / ppm;
    const dy = (sy - half) / ppm;
    const cos = Math.cos(-mapRot);
    const sin = Math.sin(-mapRot);
    const wx = centerX + dx * cos - dy * sin;
    const wz = centerZ + dx * sin + dy * cos;
    return { wx, wz };
  };

  const hitTestWorld = (wx: number, wz: number): HoveredTarget | null => {
    const state = lastStateRef.current;
    if (!state) return null;
    const { ppm } = getMapTransform(state, mapSize);
    const clickTolWorld = Math.max(2.6, 11 / ppm);

    // 1. Prioritize NPCs
    if (filtersRef.current.showNpcs) {
      let bestNpc: HoveredTarget | null = null;
      let bestDist = clickTolWorld;
      for (const npc of state.npcs) {
        const d = Math.hypot(wx - npc.x, wz - npc.z);
        if (d < bestDist) {
          bestDist = d;
          bestNpc = {
            kind: 'npc',
            id: npc.id,
            label: npc.name,
            sublabel: npc.roleTitle,
            x: npc.x,
            z: npc.z,
            distM: Math.round(Math.hypot(npc.x - state.actorX, npc.z - state.actorZ)),
          };
        }
      }
      if (bestNpc) return bestNpc;
    }

    // 2. Vehicles
    if (filtersRef.current.showVehicles) {
      let bestVeh: HoveredTarget | null = null;
      let bestDist = clickTolWorld * 1.15;
      for (const veh of state.vehicles) {
        const d = Math.hypot(wx - veh.x, wz - veh.z);
        if (d < bestDist) {
          bestDist = d;
          bestVeh = {
            kind: 'vehicle',
            id: veh.id,
            label: veh.name,
            sublabel: veh.isFlying ? 'Uçan Araç' : 'Kara Aracı',
            x: veh.x,
            z: veh.z,
            distM: Math.round(Math.hypot(veh.x - state.actorX, veh.z - state.actorZ)),
          };
        }
      }
      if (bestVeh) return bestVeh;
    }

    // 3. Buildings & Structures (skip flat sea/sand underlay if another building overlaps)
    if (filtersRef.current.showBuildings) {
      let bestObj: HoveredTarget | null = null;
      let bestDist = Infinity;
      for (const obj of state.objects) {
        if (obj.category === 'lighting') continue;
        const hitR = Math.max(2.4, obj.radius * obj.scale * 0.72);
        const d = Math.hypot(wx - obj.x, wz - obj.z);
        const priorityPenalty = FLAT_TERRAIN_TYPES.has(obj.type) ? 8 : 0;
        if (d < hitR && d + priorityPenalty < bestDist) {
          bestDist = d + priorityPenalty;
          bestObj = {
            kind: 'object',
            id: obj.id,
            label: obj.name,
            sublabel: state.mode === 'editor' ? 'Tıkla: Odakla & Seç' : 'Tıkla: Hızlı Yolculuk',
            x: obj.x,
            z: obj.z,
            distM: Math.round(Math.hypot(obj.x - state.actorX, obj.z - state.actorZ)),
          };
        }
      }
      if (bestObj) return bestObj;
    }

    return null;
  };

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    if (collapsed) return;
    let rafId = 0;
    let lastCoordTick = 0;

    const renderFrame = (now: number) => {
      rafId = window.requestAnimationFrame(renderFrame);
      const canvas = canvasRef.current;
      const state = getMinimapState();
      if (!canvas || !state) return;
      lastStateRef.current = state;

      // Throttle coordinate text React state updates to ~5 Hz
      if (now - lastCoordTick > 180) {
        lastCoordTick = now;
        const rx = Math.round(state.actorX);
        const rz = Math.round(state.actorZ);
        setCoords((prev) =>
          prev.x === rx && prev.z === rz && prev.mode === state.mode
            ? prev
            : { x: rx, z: rz, mode: state.mode }
        );
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelSize = Math.round(mapSize * dpr);
      if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      const { ppm, centerX, centerZ, mapRot, half } = getMapTransform(state, mapSize);

      // Background dark cartographic ground
      ctx.fillStyle = '#14191f';
      ctx.fillRect(0, 0, mapSize, mapSize);

      // Enter rotated & panned world coordinate space
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(mapRot);
      ctx.scale(ppm, ppm);
      ctx.translate(-centerX, -centerZ);

      // 1. Subtle 20m coordinate grid & ±92m playable terrain boundary
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1 / ppm;
      for (let g = -100; g <= 100; g += 20) {
        ctx.beginPath();
        ctx.moveTo(g, -100);
        ctx.lineTo(g, 100);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-100, g);
        ctx.lineTo(100, g);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(229, 154, 60, 0.22)';
      ctx.lineWidth = 1.4 / ppm;
      ctx.strokeRect(-92, -92, 184, 184);

      // 2. Flat coastal / water / beach layers first
      if (filtersRef.current.showBuildings) {
        for (const obj of state.objects) {
          if (!FLAT_TERRAIN_TYPES.has(obj.type)) continue;
          const [w, h] = getFootprintWorldSize(obj.type, obj.radius, obj.scale);
          ctx.save();
          ctx.translate(obj.x, obj.z);
          ctx.rotate(-obj.rotationY);
          if (obj.type === 'seaWaterPatch') {
            ctx.fillStyle = 'rgba(28, 165, 190, 0.58)';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = 'rgba(130, 234, 248, 0.25)';
            ctx.lineWidth = 0.8 / ppm;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
          } else if (obj.type === 'sandyBeachShore') {
            ctx.fillStyle = 'rgba(224, 194, 130, 0.52)';
            ctx.fillRect(-w / 2, -h / 2, w, h);
          } else if (obj.type === 'beachVolleyball') {
            ctx.fillStyle = 'rgba(235, 203, 132, 0.72)';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1 / ppm;
            ctx.strokeRect(-w * 0.43, -h * 0.4, w * 0.86, h * 0.8);
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.42);
            ctx.lineTo(0, h * 0.42);
            ctx.stroke();
          } else if (obj.type === 'swimmingPool') {
            ctx.fillStyle = '#c2b9a5';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.fillStyle = '#2dcce0';
            ctx.fillRect(-w * 0.38, -h * 0.28, w * 0.62, h * 0.56);
          }
          ctx.restore();
        }
      }

      // 3. Roads (polylines with realistic road widths)
      for (const road of state.roads) {
        if (road.points.length < 2) continue;
        const style = ROAD_COLORS[road.style] ?? ROAD_COLORS.asphalt;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(road.points[0][0], road.points[0][1]);
        for (let i = 1; i < road.points.length; i++) {
          ctx.lineTo(road.points[i][0], road.points[i][1]);
        }
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = Math.max(road.width * 0.86, 1.8 / ppm);
        ctx.stroke();

        if (style.center) {
          ctx.strokeStyle = style.center;
          ctx.lineWidth = Math.max(0.28, 0.9 / ppm);
          ctx.setLineDash([2.2, 2.2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // 4. Structures, Trees & Landmarks
      if (filtersRef.current.showBuildings) {
        for (const obj of state.objects) {
          if (FLAT_TERRAIN_TYPES.has(obj.type)) continue;
          const isSelected = state.selectedId === obj.id;
          const isHovered = hoveredRef.current?.kind === 'object' && hoveredRef.current.id === obj.id;
          const color = CATEGORY_COLORS[obj.category] ?? '#cfc7ba';

          ctx.save();
          ctx.translate(obj.x, obj.z);
          ctx.rotate(-obj.rotationY);

          if (obj.category === 'nature') {
            const r = Math.max(1.25, obj.radius * obj.scale * 0.52);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(76, 148, 86, 0.72)';
            ctx.fill();
            if (isSelected || isHovered) {
              ctx.strokeStyle = '#f5bc6f';
              ctx.lineWidth = 1.6 / ppm;
              ctx.stroke();
            }
          } else if (obj.category === 'lighting') {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.6, 2.1 / ppm), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 206, 110, 0.75)';
            ctx.fill();
          } else {
            const [w, h] = getFootprintWorldSize(obj.type, obj.radius, obj.scale);
            ctx.fillStyle = color;
            ctx.globalAlpha = isSelected || isHovered ? 0.98 : 0.82;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : 'rgba(15, 17, 21, 0.65)';
            ctx.lineWidth = (isSelected || isHovered ? 1.8 : 0.9) / ppm;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
          }
          ctx.restore();
        }
      }

      // 5. Active Quest Visit Beacons (pulsing gold radar ring)
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      for (const qt of state.questTargets) {
        ctx.beginPath();
        ctx.arc(qt.x, qt.z, (5.5 + pulse * 4.5) / ppm, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 188, 111, ${0.85 - pulse * 0.45})`;
        ctx.lineWidth = 1.8 / ppm;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(qt.x, qt.z, 3 / ppm, 0, Math.PI * 2);
        ctx.fillStyle = '#f5bc6f';
        ctx.fill();
      }

      // 6. Vehicles
      if (filtersRef.current.showVehicles) {
        for (const veh of state.vehicles) {
          if (veh.isActive && state.mode === 'play') continue; // Drawn as active actor marker
          const isSelected = state.selectedId === veh.id;
          const isHovered = hoveredRef.current?.kind === 'vehicle' && hoveredRef.current.id === veh.id;
          const angle = Math.atan2(Math.cos(veh.yaw), Math.sin(veh.yaw));

          ctx.save();
          ctx.translate(veh.x, veh.z);
          ctx.rotate(angle);

          const s = 1 / ppm;
          if (veh.isFlying) {
            // Sky-blue Zeppelin / Airship diamond marker
            ctx.beginPath();
            ctx.moveTo(6.5 * s, 0);
            ctx.lineTo(0, 3.8 * s);
            ctx.lineTo(-5.5 * s, 0);
            ctx.lineTo(0, -3.8 * s);
            ctx.closePath();
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
            ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : '#0b1926';
            ctx.lineWidth = (isSelected || isHovered ? 1.8 : 1.1) * s;
            ctx.stroke();
          } else {
            // Ground vehicle rounded rectangle
            ctx.fillStyle = '#f0a23a';
            ctx.fillRect(-4.2 * s, -2.5 * s, 8.4 * s, 5.0 * s);
            ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : '#14110c';
            ctx.lineWidth = (isSelected || isHovered ? 1.7 : 1.0) * s;
            ctx.strokeRect(-4.2 * s, -2.5 * s, 8.4 * s, 5.0 * s);
          }
          ctx.restore();
        }
      }

      // 7. NPCs
      if (filtersRef.current.showNpcs) {
        const s = 1 / ppm;
        for (const npc of state.npcs) {
          const isSelected = state.selectedId === npc.id;
          const isHovered = hoveredRef.current?.kind === 'npc' && hoveredRef.current.id === npc.id;

          if (npc.hasQuest && npc.questStatus !== 'completed') {
            ctx.beginPath();
            ctx.arc(npc.x, npc.z, (6.2 + pulse * 1.8) * s, 0, Math.PI * 2);
            ctx.strokeStyle =
              npc.questStatus === 'ready' ? '#8fd97c' : 'rgba(245, 188, 111, 0.85)';
            ctx.lineWidth = 1.4 * s;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(npc.x, npc.z, (isHovered || isSelected ? 5.2 : 4.1) * s, 0, Math.PI * 2);
          ctx.fillStyle = npc.primaryColor || '#8fd97c';
          ctx.fill();
          ctx.strokeStyle = isHovered || isSelected ? '#ffffff' : '#0f1115';
          ctx.lineWidth = (isHovered || isSelected ? 2.0 : 1.3) * s;
          ctx.stroke();
        }
      }

      // 8. In Editor Mode, show player's grounded spawn/last position subtly
      if (state.mode === 'editor') {
        const s = 1 / ppm;
        ctx.beginPath();
        ctx.arc(state.playerX, state.playerZ, 4.0 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(229, 154, 60, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3 * s;
        ctx.stroke();
      }

      // 9. Active Actor / Camera View Frustum Cone + Directional Arrow
      {
        const s = 1 / ppm;
        const coneAngle = Math.atan2(state.camHeadingZ, state.camHeadingX);
        ctx.save();
        ctx.translate(state.actorX, state.actorZ);
        ctx.rotate(coneAngle);
        const coneLen = 28 * s;
        const grad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, coneLen);
        if (state.activeVehicleIsFlying) {
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        } else if (state.mode === 'play') {
          grad.addColorStop(0, 'rgba(245, 188, 111, 0.38)');
          grad.addColorStop(1, 'rgba(245, 188, 111, 0)');
        } else {
          grad.addColorStop(0, 'rgba(243, 239, 232, 0.28)');
          grad.addColorStop(1, 'rgba(243, 239, 232, 0)');
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, coneLen, -0.52, 0.52);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Directional Arrowhead
        const arrowAngle = Math.atan2(state.actorHeadingZ, state.actorHeadingX);
        ctx.save();
        ctx.translate(state.actorX, state.actorZ);
        ctx.rotate(arrowAngle);
        ctx.beginPath();
        ctx.moveTo(7.5 * s, 0);
        ctx.lineTo(-5.2 * s, 4.8 * s);
        ctx.lineTo(-2.6 * s, 0);
        ctx.lineTo(-5.2 * s, -4.8 * s);
        ctx.closePath();
        ctx.fillStyle = state.activeVehicleIsFlying
          ? '#38bdf8'
          : state.mode === 'play'
            ? '#e59a3c'
            : '#f5efe6';
        ctx.fill();
        ctx.strokeStyle = '#0f1115';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // Exit world space

      // 10. Cardinal Compass Markers (K / D / G / B) around perimeter in screen space
      const cardinals: { label: string; worldAngle: number; isNorth?: boolean }[] = [
        { label: 'K', worldAngle: -Math.PI / 2, isNorth: true },
        { label: 'D', worldAngle: 0 },
        { label: 'G', worldAngle: Math.PI / 2 },
        { label: 'B', worldAngle: Math.PI },
      ];
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const compassR = half - 12;
      for (const c of cardinals) {
        const a = c.worldAngle + mapRot;
        const cx = half + Math.cos(a) * compassR;
        const cy = half + Math.sin(a) * compassR;
        ctx.fillStyle = c.isNorth ? '#e59a3c' : 'rgba(214, 208, 198, 0.55)';
        ctx.fillText(c.label, cx, cy);
      }

      // Subtle inner vignette border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, mapSize - 1, mapSize - 1);

      ctx.restore();
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [collapsed, expanded, getMinimapState, mapSize]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panRef.current.x,
      startPanZ: panRef.current.z,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const state = lastStateRef.current;
    if (dragRef.current.active && state) {
      const dxPx = e.clientX - dragRef.current.startX;
      const dyPx = e.clientY - dragRef.current.startY;
      if (Math.hypot(dxPx, dyPx) > 4) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        const { ppm, mapRot } = getMapTransform(state, mapSize);
        const dxW = -dxPx / ppm;
        const dyW = -dyPx / ppm;
        const cos = Math.cos(-mapRot);
        const sin = Math.sin(-mapRot);
        const nextX = dragRef.current.startPanX + dxW * cos - dyW * sin;
        const nextZ = dragRef.current.startPanZ + dxW * sin + dyW * cos;
        setPanOffset({ x: nextX, z: nextZ });
        return;
      }
    }

    const pt = screenToWorld(e.clientX, e.clientY);
    if (!pt) {
      setHovered(null);
      return;
    }
    setHovered(hitTestWorld(pt.wx, pt.wz));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!dragRef.current.active) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    dragRef.current.moved = false;

    if (wasDrag) return;

    const pt = screenToWorld(e.clientX, e.clientY);
    if (!pt) return;
    const hit = hitTestWorld(pt.wx, pt.wz);
    if (hit) {
      onFocusEntity(hit.kind, hit.id);
    } else {
      onNavigatePoint(pt.wx, pt.wz);
    }
    setPanOffset({ x: 0, z: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    setZoom((prev) => Math.max(0.5, Math.min(2.8, Number((prev * factor).toFixed(2)))));
  };

  const rightOffsetClass = shiftLeftForRightPanel ? 'right-[380px]' : 'right-5';

  if (collapsed) {
    return (
      <div className={`fixed top-[72px] ${rightOffsetClass} z-20 transition-[right] duration-200`}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115]/94 px-3.5 py-2 text-xs font-medium text-[#f3efe8] shadow-xl transition-colors hover:bg-[#1a1e26] cursor-pointer"
        >
          <MapIcon className="h-3.5 w-3.5 text-[#e59a3c]" />
          Mini Harita
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Kuş Bakışı Mini Harita"
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className={`fixed top-[72px] ${rightOffsetClass} z-20 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f1115]/94 shadow-2xl transition-[right] duration-200 select-none`}
      style={{ width: mapSize + 16 }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapIcon className="h-3.5 w-3.5 shrink-0 text-[#e59a3c]" />
          <span className="text-[11px] font-semibold text-[#f3efe8] truncate">Mini Harita</span>
          <span className="font-mono text-[10px] tabular-nums text-[#8e887f]">
            {coords.x}, {coords.z}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setRotateWithHeading((v) => !v)}
            title={rotateWithHeading ? 'Kuzey Sabit Moduna Geç' : 'Oyuncu Yönüne Döndür'}
            className={`rounded p-1 transition-colors cursor-pointer ${
              rotateWithHeading
                ? 'bg-[#e59a3c]/20 text-[#f5bc6f]'
                : 'text-[#8e887f] hover:bg-white/8 hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Küçült' : 'Haritayı Büyüt'}
            className="rounded p-1 text-[#8e887f] transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Mini Haritayı Gizle"
            className="rounded p-1 text-[#8e887f] transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Bird's-Eye Canvas */}
      <div className="relative p-2 pb-1.5">
        <div className="relative overflow-hidden rounded-lg border border-white/10">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              dragRef.current.active = false;
              setHovered(null);
            }}
            onWheel={handleWheel}
            style={{ width: mapSize, height: mapSize }}
            className={`block ${
              hovered ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
          />

          {/* Floating Zoom & Re-center Controls */}
          <div className="absolute right-1.5 bottom-1.5 flex flex-col gap-1">
            {isPanned && (
              <button
                type="button"
                onClick={() => setPanOffset({ x: 0, z: 0 })}
                title="Oyuncu / Kameraya Odakla"
                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#e59a3c]/50 bg-[#0f1115]/92 text-[#f5bc6f] hover:bg-[#1d1912] cursor-pointer"
              >
                <Crosshair className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.8, Number((z * 1.25).toFixed(2))))}
              title="Yakınlaştır"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-[#0f1115]/90 text-[#d8d2c7] hover:bg-white/14 hover:text-white cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z / 1.25).toFixed(2))))}
              title="Uzaklaştır"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-[#0f1115]/90 text-[#d8d2c7] hover:bg-white/14 hover:text-white cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Layer Filter Controls & Hover / Hint Status */}
      <div className="space-y-1.5 px-2.5 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowBuildings((v) => !v)}
            className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              showBuildings
                ? 'bg-white/12 text-[#f3efe8]'
                : 'bg-white/3 text-[#7a746b] hover:text-[#b8b1a6]'
            }`}
          >
            Yapı
          </button>
          <button
            type="button"
            onClick={() => setShowNpcs((v) => !v)}
            className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              showNpcs
                ? 'bg-[#8fd97c]/18 text-[#c7f2ba]'
                : 'bg-white/3 text-[#7a746b] hover:text-[#b8b1a6]'
            }`}
          >
            NPC
          </button>
          <button
            type="button"
            onClick={() => setShowVehicles((v) => !v)}
            className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              showVehicles
                ? 'bg-sky-500/20 text-sky-300'
                : 'bg-white/3 text-[#7a746b] hover:text-[#b8b1a6]'
            }`}
          >
            Araç
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] leading-tight text-[#9b958b]">
          {hovered ? (
            <>
              <span className="truncate font-medium text-[#f5efe6]">{hovered.label}</span>
              <span className="shrink-0 font-mono tabular-nums text-[#e59a3c]">
                {hovered.distM} m
              </span>
            </>
          ) : (
            <span className="truncate">
              {coords.mode === 'play'
                ? 'Tıkla: Hızlı yolculuk · Sürükle: Kaydır'
                : 'Tıkla: Kamerayı odakla · Sürükle: Kaydır'}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
