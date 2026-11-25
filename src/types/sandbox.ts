export type AppMode = 'editor' | 'play';

export type TimeOfDay = 'golden' | 'noon' | 'night';

export type RoadStyle =
  | 'asphalt'
  | 'ancientStone'
  | 'dirtRoad'
  | 'cobblestone'
  | 'sidewalkPath';

export type PaletteCategory =
  | 'roads'
  | 'buildings'
  | 'bazaar'
  | 'ancient'
  | 'middleEarth'
  | 'vehicles'
  | 'leisure'
  | 'nature'
  | 'lighting'
  | 'npcs';

export type VehicleType =
  | 'zeppelin'
  | 'skySkiff'
  | 'classicCar'
  | 'sportCoupe'
  | 'medievalCarriage'
  | 'warChariot';

export type NpcGender = 'male' | 'female';

export type NpcOutfit =
  | 'citizen'
  | 'merchant'
  | 'romanToga'
  | 'guard'
  | 'artisan'
  | 'noble';

export type NpcQuestObjectiveType = 'talk' | 'visit' | 'explore' | 'drive';

export type QuestStatus = 'available' | 'active' | 'ready' | 'completed';

export interface NpcQuestData {
  enabled: boolean;
  title: string;
  description: string;
  objectiveType: NpcQuestObjectiveType;
  targetAmount: number;
  targetPosition?: [number, number];
  rewardGold: number;
  rewardXp: number;
  rewardItem: string;
}

export interface NpcTemplate {
  name: string;
  roleTitle: string;
  gender: NpcGender;
  outfit: NpcOutfit;
  primaryColor: string;
  secondaryColor: string;
  skinTone: string;
  hairColor: string;
  dialogues: string[];
  quest: NpcQuestData;
}

