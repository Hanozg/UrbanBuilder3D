import React, { useMemo, useState } from 'react';
import {
  MousePointer2,
  Route,
  Footprints,
  Building2,
  Home,
  Store,
  Landmark,
  Columns3,
  Palmtree,
  TreePine,
  TreeDeciduous,
  Trees,
  Flower2,
  LampFloor,
  Flame,
  Lightbulb,
  Sparkles,
  Armchair,
  Clock,
  Coffee,
  ShoppingBag,
  Castle,
  BrickWall,
  Droplets,
  Tent,
  Music,
  FerrisWheel,
  Compass,
  Search,
  RotateCw,
  RotateCcw,
  Trash2,
  Move,
  Grid3x3,
  Check,
  Undo2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Eraser,
  Layers,
  Signpost,
  Warehouse,
  Sun,
  Users,
  UserPlus,
  SlidersHorizontal,
  ScrollText,
  Network,
  Car,
  Plane,
  Wind,
  Gauge,
  Shield,
  Crown,
  Hammer,
  Fan,
  Gem,
  Swords,
} from 'lucide-react';
import {
  ActiveTool,
  EngineSnapshot,
  NPC_OUTFIT_LABELS,
  NPC_PRESET_TEMPLATES,
  NpcTemplate,
  PALETTE_CATEGORIES,
  PLACEABLE_CATALOG,
  PaletteCategory,
  PlaceableType,
  ROAD_CATALOG,
  ROAD_STYLE_LABELS,
  RoadStyle,
  VEHICLE_CATALOG,
  VEHICLE_LABELS,
  VehicleType,
} from '../types/sandbox';

interface LeftPaletteProps {
  snapshot: EngineSnapshot;
  onSelectTool: (tool: ActiveTool) => void;
  onRotate: (deltaDeg: number) => void;
  onScaleChange: (scale: number) => void;
  onRoadWidthChange: (width: number) => void;
  onSelectedRoadStyleChange: (style: RoadStyle) => void;
  onToggleMoveSelected: () => void;
  onDeleteSelected: () => void;
  onCommitRoad: () => void;
  onUndoRoadPoint: () => void;
  onCancelRoad: () => void;
  onToggleGrid: () => void;
  onClearMap: () => void;
  onOpenCreateNpc: (preset?: NpcTemplate) => void;
  onQuickPlaceNpc: (template: NpcTemplate) => void;
  onSelectExistingNpc: (npcId: string, openEditor?: boolean) => void;
  onOpenEditSelectedNpc: () => void;
  onOpenRelationGraph: () => void;
}

const CATEGORY_ICONS: Record<PaletteCategory, React.ReactNode> = {
  roads: <Route className="h-3.5 w-3.5 shrink-0" />,
  vehicles: <Plane className="h-3.5 w-3.5 shrink-0" />,
  middleEarth: <Castle className="h-3.5 w-3.5 shrink-0" />,
  buildings: <Building2 className="h-3.5 w-3.5 shrink-0" />,
  bazaar: <Store className="h-3.5 w-3.5 shrink-0" />,
  ancient: <Landmark className="h-3.5 w-3.5 shrink-0" />,
  leisure: <FerrisWheel className="h-3.5 w-3.5 shrink-0" />,
  nature: <Trees className="h-3.5 w-3.5 shrink-0" />,
  lighting: <LampFloor className="h-3.5 w-3.5 shrink-0" />,
  npcs: <Users className="h-3.5 w-3.5 shrink-0" />,
};

const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  zeppelin: <Plane className="h-4 w-4 shrink-0" />,
  skySkiff: <Wind className="h-4 w-4 shrink-0" />,
  classicCar: <Car className="h-4 w-4 shrink-0" />,
  sportCoupe: <Gauge className="h-4 w-4 shrink-0" />,
  medievalCarriage: <Compass className="h-4 w-4 shrink-0" />,
  warChariot: <Shield className="h-4 w-4 shrink-0" />,
};

