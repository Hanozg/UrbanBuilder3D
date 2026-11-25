import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  X,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Trash2,
  Crosshair,
  SlidersHorizontal,
  Sparkles,
  Link2,
  ScrollText,
  Users,
} from 'lucide-react';
import {
  NPC_OUTFIT_LABELS,
  NPC_RELATION_META,
  NpcData,
  NpcRelationData,
  NpcRelationType,
} from '../types/sandbox';

interface NpcRelationGraphModalProps {
  npcs: NpcData[];
  relations: NpcRelationData[];
  onClose: () => void;
  onAddRelation: (
    sourceId: string,
    targetId: string,
    type: NpcRelationType,
    label: string,
    strength: number
  ) => { ok: boolean; error?: string };
  onUpdateRelation: (
    relationId: string,
    patch: Partial<Pick<NpcRelationData, 'type' | 'label' | 'strength'>>
  ) => void;
  onDeleteRelation: (relationId: string) => void;
  onAutoGenerateRelations: () => void;
  onFocusNpc: (npcId: string) => void;
  onEditNpc: (npcId: string) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  npc: NpcData;
  degree: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  relation: NpcRelationData;
}

const RELATION_TYPES: NpcRelationType[] = [
  'ally',
  'trade',
  'mentor',
  'family',
  'rival',
  'secret',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'N';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const NpcRelationGraphModal: React.FC<NpcRelationGraphModalProps> = ({
  npcs,
  relations,
  onClose,
  onAddRelation,
  onUpdateRelation,
  onDeleteRelation,
  onAutoGenerateRelations,
  onFocusNpc,
  onEditNpc,
}) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const posCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [size, setSize] = useState({ width: 760, height: 540 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<NpcRelationType | 'all'>('all');

  // New relation form state
  const [formSourceId, setFormSourceId] = useState<string>('');
  const [formTargetId, setFormTargetId] = useState<string>('');
  const [formType, setFormType] = useState<NpcRelationType>('ally');
  const [formLabel, setFormLabel] = useState<string>('');
  const [formStrength, setFormStrength] = useState<number>(3);
  const [formError, setFormError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Keep form source/target defaults valid when NPCs or selection change
  useEffect(() => {
    if (npcs.length === 0) {
      setFormSourceId('');
      setFormTargetId('');
      return;
    }
    const preferredSource =
      selectedNodeId && npcs.some((n) => n.id === selectedNodeId)
        ? selectedNodeId
        : formSourceId && npcs.some((n) => n.id === formSourceId)
          ? formSourceId
          : npcs[0].id;
    setFormSourceId(preferredSource);

    if (!formTargetId || formTargetId === preferredSource || !npcs.some((n) => n.id === formTargetId)) {
      const other = npcs.find((n) => n.id !== preferredSource);
      setFormTargetId(other ? other.id : '');
    }
  }, [npcs, selectedNodeId, formSourceId, formTargetId]);

  // Clear stale selection if deleted
  useEffect(() => {
    if (selectedNodeId && !npcs.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [npcs, selectedNodeId]);

  useEffect(() => {
    if (selectedRelationId && !relations.some((r) => r.id === selectedRelationId)) {
      setSelectedRelationId(null);
    }
  }, [relations, selectedRelationId]);

  // Observe SVG canvas container dimensions
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const npcById = useMemo(() => {
    const map = new Map<string, NpcData>();
    for (const n of npcs) map.set(n.id, n);
    return map;
  }, [npcs]);

  const visibleRelations = useMemo(() => {
    if (activeTypeFilter === 'all') return relations;
    return relations.filter((r) => r.type === activeTypeFilter);
  }, [relations, activeTypeFilter]);

  const selectedNpc = selectedNodeId ? (npcById.get(selectedNodeId) ?? null) : null;
  const selectedRelation = selectedRelationId
    ? (relations.find((r) => r.id === selectedRelationId) ?? null)
    : null;

  const selectedNpcRelations = useMemo(() => {
    if (!selectedNodeId) return [];
    return relations.filter(
      (r) => r.sourceId === selectedNodeId || r.targetId === selectedNodeId
    );
  }, [relations, selectedNodeId]);

  const isolatedCount = useMemo(() => {
    const linked = new Set<string>();
    for (const r of relations) {
      linked.add(r.sourceId);
      linked.add(r.targetId);
    }
    return npcs.filter((n) => !linked.has(n.id)).length;
  }, [npcs, relations]);

  // Build & run D3 force-directed graph
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const { width, height } = size;

    // Defs: subtle dot grid pattern + glow filter
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'npc-graph-grid')
      .attr('width', 28)
      .attr('height', 28)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern
      .append('circle')
      .attr('cx', 14)
      .attr('cy', 14)
      .attr('r', 1)
      .attr('fill', 'rgba(255,255,255,0.09)');

    // Background click clears selection
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#npc-graph-grid)')
      .on('click', () => {
        setSelectedNodeId(null);
        setSelectedRelationId(null);
      });

    const viewport = svg.append('g').attr('class', 'graph-viewport');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.6])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    if (npcs.length === 0) return;

    // Compute degree map
    const degreeMap = new Map<string, number>();
    for (const r of visibleRelations) {
      degreeMap.set(r.sourceId, (degreeMap.get(r.sourceId) ?? 0) + 1);
      degreeMap.set(r.targetId, (degreeMap.get(r.targetId) ?? 0) + 1);
    }

    const radiusCircle = Math.min(width, height) * 0.27;
    const nodes: SimNode[] = npcs.map((npc, idx) => {
      const cached = posCacheRef.current.get(npc.id);
      const angle = (idx / Math.max(1, npcs.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: npc.id,
        npc,
        degree: degreeMap.get(npc.id) ?? 0,
        x: cached ? cached.x : width / 2 + Math.cos(angle) * radiusCircle,
        y: cached ? cached.y : height / 2 + Math.sin(angle) * radiusCircle,
      };
    });

    const nodeById = new Map<string, SimNode>(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = visibleRelations
      .filter((r) => nodeById.has(r.sourceId) && nodeById.has(r.targetId))
      .map((r) => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        relation: r,
      }));

    // Adjacency lookup for hover spotlight
    const neighborsMap = new Map<string, Set<string>>();
    for (const n of nodes) neighborsMap.set(n.id, new Set([n.id]));
    for (const l of links) {
      neighborsMap.get(l.relation.sourceId)?.add(l.relation.targetId);
      neighborsMap.get(l.relation.targetId)?.add(l.relation.sourceId);
    }

    const linkLayer = viewport.append('g').attr('class', 'links-layer');
    const linkLabelLayer = viewport.append('g').attr('class', 'link-labels-layer');
    const nodeLayer = viewport.append('g').attr('class', 'nodes-layer');

    // Invisible wide hit area + visible curved link path
    const linkGroups = linkLayer
      .selectAll<SVGGElement, SimLink>('g.link-group')
      .data(links, (d) => d.id)
      .join('g')
      .attr('class', 'link-group')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedRelationId(d.id);
        setSelectedNodeId(null);
      });

    const linkHitPaths = linkGroups
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 16);

    const linkPaths = linkGroups
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => NPC_RELATION_META[d.relation.type].color)
      .attr('stroke-width', (d) => {
        const base = 1.6 + d.relation.strength * 0.7;
        return d.id === selectedRelationId ? base + 2 : base;
      })
      .attr('stroke-opacity', (d) => (d.id === selectedRelationId ? 1 : 0.78))
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) => {
        if (d.relation.type === 'secret') return '6 5';
        if (d.relation.type === 'rival') return '9 4';
        return null;
      });

    // Midpoint labels on edges
    const linkLabels = linkLabelLayer
      .selectAll<SVGGElement, SimLink>('g.link-label')
      .data(links, (d) => d.id)
      .join('g')
      .attr('class', 'link-label')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedRelationId(d.id);
        setSelectedNodeId(null);
      });

    linkLabels.each(function (d) {
      const g = d3.select(this);
      const meta = NPC_RELATION_META[d.relation.type];
      const textStr =
        d.relation.label.length > 26
          ? `${d.relation.label.slice(0, 24)}…`
          : d.relation.label || meta.shortLabel;
      const pillWidth = Math.max(58, textStr.length * 6.2 + 20);

      g.append('rect')
        .attr('x', -pillWidth / 2)
        .attr('y', -10)
        .attr('width', pillWidth)
        .attr('height', 20)
        .attr('rx', 6)
        .attr('fill', d.id === selectedRelationId ? '#1e232e' : '#0f1115')
        .attr('fill-opacity', 0.94)
        .attr('stroke', meta.color)
        .attr('stroke-opacity', d.id === selectedRelationId ? 0.95 : 0.45)
        .attr('stroke-width', d.id === selectedRelationId ? 1.5 : 1);

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.34em')
        .attr('fill', d.id === selectedRelationId ? '#ffffff' : '#dfd9ce')
        .attr('font-size', '10px')
        .attr('font-weight', d.id === selectedRelationId ? '600' : '500')
        .text(textStr);
    });

    // NPC Nodes
    const nodeGroups = nodeLayer
      .selectAll<SVGGElement, SimNode>('g.npc-node')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('class', 'npc-node')
      .style('cursor', 'grab')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
        setSelectedRelationId(null);
      });

    // Outer Selection / Hover Halo
    nodeGroups
      .append('circle')
      .attr('class', 'node-halo')
      .attr('r', (d) => 27 + Math.min(d.degree, 4) * 1.6)
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.id === selectedNodeId ? '#e59a3c' : 'rgba(255,255,255,0.12)'))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 2.5 : 1.2))
      .attr('stroke-dasharray', (d) => (d.id === selectedNodeId ? null : '3 3'));

    // Main Avatar Circle
    nodeGroups
      .append('circle')
      .attr('r', (d) => 21 + Math.min(d.degree, 4) * 1.4)
      .attr('fill', (d) => d.npc.primaryColor)
      .attr('stroke', (d) => (d.id === selectedNodeId ? '#f7c57e' : d.npc.secondaryColor))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2.2));

    // Initials inside node
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.36em')
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.65)')
      .text((d) => getInitials(d.npc.name));

    // Quest badge (!) on top-right corner if quest is enabled
    const questNodes = nodeGroups.filter((d) => d.npc.quest.enabled);
    questNodes
      .append('circle')
      .attr('cx', 17)
      .attr('cy', -17)
      .attr('r', 7.5)
      .attr('fill', '#e59a3c')
      .attr('stroke', '#0f1115')
      .attr('stroke-width', 1.8);
    questNodes
      .append('text')
      .attr('x', 17)
      .attr('y', -17)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#14110c')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .style('pointer-events', 'none')
      .text('!');

    // Name + Role Tag under each node
    nodeGroups.each(function (d) {
      const g = d3.select(this);
      const nameStr = d.npc.name.length > 20 ? `${d.npc.name.slice(0, 18)}…` : d.npc.name;
      const roleStr =
        d.npc.roleTitle.length > 22 ? `${d.npc.roleTitle.slice(0, 20)}…` : d.npc.roleTitle;
      const boxW = Math.max(84, Math.max(nameStr.length * 6.8, roleStr.length * 5.6) + 18);
      const yBase = 30 + Math.min(d.degree, 4) * 1.4;

      const labelG = g.append('g').attr('transform', `translate(0, ${yBase})`);

      labelG
        .append('rect')
        .attr('x', -boxW / 2)
        .attr('y', 0)
        .attr('width', boxW)
        .attr('height', roleStr ? 30 : 20)
        .attr('rx', 6)
        .attr('fill', '#0f1115')
        .attr('fill-opacity', 0.92)
        .attr('stroke', d.id === selectedNodeId ? '#e59a3c' : 'rgba(255,255,255,0.12)')
        .attr('stroke-width', 1);

      labelG
        .append('text')
        .attr('y', 12.5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f5efe6')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(nameStr);

      if (roleStr) {
        labelG
          .append('text')
          .attr('y', 24)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9b958b')
          .attr('font-size', '9.5px')
          .text(roleStr);
      }
    });

    // Hover Spotlight
    nodeGroups
      .on('mouseenter', (_event, hovered) => {
        const connected = neighborsMap.get(hovered.id) ?? new Set([hovered.id]);
        nodeGroups.transition().duration(140).style('opacity', (n) => (connected.has(n.id) ? 1 : 0.24));
        linkGroups
          .transition()
          .duration(140)
          .style('opacity', (l) =>
            l.relation.sourceId === hovered.id || l.relation.targetId === hovered.id ? 1 : 0.14
          );
        linkLabels
          .transition()
          .duration(140)
          .style('opacity', (l) =>
            l.relation.sourceId === hovered.id || l.relation.targetId === hovered.id ? 1 : 0.14
          );
      })
      .on('mouseleave', () => {
        nodeGroups.transition().duration(160).style('opacity', 1);
        linkGroups.transition().duration(160).style('opacity', 1);
        linkLabels.transition().duration(160).style('opacity', 1);
      });

    // Force Simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => 225 - d.relation.strength * 14)
          .strength(0.55)
      )
      .force('charge', d3.forceManyBody().strength(-520))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.06))
      .force('y', d3.forceY(height / 2).strength(0.06))
      .force('collision', d3.forceCollide<SimNode>().radius(66));

    // Drag Behavior
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.28).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(drag);

    // Tick Geometry Updater (with subtle arc curve for clarity)
    const computeCurvePath = (d: SimLink): { path: string; midX: number; midY: number } => {
      const s = d.source as SimNode;
      const t = d.target as SimNode;
      const sx = s.x ?? 0;
      const sy = s.y ?? 0;
      const tx = t.x ?? 0;
      const ty = t.y ?? 0;
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const curveOffset = Math.min(28, dist * 0.11);
      const nx = -dy / dist;
      const ny = dx / dist;
      const cx = (sx + tx) / 2 + nx * curveOffset;
      const cy = (sy + ty) / 2 + ny * curveOffset;
      const midX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
      const midY = 0.25 * sy + 0.5 * cy + 0.25 * ty;
      return {
        path: `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`,
        midX,
        midY,
      };
    };

    simulation.on('tick', () => {
      linkHitPaths.attr('d', (d) => computeCurvePath(d).path);
      linkPaths.attr('d', (d) => computeCurvePath(d).path);
      linkLabels.attr('transform', (d) => {
        const { midX, midY } = computeCurvePath(d);
        return `translate(${midX}, ${midY})`;
      });
      nodeGroups.attr('transform', (d) => {
        const x = d.x ?? width / 2;
        const y = d.y ?? height / 2;
        posCacheRef.current.set(d.id, { x, y });
        return `translate(${x}, ${y})`;
      });
    });

    return () => {
      simulation.stop();
    };
  }, [npcs, visibleRelations, size, selectedNodeId, selectedRelationId]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(220).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(260)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleCreateRelation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = onAddRelation(formSourceId, formTargetId, formType, formLabel, formStrength);
    if (!res.ok) {
      setFormError(res.error || 'İlişki eklenemedi.');
      return;
    }
    setFormLabel('');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/72 p-4 sm:p-6">
      <div className="flex h-[min(86vh,760px)] w-[min(96vw,1220px)] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0f1115] shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e59a3c]/18 text-[#f5bc6f]">
              <Network className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-[#f5efe6] truncate">
                NPC İlişki Ağı (D3 Graph)
              </h2>
              <p className="text-[11px] text-[#9b958b] truncate">
                Haritadaki tüm NPC’lerin sosyal, ticari ve gizli bağlantılarını incele, sürükle ve düzenle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAutoGenerateRelations}
              disabled={npcs.length < 2}
              title="Haritadaki fiziksel yakınlığa göre eksik bağlantıları otomatik oluştur"
              className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-[#f0eae0] transition-colors hover:bg-white/14 disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#e59a3c]" />
              Yakınlığa Göre Bağla
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Kapat (Esc)"
              className="rounded-lg p-1.5 text-[#9b958b] transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content Split: D3 Graph Canvas + Right Inspector */}
        <div className="flex flex-1 min-h-0">
          {/* Left/Center: Interactive D3 Force Graph */}
          <div className="relative flex flex-1 flex-col bg-[#0b0d11] min-w-0">
            {/* Filter Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-[#101319] px-4 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTypeFilter('all')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTypeFilter === 'all'
                      ? 'bg-[#e59a3c] text-[#14110c]'
                      : 'bg-white/6 text-[#c7c1b7] hover:bg-white/12'
                  }`}
                >
                  Tümü ({relations.length})
                </button>
                {RELATION_TYPES.map((type) => {
                  const meta = NPC_RELATION_META[type];
                  const count = relations.filter((r) => r.type === type).length;
                  const active = activeTypeFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveTypeFilter(active ? 'all' : type)}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-white/16 text-white ring-1 ring-white/30'
                          : 'bg-white/4 text-[#b8b1a6] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span>{meta.shortLabel}</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleZoom(1.22)}
                  title="Yakınlaş"
                  className="rounded-md bg-white/6 p-1.5 text-[#d6d0c6] hover:bg-white/14 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(0.82)}
                  title="Uzaklaş"
                  className="rounded-md bg-white/6 p-1.5 text-[#d6d0c6] hover:bg-white/14 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  title="Görünümü Sıfırla"
                  className="rounded-md bg-white/6 p-1.5 text-[#d6d0c6] hover:bg-white/14 cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* SVG Force Canvas */}
            <div ref={svgContainerRef} className="relative flex-1 min-h-0 overflow-hidden">
              {npcs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <Users className="h-10 w-10 text-[#68635c]" />
                  <h3 className="mt-3 font-display text-sm font-semibold text-[#e6dfd3]">
                    Haritada Henüz NPC Yok
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-[#8e887f]">
                    İnşa paletindeki “NPC & Görev” sekmesinden haritaya NPC ekledikçe burada
                    interaktif ilişki ağı oluşacaktır.
                  </p>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  width={size.width}
                  height={size.height}
                  className="block h-full w-full select-none"
                />
              )}

              {/* Bottom-Left Subtle Interaction Hint */}
              {npcs.length > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/8 bg-[#0f1115]/92 px-3 py-1.5 text-[10px] text-[#9b958b]">
                  Düğümleri sürükle · Tekerlek ile yakınlaş · NPC veya çizgiye tıklayarak düzenle
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Inspector & Relationship Studio */}
          <aside className="palette-scroll flex w-[316px] shrink-0 flex-col overflow-y-auto border-l border-white/8 bg-[#12151c] p-4 space-y-4">
            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-2 text-center">
                <div className="font-mono text-sm font-semibold tabular-nums text-[#f5efe6]">
                  {npcs.length}
                </div>
                <div className="text-[10px] text-[#8e887f]">NPC</div>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-2 text-center">
                <div className="font-mono text-sm font-semibold tabular-nums text-[#e59a3c]">
                  {relations.length}
                </div>
                <div className="text-[10px] text-[#8e887f]">İlişki</div>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-2 text-center">
                <div className="font-mono text-sm font-semibold tabular-nums text-[#9b958b]">
                  {isolatedCount}
                </div>
                <div className="text-[10px] text-[#8e887f]">Bağsız</div>
              </div>
            </div>

            {/* Selected NPC Inspector */}
            {selectedNpc && (
              <section className="space-y-2.5 rounded-xl border border-[#e59a3c]/40 bg-[#e59a3c]/8 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold text-white"
                      style={{
                        backgroundColor: selectedNpc.primaryColor,
                        borderColor: selectedNpc.secondaryColor,
                      }}
                    >
                      {getInitials(selectedNpc.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-[#f5efe6]">
                        {selectedNpc.name}
                      </div>
                      <div className="truncate text-[10px] text-[#d6b68a]">
                        {selectedNpc.roleTitle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="rounded p-1 text-[#9b958b] hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#b8b1a6]">
                  <span className="rounded bg-white/8 px-2 py-0.5">
                    {selectedNpc.gender === 'female' ? 'Kadın' : 'Erkek'}
                  </span>
                  <span className="rounded bg-white/8 px-2 py-0.5">
                    {NPC_OUTFIT_LABELS[selectedNpc.outfit]}
                  </span>
                  <span className="rounded bg-white/8 px-2 py-0.5 font-mono tabular-nums">
                    X:{Math.round(selectedNpc.position[0])} Z:{Math.round(selectedNpc.position[2])}
                  </span>
                </div>

                {selectedNpc.quest.enabled && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-[10px] text-[#f5bc6f]">
                    <ScrollText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Görev: {selectedNpc.quest.title}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onFocusNpc(selectedNpc.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg bg-[#e59a3c] px-2.5 py-1.5 text-[11px] font-semibold text-[#14110c] hover:bg-[#f0aa50] cursor-pointer"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    Haritada Göster
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditNpc(selectedNpc.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-[#f5efe6] hover:bg-white/16 cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Özelleştir
                  </button>
                </div>

                {/* Connections of Selected NPC */}
                <div className="space-y-1.5 border-t border-white/10 pt-2">
                  <div className="text-[10px] font-medium text-[#b8b1a6]">
                    Bağlantıları ({selectedNpcRelations.length})
                  </div>
                  {selectedNpcRelations.length === 0 ? (
                    <p className="text-[10px] text-[#8e887f]">
                      Bu NPC henüz kimseyle bağlı değil. Aşağıdan hemen ilişki ekleyebilirsin.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {selectedNpcRelations.map((rel) => {
                        const otherId =
                          rel.sourceId === selectedNpc.id ? rel.targetId : rel.sourceId;
                        const other = npcById.get(otherId);
                        const meta = NPC_RELATION_META[rel.type];
                        return (
                          <div
                            key={rel.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-[#0f1115]/80 px-2 py-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRelationId(rel.id);
                                setSelectedNodeId(null);
                              }}
                              className="min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: meta.color }}
                                />
                                <span className="truncate text-[11px] font-medium text-[#f5efe6]">
                                  {other?.name || 'NPC'}
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-[#9b958b]">
                                {rel.label}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRelation(rel.id)}
                              title="İlişkiyi sil"
                              className="rounded p-1 text-[#9b958b] hover:text-[#f48b7e] cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Selected Relation Editor */}
            {selectedRelation && (
              <section className="space-y-2.5 rounded-xl border border-white/15 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#f5efe6]">
                    <Link2 className="h-3.5 w-3.5 text-[#e59a3c]" />
                    İlişkiyi Düzenle
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRelationId(null)}
                    className="rounded p-1 text-[#9b958b] hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="rounded-lg bg-[#0f1115]/80 px-2.5 py-2 text-[11px] text-[#e7e1d7]">
                  <strong>{npcById.get(selectedRelation.sourceId)?.name}</strong>
                  <span className="mx-1.5 text-[#8e887f]">↔</span>
                  <strong>{npcById.get(selectedRelation.targetId)?.name}</strong>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {RELATION_TYPES.map((t) => {
                    const meta = NPC_RELATION_META[t];
                    const active = selectedRelation.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onUpdateRelation(selectedRelation.id, { type: t })}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium cursor-pointer ${
                          active
                            ? 'bg-white/16 text-white ring-1 ring-white/30'
                            : 'bg-white/5 text-[#b8b1a6] hover:bg-white/10'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="truncate">{meta.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9b958b]">İlişki Etiketi</span>
                  <input
                    type="text"
                    value={selectedRelation.label}
                    maxLength={42}
                    onChange={(e) =>
                      onUpdateRelation(selectedRelation.id, { label: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0f1115] px-2.5 py-1.5 text-xs text-[#f5efe6] outline-none focus:border-[#e59a3c]/70"
                  />
                </label>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#b8b1a6]">
                    <span>Bağ Gücü</span>
                    <span className="font-mono tabular-nums text-[#f5bc6f]">
                      {selectedRelation.strength} / 5
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={selectedRelation.strength}
                    onChange={(e) =>
                      onUpdateRelation(selectedRelation.id, {
                        strength: parseInt(e.target.value, 10),
                      })
                    }
                    className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onDeleteRelation(selectedRelation.id);
                    setSelectedRelationId(null);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#dc5b4b]/18 px-3 py-1.5 text-xs font-medium text-[#f48b7e] hover:bg-[#dc5b4b]/28 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  İlişkiyi Sil
                </button>
              </section>
            )}

            {/* Add New Relationship Form */}
            {npcs.length >= 2 && (
              <form
                onSubmit={handleCreateRelation}
                className="space-y-2.5 rounded-xl border border-white/8 bg-white/3 p-3"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e6dfd3]">
                  <Plus className="h-3.5 w-3.5 text-[#e59a3c]" />
                  Yeni İlişki Bağla
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-[10px] text-[#9b958b]">1. NPC</span>
                    <select
                      value={formSourceId}
                      onChange={(e) => {
                        setFormSourceId(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-[#0f1115] px-2 py-1.5 text-[11px] text-[#f5efe6] outline-none focus:border-[#e59a3c]/70"
                    >
                      {npcs.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] text-[#9b958b]">2. NPC</span>
                    <select
                      value={formTargetId}
                      onChange={(e) => {
                        setFormTargetId(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-[#0f1115] px-2 py-1.5 text-[11px] text-[#f5efe6] outline-none focus:border-[#e59a3c]/70"
                    >
                      {npcs.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#9b958b]">İlişki Türü</span>
                  <div className="grid grid-cols-2 gap-1">
                    {RELATION_TYPES.map((t) => {
                      const meta = NPC_RELATION_META[t];
                      const active = formType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormType(t)}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#e59a3c]/22 text-[#f7c57e] ring-1 ring-[#e59a3c]/55'
                              : 'bg-white/5 text-[#b8b1a6] hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="truncate">{meta.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] text-[#9b958b]">Bağ Açıklaması</span>
                  <input
                    type="text"
                    value={formLabel}
                    maxLength={42}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="Örn: Eski dostluk, gizli ticaret..."
                    className="w-full rounded-lg border border-white/10 bg-[#0f1115] px-2.5 py-1.5 text-xs text-[#f5efe6] placeholder-[#736e66] outline-none focus:border-[#e59a3c]/70"
                  />
                </label>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#b8b1a6]">
                    <span>Bağ Gücü</span>
                    <span className="font-mono tabular-nums text-[#f5bc6f]">
                      {formStrength} / 5
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={formStrength}
                    onChange={(e) => setFormStrength(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
                  />
                </div>

                {formError && (
                  <p className="rounded-md bg-[#dc5b4b]/18 px-2.5 py-1.5 text-[11px] text-[#f7a89f]">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#e59a3c] px-3 py-2 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  İlişkiyi Ağa Ekle
                </button>
              </form>
            )}

            {/* Full Relationships List */}
            {relations.length > 0 && !selectedNpc && !selectedRelation && (
              <section className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#9b958b]">
                  Tüm Bağlantılar ({relations.length})
                </div>
                <div className="space-y-1">
                  {relations.map((rel) => {
                    const meta = NPC_RELATION_META[rel.type];
                    const s = npcById.get(rel.sourceId);
                    const t = npcById.get(rel.targetId);
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => setSelectedRelationId(rel.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/4 px-2.5 py-2 text-left transition-colors hover:bg-white/9 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            <span className="truncate text-[11px] font-medium text-[#f5efe6]">
                              {s?.name || 'NPC'} ↔ {t?.name || 'NPC'}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-[#8e887f]">
                            {rel.label}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#8e887f]">
                          {rel.strength}/5
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