export interface NpcData extends NpcTemplate {
  id: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface ActiveQuestRuntime {
  npcId: string;
  npcName: string;
  status: QuestStatus;
  progress: number;
  target: number;
  quest: NpcQuestData;
}

export type NpcRelationType = 'ally' | 'trade' | 'mentor' | 'family' | 'rival' | 'secret';

export interface NpcRelationData {
  id: string;
  sourceId: string;
  targetId: string;
  type: NpcRelationType;
  label: string;
  strength: number; // 1..5
}

export interface PlayerRewardsState {
  gold: number;
  xp: number;
  items: string[];
  completedCount: number;
}

export type PlaceableType =
  // Binalar & Evler
  | 'apartment5'
  | 'medVilla'
  | 'cottageHouse'
  | 'modernTower'
  | 'clockTower'
  // Çarşı & Ticaret
  | 'shopGround'
  | 'bazaarStall'
  | 'coveredBazaar'
  | 'streetCafe'
  | 'bakeryOven'
  // Antik Kent & Eserler
  | 'romanArch'
  | 'aqueductSpan'
  | 'ancientWall'
  | 'ancientGate'
  | 'ancientColumn'
  | 'templeRuins'
  | 'obeliskMonument'
  | 'amphoraCluster'
  // Eğlence & Meydan
  | 'fountain'
  | 'gazebo'
  | 'bandstand'
  | 'carouselKiosk'
  | 'playgroundSlide'
  | 'bench'
  // Ağaçlar & Doğa
  | 'palmTree'
  | 'cypressTree'
  | 'oliveTree'
  | 'pineTree'
  | 'oakTree'
  | 'flowerPlanter'
  // Aydınlatma & Sokak
  | 'streetLamp'
  | 'doubleBoulevardLamp'
  | 'ancientTorch'
  | 'modernBollardLamp'
  | 'pergolaStringLights'
  // Orta Dünya & Fantastik Yapılar
  | 'hobbitBurrow'
  | 'wizardTower'
  | 'elvenPavilion'
  | 'dwarvenHall'
  | 'medievalKeep'
  | 'fantasyTavern'
  | 'windmillTower'
  | 'beaconTower'
  | 'runeMonolith'
  | 'dragonStatue';

export type ActiveTool =
  | { kind: 'select' }
  | { kind: 'road'; style: RoadStyle }
  | { kind: 'place'; objectType: PlaceableType }
  | { kind: 'vehicle'; vehicleType: VehicleType }
  | { kind: 'npc' };

export interface PlacedVehicleData {
  id: string;
  type: VehicleType;
  position: [number, number, number];
  rotationY: number;
}

export interface PlacedObjectData {
  id: string;
  type: PlaceableType;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface RoadData {
  id: string;
  style: RoadStyle;
  width: number;
  points: [number, number][];
}

export interface CarTransformData {
  position: [number, number, number];
  rotationY: number;
}

export interface MapDocument {
  version: 1;
  name: string;
  timeOfDay: TimeOfDay;
  carTransform: CarTransformData;
  objects: PlacedObjectData[];
  roads: RoadData[];
  vehicles?: PlacedVehicleData[];
  npcs?: NpcData[];
  npcRelations?: NpcRelationData[];
}

export interface SelectedEntityInfo {
  kind: 'object' | 'road' | 'npc' | 'vehicle';
  id: string;
  label: string;
  position?: [number, number, number];
  rotationDeg?: number;
  scale?: number;
  pointCount?: number;
  roadStyle?: RoadStyle;
  roadWidth?: number;
  npcData?: NpcData;
  vehicleType?: VehicleType;
}

export interface EngineSnapshot {
  mode: AppMode;
  timeOfDay: TimeOfDay;
  activeTool: ActiveTool;
  placementRotationDeg: number;
  placementScale: number;
  placementRoadWidth: number;
  isMovingSelected: boolean;
  selected: SelectedEntityInfo | null;
  activeRoadPoints: number;
  showGrid: boolean;
  objectCount: number;
  roadCount: number;
  vehicleCount: number;
  npcCount: number;
  npcsList: NpcData[];
  npcRelations: NpcRelationData[];
  inVehicle: boolean;
  activeVehicleName: string | null;
  activeVehicleIsFlying: boolean;
  nearVehicle: boolean;
  nearVehicleName: string | null;
  nearVehicleIsFlying: boolean;
  nearNpc: NpcData | null;
  quests: Record<string, ActiveQuestRuntime>;
  playerRewards: PlayerRewardsState;
  speedKmh: number;
  altitudeM: number;
  pointerLocked: boolean;
}

export interface RoadCatalogItem {
  style: RoadStyle;
  name: string;
  subtitle: string;
  defaultWidth: number;
}

export interface VehicleCatalogItem {
  type: VehicleType;
  name: string;
  subtitle: string;
  isFlying: boolean;
  maxSpeedKmh: number;
}

export interface CatalogItem {
  type: PlaceableType;
  name: string;
  category: Exclude<PaletteCategory, 'roads' | 'npcs' | 'vehicles'>;
  footprintLabel: string;
  defaultScale: number;
}

export const PALETTE_CATEGORIES: { id: PaletteCategory; label: string }[] = [
  { id: 'roads', label: 'Yollar' },
  { id: 'vehicles', label: 'Araçlar' },
  { id: 'middleEarth', label: 'Orta Dünya' },
  { id: 'buildings', label: 'Bina & Ev' },
  { id: 'bazaar', label: 'Çarşı' },
  { id: 'ancient', label: 'Antik Kent' },
  { id: 'leisure', label: 'Eğlence' },
  { id: 'nature', label: 'Ağaçlar' },
  { id: 'lighting', label: 'Lambalar' },
  { id: 'npcs', label: 'NPC & Görev' },
];

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  {
    type: 'zeppelin',
    name: 'Uçan Zeplin',
    subtitle: 'Buharlı gökyüzü gemisi (Uçabilir)',
    isFlying: true,
    maxSpeedKmh: 76,
  },
  {
    type: 'skySkiff',
    name: 'Elf Hava Kayığı',
    subtitle: 'Kristal itkili hızlı uçan kayık',
    isFlying: true,
    maxSpeedKmh: 96,
  },
  {
    type: 'classicCar',
    name: 'Klasik Üstü Açık',
    subtitle: 'Akdeniz kırmızı roadster',
    isFlying: false,
    maxSpeedKmh: 90,
  },
  {
    type: 'sportCoupe',
    name: 'Modern Spor Araç',
    subtitle: 'Yüksek hızlı safir spor coupe',
    isFlying: false,
    maxSpeedKmh: 122,
  },
  {
    type: 'medievalCarriage',
    name: 'Orta Dünya Arabası',
    subtitle: 'Tente örtülü ahşap yolcu arabası',
    isFlying: false,
    maxSpeedKmh: 58,
  },
  {
    type: 'warChariot',
    name: 'Antik Savaş Arabası',
    subtitle: 'Bronz kaplı hızlı Roma arabası',
    isFlying: false,
    maxSpeedKmh: 74,
  },
];

export const VEHICLE_LABELS: Record<VehicleType, string> = Object.fromEntries(
  VEHICLE_CATALOG.map((v) => [v.type, v.name])
) as Record<VehicleType, string>;

export const NPC_OUTFIT_LABELS: Record<NpcOutfit, string> = {
  citizen: 'Sivil Akdeniz',
  merchant: 'Çarşı Tüccarı',
  romanToga: 'Antik Roma Togası',
  guard: 'Şehir Muhafızı',
  artisan: 'Zanaatkar / Esnaf',
  noble: 'Soylu / Aristokrat',
};

export const NPC_QUEST_TYPE_LABELS: Record<NpcQuestObjectiveType, string> = {
  talk: 'Sohbet / Mesaj Görevi',
  visit: 'Konuma Git (3D İşaretçi)',
  explore: 'Şehirde Yürüyüş Keşfi',
  drive: 'Klasik Araç Sürüşü',
};

export const NPC_RELATION_META: Record<
  NpcRelationType,
  { label: string; shortLabel: string; color: string }
> = {
  ally: { label: 'Müttefik / Dost', shortLabel: 'Dost', color: '#5cc88a' },
  trade: { label: 'Ticaret Ortağı', shortLabel: 'Ticaret', color: '#e59a3c' },
  mentor: { label: 'Usta / Rehber', shortLabel: 'Rehber', color: '#6cb6ff' },
  family: { label: 'Aile / Akraba', shortLabel: 'Aile', color: '#df85d6' },
  rival: { label: 'Rakip / Gerilim', shortLabel: 'Rakip', color: '#e3645b' },
  secret: { label: 'Gizli Bağlantı', shortLabel: 'Gizli', color: '#a58cf5' },
};

export const NPC_PRESET_TEMPLATES: { id: string; label: string; template: NpcTemplate }[] = [
  {
    id: 'merchant',
    label: 'Çarşı Tüccarı',
    template: {
      name: 'Usta Kerem',
      roleTitle: 'Baharat Tüccarı',
      gender: 'male',
      outfit: 'merchant',
      primaryColor: '#b84a32',
      secondaryColor: '#e8c47a',
      skinTone: '#d9a47c',
      hairColor: '#2a1d14',
      dialogues: [
        'Hoş geldin gezgin! Çarşımızın en taze baharatları ve kumaşları burada.',
        'Bugün meydan çok hareketli, şehrin yeni sokaklarını keşfetmek ister misin?',
      ],
      quest: {
        enabled: true,
        title: 'Çarşı & Meydan Yürüyüşü',
        description: 'Şehrin sokaklarında yaya olarak dolaş ve esnafı selamla.',
        objectiveType: 'explore',
        targetAmount: 35,
        rewardGold: 150,
        rewardXp: 60,
        rewardItem: 'Safran Kesesi',
      },
    },
  },
  {
    id: 'romanScholar',
    label: 'Antik Rehber',
    template: {
      name: 'Aylin',
      roleTitle: 'Antik Kent Tarihçisi',
      gender: 'female',
      outfit: 'romanToga',
      primaryColor: '#efe6d5',
      secondaryColor: '#9f2f2b',
      skinTone: '#e6b895',
      hairColor: '#3a2216',
      dialogues: [
        'Bu kemerler binlerce yıl önce Akdeniz ticaret yolunu koruyordu.',
        'Dikilitaşın yanındaki yazıtları inceleyip bana döner misin?',
      ],
      quest: {
        enabled: true,
        title: 'Antik Yazıt İncelemesi',
        description: 'Altın ışık sütunuyla işaretlenen antik kalıntı noktasına ulaş.',
        objectiveType: 'visit',
        targetAmount: 18,
        rewardGold: 240,
        rewardXp: 95,
        rewardItem: 'Roma Mührü',
      },
    },
  },
  {
    id: 'guard',
    label: 'Şehir Muhafızı',
    template: {
      name: 'Komutan Marcus',
      roleTitle: 'Bulvar Muhafızı',
      gender: 'male',
      outfit: 'guard',
      primaryColor: '#3d4c5c',
      secondaryColor: '#c48f38',
      skinTone: '#d7a278',
      hairColor: '#231c18',
      dialogues: [
        'Selamlar! Ana bulvar yeni döşendi ve güvenlik kontrolü gerekiyor.',
        'Klasik üstü açık otomobille bulvarda kısa bir devriye turu atabilir misin?',
      ],
      quest: {
        enabled: true,
        title: 'Bulvar Devriye Sürüşü',
        description: 'Klasik araca bin (E) ve şehir yollarında sürüş yaparak kontrol sağla.',
        objectiveType: 'drive',
        targetAmount: 65,
        rewardGold: 300,
        rewardXp: 120,
        rewardItem: 'Altın Defne Anahtarlığı',
      },
    },
  },
  {
    id: 'citizen',
    label: 'Sivil Vatandaş',
    template: {
      name: 'Defne',
      roleTitle: 'Şehir Sakini',
      gender: 'female',
      outfit: 'citizen',
      primaryColor: '#2f6d82',
      secondaryColor: '#f0e4cf',
      skinTone: '#e8bc99',
      hairColor: '#5e3a20',
      dialogues: [
        'Altın saat ışığında bu meydan gerçekten harika görünüyor!',
        'Yeni binalar ve parklar şehre bambaşka bir ruh kattı.',
      ],
      quest: {
        enabled: true,
        title: 'Meydan Sohbeti',
        description: 'Şehir sakiniyle tanış ve meydan hakkında bilgi al.',
        objectiveType: 'talk',
        targetAmount: 1,
        rewardGold: 80,
        rewardXp: 40,
        rewardItem: 'Zeytin Dalı Broşu',
      },
    },
  },
  {
    id: 'artisan',
    label: 'Taş Ustası',
    template: {
      name: 'Mimar Sinan Usta',
      roleTitle: 'Taş & Mermer Ustası',
      gender: 'male',
      outfit: 'artisan',
      primaryColor: '#7b5539',
      secondaryColor: '#d9ccb6',
      skinTone: '#cf9870',
      hairColor: '#4c4640',
      dialogues: [
        'Her traverten bloğunu özenle yontuyoruz. Sağlam şehir sağlam temelle kurulur.',
        'Meydan çevresindeki yapıları inceleyip bana fikirlerini getir!',
      ],
      quest: {
        enabled: true,
        title: 'Mimari Keşif Turu',
        description: 'Şehirde yaya olarak gezinerek yeni yapıları incele.',
        objectiveType: 'explore',
        targetAmount: 45,
        rewardGold: 190,
        rewardXp: 85,
        rewardItem: 'Usta Pergeli',
      },
    },
  },
  {
    id: 'noble',
    label: 'Soylu Gezgin',
    template: {
      name: 'Leydi Elena',
      roleTitle: 'Kültür Hamisi',
      gender: 'female',
      outfit: 'noble',
      primaryColor: '#6d2e5c',
      secondaryColor: '#dfb458',
      skinTone: '#ecc5a6',
      hairColor: '#2c1b12',
      dialogues: [
        'Sanat, mimari ve müzik bu kentin kalbidir.',
        'Şehrimize yakışan büyük bir kültür şenliği planlıyoruz, desteğin çok değerli.',
      ],
      quest: {
        enabled: true,
        title: 'Kültür Elçisi Görevi',
        description: 'Kültür hamisinin davetini kabul et ve şenlik hazırlığına katıl.',
        objectiveType: 'talk',
        targetAmount: 1,
        rewardGold: 220,
        rewardXp: 90,
        rewardItem: 'Soylu Davetiyesi',
      },
    },
  },
];

export const ROAD_CATALOG: RoadCatalogItem[] = [
  {
    style: 'asphalt',
    name: 'Asfalt Yol',
    subtitle: 'Şeritli, çift kaldırımlı cadde',
    defaultWidth: 8.2,
  },
  {
    style: 'ancientStone',
    name: 'Antik Taş Yol',
    subtitle: 'Roma blok taş döşeme',
    defaultWidth: 5.6,
  },
  {
    style: 'cobblestone',
    name: 'Arnavut Kaldırımı',
    subtitle: 'Tarihi küp taş çarşı sokağı',
    defaultWidth: 5.8,
  },
  {
    style: 'dirtRoad',
    name: 'Toprak Yol',
    subtitle: 'Tekerlek izli köy / arazi yolu',
    defaultWidth: 4.8,
  },
  {
    style: 'sidewalkPath',
    name: 'Normal Kaldırım',
    subtitle: 'Karo döşeli yaya yürüyüş yolu',
    defaultWidth: 3.2,
  },
];

export const ROAD_STYLE_LABELS: Record<RoadStyle, string> = {
  asphalt: 'Asfalt Yol',
  ancientStone: 'Antik Taş Yol',
  cobblestone: 'Arnavut Kaldırımı',
  dirtRoad: 'Toprak Yol',
  sidewalkPath: 'Normal Kaldırım',
};

export const ROAD_DEFAULT_WIDTHS: Record<RoadStyle, number> = {
  asphalt: 8.2,
  ancientStone: 5.6,
  cobblestone: 5.8,
  dirtRoad: 4.8,
  sidewalkPath: 3.2,
};

export const PLACEABLE_CATALOG: CatalogItem[] = [
  // Binalar & Evler
  { type: 'apartment5', name: '5 Katlı Apartman', category: 'buildings', footprintLabel: '10 × 8 m', defaultScale: 1 },
  { type: 'medVilla', name: 'Akdeniz Taş Ev', category: 'buildings', footprintLabel: '8 × 7 m', defaultScale: 1 },
  { type: 'cottageHouse', name: 'Bahçeli Köy Evi', category: 'buildings', footprintLabel: '6.5 × 6 m', defaultScale: 1 },
  { type: 'modernTower', name: 'Modern Cam Plaza', category: 'buildings', footprintLabel: '11 × 11 m', defaultScale: 1 },
  { type: 'clockTower', name: 'Meydan Saat Kulesi', category: 'buildings', footprintLabel: '4 × 4 m', defaultScale: 1 },

  // Çarşı & Ticaret
  { type: 'shopGround', name: 'Esnaf Dükkanı', category: 'bazaar', footprintLabel: '8 × 6 m', defaultScale: 1 },
  { type: 'bazaarStall', name: 'Pazar Tezgahı', category: 'bazaar', footprintLabel: '3.6 × 2.2 m', defaultScale: 1 },
  { type: 'coveredBazaar', name: 'Kapalı Çarşı Kemeri', category: 'bazaar', footprintLabel: '10 × 5 m', defaultScale: 1 },
  { type: 'streetCafe', name: 'Sokak Kafesi', category: 'bazaar', footprintLabel: '6 × 5 m', defaultScale: 1 },
  { type: 'bakeryOven', name: 'Taş Fırın & Pastane', category: 'bazaar', footprintLabel: '6 × 5.5 m', defaultScale: 1 },

  // Antik Kent & Eserler
  { type: 'romanArch', name: 'Antik Roma Kemeri', category: 'ancient', footprintLabel: '10 × 3 m', defaultScale: 1 },
  { type: 'aqueductSpan', name: 'Antik Su Kemeri', category: 'ancient', footprintLabel: '12 × 2.8 m', defaultScale: 1 },
  { type: 'ancientWall', name: 'Antik Sur Duvarı', category: 'ancient', footprintLabel: '10 × 2.2 m', defaultScale: 1 },
  { type: 'ancientGate', name: 'Antik Kent Kapısı', category: 'ancient', footprintLabel: '12 × 4.5 m', defaultScale: 1 },
  { type: 'ancientColumn', name: 'Antik Yivli Sütun', category: 'ancient', footprintLabel: '1.6 × 1.6 m', defaultScale: 1 },
  { type: 'templeRuins', name: 'Antik Tapınak Harabesi', category: 'ancient', footprintLabel: '9 × 7 m', defaultScale: 1 },
  { type: 'obeliskMonument', name: 'Dikilitaş & Antik Eser', category: 'ancient', footprintLabel: '3.2 × 3.2 m', defaultScale: 1 },
  { type: 'amphoraCluster', name: 'Antik Amfora & Kalıntı', category: 'ancient', footprintLabel: '2.4 × 2.2 m', defaultScale: 1 },

  // Eğlence & Meydan
  { type: 'fountain', name: 'Meydan Fıskiyesi', category: 'leisure', footprintLabel: '5.5 × 5.5 m', defaultScale: 1 },
  { type: 'gazebo', name: 'Park Kameriyesi', category: 'leisure', footprintLabel: '5 × 5 m', defaultScale: 1 },
  { type: 'bandstand', name: 'Açık Hava Sahnesi', category: 'leisure', footprintLabel: '9 × 6 m', defaultScale: 1 },
  { type: 'carouselKiosk', name: 'Lunapark Atlıkarınca', category: 'leisure', footprintLabel: '7.5 × 7.5 m', defaultScale: 1 },
  { type: 'playgroundSlide', name: 'Çocuk Parkı Kulesi', category: 'leisure', footprintLabel: '4.8 × 3.4 m', defaultScale: 1 },
  { type: 'bench', name: 'Park Bankı', category: 'leisure', footprintLabel: '2.2 × 0.9 m', defaultScale: 1 },

  // Ağaçlar & Doğa
  { type: 'palmTree', name: 'Palmiye Ağacı', category: 'nature', footprintLabel: '2 × 2 m', defaultScale: 1 },
  { type: 'cypressTree', name: 'Akdeniz Selvisi', category: 'nature', footprintLabel: '1.8 × 1.8 m', defaultScale: 1 },
  { type: 'oliveTree', name: 'Asırlık Zeytin Ağacı', category: 'nature', footprintLabel: '3.5 × 3.5 m', defaultScale: 1 },
  { type: 'pineTree', name: 'Fıstık Çamı', category: 'nature', footprintLabel: '4 × 4 m', defaultScale: 1 },
  { type: 'oakTree', name: 'Çınar / Meşe Ağacı', category: 'nature', footprintLabel: '4.5 × 4.5 m', defaultScale: 1 },
  { type: 'flowerPlanter', name: 'Çiçeklik & Çalı', category: 'nature', footprintLabel: '2.4 × 1.2 m', defaultScale: 1 },

  // Aydınlatma & Sokak
  { type: 'streetLamp', name: 'Klasik Sokak Lambası', category: 'lighting', footprintLabel: '0.8 × 0.8 m', defaultScale: 1 },
  { type: 'doubleBoulevardLamp', name: 'Çift Kollu Bulvar Lambası', category: 'lighting', footprintLabel: '1.4 × 0.9 m', defaultScale: 1 },
  { type: 'ancientTorch', name: 'Antik Meşale / Mangal', category: 'lighting', footprintLabel: '1.1 × 1.1 m', defaultScale: 1 },
  { type: 'modernBollardLamp', name: 'Park Bollard Lambası', category: 'lighting', footprintLabel: '0.5 × 0.5 m', defaultScale: 1 },
  { type: 'pergolaStringLights', name: 'Işıklı Sokak Pergolası', category: 'lighting', footprintLabel: '6.5 × 1.2 m', defaultScale: 1 },

  // Orta Dünya & Fantastik Yapılar
  { type: 'hobbitBurrow', name: 'Hobbit Tepeli Evi', category: 'middleEarth', footprintLabel: '8.5 × 7.5 m', defaultScale: 1 },
  { type: 'wizardTower', name: 'Kara Büyücü Kulesi', category: 'middleEarth', footprintLabel: '7 × 7 m', defaultScale: 1 },
  { type: 'elvenPavilion', name: 'Elf Yıldız Köşkü', category: 'middleEarth', footprintLabel: '7 × 7 m', defaultScale: 1 },
  { type: 'dwarvenHall', name: 'Cüce Taş Salonu', category: 'middleEarth', footprintLabel: '10 × 7 m', defaultScale: 1 },
  { type: 'medievalKeep', name: 'Orta Dünya Kale Burcu', category: 'middleEarth', footprintLabel: '9.5 × 9.5 m', defaultScale: 1 },
  { type: 'fantasyTavern', name: 'Orta Dünya Hanı', category: 'middleEarth', footprintLabel: '9 × 7 m', defaultScale: 1 },
  { type: 'windmillTower', name: 'Köy Yel Değirmeni', category: 'middleEarth', footprintLabel: '5.5 × 5.5 m', defaultScale: 1 },
  { type: 'beaconTower', name: 'İşaret Ateşi Kulesi', category: 'middleEarth', footprintLabel: '5 × 5 m', defaultScale: 1 },
  { type: 'runeMonolith', name: 'Kadim Rün Dikilitaşı', category: 'middleEarth', footprintLabel: '5.5 × 5.5 m', defaultScale: 1 },
  { type: 'dragonStatue', name: 'Ejderha Muhafız Anıtı', category: 'middleEarth', footprintLabel: '4.5 × 4.5 m', defaultScale: 1 },
];

export const PLACEABLE_LABELS: Record<PlaceableType, string> = Object.fromEntries(
  PLACEABLE_CATALOG.map((item) => [item.type, item.name])
) as Record<PlaceableType, string>;

export function createDefaultDemoMap(): MapDocument {
  const deg = (d: number) => (d * Math.PI) / 180;
  return {
    version: 1,
    name: 'Akdeniz Antik Meydanı & Çarşı',
    timeOfDay: 'golden',
    carTransform: {
      position: [12, 0, 12.2],
      rotationY: deg(-80),
    },
    roads: [
      {
        id: 'road-main-boulevard',
        style: 'asphalt',
        width: 8.5,
        points: [
          [-38, 18],
          [-16, 15],
          [4, 13],
          [20, 8],
          [32, -6],
          [36, -26],
        ],
      },
      {
        id: 'road-ancient-way',
        style: 'ancientStone',
        width: 5.6,
        points: [
          [-4, 11],
          [-7, 1],
          [-11, -10],
          [-14, -22],
          [-8, -32],
        ],
      },
      {
        id: 'road-bazaar-cobble',
        style: 'cobblestone',
        width: 5.4,
        points: [
          [-14, 15.5],
          [-14, 28],
          [-2, 32],
          [14, 29],
        ],
      },
      {
        id: 'road-plaza-walkway',
        style: 'sidewalkPath',
        width: 3.4,
        points: [
          [2, 13.5],
          [2, 20.5],
          [2, 24.5],
          [9.5, 23.5],
        ],
      },
      {
        id: 'road-olive-trail',
        style: 'dirtRoad',
        width: 4.4,
        points: [
          [-26, 16.5],
          [-24, 6],
          [-22, -4],
        ],
      },
    ],
    objects: [
      // Grand Roman Triumphal Arch spanning the ancient stone road
      { id: 'obj-arch-main', type: 'romanArch', position: [-8.5, 0, -4.5], rotationY: deg(18), scale: 1.05 },
      { id: 'obj-arch-forum', type: 'romanArch', position: [-12.5, 0, -26.5], rotationY: deg(-20), scale: 0.95 },

      // Ancient wall & monument framing the historic quarter
      { id: 'obj-wall-1', type: 'ancientWall', position: [-26, 0, -14], rotationY: deg(82), scale: 1 },
      { id: 'obj-wall-2', type: 'ancientWall', position: [-24.6, 0, -24], rotationY: deg(82), scale: 1 },
      { id: 'obj-obelisk-1', type: 'obeliskMonument', position: [-2, 0, -21], rotationY: deg(15), scale: 1 },

      // Ancient Colonnade flanking the plaza
      { id: 'obj-col-1', type: 'ancientColumn', position: [-18.5, 0, -10], rotationY: 0, scale: 1.1 },
      { id: 'obj-col-2', type: 'ancientColumn', position: [-20.5, 0, -16], rotationY: deg(15), scale: 1.1 },
      { id: 'obj-col-4', type: 'ancientColumn', position: [-2.5, 0, -13], rotationY: deg(30), scale: 1.1 },
      { id: 'obj-amphora-1', type: 'amphoraCluster', position: [-15.5, 0, -4.2], rotationY: deg(35), scale: 1 },

      // Modern & Mediterranean residences
      { id: 'obj-apt-1', type: 'apartment5', position: [13, 0, -3.5], rotationY: deg(28), scale: 1 },
      { id: 'obj-apt-2', type: 'apartment5', position: [22, 0, -15], rotationY: deg(68), scale: 1 },
      { id: 'obj-villa-1', type: 'medVilla', position: [-24, 0, 27], rotationY: deg(170), scale: 1 },
      { id: 'obj-clock-1', type: 'clockTower', position: [9, 0, 22], rotationY: deg(160), scale: 1 },

      // Bazaar & artisan quarter
      { id: 'obj-shop-1', type: 'shopGround', position: [4.5, 0, 2.2], rotationY: deg(10), scale: 1 },
      { id: 'obj-shop-2', type: 'shopGround', position: [-7.5, 0, 24.5], rotationY: deg(176), scale: 1 },
      { id: 'obj-stall-1', type: 'bazaarStall', position: [-4.5, 0, 38], rotationY: deg(180), scale: 1 },
      { id: 'obj-stall-2', type: 'bazaarStall', position: [1.5, 0, 38], rotationY: deg(175), scale: 1 },
      { id: 'obj-cafe-1', type: 'streetCafe', position: [20, 0, 18.5], rotationY: deg(-135), scale: 1 },

      // Plaza leisure
      { id: 'obj-fountain-1', type: 'fountain', position: [2, 0, 24.5], rotationY: 0, scale: 1 },
      { id: 'obj-bench-1', type: 'bench', position: [9.5, 0, 17.5], rotationY: deg(165), scale: 1 },
      { id: 'obj-bench-2', type: 'bench', position: [-14, 0, -6.5], rotationY: deg(105), scale: 1 },

      // Diverse Mediterranean Trees
      { id: 'obj-palm-1', type: 'palmTree', position: [-15, 0, 8.2], rotationY: deg(20), scale: 1.1 },
      { id: 'obj-palm-2', type: 'palmTree', position: [14.5, 0, 19.5], rotationY: deg(110), scale: 1.05 },
      { id: 'obj-cypress-1', type: 'cypressTree', position: [-17.5, 0, -3.5], rotationY: 0, scale: 1.1 },
      { id: 'obj-cypress-2', type: 'cypressTree', position: [-4, 0, -7.2], rotationY: deg(40), scale: 1.05 },
      { id: 'obj-olive-1', type: 'oliveTree', position: [-21, 0, 1.5], rotationY: deg(70), scale: 1.15 },
      { id: 'obj-pine-1', type: 'pineTree', position: [27.5, 0, -22], rotationY: deg(25), scale: 1.1 },

      // Lighting (Lamps + Ancient Torches)
      { id: 'obj-lamp-1', type: 'doubleBoulevardLamp', position: [-18, 0, 10.2], rotationY: deg(90), scale: 1 },
      { id: 'obj-lamp-2', type: 'streetLamp', position: [0, 0, 7.6], rotationY: deg(90), scale: 1 },
      { id: 'obj-lamp-3', type: 'streetLamp', position: [17, 0, 3.2], rotationY: deg(130), scale: 1 },
      { id: 'obj-lamp-4', type: 'streetLamp', position: [26.5, 0, -10], rotationY: deg(175), scale: 1 },
      { id: 'obj-torch-1', type: 'ancientTorch', position: [-12.5, 0, -7.8], rotationY: 0, scale: 1 },
      { id: 'obj-torch-2', type: 'ancientTorch', position: [-5.5, 0, -9.8], rotationY: 0, scale: 1 },

      // Middle-earth Quarter Highlights
      { id: 'obj-hobbit-1', type: 'hobbitBurrow', position: [-32, 0, 2], rotationY: deg(72), scale: 1.05 },
      { id: 'obj-wizard-1', type: 'wizardTower', position: [-34, 0, -24], rotationY: deg(25), scale: 1 },
      { id: 'obj-elven-1', type: 'elvenPavilion', position: [14, 0, 34], rotationY: deg(-40), scale: 1 },
      { id: 'obj-beacon-1', type: 'beaconTower', position: [-2, 0, -37], rotationY: 0, scale: 1 },
    ],
    vehicles: [
      { id: 'veh-classic-1', type: 'classicCar', position: [12, 0, 12.2], rotationY: deg(-80) },
      { id: 'veh-zeppelin-1', type: 'zeppelin', position: [-18, 0.3, 21.5], rotationY: deg(35) },
      { id: 'veh-carriage-1', type: 'medievalCarriage', position: [-8.5, 0, 29.5], rotationY: deg(95) },
    ],
    npcs: [
      {
        id: 'npc-demo-merchant',
        name: 'Usta Kerem',
        roleTitle: 'Çarşı Baharatçısı',
        gender: 'male',
        outfit: 'merchant',
        primaryColor: '#b84a32',
        secondaryColor: '#e8c47a',
        skinTone: '#d9a47c',
        hairColor: '#2a1d14',
        position: [-1.5, 0, 29.5],
        rotationY: deg(180),
        scale: 1,
        dialogues: [
          'Hoş geldin gezgin! Arnavut kaldırımlı çarşımızda taze baharatlar, zeytinyağı ve dokumalar seni bekler.',
          'Meydan ve antik sokaklar arasında kısa bir yürüyüş yapıp şehri keşfedersen sana özel bir ödülüm olacak!',
        ],
        quest: {
          enabled: true,
          title: 'Çarşı & Meydan Keşfi',
          description: 'Şehrin sokaklarında 35 metre yaya olarak dolaş ve Usta Kerem’e geri dön.',
          objectiveType: 'explore',
          targetAmount: 35,
          rewardGold: 150,
          rewardXp: 60,
          rewardItem: 'Altın Safran Kesesi',
        },
      },
      {
        id: 'npc-demo-historian',
        name: 'Tarihçi Aylin',
        roleTitle: 'Antik Kent Rehberi',
        gender: 'female',
        outfit: 'romanToga',
        primaryColor: '#efe6d5',
        secondaryColor: '#9f2f2b',
        skinTone: '#e6b895',
        hairColor: '#3a2216',
        position: [-4.2, 0, -2.5],
        rotationY: deg(-35),
        scale: 1,
        dialogues: [
          'Antik Roma kemerinden geçtiğinde kadim Agora meydanına ulaşırsın.',
          'İlerideki Dikilitaşın etrafında antik yazıtlar bulduk. Altın işaretçi noktasına gidip inceleyebilir misin?',
        ],
        quest: {
          enabled: true,
          title: 'Dikilitaş İncelemesi',
          description: 'Antik meydandaki Dikilitaşın yanındaki altın görev işaretçisine ulaş.',
          objectiveType: 'visit',
          targetAmount: 18,
          targetPosition: [-2, -18.5],
          rewardGold: 250,
          rewardXp: 100,
          rewardItem: 'Kadim Roma Mührü',
        },
      },
      {
        id: 'npc-demo-guard',
        name: 'Komutan Marcus',
        roleTitle: 'Bulvar Muhafızı',
        gender: 'male',
        outfit: 'guard',
        primaryColor: '#3d4c5c',
        secondaryColor: '#c48f38',
        skinTone: '#d7a278',
        hairColor: '#231c18',
        position: [7.8, 0, 14.8],
        rotationY: deg(40),
        scale: 1,
        dialogues: [
          'Selam gezgin! Ana asfalt bulvarımız yeni açıldı ve harika görünüyor.',
          'Yanımdaki klasik üstü açık otomobile binip (E) bulvarda 60 metre test sürüşü yapar mısın?',
        ],
        quest: {
          enabled: true,
          title: 'Bulvar Test Sürüşü',
          description: 'Klasik üstü açık otomobille (E) şehir bulvarında 60 metre sürüş yap.',
          objectiveType: 'drive',
          targetAmount: 60,
          rewardGold: 300,
          rewardXp: 120,
          rewardItem: 'Altın Defne Anahtarlığı',
        },
      },
    ],
    npcRelations: [
      {
        id: 'rel-demo-1',
        sourceId: 'npc-demo-merchant',
        targetId: 'npc-demo-historian',
        type: 'trade',
        label: 'Antik baharat & parşömen takası',
        strength: 4,
      },
      {
        id: 'rel-demo-2',
        sourceId: 'npc-demo-merchant',
        targetId: 'npc-demo-guard',
        type: 'ally',
        label: 'Çarşı güvenliği iş birliği',
        strength: 4,
      },
      {
        id: 'rel-demo-3',
        sourceId: 'npc-demo-historian',
        targetId: 'npc-demo-guard',
        type: 'secret',
        label: 'Kayıp Roma mührü araştırması',
        strength: 3,
      },
    ],
  };
}