const ROAD_ICONS: Record<RoadStyle, React.ReactNode> = {
  asphalt: <Route className="h-4 w-4 shrink-0" />,
  ancientStone: <Landmark className="h-4 w-4 shrink-0" />,
  cobblestone: <Layers className="h-4 w-4 shrink-0" />,
  dirtRoad: <Compass className="h-4 w-4 shrink-0" />,
  sidewalkPath: <Footprints className="h-4 w-4 shrink-0" />,
};

const ITEM_ICONS: Record<PlaceableType, React.ReactNode> = {
  // Binalar & Evler
  apartment5: <Building2 className="h-4 w-4 shrink-0" />,
  medVilla: <Home className="h-4 w-4 shrink-0" />,
  cottageHouse: <Home className="h-4 w-4 shrink-0" />,
  modernTower: <Building2 className="h-4 w-4 shrink-0" />,
  clockTower: <Clock className="h-4 w-4 shrink-0" />,

  // Çarşı & Ticaret
  shopGround: <Store className="h-4 w-4 shrink-0" />,
  bazaarStall: <ShoppingBag className="h-4 w-4 shrink-0" />,
  coveredBazaar: <Warehouse className="h-4 w-4 shrink-0" />,
  streetCafe: <Coffee className="h-4 w-4 shrink-0" />,
  bakeryOven: <Flame className="h-4 w-4 shrink-0" />,

  // Antik Kent & Eserler
  romanArch: <Landmark className="h-4 w-4 shrink-0" />,
  aqueductSpan: <Landmark className="h-4 w-4 shrink-0" />,
  ancientWall: <BrickWall className="h-4 w-4 shrink-0" />,
  ancientGate: <Castle className="h-4 w-4 shrink-0" />,
  ancientColumn: <Columns3 className="h-4 w-4 shrink-0" />,
  templeRuins: <Columns3 className="h-4 w-4 shrink-0" />,
  obeliskMonument: <Compass className="h-4 w-4 shrink-0" />,
  amphoraCluster: <Layers className="h-4 w-4 shrink-0" />,

  // Eğlence & Meydan
  fountain: <Droplets className="h-4 w-4 shrink-0" />,
  gazebo: <Tent className="h-4 w-4 shrink-0" />,
  bandstand: <Music className="h-4 w-4 shrink-0" />,
  carouselKiosk: <FerrisWheel className="h-4 w-4 shrink-0" />,
  playgroundSlide: <Signpost className="h-4 w-4 shrink-0" />,
  bench: <Armchair className="h-4 w-4 shrink-0" />,

  // Ağaçlar & Doğa
  palmTree: <Palmtree className="h-4 w-4 shrink-0" />,
  cypressTree: <TreePine className="h-4 w-4 shrink-0" />,
  oliveTree: <TreeDeciduous className="h-4 w-4 shrink-0" />,
  pineTree: <TreePine className="h-4 w-4 shrink-0" />,
  oakTree: <Trees className="h-4 w-4 shrink-0" />,
  flowerPlanter: <Flower2 className="h-4 w-4 shrink-0" />,

  // Aydınlatma & Sokak
  streetLamp: <LampFloor className="h-4 w-4 shrink-0" />,
  doubleBoulevardLamp: <Sun className="h-4 w-4 shrink-0" />,
  ancientTorch: <Flame className="h-4 w-4 shrink-0" />,
  modernBollardLamp: <Lightbulb className="h-4 w-4 shrink-0" />,
  pergolaStringLights: <Sparkles className="h-4 w-4 shrink-0" />,

  // Orta Dünya & Fantastik Yapılar
  hobbitBurrow: <Home className="h-4 w-4 shrink-0" />,
  wizardTower: <Sparkles className="h-4 w-4 shrink-0" />,
  elvenPavilion: <Crown className="h-4 w-4 shrink-0" />,
  dwarvenHall: <Hammer className="h-4 w-4 shrink-0" />,
  medievalKeep: <Castle className="h-4 w-4 shrink-0" />,
  fantasyTavern: <Store className="h-4 w-4 shrink-0" />,
  windmillTower: <Fan className="h-4 w-4 shrink-0" />,
  beaconTower: <Flame className="h-4 w-4 shrink-0" />,
  runeMonolith: <Gem className="h-4 w-4 shrink-0" />,
  dragonStatue: <Swords className="h-4 w-4 shrink-0" />,
};

export const LeftPalette: React.FC<LeftPaletteProps> = ({
  snapshot,
  onSelectTool,
  onRotate,
  onScaleChange,
  onRoadWidthChange,
  onSelectedRoadStyleChange,
  onToggleMoveSelected,
  onDeleteSelected,
  onCommitRoad,
  onUndoRoadPoint,
  onCancelRoad,
  onToggleGrid,
  onClearMap,
  onOpenCreateNpc,
  onQuickPlaceNpc,
  onSelectExistingNpc,
  onOpenEditSelectedNpc,
  onOpenRelationGraph,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('buildings');
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr');
  const isSearching = normalizedQuery.length > 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<PaletteCategory, number> = {
      roads: ROAD_CATALOG.length,
      vehicles: VEHICLE_CATALOG.length,
      middleEarth: 0,
      buildings: 0,
      bazaar: 0,
      ancient: 0,
      leisure: 0,
      nature: 0,
      lighting: 0,
      npcs: snapshot.npcCount,
    };
    for (const item of PLACEABLE_CATALOG) {
      counts[item.category] += 1;
    }
    return counts;
  }, [snapshot.npcCount]);

  const filteredRoads = useMemo(() => {
    if (!isSearching) return ROAD_CATALOG;
    return ROAD_CATALOG.filter(
      (r) =>
        r.name.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        r.subtitle.toLocaleLowerCase('tr').includes(normalizedQuery)
    );
  }, [isSearching, normalizedQuery]);

  const filteredVehicles = useMemo(() => {
    if (!isSearching) return VEHICLE_CATALOG;
    return VEHICLE_CATALOG.filter(
      (v) =>
        v.name.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        v.subtitle.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        (v.isFlying && 'uçan zeplin hava gemi gökyüzü'.includes(normalizedQuery)) ||
        'araç araba'.includes(normalizedQuery)
    );
  }, [isSearching, normalizedQuery]);

  const filteredObjects = useMemo(() => {
    if (isSearching) {
      return PLACEABLE_CATALOG.filter((item) =>
        item.name.toLocaleLowerCase('tr').includes(normalizedQuery)
      );
    }
    if (activeCategory === 'roads' || activeCategory === 'vehicles' || activeCategory === 'npcs') {
      return [];
    }
    return PLACEABLE_CATALOG.filter((item) => item.category === activeCategory);
  }, [activeCategory, isSearching, normalizedQuery]);

  const filteredNpcPresets = useMemo(() => {
    if (!isSearching) return NPC_PRESET_TEMPLATES;
    return NPC_PRESET_TEMPLATES.filter(
      (p) =>
        p.label.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        p.template.name.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        p.template.roleTitle.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        'npc görev karakter'.includes(normalizedQuery)
    );
  }, [isSearching, normalizedQuery]);

  const filteredSceneNpcs = useMemo(() => {
    if (!isSearching) return snapshot.npcsList;
    return snapshot.npcsList.filter(
      (n) =>
        n.name.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        n.roleTitle.toLocaleLowerCase('tr').includes(normalizedQuery)
    );
  }, [isSearching, normalizedQuery, snapshot.npcsList]);

  if (snapshot.mode !== 'editor') return null;

  if (collapsed) {
    return (
      <div className="fixed top-20 left-5 z-20">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115]/92 px-3.5 py-2.5 text-xs font-medium text-[#f3efe8] shadow-lg transition-colors hover:bg-[#1a1e26] cursor-pointer"
        >
          <PanelLeftOpen className="h-4 w-4 text-[#e59a3c]" />
          İnşa Paleti
        </button>
      </div>
    );
  }

  const isSelect = snapshot.activeTool.kind === 'select';
  const isNpcPlace = snapshot.activeTool.kind === 'npc';
  const activeRoadStyle = snapshot.activeTool.kind === 'road' ? snapshot.activeTool.style : null;
  const activePlaceType =
    snapshot.activeTool.kind === 'place' ? snapshot.activeTool.objectType : null;
  const activeVehicleType =
    snapshot.activeTool.kind === 'vehicle' ? snapshot.activeTool.vehicleType : null;

  const isTransformableSelected =
    snapshot.selected?.kind === 'object' ||
    snapshot.selected?.kind === 'npc' ||
    snapshot.selected?.kind === 'vehicle';
  const isScalableTarget =
    Boolean(activePlaceType || isNpcPlace) ||
    (isSelect && (snapshot.selected?.kind === 'object' || snapshot.selected?.kind === 'npc'));

  const activeScale =
    isSelect && (snapshot.selected?.kind === 'object' || snapshot.selected?.kind === 'npc')
      ? (snapshot.selected?.scale ?? 1)
      : snapshot.placementScale;
  const activeAngle =
    isSelect && isTransformableSelected
      ? (snapshot.selected?.rotationDeg ?? 0)
      : snapshot.placementRotationDeg;

  const showRoadsSection = isSearching ? filteredRoads.length > 0 : activeCategory === 'roads';
  const showVehiclesSection = isSearching
    ? filteredVehicles.length > 0
    : activeCategory === 'vehicles';
  const showNpcSection = isSearching
    ? filteredNpcPresets.length > 0 || filteredSceneNpcs.length > 0
    : activeCategory === 'npcs';
  const showObjectsSection = isSearching
    ? filteredObjects.length > 0
    : activeCategory !== 'roads' && activeCategory !== 'vehicles' && activeCategory !== 'npcs';
  const noSearchResults =
    isSearching &&
    filteredRoads.length === 0 &&
    filteredVehicles.length === 0 &&
    filteredObjects.length === 0 &&
    filteredNpcPresets.length === 0 &&
    filteredSceneNpcs.length === 0;

  return (
    <aside className="fixed top-[72px] bottom-16 left-5 z-20 flex w-[296px] flex-col rounded-xl border border-white/10 bg-[#0f1115]/94 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-sm font-semibold text-[#f5efe6] truncate">
            İnşa Kütüphanesi
          </span>
          <span className="font-mono text-[10px] tabular-nums text-[#8e887f]">
            {ROAD_CATALOG.length + VEHICLE_CATALOG.length + PLACEABLE_CATALOG.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleGrid}
            title="Zemin Izgarasını Göster/Gizle"
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              snapshot.showGrid
                ? 'bg-[#e59a3c]/20 text-[#f5bc6f]'
                : 'text-[#8e887f] hover:bg-white/6 hover:text-white'
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Paleti Daralt"
            className="rounded-lg p-1.5 text-[#8e887f] transition-colors hover:bg-white/6 hover:text-white cursor-pointer"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Pinned Top Controls: Select + Search + Category Tabs */}
      <div className="space-y-2.5 border-b border-white/8 px-3.5 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectTool({ kind: 'select' })}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isSelect
                ? 'bg-[#e59a3c] text-[#14110c]'
                : 'bg-white/6 text-[#e5dfd4] hover:bg-white/12'
            }`}
            title="Obje veya yol seç, taşı, sil"
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Seç
          </button>

          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#8e887f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Yapı, zeplin, araç, NPC ara..."
              className="w-full rounded-lg border border-white/8 bg-white/5 py-1.5 pr-7 pl-8 text-xs text-[#f3efe8] placeholder-[#807a71] outline-none transition-colors focus:border-[#e59a3c]/60 focus:bg-white/8"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Aramayı temizle"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-[#9b958b] hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Active Road Drawing Banner (always accessible while road tool is active) */}
        {activeRoadStyle && (
          <div className="space-y-2 rounded-lg border border-[#e59a3c]/35 bg-[#e59a3c]/12 p-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#f3d09e]">
              <span className="truncate font-medium">
                {ROAD_STYLE_LABELS[activeRoadStyle]}
              </span>
              <span className="shrink-0 font-mono tabular-nums font-semibold">
                {snapshot.activeRoadPoints} nokta
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#e7d6ba]">
                <span>Genişlik (Tekerlek)</span>
                <span className="font-mono tabular-nums font-semibold">
                  {snapshot.placementRoadWidth.toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min={2.4}
                max={14}
                step={0.2}
                value={snapshot.placementRoadWidth}
                onChange={(e) => onRoadWidthChange(parseFloat(e.target.value))}
                className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
              />
            </div>

            <div className="text-[10px] leading-snug text-[#d4bfa0]">
              Zemine tıklayıp kavis verin · Çift tık / Enter ile bitirin · Yollara otomatik kenetlenir
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCommitRoad}
                disabled={snapshot.activeRoadPoints < 2}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#e59a3c] px-2.5 py-1.5 text-[11px] font-semibold text-[#14110c] transition-opacity disabled:opacity-40 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Yolu Bitir
              </button>
              <button
                type="button"
                onClick={onUndoRoadPoint}
                disabled={snapshot.activeRoadPoints === 0}
                title="Son noktayı geri al"
                className="rounded-md bg-white/10 p-1.5 text-[#ece6dc] hover:bg-white/18 disabled:opacity-35 cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancelRoad}
                disabled={snapshot.activeRoadPoints === 0}
                title="Çizimi iptal et"
                className="rounded-md bg-white/10 p-1.5 text-[#ece6dc] hover:bg-white/18 disabled:opacity-35 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active NPC Placement Banner */}
        {isNpcPlace && (
          <div className="space-y-1.5 rounded-lg border border-[#8fd97c]/40 bg-[#8fd97c]/12 p-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#cef5c2]">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#8fd97c]" />
                NPC Yerleştirme Aktif
              </span>
              <button
                type="button"
                onClick={() => onOpenCreateNpc()}
                className="rounded bg-white/12 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/20 cursor-pointer"
              >
                Özelleştir
              </button>
            </div>
            <p className="text-[10px] leading-snug text-[#b7ddb0]">
              Zemine tıklayarak NPC bırakın · R ile döndürün · Tekerlek ile boyutu ayarlayın
            </p>
          </div>
        )}

        {/* Active Vehicle Placement Banner */}
        {activeVehicleType && (
          <div className="space-y-1 rounded-lg border border-sky-400/40 bg-sky-500/12 p-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-sky-200">
              <span className="flex items-center gap-1.5 truncate">
                {VEHICLE_ICONS[activeVehicleType]}
                <span className="truncate">{VEHICLE_LABELS[activeVehicleType]}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-sky-300/90">Araç</span>
            </div>
            <p className="text-[10px] leading-snug text-sky-100/80">
              Zemine tıklayarak yerleştirin · R ile yönünü çevirin · Oynanış Modunda E ile binin
            </p>
          </div>
        )}

        {/* 10-Category Grid */}
        {!isSearching && (
          <div className="grid grid-cols-2 gap-1">
            {PALETTE_CATEGORIES.map((cat) => {
              const selected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#e59a3c]/20 text-[#f7c57e] ring-1 ring-[#e59a3c]/45'
                      : 'bg-white/4 text-[#c7c1b7] hover:bg-white/8 hover:text-[#f5efe6]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={selected ? 'text-[#f5bc6f]' : 'text-[#8e887f]'}>
                      {CATEGORY_ICONS[cat.id]}
                    </span>
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span
                    className={`ml-1 shrink-0 font-mono text-[10px] tabular-nums ${
                      selected ? 'text-[#f5bc6f]/90' : 'text-[#767169]'
                    }`}
                  >
                    {categoryCounts[cat.id]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable Catalog List */}
      <div className="palette-scroll flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        {noSearchResults && (
          <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-6 text-center text-xs text-[#9b958b]">
            &ldquo;{searchQuery}&rdquo; ile eşleşen yapı veya yol bulunamadı.
          </div>
        )}

        {/* Roads List */}
        {showRoadsSection && (
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#9b958b]">
              <span>Yollar ve Kaldırımlar</span>
              <span className="font-mono text-[10px] tabular-nums">
                {filteredRoads.length} çeşit
              </span>
            </div>
            <div className="space-y-1">
              {filteredRoads.map((road) => {
                const active = activeRoadStyle === road.style;
                return (
                  <button
                    key={road.style}
                    type="button"
                    onClick={() => onSelectTool({ kind: 'road', style: road.style })}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e59a3c] text-[#14110c]'
                        : 'bg-white/4 text-[#e7e1d7] hover:bg-white/9'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={active ? 'text-[#14110c]' : 'text-[#e59a3c]'}>
                        {ROAD_ICONS[road.style]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium leading-tight">
                          {road.name}
                        </span>
                        <span
                          className={`block truncate text-[10px] leading-tight mt-0.5 ${
                            active ? 'text-[#14110c]/75' : 'text-[#8e887f]'
                          }`}
                        >
                          {road.subtitle}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`ml-2 shrink-0 font-mono text-[10px] tabular-nums ${
                        active ? 'text-[#14110c]/85' : 'text-[#8e887f]'
                      }`}
                    >
                      {road.defaultWidth.toFixed(1)}m
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Vehicles List */}
        {showVehiclesSection && (
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#9b958b]">
              <span>Kara & Gökyüzü Araçları</span>
              <span className="font-mono text-[10px] tabular-nums">
                {filteredVehicles.length} araç
              </span>
            </div>
            <div className="space-y-1">
              {filteredVehicles.map((vehicle) => {
                const active = activeVehicleType === vehicle.type;
                return (
                  <button
                    key={vehicle.type}
                    type="button"
                    onClick={() => onSelectTool({ kind: 'vehicle', vehicleType: vehicle.type })}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e59a3c] text-[#14110c]'
                        : 'bg-white/4 text-[#e7e1d7] hover:bg-white/9'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={
                          active
                            ? 'text-[#14110c]'
                            : vehicle.isFlying
                              ? 'text-sky-400'
                              : 'text-[#e59a3c]'
                        }
                      >
                        {VEHICLE_ICONS[vehicle.type]}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-xs font-medium leading-tight">
                          <span className="truncate">{vehicle.name}</span>
                          {vehicle.isFlying && (
                            <span
                              className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-semibold tracking-wide ${
                                active
                                  ? 'bg-[#14110c]/15 text-[#14110c]'
                                  : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              UÇAR
                            </span>
                          )}
                        </span>
                        <span
                          className={`block truncate text-[10px] leading-tight mt-0.5 ${
                            active ? 'text-[#14110c]/75' : 'text-[#8e887f]'
                          }`}
                        >
                          {vehicle.subtitle}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`ml-2 shrink-0 font-mono text-[10px] tabular-nums ${
                        active ? 'text-[#14110c]/85' : 'text-[#8e887f]'
                      }`}
                    >
                      {vehicle.maxSpeedKmh} km/s
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg border border-white/6 bg-white/3 px-2.5 py-2 text-[10px] leading-relaxed text-[#9b958b]">
              Oynanış Modunda (TAB) aracın yanına yaklaşıp <strong className="font-mono text-[#e7e1d7]">E</strong> ile binin. Uçan araçlarda <strong className="font-mono text-sky-300">Space</strong> yükselir, <strong className="font-mono text-sky-300">Shift</strong> alçalır.
            </div>
          </section>
        )}

        {/* Objects List */}
        {showObjectsSection && (
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#9b958b]">
              <span>
                {isSearching
                  ? 'Eşleşen Yapı & Objeler'
                  : PALETTE_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
              <span className="font-mono text-[10px] tabular-nums">
                {filteredObjects.length} adet
              </span>
            </div>
            <div className="space-y-1">
              {filteredObjects.map((item) => {
                const active = activePlaceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onSelectTool({ kind: 'place', objectType: item.type })}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e59a3c] text-[#14110c]'
                        : 'bg-white/4 text-[#e7e1d7] hover:bg-white/9'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={active ? 'text-[#14110c]' : 'text-[#e59a3c]'}>
                        {ITEM_ICONS[item.type]}
                      </span>
                      <span className="truncate text-xs font-medium">{item.name}</span>
                    </span>
                    <span
                      className={`ml-2 shrink-0 font-mono text-[10px] tabular-nums ${
                        active ? 'text-[#14110c]/80' : 'text-[#8e887f]'
                      }`}
                    >
                      {item.footprintLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* NPC & Quest Studio Section */}
        {showNpcSection && (
          <section className="space-y-3">
            {/* Primary Create Custom NPC CTA + D3 Relation Graph Trigger */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onOpenCreateNpc()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e59a3c] px-3 py-2 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Özel NPC Tasarla & Oluştur
              </button>
              <button
                type="button"
                onClick={onOpenRelationGraph}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-[#f2ece2] transition-colors hover:border-[#e59a3c]/45 hover:bg-white/10 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-[#e59a3c]" />
                  NPC İlişki Ağı (D3)
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#9b958b]">
                  {snapshot.npcRelations.length} bağ
                </span>
              </button>
            </div>

            {/* Quick Presets */}
            {filteredNpcPresets.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#9b958b]">
                  <span>Hazır NPC Şablonları</span>
                  <span className="font-mono text-[10px] tabular-nums">
                    {filteredNpcPresets.length} şablon
                  </span>
                </div>
                <div className="space-y-1">
                  {filteredNpcPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-1 rounded-lg bg-white/4 p-1 transition-colors hover:bg-white/8"
                    >
                      <button
                        type="button"
                        onClick={() => onQuickPlaceNpc(preset.template)}
                        title="Hemen haritaya yerleştir"
                        className="flex flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left cursor-pointer min-w-0"
                      >
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25"
                          style={{ backgroundColor: preset.template.primaryColor }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-[#f2ece2] leading-tight">
                            {preset.label}
                          </span>
                          <span className="block truncate text-[10px] text-[#8e887f] leading-tight mt-0.5">
                            {preset.template.gender === 'female' ? 'Kadın' : 'Erkek'} ·{' '}
                            {NPC_OUTFIT_LABELS[preset.template.outfit]}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCreateNpc(preset.template)}
                        title="Bu şablonu özelleştir"
                        className="shrink-0 rounded-md bg-white/6 p-2 text-[#c7c1b7] transition-colors hover:bg-[#e59a3c]/25 hover:text-[#f7c57e] cursor-pointer"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Placed NPCs in Scene */}
            <div className="space-y-1.5 border-t border-white/8 pt-2.5">
              <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#9b958b]">
                <span>Sahnedeki NPC’ler</span>
                <span className="font-mono text-[10px] tabular-nums">
                  {filteredSceneNpcs.length}
                </span>
              </div>

              {filteredSceneNpcs.length === 0 ? (
                <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-3 text-center text-[11px] text-[#8e887f]">
                  Henüz sahnede NPC yok. Yukarıdan tasarla veya şablon seç.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSceneNpcs.map((npc) => {
                    const isSelectedNpc =
                      snapshot.selected?.kind === 'npc' && snapshot.selected.id === npc.id;
                    return (
                      <div
                        key={npc.id}
                        className={`flex items-center gap-1 rounded-lg p-1 transition-colors ${
                          isSelectedNpc
                            ? 'bg-[#e59a3c]/20 ring-1 ring-[#e59a3c]/55'
                            : 'bg-white/4 hover:bg-white/8'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectExistingNpc(npc.id, false)}
                          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left cursor-pointer min-w-0"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-white/25"
                            style={{ backgroundColor: npc.primaryColor }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1 truncate text-xs font-medium text-[#f5efe6] leading-tight">
                              <span className="truncate">{npc.name}</span>
                              {npc.quest.enabled && (
                                <ScrollText className="h-3 w-3 shrink-0 text-[#e59a3c]" />
                              )}
                            </span>
                            <span className="block truncate text-[10px] text-[#8e887f] leading-tight mt-0.5">
                              {npc.roleTitle}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectExistingNpc(npc.id, true)}
                          title="NPC’yi düzenle"
                          className="shrink-0 rounded-md bg-white/6 p-1.5 text-[#c7c1b7] transition-colors hover:bg-[#e59a3c]/25 hover:text-[#f7c57e] cursor-pointer"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Docked Placement Transform OR Selected Entity Inspector */}
      {(activePlaceType || activeVehicleType || isNpcPlace || snapshot.selected) && (
        <div className="border-t border-white/8 bg-[#14171d]/95 px-3.5 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-medium text-[#d6d0c6]">
              {snapshot.selected
                ? `Seçili: ${snapshot.selected.label}`
                : activeVehicleType
                  ? `Araç: ${VEHICLE_LABELS[activeVehicleType]}`
                  : isNpcPlace
                    ? 'NPC Yerleştirme Ayarı'
                    : 'Yerleştirme Ayarı'}
            </span>
            {isTransformableSelected && snapshot.selected?.position && (
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#8e887f]">
                {snapshot.selected.position[0]}, {snapshot.selected.position[2]}
              </span>
            )}
          </div>

          {(activePlaceType || activeVehicleType || isNpcPlace || isTransformableSelected) && (
            <div className="space-y-2 rounded-lg bg-white/4 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#c7c1b7]">Açı (R)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRotate(-15)}
                    className="rounded bg-white/8 p-1 text-[#e8e2d8] hover:bg-white/15 cursor-pointer"
                    title="-15° Döndür"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <span className="w-11 text-center font-mono text-xs tabular-nums text-[#f5efe6]">
                    {activeAngle}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onRotate(15)}
                    className="rounded bg-white/8 p-1 text-[#e8e2d8] hover:bg-white/15 cursor-pointer"
                    title="+15° Döndür"
                  >
                    <RotateCw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {isScalableTarget && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#c7c1b7]">
                      {isNpcPlace || snapshot.selected?.kind === 'npc' ? 'Boyut (Tekerlek)' : 'Ölçek (Tekerlek)'}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#f5efe6]">
                      {activeScale.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={isNpcPlace || snapshot.selected?.kind === 'npc' ? 0.7 : 0.5}
                    max={isNpcPlace || snapshot.selected?.kind === 'npc' ? 1.8 : 2.5}
                    step={0.05}
                    value={activeScale}
                    onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                    className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {snapshot.selected?.kind === 'road' && (
            <div className="space-y-2 rounded-lg bg-white/4 p-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#c7c1b7]">Yol Genişliği</span>
                  <span className="font-mono text-xs tabular-nums text-[#f5efe6]">
                    {(snapshot.selected.roadWidth ?? 6).toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min={2.4}
                  max={14}
                  step={0.2}
                  value={snapshot.selected.roadWidth ?? 6}
                  onChange={(e) => onRoadWidthChange(parseFloat(e.target.value))}
                  className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-[#9b958b]">Yol Tipini Değiştir</span>
                <div className="grid grid-cols-2 gap-1">
                  {ROAD_CATALOG.map((rc) => {
                    const isCurrent = snapshot.selected?.roadStyle === rc.style;
                    return (
                      <button
                        key={rc.style}
                        type="button"
                        onClick={() => onSelectedRoadStyleChange(rc.style)}
                        className={`truncate rounded px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#e59a3c] text-[#14110c]'
                            : 'bg-white/6 text-[#d8d2c7] hover:bg-white/12'
                        }`}
                      >
                        {rc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {snapshot.selected && (
            <div className="space-y-1.5">
              {snapshot.selected.kind === 'npc' && (
                <button
                  type="button"
                  onClick={onOpenEditSelectedNpc}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#e59a3c] px-2.5 py-1.5 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Kıyafet, Replik & Görev Düzenle
                </button>
              )}
              <div className="flex items-center gap-1.5">
                {isTransformableSelected && (
                  <button
                    type="button"
                    onClick={onToggleMoveSelected}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      snapshot.isMovingSelected
                        ? 'bg-[#e59a3c] text-[#14110c]'
                        : 'bg-white/8 text-[#ece6dc] hover:bg-white/14'
                    }`}
                  >
                    <Move className="h-3.5 w-3.5" />
                    {snapshot.isMovingSelected ? 'Konum Seç...' : 'Taşı (G)'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#dc5b4b]/18 px-2.5 py-1.5 text-xs font-medium text-[#f48b7e] transition-colors hover:bg-[#dc5b4b]/28 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil (Del)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/8 px-3.5 py-2 text-[11px] text-[#9b958b]">
        <span className="font-mono tabular-nums">
          {snapshot.objectCount} yapı · {snapshot.vehicleCount} araç · {snapshot.npcCount} NPC
        </span>
        <button
          type="button"
          onClick={onClearMap}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[#b8b1a6] transition-colors hover:bg-white/8 hover:text-[#f48b7e] cursor-pointer"
        >
          <Eraser className="h-3 w-3" />
          Temizle
        </button>
      </div>
    </aside>
  );
};
