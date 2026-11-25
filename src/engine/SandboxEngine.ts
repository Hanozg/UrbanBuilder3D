import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';
import {
  ActiveQuestRuntime,
  ActiveTool,
  AppMode,
  createDefaultDemoMap,
  EngineSnapshot,
  MapDocument,
  NPC_PRESET_TEMPLATES,
  NpcData,
  NpcGender,
  NpcOutfit,
  NpcQuestObjectiveType,
  NpcRelationData,
  NpcRelationType,
  NpcTemplate,
  PLACEABLE_LABELS,
  PlaceableType,
  PlacedObjectData,
  PlacedVehicleData,
  PlayerRewardsState,
  ROAD_DEFAULT_WIDTHS,
  ROAD_STYLE_LABELS,
  RoadData,
  RoadStyle,
  SelectedEntityInfo,
  TimeOfDay,
  VEHICLE_LABELS,
  VehicleType,
} from '../types/sandbox';
import { createProceduralTextures, ProceduralTextureLibrary } from './textures';
import {
  buildExplorerCharacter,
  buildPlaceableAsset,
  buildRoadGroup,
  buildRoadHighlightGroup,
  ColliderBoxDef,
  createMaterialLibrary,
  ExplorerRig,
  getRoadTotalWidth,
  MaterialLibrary,
} from './models';
import { buildNpcCharacter, buildQuestBeaconMesh, NpcRig } from './npcModels';
import { buildVehicleRig, VehicleRig } from './vehicleModels';

interface RuntimeObject {
  data: PlacedObjectData;
  group: THREE.Group;
  colliders: ColliderBoxDef[];
  selectionRadius: number;
  body: CANNON.Body;
}

interface RuntimeRoad {
  data: RoadData;
  group: THREE.Group;
  bodies: CANNON.Body[];
}

interface RuntimeNpc {
  data: NpcData;
  rig: NpcRig;
  body: CANNON.Body;
  baseYaw: number;
}

interface RuntimeVehicle {
  data: PlacedVehicleData;
  rig: VehicleRig;
  body: CANNON.Body;
  yaw: number;
  steerAngle: number;
  speed: number;
  verticalSpeed: number;
  bankAngle: number;
}

interface LightingPreset {
  sunPos: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fillColor: THREE.Color;
  fillIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  nightFactor: number;
  exposure: number;
}

const LIGHTING_PRESETS: Record<TimeOfDay, LightingPreset> = {
  golden: {
    sunPos: new THREE.Vector3(62, 24, 46),
    sunColor: new THREE.Color('#ffae62'),
    sunIntensity: 2.65,
    hemiSky: new THREE.Color('#8ba8d6'),
    hemiGround: new THREE.Color('#9c704c'),
    hemiIntensity: 0.78,
    fillColor: new THREE.Color('#7ca3d8'),
    fillIntensity: 0.45,
    fogColor: new THREE.Color('#e3b78b'),
    fogDensity: 0.0052,
    skyTop: new THREE.Color('#395c8c'),
    skyHorizon: new THREE.Color('#f4b47c'),
    nightFactor: 0.28,
    exposure: 1.08,
  },
  noon: {
    sunPos: new THREE.Vector3(36, 78, 28),
    sunColor: new THREE.Color('#fff5e4'),
    sunIntensity: 2.55,
    hemiSky: new THREE.Color('#88c4f4'),
    hemiGround: new THREE.Color('#b09a7a'),
    hemiIntensity: 0.92,
    fillColor: new THREE.Color('#a8d0f8'),
    fillIntensity: 0.42,
    fogColor: new THREE.Color('#cde0f0'),
    fogDensity: 0.0038,
    skyTop: new THREE.Color('#2d74c4'),
    skyHorizon: new THREE.Color('#c7e1f5'),
    nightFactor: 0.0,
    exposure: 1.04,
  },
  night: {
    sunPos: new THREE.Vector3(-42, 46, -34),
    sunColor: new THREE.Color('#7ea2e0'),
    sunIntensity: 0.65,
    hemiSky: new THREE.Color('#1d2b4c'),
    hemiGround: new THREE.Color('#1a1718'),
    hemiIntensity: 0.55,
    fillColor: new THREE.Color('#394c78'),
    fillIntensity: 0.25,
    fogColor: new THREE.Color('#131b2e'),
    fogDensity: 0.0068,
    skyTop: new THREE.Color('#090d1a'),
    skyHorizon: new THREE.Color('#1d2c4a'),
    nightFactor: 1.0,
    exposure: 1.02,
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function disposeObject3D(root: THREE.Object3D, skipSharedMaterials: Set<THREE.Material>) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m && !skipSharedMaterials.has(m)) {
          m.dispose();
        }
      }
    }
  });
}

// Reusable math scratch variables (zero per-frame GC allocations)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecRight = new THREE.Vector3();
const _vecForward = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _quat = new THREE.Quaternion();

export interface SandboxEngineCallbacks {
  onSnapshot: (snapshot: EngineSnapshot) => void;
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void;
  onInteractNpc?: (npc: NpcData) => void;
  onContextLost?: () => void;
}

export class SandboxEngine {
  private container: HTMLElement;
  private callbacks: SandboxEngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private textures: ProceduralTextureLibrary;
  private materials: MaterialLibrary;
  private sharedMaterialsSet: Set<THREE.Material>;

  // Lighting & Sky
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fillLight: THREE.DirectionalLight;
  private nightAccentLight: THREE.PointLight;
  private carNightLight: THREE.PointLight;
  private skyMat: THREE.ShaderMaterial;
  private fog: THREE.FogExp2;
  private currentNightFactor = 0.28;

  // Editor Helpers
  private gridHelper: THREE.GridHelper;
  private showGrid = true;
  private ghostGroup: THREE.Group | null = null;
  private ghostNpcRig: NpcRig | null = null;
  private ghostVehicleRig: VehicleRig | null = null;
  private ghostMat: THREE.MeshStandardMaterial;
  private selectionRing: THREE.Mesh;
  private roadCursorRing: THREE.Mesh;
  private roadCursorRingMat: THREE.MeshBasicMaterial;
  private selectedRoadHighlight: THREE.Group | null = null;
  private roadPreviewGroup: THREE.Group | null = null;
  private roadMarkerGroup: THREE.Group;

  // Physics World (Cannon-es)
  private world: CANNON.World;
  private groundPhysMat: CANNON.Material;
  private actorPhysMat: CANNON.Material;
  private carPhysMat: CANNON.Material;

  // World Content
  private objectsRoot: THREE.Group;
  private roadsRoot: THREE.Group;
  private npcsRoot: THREE.Group;
  private vehiclesRoot: THREE.Group;
  private questBeaconsRoot: THREE.Group;
  private placedObjects = new Map<string, RuntimeObject>();
  private roads = new Map<string, RuntimeRoad>();
  private npcs = new Map<string, RuntimeNpc>();
  private vehicles = new Map<string, RuntimeVehicle>();
  private npcRelations: NpcRelationData[] = [];
  private questBeacons = new Map<string, { group: THREE.Group; dispose: () => void; target: [number, number] }>();
  private nextIdCounter = 1;

  // Playable Character & Multi-Vehicle Fleet
  private explorer: ExplorerRig;
  private playerBody: CANNON.Body;
  private playerYaw = Math.PI;
  private walkCycle = 0;
  private isGrounded = true;
  private jumpCooldown = 0;

  private activeVehicleId: string | null = null;
  private nearVehicleId: string | null = null;
  private inVehicle = false;
  private nearVehicle = false;

  // NPC & Quest Runtime
  private npcDraftTemplate: NpcTemplate = structuredClone(NPC_PRESET_TEMPLATES[0].template);
  private nearNpcId: string | null = null;
  private questStates = new Map<string, ActiveQuestRuntime>();
  private playerRewards: PlayerRewardsState = { gold: 0, xp: 0, items: [], completedCount: 0 };
  private npcAnimTime = 0;

  // State
  private mode: AppMode = 'editor';
  private timeOfDay: TimeOfDay = 'golden';
  private activeTool: ActiveTool = { kind: 'place', objectType: 'apartment5' };
  private placementRotationDeg = 0;
  private placementScale = 1.0;
  private placementRoadWidth = ROAD_DEFAULT_WIDTHS.asphalt;
  private selected: { kind: 'object' | 'road' | 'npc' | 'vehicle'; id: string } | null = null;
  private isMovingSelected = false;
  private activeRoadPoints: [number, number][] = [];
  private cursorGroundPos = new THREE.Vector3(0, 0, 0);
  private hasCursorGround = false;
  private roadCursorSnapped = false;

  // Camera Rig State
  private editorPos = new THREE.Vector3(-24, 21, 34);
  private editorYaw = -0.58;
  private editorPitch = -0.46;
  private playCamYaw = -0.35;
  private playCamPitch = 0.24;
  private currentCamPos = new THREE.Vector3(-24, 21, 34);
  private currentCamLook = new THREE.Vector3(0, 2, 0);

  // Input State
  private keys = new Set<string>();
  private isRightMouseDown = false;
  private isLeftDraggingPlay = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownPos = { x: 0, y: 0 };
  private pointerLocked = false;
  private raycaster = new THREE.Raycaster();
  private mouseNdc = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private lastHoverRaycastTime = 0;

  // Loop
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastHudSync = 0;

  constructor(container: HTMLElement, callbacks: SandboxEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LIGHTING_PRESETS.golden.exposure;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Environment
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(
      LIGHTING_PRESETS.golden.fogColor.getHex(),
      LIGHTING_PRESETS.golden.fogDensity
    );
    this.scene.fog = this.fog;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmrem.dispose();

    // 3. Camera
    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.15, 650);
    this.camera.position.copy(this.editorPos);

    // 4. Procedural PBR Textures & Materials
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.materials = createMaterialLibrary(this.textures, this.isSoftwareGl);
    this.sharedMaterialsSet = new Set(
      Object.values(this.materials).filter((v): v is THREE.Material => v instanceof THREE.Material)
    );

    // 5. Sky Dome & Lighting Rig
    const preset = LIGHTING_PRESETS.golden;
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: preset.skyTop.clone() },
        horizonColor: { value: preset.skyHorizon.clone() },
        sunDir: { value: preset.sunPos.clone().normalize() },
        sunColor: { value: preset.sunColor.clone() },
        nightMix: { value: preset.nightFactor },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform float nightMix;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y * 1.45, 0.0, 1.0);
          vec3 col = mix(horizonColor, topColor, pow(h, 0.58));
          float sunAmt = max(dot(dir, normalize(sunDir)), 0.0);
          col += sunColor * pow(sunAmt, 14.0) * (0.45 * (1.0 - nightMix * 0.75));
          col += sunColor * smoothstep(0.996, 0.9995, sunAmt) * (1.15 * (1.0 - nightMix * 0.6));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(420, 28, 18), this.skyMat);
    skyMesh.frustumCulled = false;
    skyMesh.userData.ignoreRaycast = true;
    this.scene.add(skyMesh);

    this.sunLight = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
    this.sunLight.position.copy(preset.sunPos);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 210;
    const d = 58;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(
      preset.hemiSky,
      preset.hemiGround,
      preset.hemiIntensity
    );
    this.scene.add(this.hemiLight);

    this.fillLight = new THREE.DirectionalLight(preset.fillColor, preset.fillIntensity);
    this.fillLight.position.set(-48, 30, -36);
    this.scene.add(this.fillLight);

    this.nightAccentLight = new THREE.PointLight(0xffb55c, 0, 48, 1.4);
    this.nightAccentLight.position.set(-6, 9, -6);
    this.scene.add(this.nightAccentLight);

    this.carNightLight = new THREE.PointLight(0xffe09c, 0, 26, 1.6);
    this.scene.add(this.carNightLight);

    // 6. Natural Mediterranean Coastal Terrain + Distant Hills & Sea Horizon
    this.buildNaturalEnvironment();

    // 7. Editor Grid, Ghost & Selection Ring
    this.gridHelper = new THREE.GridHelper(120, 120, 0xe59a3c, 0x5c5852);
    this.gridHelper.position.y = 0.012;
    const gridMats = Array.isArray(this.gridHelper.material)
      ? this.gridHelper.material
      : [this.gridHelper.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.34;
    });
    this.scene.add(this.gridHelper);

    this.ghostMat = new THREE.MeshStandardMaterial({
      color: 0xf0ad4e,
      emissive: 0x995a14,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });

    const ringGeo = new THREE.RingGeometry(0.88, 1.0, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf4ae44,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.y = 0.06;
    this.selectionRing.visible = false;
    this.selectionRing.userData.ignoreRaycast = true;
    this.scene.add(this.selectionRing);

    const roadRingGeo = new THREE.RingGeometry(0.84, 1.0, 40);
    roadRingGeo.rotateX(-Math.PI / 2);
    this.roadCursorRingMat = new THREE.MeshBasicMaterial({
      color: 0xf4ae44,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.roadCursorRing = new THREE.Mesh(roadRingGeo, this.roadCursorRingMat);
    this.roadCursorRing.position.y = 0.24;
    this.roadCursorRing.visible = false;
    this.roadCursorRing.userData.ignoreRaycast = true;
    this.scene.add(this.roadCursorRing);

    this.roadMarkerGroup = new THREE.Group();
    this.scene.add(this.roadMarkerGroup);

    this.objectsRoot = new THREE.Group();
    this.roadsRoot = new THREE.Group();
    this.npcsRoot = new THREE.Group();
    this.vehiclesRoot = new THREE.Group();
    this.questBeaconsRoot = new THREE.Group();
    this.scene.add(this.roadsRoot);
    this.scene.add(this.objectsRoot);
    this.scene.add(this.npcsRoot);
    this.scene.add(this.vehiclesRoot);
    this.scene.add(this.questBeaconsRoot);

    // 8. Cannon-es Physics World
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -22, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    this.groundPhysMat = new CANNON.Material('ground');
    this.actorPhysMat = new CANNON.Material('actor');
    this.carPhysMat = new CANNON.Material('car');

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.groundPhysMat, this.actorPhysMat, {
        friction: 0.08,
        restitution: 0.0,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.groundPhysMat, this.carPhysMat, {
        friction: 0.15,
        restitution: 0.05,
      })
    );

    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.groundPhysMat,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // 9. Explorer Character & Physics Body
    this.explorer = buildExplorerCharacter(this.materials);
    this.explorer.root.position.set(1.5, 0, 12);
    this.scene.add(this.explorer.root);

    this.playerBody = new CANNON.Body({
      mass: 72,
      material: this.actorPhysMat,
      fixedRotation: true,
      linearDamping: 0.15,
    });
    this.playerBody.addShape(new CANNON.Sphere(0.42), new CANNON.Vec3(0, 0.42, 0));
    this.playerBody.addShape(new CANNON.Sphere(0.4), new CANNON.Vec3(0, 1.15, 0));
    this.playerBody.position.set(1.5, 0.1, 12);
    this.world.addBody(this.playerBody);

    // 10. Load Initial Curated Mediterranean, Ancient & Middle-earth Demo Map
    this.applyMapDocument(createDefaultDemoMap(), true);
    this.rebuildGhostPreview();
    this.applyEditorCameraRotation();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 12. Bind Events & Start Loop
    this.bindEvents();
    this.emitSnapshot();
    this.tick();
  }

  private buildNaturalEnvironment() {
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.terrainMap,
      roughness: 0.94,
      metalness: 0.0,
    });
    const terrain = new THREE.Mesh(new THREE.CircleGeometry(185, 64), terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.userData.ignoreRaycast = true;
    this.scene.add(terrain);

    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x2e6e8a,
      roughness: 0.24,
      metalness: 0.32,
    });
    const sea = new THREE.Mesh(new THREE.RingGeometry(150, 440, 64), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.35;
    sea.userData.ignoreRaycast = true;
    this.scene.add(sea);

    const hillGeo = new THREE.ConeGeometry(1, 1, 7);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0xa69478,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });
    const hillCount = 34;
    const hills = new THREE.InstancedMesh(hillGeo, hillMat, hillCount);
    hills.receiveShadow = false;
    hills.castShadow = false;
    hills.userData.ignoreRaycast = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < hillCount; i++) {
      const angle = (i / hillCount) * Math.PI * 1.65 + 0.55;
      const radius = 112 + ((i * 29) % 42);
      const scaleX = 24 + ((i * 17) % 24);
      const scaleY = 12 + ((i * 13) % 20);
      const scaleZ = 20 + ((i * 19) % 20);
      dummy.position.set(Math.cos(angle) * radius, scaleY * 0.42 - 1.2, Math.sin(angle) * radius);
      dummy.rotation.set(0, i * 0.9, 0);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.updateMatrix();
      hills.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.09 + (i % 4) * 0.012, 0.22, 0.52 + (i % 5) * 0.04);
      hills.setColorAt(i, tint);
    }
    hills.instanceMatrix.needsUpdate = true;
    if (hills.instanceColor) hills.instanceColor.needsUpdate = true;
    hills.computeBoundingSphere();
    this.scene.add(hills);

    const groveGeo = new THREE.ConeGeometry(1.1, 4.8, 6);
    const groveMat = new THREE.MeshStandardMaterial({
      color: 0x3f5e39,
      roughness: 0.88,
      flatShading: true,
    });
    const groveCount = 46;
    const grove = new THREE.InstancedMesh(groveGeo, groveMat, groveCount);
    grove.userData.ignoreRaycast = true;
    for (let i = 0; i < groveCount; i++) {
      const a = (i / groveCount) * Math.PI * 2;
      const r = 68 + ((i * 11) % 34);
      const s = 0.85 + ((i * 7) % 10) * 0.06;
      dummy.position.set(Math.cos(a) * r, 2.2 * s, Math.sin(a) * r);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      grove.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.28 + (i % 3) * 0.02, 0.28, 0.28 + (i % 4) * 0.03);
      grove.setColorAt(i, tint);
    }
    grove.instanceMatrix.needsUpdate = true;
    if (grove.instanceColor) grove.instanceColor.needsUpdate = true;
    grove.computeBoundingSphere();
    this.scene.add(grove);
  }

  // ==================== PUBLIC API FOR REACT HUD ====================

  public setMode(nextMode: AppMode) {
    if (this.mode === nextMode) return;
    this.mode = nextMode;
    this.cancelRoadDraft();
    this.isMovingSelected = false;

    if (nextMode === 'play') {
      this.gridHelper.visible = false;
      this.selectionRing.visible = false;
      this.roadCursorRing.visible = false;
      this.clearSelectedRoadHighlight();
      if (this.ghostGroup) this.ghostGroup.visible = false;
      this.selected = null;

      if (!this.inVehicle) {
        this.playerBody.velocity.set(0, 0, 0);
        if (this.playerBody.position.y < 0.05 || this.playerBody.position.y > 10) {
          this.playerBody.position.set(1.5, 0.2, 12);
        }
      }
      this.currentCamPos.copy(this.camera.position);
      this.callbacks.onToast('Oynanış Modu — WASD ile keşfedin, klasik aracın yanında E ile binin.', 'info');
    } else {
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
      if (this.inVehicle) {
        this.exitVehicle();
      }
      this.gridHelper.visible = this.showGrid;
      this.rebuildGhostPreview();
      this.editorPos.set(
        this.playerBody.position.x - 16,
        Math.max(15, this.camera.position.y + 10),
        this.playerBody.position.z + 20
      );
      this.editorYaw = -0.62;
      this.editorPitch = -0.48;
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.callbacks.onToast('İnşa Modu — Sol paletten yol veya modüler yapı seçin.', 'info');
    }

    this.emitSnapshot();
  }

  public toggleMode() {
    this.setMode(this.mode === 'editor' ? 'play' : 'editor');
  }

  public setTimeOfDay(tod: TimeOfDay) {
    this.timeOfDay = tod;
    this.emitSnapshot();
  }

  public setTool(tool: ActiveTool) {
    if (this.mode !== 'editor') this.setMode('editor');
    this.cancelRoadDraft();
    this.isMovingSelected = false;
    this.activeTool = tool;
    if (tool.kind === 'road') {
      this.placementRoadWidth = ROAD_DEFAULT_WIDTHS[tool.style];
      this.updateRoadCursorRing();
    } else {
      this.roadCursorRing.visible = false;
    }
    if (tool.kind !== 'select') {
      this.selected = null;
      this.selectionRing.visible = false;
      this.clearSelectedRoadHighlight();
    }
    this.rebuildGhostPreview();
    this.emitSnapshot();
  }

  public setRoadWidth(width: number) {
    const clamped = Math.round(THREE.MathUtils.clamp(width, 2.4, 14.0) * 10) / 10;
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'road') {
      const road = this.roads.get(this.selected.id);
      if (road) {
        road.data.width = clamped;
        this.rebuildRoadEntity(road);
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }
    }
    this.placementRoadWidth = clamped;
    this.updateRoadCursorRing();
    if (this.activeTool.kind === 'road' && this.activeRoadPoints.length > 0) {
      this.rebuildRoadPreview();
    }
    this.emitSnapshot();
  }

  public setSelectedRoadStyle(style: RoadStyle) {
    if (this.selected?.kind !== 'road') return;
    const road = this.roads.get(this.selected.id);
    if (!road || road.data.style === style) return;
    road.data.style = style;
    this.rebuildRoadEntity(road);
    this.updateSelectionRing();
    this.callbacks.onToast(`Yol tipi "${ROAD_STYLE_LABELS[style]}" olarak güncellendi.`, 'info');
    this.emitSnapshot();
  }

  public toggleGrid() {
    this.showGrid = !this.showGrid;
    this.gridHelper.visible = this.mode === 'editor' && this.showGrid;
    this.emitSnapshot();
  }

  public startNpcPlacement(template: NpcTemplate) {
    this.npcDraftTemplate = structuredClone(template);
    this.setTool({ kind: 'npc' });
    this.callbacks.onToast(`"${template.name}" yerleştirilmeye hazır — zemine sol tıklayın (R döndürür).`, 'info');
  }

  public updateNpcDraftTemplate(template: NpcTemplate) {
    this.npcDraftTemplate = structuredClone(template);
    if (this.activeTool.kind === 'npc') {
      this.rebuildGhostPreview();
    }
  }

  public updateNpcData(npcId: string, updated: NpcTemplate) {
    const existing = this.npcs.get(npcId);
    if (!existing) return;
    const nextData: NpcData = {
      ...structuredClone(updated),
      id: existing.data.id,
      position: [...existing.data.position],
      rotationY: existing.data.rotationY,
      scale: existing.data.scale,
    };
    this.rebuildNpcEntity(existing, nextData);
    this.syncNpcQuestState(nextData);
    this.emitSnapshot();
  }

  public selectNpcById(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    if (this.mode !== 'editor') this.setMode('editor');
    this.activeTool = { kind: 'select' };
    this.rebuildGhostPreview();
    this.roadCursorRing.visible = false;
    this.selected = { kind: 'npc', id: npcId };
    this.isMovingSelected = false;
    this.updateSelectionRing();
    this.emitSnapshot();
  }

  public focusCameraOnNpc(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    this.selectNpcById(npcId);
    const [nx, ny, nz] = npc.data.position;
    const camX = nx + 6.5;
    const camY = ny + 5.2;
    const camZ = nz + 7.5;
    this.editorPos.set(camX, camY, camZ);
    const dx = nx - camX;
    const dy = ny + 1.1 - camY;
    const dz = nz - camZ;
    const horiz = Math.hypot(dx, dz);
    this.editorYaw = Math.atan2(-dx, -dz);
    this.editorPitch = Math.atan2(dy, horiz);
    this.currentCamPos.copy(this.editorPos);
    this.camera.position.copy(this.editorPos);
    this.camera.lookAt(nx, ny + 1.1, nz);
  }

  public addNpcRelation(
    sourceId: string,
    targetId: string,
    type: NpcRelationType,
    label: string,
    strength = 3
  ): { ok: boolean; error?: string } {
    if (!sourceId || !targetId || sourceId === targetId) {
      return { ok: false, error: 'İki farklı NPC seçmelisiniz.' };
    }
    if (!this.npcs.has(sourceId) || !this.npcs.has(targetId)) {
      return { ok: false, error: 'Seçilen NPC haritada bulunamadı.' };
    }
    const exists = this.npcRelations.some(
      (r) =>
        (r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)
    );
    if (exists) {
      return { ok: false, error: 'Bu iki NPC arasında zaten bir ilişki tanımlı.' };
    }
    const cleanStrength = THREE.MathUtils.clamp(Math.round(strength) || 3, 1, 5);
    const rel: NpcRelationData = {
      id: `rel-${Date.now()}-${this.nextIdCounter++}`,
      sourceId,
      targetId,
      type,
      label: label.trim() || 'Şehir bağlantısı',
      strength: cleanStrength,
    };
    this.npcRelations.push(rel);
    this.callbacks.onToast('Yeni NPC ilişkisi ağa eklendi.', 'success');
    this.emitSnapshot();
    return { ok: true };
  }

  public updateNpcRelation(
    relationId: string,
    patch: Partial<Pick<NpcRelationData, 'type' | 'label' | 'strength'>>
  ) {
    const rel = this.npcRelations.find((r) => r.id === relationId);
    if (!rel) return;
    if (patch.type) rel.type = patch.type;
    if (typeof patch.label === 'string') rel.label = patch.label;
    if (typeof patch.strength === 'number') {
      rel.strength = THREE.MathUtils.clamp(Math.round(patch.strength), 1, 5);
    }
    this.emitSnapshot();
  }

  public deleteNpcRelation(relationId: string) {
    const before = this.npcRelations.length;
    this.npcRelations = this.npcRelations.filter((r) => r.id !== relationId);
    if (this.npcRelations.length !== before) {
      this.callbacks.onToast('NPC ilişkisi silindi.', 'info');
      this.emitSnapshot();
    }
  }

  public autoGenerateProximityRelations() {
    const list = Array.from(this.npcs.values()).map((n) => n.data);
    if (list.length < 2) {
      this.callbacks.onToast('Bağlantı oluşturmak için haritada en az 2 NPC olmalı.', 'info');
      return;
    }
    let created = 0;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      // Find closest NPC not yet linked to a
      let bestTarget: NpcData | null = null;
      let bestDist = Infinity;
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        const alreadyLinked = this.npcRelations.some(
          (r) =>
            (r.sourceId === a.id && r.targetId === b.id) ||
            (r.sourceId === b.id && r.targetId === a.id)
        );
        if (alreadyLinked) continue;
        const d = Math.hypot(
          a.position[0] - b.position[0],
          a.position[2] - b.position[2]
        );
        if (d < bestDist) {
          bestDist = d;
          bestTarget = b;
        }
      }
      if (bestTarget && bestDist < 48) {
        let relType: NpcRelationType = 'ally';
        let label = 'Mahalle komşuluğu';
        if (a.outfit === 'merchant' || bestTarget.outfit === 'merchant') {
          relType = 'trade';
          label = 'Çarşı ticareti';
        } else if (a.outfit === 'romanToga' || bestTarget.outfit === 'romanToga') {
          relType = 'mentor';
          label = 'Tarih & kültür sohbeti';
        } else if (a.outfit === 'guard' || bestTarget.outfit === 'guard') {
          relType = 'ally';
          label = 'Bölge devriye teması';
        } else if (a.outfit === 'noble' && bestTarget.outfit === 'artisan') {
          relType = 'trade';
          label = 'Özel sanat siparişi';
        }
        const strength = bestDist < 16 ? 4 : bestDist < 28 ? 3 : 2;
        this.npcRelations.push({
          id: `rel-${Date.now()}-${this.nextIdCounter++}`,
          sourceId: a.id,
          targetId: bestTarget.id,
          type: relType,
          label,
          strength,
        });
        created += 1;
      }
    }
    if (created > 0) {
      this.callbacks.onToast(`${created} yeni yakınlık ilişkisi ağa eklendi.`, 'success');
      this.emitSnapshot();
    } else {
      this.callbacks.onToast('Yakındaki tüm NPC’ler zaten birbirine bağlı.', 'info');
    }
  }

  public acceptNpcQuest(npcId: string) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.data.quest.enabled) return;
    const q = npc.data.quest;
    const target = Math.max(1, q.objectiveType === 'talk' ? 1 : q.targetAmount || 20);
    const initialStatus = q.objectiveType === 'talk' ? 'ready' : 'active';
    const runtime: ActiveQuestRuntime = {
      npcId,
      npcName: npc.data.name,
      status: initialStatus,
      progress: q.objectiveType === 'talk' ? 1 : 0,
      target,
      quest: structuredClone(q),
    };
    this.questStates.set(npcId, runtime);
    npc.rig.setQuestMarkerStatus(initialStatus);

    if (q.objectiveType === 'visit') {
      const targetPos = this.resolveVisitTarget(npc.data);
      this.spawnQuestBeacon(npcId, targetPos);
    } else {
      this.removeQuestBeacon(npcId);
    }

    this.callbacks.onToast(
      initialStatus === 'ready'
        ? `Görev kabul edildi: "${q.title}" — Ödülü hemen alabilirsiniz!`
        : `Yeni Görev: "${q.title}" kabul edildi!`,
      'success'
    );
    this.emitSnapshot();
  }

  public claimNpcQuestReward(npcId: string) {
    const state = this.questStates.get(npcId);
    const npc = this.npcs.get(npcId);
    if (!state || state.status !== 'ready') return;

    state.status = 'completed';
    state.progress = state.target;
    this.removeQuestBeacon(npcId);
    if (npc) npc.rig.setQuestMarkerStatus('completed');

    this.playerRewards = {
      gold: this.playerRewards.gold + Math.max(0, state.quest.rewardGold || 0),
      xp: this.playerRewards.xp + Math.max(0, state.quest.rewardXp || 0),
      items: state.quest.rewardItem?.trim()
        ? [...this.playerRewards.items, state.quest.rewardItem.trim()]
        : [...this.playerRewards.items],
      completedCount: this.playerRewards.completedCount + 1,
    };

    const parts: string[] = [];
    if (state.quest.rewardGold > 0) parts.push(`+${state.quest.rewardGold} Altın`);
    if (state.quest.rewardXp > 0) parts.push(`+${state.quest.rewardXp} XP`);
    if (state.quest.rewardItem?.trim()) parts.push(state.quest.rewardItem.trim());

    this.callbacks.onToast(
      `Görev Tamamlandı: "${state.quest.title}" (${parts.join(' · ')})`,
      'success'
    );
    this.emitSnapshot();
  }

  public interactWithNearNpc() {
    if (this.mode !== 'play' || this.inVehicle || !this.nearNpcId) return;
    const npc = this.npcs.get(this.nearNpcId);
    if (npc) {
      this.callbacks.onInteractNpc?.(npc.data);
    }
  }

  public rotatePlacement(deltaDeg = 15) {
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'object') {
      const runtime = this.placedObjects.get(this.selected.id);
      if (runtime) {
        runtime.data.rotationY += THREE.MathUtils.degToRad(deltaDeg);
        this.syncObjectTransform(runtime);
        this.emitSnapshot();
        return;
      }
    }
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'npc') {
      const npc = this.npcs.get(this.selected.id);
      if (npc) {
        npc.data.rotationY += THREE.MathUtils.degToRad(deltaDeg);
        npc.baseYaw = npc.data.rotationY;
        this.syncNpcTransform(npc);
        this.emitSnapshot();
        return;
      }
    }
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'vehicle') {
      const veh = this.vehicles.get(this.selected.id);
      if (veh) {
        veh.data.rotationY += THREE.MathUtils.degToRad(deltaDeg);
        veh.yaw = veh.data.rotationY;
        veh.body.quaternion.setFromEuler(0, veh.yaw, 0);
        this.syncVehicleVisuals(veh, 0);
        this.emitSnapshot();
        return;
      }
    }
    this.placementRotationDeg = (this.placementRotationDeg + deltaDeg + 360) % 360;
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = THREE.MathUtils.degToRad(this.placementRotationDeg);
    }
    this.emitSnapshot();
  }

  public setPlacementScale(scale: number) {
    const clamped = Math.round(THREE.MathUtils.clamp(scale, 0.5, 2.5) * 100) / 100;
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'object') {
      const runtime = this.placedObjects.get(this.selected.id);
      if (runtime) {
        runtime.data.scale = clamped;
        this.rebuildObjectBody(runtime);
        this.syncObjectTransform(runtime);
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }
    }
    if (this.activeTool.kind === 'select' && this.selected?.kind === 'npc') {
      const npc = this.npcs.get(this.selected.id);
      if (npc) {
        npc.data.scale = THREE.MathUtils.clamp(clamped, 0.7, 1.8);
        this.syncNpcTransform(npc);
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }
    }
    this.placementScale = clamped;
    if (this.ghostGroup && this.activeTool.kind !== 'vehicle') {
      this.ghostGroup.scale.setScalar(this.placementScale);
    }
    this.emitSnapshot();
  }

  public startMovingSelected() {
    if (
      this.selected?.kind !== 'object' &&
      this.selected?.kind !== 'npc' &&
      this.selected?.kind !== 'vehicle'
    ) {
      return;
    }
    this.isMovingSelected = !this.isMovingSelected;
    if (this.isMovingSelected) {
      this.callbacks.onToast('Yeni konuma sol tıklayarak yerleştirin (ESC iptal).', 'info');
    }
    this.emitSnapshot();
  }

  public deleteSelected() {
    if (!this.selected) return;
    if (this.selected.kind === 'object') {
      const runtime = this.placedObjects.get(this.selected.id);
      if (runtime) {
        this.objectsRoot.remove(runtime.group);
        disposeObject3D(runtime.group, this.sharedMaterialsSet);
        this.world.removeBody(runtime.body);
        this.placedObjects.delete(this.selected.id);
      }
    } else if (this.selected.kind === 'road') {
      const road = this.roads.get(this.selected.id);
      if (road) {
        this.roadsRoot.remove(road.group);
        disposeObject3D(road.group, this.sharedMaterialsSet);
        for (const b of road.bodies) this.world.removeBody(b);
        this.roads.delete(this.selected.id);
      }
    } else if (this.selected.kind === 'npc') {
      const npc = this.npcs.get(this.selected.id);
      if (npc) {
        this.npcsRoot.remove(npc.rig.group);
        npc.rig.disposeOwned();
        this.world.removeBody(npc.body);
        this.npcs.delete(this.selected.id);
        this.npcRelations = this.npcRelations.filter(
          (r) => r.sourceId !== this.selected?.id && r.targetId !== this.selected?.id
        );
        this.questStates.delete(this.selected.id);
        this.removeQuestBeacon(this.selected.id);
      }
    } else if (this.selected.kind === 'vehicle') {
      const veh = this.vehicles.get(this.selected.id);
      if (veh) {
        if (this.activeVehicleId === veh.data.id) {
          this.exitVehicle();
        }
        this.vehiclesRoot.remove(veh.rig.root);
        veh.rig.disposeOwned();
        this.world.removeBody(veh.body);
        this.vehicles.delete(this.selected.id);
      }
    }
    this.selected = null;
    this.isMovingSelected = false;
    this.selectionRing.visible = false;
    this.clearSelectedRoadHighlight();
    this.emitSnapshot();
  }

  public commitActiveRoad() {
    if (this.activeTool.kind !== 'road') return;
    if (this.activeRoadPoints.length < 2) {
      this.callbacks.onToast('Yol oluşturmak için zemine en az 2 nokta tıklayın.', 'error');
      return;
    }
    const style = this.activeTool.style;
    const roadData: RoadData = {
      id: `road-${Date.now()}-${this.nextIdCounter++}`,
      style,
      width: this.placementRoadWidth,
      points: this.activeRoadPoints.map(([x, z]) => [
        Math.round(x * 100) / 100,
        Math.round(z * 100) / 100,
      ]),
    };
    this.addRoadEntity(roadData);
    this.cancelRoadDraft();
    this.callbacks.onToast(`${ROAD_STYLE_LABELS[style]} oluşturuldu.`, 'success');
    this.emitSnapshot();
  }

  public undoLastRoadPoint() {
    if (this.activeRoadPoints.length === 0) return;
    this.activeRoadPoints.pop();
    this.rebuildRoadPreview();
    this.emitSnapshot();
  }

  public cancelRoadDraft() {
    this.activeRoadPoints = [];
    this.clearRoadPreview();
    this.emitSnapshot();
  }

  public loadDemoMap() {
    this.applyMapDocument(createDefaultDemoMap(), false);
    this.callbacks.onToast('Hazır Akdeniz & Antik Meydan haritası yüklendi.', 'success');
  }

  public clearMap() {
    this.applyMapDocument(
      {
        version: 1,
        name: 'Boş İnşaat Arazisi',
        timeOfDay: this.timeOfDay,
        carTransform: { position: [6, 0, 8], rotationY: 0 },
        objects: [],
        roads: [],
      },
      false
    );
    this.callbacks.onToast('Sahne temizlendi.', 'info');
  }

  public exportMap(): MapDocument {
    const firstVeh = this.vehicles.values().next().value as RuntimeVehicle | undefined;
    return {
      version: 1,
      name: 'Agora Studio Şehir Haritası',
      timeOfDay: this.timeOfDay,
      carTransform: firstVeh
        ? {
            position: [
              Math.round(firstVeh.body.position.x * 100) / 100,
              Math.round(firstVeh.body.position.y * 100) / 100,
              Math.round(firstVeh.body.position.z * 100) / 100,
            ],
            rotationY: Math.round(firstVeh.yaw * 1000) / 1000,
          }
        : { position: [6, 0, 8], rotationY: 0 },
      objects: Array.from(this.placedObjects.values()).map((r) => ({
        id: r.data.id,
        type: r.data.type,
        position: [
          Math.round(r.data.position[0] * 100) / 100,
          Math.round(r.data.position[1] * 100) / 100,
          Math.round(r.data.position[2] * 100) / 100,
        ],
        rotationY: Math.round(r.data.rotationY * 1000) / 1000,
        scale: Math.round(r.data.scale * 100) / 100,
      })),
      roads: Array.from(this.roads.values()).map((r) => ({
        id: r.data.id,
        style: r.data.style,
        width: r.data.width,
        points: r.data.points.map(([x, z]) => [
          Math.round(x * 100) / 100,
          Math.round(z * 100) / 100,
        ]),
      })),
      vehicles: Array.from(this.vehicles.values()).map((v) => ({
        id: v.data.id,
        type: v.data.type,
        position: [
          Math.round(v.body.position.x * 100) / 100,
          Math.round(Math.max(0, v.body.position.y) * 100) / 100,
          Math.round(v.body.position.z * 100) / 100,
        ],
        rotationY: Math.round(v.yaw * 1000) / 1000,
      })),
      npcs: Array.from(this.npcs.values()).map((n) => ({
        ...structuredClone(n.data),
        position: [
          Math.round(n.data.position[0] * 100) / 100,
          Math.round(n.data.position[1] * 100) / 100,
          Math.round(n.data.position[2] * 100) / 100,
        ],
        rotationY: Math.round(n.data.rotationY * 1000) / 1000,
        scale: Math.round(n.data.scale * 100) / 100,
      })),
      npcRelations: this.npcRelations.map((r) => ({ ...r })),
    };
  }

  public importMap(raw: unknown): { ok: boolean; error?: string } {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'Geçersiz JSON formatı.' };
    }
    const doc = raw as Partial<MapDocument>;
    if (!Array.isArray(doc.objects) || !Array.isArray(doc.roads)) {
      return { ok: false, error: 'Harita JSON dosyasında "objects" ve "roads" alanları bulunamadı.' };
    }
    const validTypes = new Set<string>(Object.keys(PLACEABLE_LABELS));
    const sanitizedObjects: PlacedObjectData[] = [];
    for (const o of doc.objects) {
      if (
        !o ||
        typeof o !== 'object' ||
        !validTypes.has(o.type) ||
        !Array.isArray(o.position) ||
        o.position.length !== 3
      ) {
        continue;
      }
      sanitizedObjects.push({
        id: typeof o.id === 'string' && o.id ? o.id : `obj-${this.nextIdCounter++}`,
        type: o.type as PlaceableType,
        position: [
          Number(o.position[0]) || 0,
          Number(o.position[1]) || 0,
          Number(o.position[2]) || 0,
        ],
        rotationY: Number(o.rotationY) || 0,
        scale: THREE.MathUtils.clamp(Number(o.scale) || 1, 0.5, 2.5),
      });
    }

    const validRoadStyles = new Set<string>(Object.keys(ROAD_STYLE_LABELS));
    const sanitizedRoads: RoadData[] = [];
    for (const r of doc.roads) {
      if (!r || typeof r !== 'object' || !Array.isArray(r.points) || r.points.length < 2) continue;
      const style: RoadStyle =
        typeof r.style === 'string' && validRoadStyles.has(r.style)
          ? (r.style as RoadStyle)
          : 'asphalt';
      sanitizedRoads.push({
        id: typeof r.id === 'string' && r.id ? r.id : `road-${this.nextIdCounter++}`,
        style,
        width: THREE.MathUtils.clamp(Number(r.width) || ROAD_DEFAULT_WIDTHS[style], 2.4, 16),
        points: r.points
          .filter((pt) => Array.isArray(pt) && pt.length >= 2)
          .map((pt) => [Number(pt[0]) || 0, Number(pt[1]) || 0]),
      });
    }

    const validOutfits = new Set<string>(['citizen', 'merchant', 'romanToga', 'guard', 'artisan', 'noble']);
    const validQuestTypes = new Set<string>(['talk', 'visit', 'explore', 'drive']);
    const sanitizedNpcs: NpcData[] = [];
    if (Array.isArray(doc.npcs)) {
      for (const n of doc.npcs) {
        if (!n || typeof n !== 'object' || !Array.isArray(n.position) || n.position.length !== 3) continue;
        const gender: NpcGender = n.gender === 'female' ? 'female' : 'male';
        const outfit: NpcOutfit = validOutfits.has(n.outfit) ? n.outfit : 'citizen';
        const qType: NpcQuestObjectiveType =
          n.quest && validQuestTypes.has(n.quest.objectiveType) ? n.quest.objectiveType : 'talk';
        sanitizedNpcs.push({
          id: typeof n.id === 'string' && n.id ? n.id : `npc-${this.nextIdCounter++}`,
          name: typeof n.name === 'string' && n.name.trim() ? n.name.trim() : 'Şehir Sakini',
          roleTitle: typeof n.roleTitle === 'string' ? n.roleTitle.trim() : 'Gezgin',
          gender,
          outfit,
          primaryColor: typeof n.primaryColor === 'string' ? n.primaryColor : '#b84a32',
          secondaryColor: typeof n.secondaryColor === 'string' ? n.secondaryColor : '#e8dcc8',
          skinTone: typeof n.skinTone === 'string' ? n.skinTone : '#e3b38e',
          hairColor: typeof n.hairColor === 'string' ? n.hairColor : '#2a1d14',
          position: [Number(n.position[0]) || 0, Number(n.position[1]) || 0, Number(n.position[2]) || 0],
          rotationY: Number(n.rotationY) || 0,
          scale: THREE.MathUtils.clamp(Number(n.scale) || 1, 0.7, 1.8),
          dialogues:
            Array.isArray(n.dialogues) && n.dialogues.length > 0
              ? n.dialogues.map((d) => String(d)).filter(Boolean)
              : ['Merhaba gezgin!'],
          quest: {
            enabled: Boolean(n.quest?.enabled),
            title: typeof n.quest?.title === 'string' ? n.quest.title : 'Şehir Görevi',
            description: typeof n.quest?.description === 'string' ? n.quest.description : '',
            objectiveType: qType,
            targetAmount: Math.max(1, Number(n.quest?.targetAmount) || 25),
            targetPosition:
              Array.isArray(n.quest?.targetPosition) && n.quest.targetPosition.length === 2
                ? [Number(n.quest.targetPosition[0]) || 0, Number(n.quest.targetPosition[1]) || 0]
                : undefined,
            rewardGold: Math.max(0, Number(n.quest?.rewardGold) || 0),
            rewardXp: Math.max(0, Number(n.quest?.rewardXp) || 0),
            rewardItem: typeof n.quest?.rewardItem === 'string' ? n.quest.rewardItem : '',
          },
        });
      }
    }

    const timeOfDay: TimeOfDay =
      doc.timeOfDay === 'noon' || doc.timeOfDay === 'night' ? doc.timeOfDay : 'golden';

    const carPos =
      doc.carTransform && Array.isArray(doc.carTransform.position)
        ? ([
            Number(doc.carTransform.position[0]) || 8,
            0,
            Number(doc.carTransform.position[2]) || 10,
          ] as [number, number, number])
        : ([8, 0, 10] as [number, number, number]);

    const validRelTypes = new Set<string>(['ally', 'trade', 'mentor', 'family', 'rival', 'secret']);
    const npcIdSet = new Set(sanitizedNpcs.map((n) => n.id));
    const sanitizedRelations: NpcRelationData[] = [];
    if (Array.isArray(doc.npcRelations)) {
      for (const rel of doc.npcRelations) {
        if (!rel || typeof rel !== 'object') continue;
        if (
          typeof rel.sourceId !== 'string' ||
          typeof rel.targetId !== 'string' ||
          rel.sourceId === rel.targetId ||
          !npcIdSet.has(rel.sourceId) ||
          !npcIdSet.has(rel.targetId)
        ) {
          continue;
        }
        const type: NpcRelationType = validRelTypes.has(rel.type) ? rel.type : 'ally';
        sanitizedRelations.push({
          id: typeof rel.id === 'string' && rel.id ? rel.id : `rel-${this.nextIdCounter++}`,
          sourceId: rel.sourceId,
          targetId: rel.targetId,
          type,
          label: typeof rel.label === 'string' && rel.label.trim() ? rel.label.trim() : 'Bağlantı',
          strength: THREE.MathUtils.clamp(Math.round(Number(rel.strength) || 3), 1, 5),
        });
      }
    }

    const validVehicleTypes = new Set<string>(Object.keys(VEHICLE_LABELS));
    const sanitizedVehicles: PlacedVehicleData[] = [];
    if (Array.isArray(doc.vehicles)) {
      for (const v of doc.vehicles) {
        if (!v || typeof v !== 'object' || !Array.isArray(v.position) || v.position.length !== 3) continue;
        const vType: VehicleType = validVehicleTypes.has(v.type)
          ? (v.type as VehicleType)
          : 'classicCar';
        sanitizedVehicles.push({
          id: typeof v.id === 'string' && v.id ? v.id : `veh-${this.nextIdCounter++}`,
          type: vType,
          position: [
            Number(v.position[0]) || 0,
            Math.max(0, Number(v.position[1]) || 0),
            Number(v.position[2]) || 0,
          ],
          rotationY: Number(v.rotationY) || 0,
        });
      }
    }

    const normalized: MapDocument = {
      version: 1,
      name: typeof doc.name === 'string' ? doc.name : 'Yüklenen Harita',
      timeOfDay,
      carTransform: {
        position: carPos,
        rotationY: Number(doc.carTransform?.rotationY) || 0,
      },
      objects: sanitizedObjects,
      roads: sanitizedRoads,
      vehicles: sanitizedVehicles.length > 0 ? sanitizedVehicles : undefined,
      npcs: sanitizedNpcs,
      npcRelations: sanitizedRelations,
    };

    this.applyMapDocument(normalized, false);
    return { ok: true };
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();

    this.clearSceneEntities();
    this.clearRoadPreview();
    this.clearSelectedRoadHighlight();
    if (this.ghostNpcRig) {
      this.scene.remove(this.ghostNpcRig.group);
      this.ghostNpcRig.disposeOwned();
      this.ghostNpcRig = null;
      this.ghostGroup = null;
    } else if (this.ghostVehicleRig) {
      this.scene.remove(this.ghostVehicleRig.root);
      this.ghostVehicleRig.disposeOwned();
      this.ghostVehicleRig = null;
      this.ghostGroup = null;
    } else if (this.ghostGroup) {
      disposeObject3D(this.ghostGroup, this.sharedMaterialsSet);
    }
    this.roadCursorRing.geometry.dispose();
    this.roadCursorRingMat.dispose();
    this.ghostMat.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // ==================== ENTITY MANAGEMENT & PHYSICS ====================

  private clearSceneEntities() {
    for (const obj of this.placedObjects.values()) {
      this.objectsRoot.remove(obj.group);
      disposeObject3D(obj.group, this.sharedMaterialsSet);
      this.world.removeBody(obj.body);
    }
    this.placedObjects.clear();

    for (const road of this.roads.values()) {
      this.roadsRoot.remove(road.group);
      disposeObject3D(road.group, this.sharedMaterialsSet);
      for (const b of road.bodies) this.world.removeBody(b);
    }
    this.roads.clear();

    for (const veh of this.vehicles.values()) {
      this.vehiclesRoot.remove(veh.rig.root);
      veh.rig.disposeOwned();
      this.world.removeBody(veh.body);
    }
    this.vehicles.clear();
    this.activeVehicleId = null;
    this.nearVehicleId = null;
    this.inVehicle = false;
    this.nearVehicle = false;

    for (const npc of this.npcs.values()) {
      this.npcsRoot.remove(npc.rig.group);
      npc.rig.disposeOwned();
      this.world.removeBody(npc.body);
    }
    this.npcs.clear();
    this.npcRelations = [];
    this.questStates.clear();
    for (const b of this.questBeacons.values()) {
      this.questBeaconsRoot.remove(b.group);
      b.dispose();
    }
    this.questBeacons.clear();
    this.nearNpcId = null;
    this.playerRewards = { gold: 0, xp: 0, items: [], completedCount: 0 };

    this.selected = null;
    this.isMovingSelected = false;
    this.selectionRing.visible = false;
    this.clearSelectedRoadHighlight();
  }

  private applyMapDocument(doc: MapDocument, initial: boolean) {
    this.cancelRoadDraft();
    if (this.inVehicle) this.exitVehicle();
    this.clearSceneEntities();

    this.timeOfDay = doc.timeOfDay;
    for (const r of doc.roads) {
      this.addRoadEntity(r);
    }
    for (const o of doc.objects) {
      this.addPlacedObject(o);
    }
    if (Array.isArray(doc.vehicles) && doc.vehicles.length > 0) {
      for (const v of doc.vehicles) {
        this.addVehicleEntity(v);
      }
    } else if (doc.carTransform) {
      this.addVehicleEntity({
        id: 'veh-classic-default',
        type: 'classicCar',
        position: [...doc.carTransform.position],
        rotationY: doc.carTransform.rotationY,
      });
    }
    if (Array.isArray(doc.npcs)) {
      for (const n of doc.npcs) {
        this.addNpcEntity(n);
      }
    }
    if (Array.isArray(doc.npcRelations)) {
      for (const rel of doc.npcRelations) {
        if (this.npcs.has(rel.sourceId) && this.npcs.has(rel.targetId) && rel.sourceId !== rel.targetId) {
          this.npcRelations.push({ ...rel });
        }
      }
    }

    const [cx, , cz] = doc.carTransform.position;
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.position.set(cx - 4.2, 0.25, cz + 1.5);
    this.explorer.root.position.set(cx - 4.2, 0, cz + 1.5);

    if (!initial) {
      this.emitSnapshot();
    }
  }

  private addVehicleEntity(data: PlacedVehicleData): RuntimeVehicle {
    const rig = buildVehicleRig(data.type, this.materials);
    rig.root.userData.entityKind = 'vehicle';
    rig.root.userData.entityId = data.id;
    rig.root.traverse((child) => {
      child.userData.entityKind = 'vehicle';
      child.userData.entityId = data.id;
    });

    const [hx, hy, hz] = rig.colliderHalfExtents;
    const body = rig.isFlying
      ? new CANNON.Body({
          mass: 0,
          type: CANNON.Body.KINEMATIC,
          material: this.carPhysMat,
        })
      : new CANNON.Body({
          mass: 1150,
          material: this.carPhysMat,
          linearDamping: 0.22,
          angularDamping: 0.85,
          angularFactor: new CANNON.Vec3(0, 1, 0),
        });

    body.addShape(
      new CANNON.Box(new CANNON.Vec3(hx, hy, hz)),
      new CANNON.Vec3(0, rig.colliderOffsetY, 0)
    );
    const startY = rig.isFlying ? Math.max(0.15, data.position[1]) : Math.max(0.06, data.position[1]);
    body.position.set(data.position[0], startY, data.position[2]);
    body.quaternion.setFromEuler(0, data.rotationY, 0);

    const runtime: RuntimeVehicle = {
      data: {
        ...data,
        position: [data.position[0], startY, data.position[2]],
      },
      rig,
      body,
      yaw: data.rotationY,
      steerAngle: 0,
      speed: 0,
      verticalSpeed: 0,
      bankAngle: 0,
    };

    this.syncVehicleVisuals(runtime, 0);
    this.vehiclesRoot.add(rig.root);
    this.world.addBody(body);
    this.vehicles.set(data.id, runtime);
    return runtime;
  }

  private addPlacedObject(data: PlacedObjectData): RuntimeObject {
    const built = buildPlaceableAsset(data.type, this.materials);
    built.group.userData.entityKind = 'object';
    built.group.userData.entityId = data.id;
    built.group.traverse((child) => {
      child.userData.entityKind = 'object';
      child.userData.entityId = data.id;
    });

    const body = new CANNON.Body({
      mass: 0,
      material: this.groundPhysMat,
    });

    const runtime: RuntimeObject = {
      data: { ...data, position: [...data.position] },
      group: built.group,
      colliders: built.colliders,
      selectionRadius: built.selectionRadius,
      body,
    };

    this.rebuildObjectBody(runtime);
    this.syncObjectTransform(runtime);

    this.objectsRoot.add(built.group);
    this.world.addBody(body);
    this.placedObjects.set(data.id, runtime);
    return runtime;
  }

  private rebuildObjectBody(runtime: RuntimeObject) {
    while (runtime.body.shapes.length > 0) {
      runtime.body.removeShape(runtime.body.shapes[0]);
    }
    const s = runtime.data.scale;
    for (const def of runtime.colliders) {
      const halfExtents = new CANNON.Vec3(
        (def.size[0] * s) / 2,
        (def.size[1] * s) / 2,
        (def.size[2] * s) / 2
      );
      const offset = new CANNON.Vec3(def.offset[0] * s, def.offset[1] * s, def.offset[2] * s);
      runtime.body.addShape(new CANNON.Box(halfExtents), offset);
    }
  }

  private syncObjectTransform(runtime: RuntimeObject) {
    const [x, y, z] = runtime.data.position;
    runtime.group.position.set(x, y, z);
    runtime.group.rotation.set(0, runtime.data.rotationY, 0);
    runtime.group.scale.setScalar(runtime.data.scale);

    runtime.body.position.set(x, y, z);
    runtime.body.quaternion.setFromEuler(0, runtime.data.rotationY, 0);
  }

  private buildRoadPhysicsBodies(data: RoadData): CANNON.Body[] {
    const bodies: CANNON.Body[] = [];
    const vecPoints = data.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    if (vecPoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(vecPoints, false, 'centripetal', 0.5);
      const len = curve.getLength();
      const segs = Math.max(4, Math.min(48, Math.ceil(len / 3.5)));
      const pts = curve.getSpacedPoints(segs);
      const totalWidth = getRoadTotalWidth(data.style, data.width);

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const segLen = a.distanceTo(b);
        if (segLen < 0.1) continue;
        const midX = (a.x + b.x) * 0.5;
        const midZ = (a.z + b.z) * 0.5;
        const angle = Math.atan2(b.x - a.x, b.z - a.z);

        const roadBody = new CANNON.Body({
          mass: 0,
          material: this.groundPhysMat,
        });
        roadBody.addShape(new CANNON.Box(new CANNON.Vec3(totalWidth * 0.5, 0.03, segLen * 0.54)));
        roadBody.position.set(midX, -0.01, midZ);
        roadBody.quaternion.setFromEuler(0, angle, 0);
        this.world.addBody(roadBody);
        bodies.push(roadBody);
      }
    }
    return bodies;
  }

  private addRoadEntity(data: RoadData): RuntimeRoad {
    const group = buildRoadGroup(data.points, data.style, data.width, this.materials, false);
    group.userData.entityKind = 'road';
    group.userData.entityId = data.id;
    group.traverse((child) => {
      child.userData.entityKind = 'road';
      child.userData.entityId = data.id;
    });

    const bodies = this.buildRoadPhysicsBodies(data);
    this.roadsRoot.add(group);
    const runtime: RuntimeRoad = { data, group, bodies };
    this.roads.set(data.id, runtime);
    return runtime;
  }

  private rebuildRoadEntity(road: RuntimeRoad) {
    this.roadsRoot.remove(road.group);
    disposeObject3D(road.group, this.sharedMaterialsSet);
    for (const b of road.bodies) this.world.removeBody(b);

    const group = buildRoadGroup(
      road.data.points,
      road.data.style,
      road.data.width,
      this.materials,
      false
    );
    group.userData.entityKind = 'road';
    group.userData.entityId = road.data.id;
    group.traverse((child) => {
      child.userData.entityKind = 'road';
      child.userData.entityId = road.data.id;
    });
    this.roadsRoot.add(group);
    road.group = group;
    road.bodies = this.buildRoadPhysicsBodies(road.data);
  }

  private resolveVisitTarget(npc: NpcData): [number, number] {
    if (npc.quest.targetPosition) {
      return npc.quest.targetPosition;
    }
    const dist = Math.max(8, Math.min(45, npc.quest.targetAmount || 18));
    const tx = THREE.MathUtils.clamp(npc.position[0] + Math.sin(npc.rotationY) * dist, -60, 60);
    const tz = THREE.MathUtils.clamp(npc.position[2] + Math.cos(npc.rotationY) * dist, -60, 60);
    return [Math.round(tx * 10) / 10, Math.round(tz * 10) / 10];
  }

  private spawnQuestBeacon(npcId: string, target: [number, number]) {
    this.removeQuestBeacon(npcId);
    const beacon = buildQuestBeaconMesh();
    beacon.group.position.set(target[0], 0, target[1]);
    this.questBeaconsRoot.add(beacon.group);
    this.questBeacons.set(npcId, { ...beacon, target });
  }

  private removeQuestBeacon(npcId: string) {
    const existing = this.questBeacons.get(npcId);
    if (existing) {
      this.questBeaconsRoot.remove(existing.group);
      existing.dispose();
      this.questBeacons.delete(npcId);
    }
  }

  private syncNpcQuestState(npc: NpcData) {
    const runtimeNpc = this.npcs.get(npc.id);
    if (!npc.quest.enabled) {
      this.questStates.delete(npc.id);
      this.removeQuestBeacon(npc.id);
      runtimeNpc?.rig.setQuestMarkerStatus(null);
      return;
    }
    const prev = this.questStates.get(npc.id);
    const target = Math.max(1, npc.quest.objectiveType === 'talk' ? 1 : npc.quest.targetAmount || 20);
    const next: ActiveQuestRuntime = {
      npcId: npc.id,
      npcName: npc.name,
      status: prev ? prev.status : 'available',
      progress: prev ? Math.min(prev.progress, target) : 0,
      target,
      quest: structuredClone(npc.quest),
    };
    this.questStates.set(npc.id, next);
    runtimeNpc?.rig.setQuestMarkerStatus(next.status);
    if (next.status === 'active' && next.quest.objectiveType === 'visit') {
      this.spawnQuestBeacon(npc.id, this.resolveVisitTarget(npc));
    } else {
      this.removeQuestBeacon(npc.id);
    }
  }

  private addNpcEntity(data: NpcData): RuntimeNpc {
    const cloned = structuredClone(data);
    const rig = buildNpcCharacter(cloned, this.materials, false);
    rig.group.userData.entityKind = 'npc';
    rig.group.userData.entityId = cloned.id;
    rig.group.traverse((child) => {
      child.userData.entityKind = 'npc';
      child.userData.entityId = cloned.id;
    });

    const body = new CANNON.Body({
      mass: 0,
      material: this.groundPhysMat,
    });
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(0.45 * cloned.scale, 0.92 * cloned.scale, 0.45 * cloned.scale)),
      new CANNON.Vec3(0, 0.92 * cloned.scale, 0)
    );
    this.world.addBody(body);

    const runtime: RuntimeNpc = { data: cloned, rig, body, baseYaw: cloned.rotationY };
    this.syncNpcTransform(runtime);
    this.npcsRoot.add(rig.group);
    this.npcs.set(cloned.id, runtime);
    this.syncNpcQuestState(cloned);
    return runtime;
  }

  private rebuildNpcEntity(runtime: RuntimeNpc, nextData: NpcData) {
    this.npcsRoot.remove(runtime.rig.group);
    runtime.rig.disposeOwned();
    const rig = buildNpcCharacter(nextData, this.materials, false);
    rig.group.userData.entityKind = 'npc';
    rig.group.userData.entityId = nextData.id;
    rig.group.traverse((child) => {
      child.userData.entityKind = 'npc';
      child.userData.entityId = nextData.id;
    });
    runtime.data = nextData;
    runtime.rig = rig;
    runtime.baseYaw = nextData.rotationY;
    this.syncNpcTransform(runtime);
    this.npcsRoot.add(rig.group);
  }

  private syncNpcTransform(runtime: RuntimeNpc) {
    const { position, rotationY, scale } = runtime.data;
    runtime.rig.group.position.set(position[0], position[1], position[2]);
    runtime.rig.group.rotation.set(0, rotationY, 0);
    runtime.rig.group.scale.setScalar(scale);
    runtime.body.position.set(position[0], position[1], position[2]);
    runtime.body.quaternion.setFromEuler(0, rotationY, 0);
  }

  private rebuildGhostPreview() {
    if (this.ghostNpcRig) {
      this.scene.remove(this.ghostNpcRig.group);
      this.ghostNpcRig.disposeOwned();
      this.ghostNpcRig = null;
      this.ghostGroup = null;
    } else if (this.ghostVehicleRig) {
      this.scene.remove(this.ghostVehicleRig.root);
      this.ghostVehicleRig.disposeOwned();
      this.ghostVehicleRig = null;
      this.ghostGroup = null;
    } else if (this.ghostGroup) {
      this.scene.remove(this.ghostGroup);
      disposeObject3D(this.ghostGroup, this.sharedMaterialsSet);
      this.ghostGroup = null;
    }

    if (this.mode !== 'editor') return;

    if (this.activeTool.kind === 'npc') {
      const rig = buildNpcCharacter(this.npcDraftTemplate, this.materials, true);
      rig.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.transparent = true;
            mat.opacity = 0.74;
            mat.depthWrite = false;
          }
          child.castShadow = false;
          child.receiveShadow = false;
        }
        child.userData.ignoreRaycast = true;
      });
      rig.group.rotation.y = THREE.MathUtils.degToRad(this.placementRotationDeg);
      rig.group.scale.setScalar(THREE.MathUtils.clamp(this.placementScale, 0.7, 1.8));
      rig.group.visible = this.hasCursorGround;
      rig.group.position.copy(this.cursorGroundPos);
      this.ghostNpcRig = rig;
      this.ghostGroup = rig.group;
      this.scene.add(rig.group);
      return;
    }

    if (this.activeTool.kind === 'vehicle') {
      const rig = buildVehicleRig(this.activeTool.vehicleType, this.materials);
      rig.root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.userData.ignoreRaycast) {
            child.visible = false;
          } else {
            child.material = this.ghostMat;
            child.castShadow = false;
            child.receiveShadow = false;
          }
        }
        child.userData.ignoreRaycast = true;
      });
      rig.root.rotation.y = THREE.MathUtils.degToRad(this.placementRotationDeg);
      rig.root.visible = this.hasCursorGround;
      rig.root.position.copy(this.cursorGroundPos);
      this.ghostVehicleRig = rig;
      this.ghostGroup = rig.root;
      this.scene.add(rig.root);
      return;
    }

    if (this.activeTool.kind !== 'place') return;

    const built = buildPlaceableAsset(this.activeTool.objectType, this.materials);
    built.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.userData.ignoreRaycast) {
          child.visible = false;
        } else {
          child.material = this.ghostMat;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      }
      child.userData.ignoreRaycast = true;
    });

    built.group.rotation.y = THREE.MathUtils.degToRad(this.placementRotationDeg);
    built.group.scale.setScalar(this.placementScale);
    built.group.visible = this.hasCursorGround;
    built.group.position.copy(this.cursorGroundPos);

    this.ghostGroup = built.group;
    this.scene.add(built.group);
  }

  private clearRoadPreview() {
    if (this.roadPreviewGroup) {
      this.scene.remove(this.roadPreviewGroup);
      disposeObject3D(this.roadPreviewGroup, this.sharedMaterialsSet);
      this.roadPreviewGroup = null;
    }
    while (this.roadMarkerGroup.children.length > 0) {
      const child = this.roadMarkerGroup.children[0];
      this.roadMarkerGroup.remove(child);
      disposeObject3D(child, this.sharedMaterialsSet);
    }
  }

  private rebuildRoadPreview() {
    this.clearRoadPreview();
    if (this.mode !== 'editor' || this.activeTool.kind !== 'road') return;

    const markerGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xf4ae44 });
    for (const [x, z] of this.activeRoadPoints) {
      const m = new THREE.Mesh(markerGeo, markerMat);
      m.position.set(x, 0.2, z);
      m.userData.ignoreRaycast = true;
      this.roadMarkerGroup.add(m);
    }

    const previewPts: [number, number][] = [...this.activeRoadPoints];
    if (this.hasCursorGround && this.activeRoadPoints.length >= 1) {
      const last = this.activeRoadPoints[this.activeRoadPoints.length - 1];
      const dx = this.cursorGroundPos.x - last[0];
      const dz = this.cursorGroundPos.z - last[1];
      if (dx * dx + dz * dz > 0.6) {
        previewPts.push([this.cursorGroundPos.x, this.cursorGroundPos.z]);
      }
    }

    if (previewPts.length >= 2) {
      const width = this.placementRoadWidth;
      this.roadPreviewGroup = buildRoadGroup(
        previewPts,
        this.activeTool.style,
        width,
        this.materials,
        true
      );
      this.roadPreviewGroup.traverse((c) => {
        c.userData.ignoreRaycast = true;
      });
      this.scene.add(this.roadPreviewGroup);
    }
  }

  private clearSelectedRoadHighlight() {
    if (this.selectedRoadHighlight) {
      this.scene.remove(this.selectedRoadHighlight);
      disposeObject3D(this.selectedRoadHighlight, this.sharedMaterialsSet);
      this.selectedRoadHighlight = null;
    }
  }

  private updateRoadCursorRing() {
    if (this.mode !== 'editor' || this.activeTool.kind !== 'road' || !this.hasCursorGround) {
      this.roadCursorRing.visible = false;
      return;
    }
    const rad = getRoadTotalWidth(this.activeTool.style, this.placementRoadWidth) * 0.5;
    this.roadCursorRing.position.set(this.cursorGroundPos.x, 0.24, this.cursorGroundPos.z);
    this.roadCursorRing.scale.set(rad, 1, rad);
    this.roadCursorRingMat.color.setHex(this.roadCursorSnapped ? 0x38d9a9 : 0xf4ae44);
    this.roadCursorRing.visible = true;
  }

  private findRoadSnapPoint(x: number, z: number): { x: number; z: number; snapped: boolean } {
    let bestDist = 2.6;
    let bestX = x;
    let bestZ = z;
    let snapped = false;

    for (const road of this.roads.values()) {
      const pts = road.data.points;
      if (pts.length < 2) continue;

      // Priority 1: Snap directly to existing road endpoints
      for (const ep of [pts[0], pts[pts.length - 1]]) {
        const d = Math.hypot(ep[0] - x, ep[1] - z);
        if (d < bestDist) {
          bestDist = d;
          bestX = ep[0];
          bestZ = ep[1];
          snapped = true;
        }
      }

      // Priority 2: Snap to existing road centerline for clean T-junctions & crossings
      const vecPts = pts.map(([px, pz]) => new THREE.Vector3(px, 0, pz));
      const curve = new THREE.CatmullRomCurve3(vecPts, false, 'centripetal', 0.5);
      const len = curve.getLength();
      const samples = curve.getSpacedPoints(Math.max(4, Math.min(48, Math.ceil(len / 2.0))));
      for (const sp of samples) {
        const d = Math.hypot(sp.x - x, sp.z - z);
        if (d < Math.min(bestDist, 2.0)) {
          bestDist = d;
          bestX = sp.x;
          bestZ = sp.z;
          snapped = true;
        }
      }
    }

    return { x: bestX, z: bestZ, snapped };
  }

  private updateSelectionRing() {
    this.clearSelectedRoadHighlight();
    if (this.selected?.kind === 'object') {
      const runtime = this.placedObjects.get(this.selected.id);
      if (runtime) {
        const rad = runtime.selectionRadius * runtime.data.scale;
        this.selectionRing.position.set(runtime.data.position[0], 0.08, runtime.data.position[2]);
        this.selectionRing.scale.set(rad, 1, rad);
        this.selectionRing.visible = true;
        return;
      }
    } else if (this.selected?.kind === 'npc') {
      const npc = this.npcs.get(this.selected.id);
      if (npc) {
        const rad = 1.05 * npc.data.scale;
        this.selectionRing.position.set(npc.data.position[0], 0.08, npc.data.position[2]);
        this.selectionRing.scale.set(rad, 1, rad);
        this.selectionRing.visible = true;
        return;
      }
    } else if (this.selected?.kind === 'vehicle') {
      const veh = this.vehicles.get(this.selected.id);
      if (veh) {
        const rad = veh.rig.selectionRadius;
        this.selectionRing.position.set(veh.body.position.x, 0.08, veh.body.position.z);
        this.selectionRing.scale.set(rad, 1, rad);
        this.selectionRing.visible = true;
        return;
      }
    } else if (this.selected?.kind === 'road') {
      const road = this.roads.get(this.selected.id);
      if (road) {
        this.selectionRing.visible = false;
        this.selectedRoadHighlight = buildRoadHighlightGroup(
          road.data.points,
          road.data.style,
          road.data.width
        );
        this.scene.add(this.selectedRoadHighlight);
        return;
      }
    }
    this.selectionRing.visible = false;
  }

  // ==================== VEHICLE ENTER / EXIT ====================

  private getActiveVehicle(): RuntimeVehicle | null {
    if (!this.inVehicle || !this.activeVehicleId) return null;
    return this.vehicles.get(this.activeVehicleId) ?? null;
  }

  private toggleVehicle() {
    if (this.mode !== 'play') return;
    if (this.inVehicle) {
      this.exitVehicle();
    } else if (this.nearVehicle && this.nearVehicleId) {
      this.enterVehicle(this.nearVehicleId);
    }
  }

  private enterVehicle(vehicleId: string) {
    const veh = this.vehicles.get(vehicleId);
    if (!veh) return;
    this.activeVehicleId = vehicleId;
    this.inVehicle = true;
    this.playerBody.collisionResponse = false;
    this.playerBody.mass = 0;
    this.playerBody.updateMassProperties();
    this.playerBody.velocity.set(0, 0, 0);
    this.playCamYaw = veh.yaw + Math.PI;
    this.playCamPitch = veh.rig.isFlying ? 0.16 : 0.22;

    const name = VEHICLE_LABELS[veh.data.type];
    this.callbacks.onToast(
      veh.rig.isFlying
        ? `${name} kontrolünde — WASD uçuş, Space yüksel, Shift alçal, E in.`
        : `${name} direksiyonundasınız — WASD sürüş, Space el freni, E in.`,
      'info'
    );
    this.emitSnapshot();
  }

  private exitVehicle() {
    const veh = this.getActiveVehicle();
    this.inVehicle = false;
    this.activeVehicleId = null;
    this.playerBody.mass = 72;
    this.playerBody.updateMassProperties();
    this.playerBody.collisionResponse = true;

    if (veh) {
      const offset = veh.rig.isFlying ? 3.2 : 2.2;
      const leftX = Math.cos(veh.yaw) * offset;
      const leftZ = -Math.sin(veh.yaw) * offset;
      // Safely place player at ground height even if disembarking from an airborne Zeppelin
      this.playerBody.position.set(
        veh.body.position.x + leftX,
        0.35,
        veh.body.position.z + leftZ
      );
      this.explorer.root.rotation.set(0, veh.yaw, 0);
      veh.verticalSpeed = 0;
      if (veh.rig.isFlying) {
        veh.speed *= 0.2;
      }
    }
    this.playerBody.velocity.set(0, 0, 0);
    this.explorer.leftLeg.rotation.x = 0;
    this.explorer.rightLeg.rotation.x = 0;
    this.explorer.leftArm.rotation.x = 0;
    this.explorer.rightArm.rotation.x = 0;
    this.emitSnapshot();
  }

  // ==================== INPUT EVENTS ====================

  private onKeyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (e.code === 'Tab') {
      e.preventDefault();
      this.toggleMode();
      return;
    }

    this.keys.add(e.code);

    if (this.mode === 'editor') {
      if (e.code === 'KeyR') {
        e.preventDefault();
        this.rotatePlacement(e.shiftKey ? -15 : 15);
      } else if (
        e.code === 'KeyG' &&
        (this.selected?.kind === 'object' ||
          this.selected?.kind === 'npc' ||
          this.selected?.kind === 'vehicle')
      ) {
        e.preventDefault();
        this.startMovingSelected();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (this.activeTool.kind === 'road' && this.activeRoadPoints.length > 0) {
          e.preventDefault();
          this.undoLastRoadPoint();
        } else if (this.selected) {
          e.preventDefault();
          this.deleteSelected();
        }
      } else if (e.code === 'Enter' && this.activeTool.kind === 'road') {
        e.preventDefault();
        this.commitActiveRoad();
      } else if (e.code === 'Escape') {
        if (this.activeTool.kind === 'road' && this.activeRoadPoints.length > 0) {
          this.cancelRoadDraft();
        } else if (this.isMovingSelected) {
          this.isMovingSelected = false;
          this.emitSnapshot();
        } else if (this.selected) {
          this.selected = null;
          this.selectionRing.visible = false;
          this.clearSelectedRoadHighlight();
          this.emitSnapshot();
        }
      }
    } else {
      if (e.code === 'KeyF') {
        if (!this.inVehicle && this.nearNpcId) {
          e.preventDefault();
          this.interactWithNearNpc();
        }
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        if (this.inVehicle || this.nearVehicle) {
          this.toggleVehicle();
        } else if (this.nearNpcId) {
          this.interactWithNearNpc();
        }
      } else if (e.code === 'Space' && !this.inVehicle && this.isGrounded && this.jumpCooldown <= 0) {
        e.preventDefault();
        this.playerBody.velocity.y = 8.4;
        this.isGrounded = false;
        this.jumpCooldown = 0.35;
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    const canvas = this.renderer.domElement;
    if (e.target !== canvas) return;

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };

    if (this.mode === 'editor') {
      if (e.button === 2 || e.button === 1) {
        this.isRightMouseDown = true;
      }
    } else {
      if (e.button === 0 || e.button === 2) {
        this.isLeftDraggingPlay = true;
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.mode === 'editor') {
      if (this.isRightMouseDown) {
        this.editorYaw -= dx * 0.0038;
        this.editorPitch = THREE.MathUtils.clamp(this.editorPitch - dy * 0.0035, -1.45, 1.35);
        return;
      }

      const now = performance.now();
      if (now - this.lastHoverRaycastTime < 22) return;
      this.lastHoverRaycastTime = now;

      if (this.updateCursorGround(e)) {
        if ((this.activeTool.kind === 'place' || this.activeTool.kind === 'npc') && this.ghostGroup) {
          this.ghostGroup.visible = true;
          this.ghostGroup.position.copy(this.cursorGroundPos);
        } else if (this.activeTool.kind === 'road') {
          this.updateRoadCursorRing();
          if (this.activeRoadPoints.length > 0) {
            this.rebuildRoadPreview();
          }
        } else if (this.isMovingSelected && this.selected?.kind === 'object') {
          const runtime = this.placedObjects.get(this.selected.id);
          if (runtime) {
            runtime.data.position = [this.cursorGroundPos.x, 0, this.cursorGroundPos.z];
            this.syncObjectTransform(runtime);
            this.updateSelectionRing();
          }
        } else if (this.isMovingSelected && this.selected?.kind === 'npc') {
          const npc = this.npcs.get(this.selected.id);
          if (npc) {
            npc.data.position = [this.cursorGroundPos.x, 0, this.cursorGroundPos.z];
            this.syncNpcTransform(npc);
            this.updateSelectionRing();
          }
        }
      }
    } else {
      if (this.pointerLocked) {
        this.playCamYaw -= e.movementX * 0.0028;
        this.playCamPitch = THREE.MathUtils.clamp(this.playCamPitch + e.movementY * 0.0024, -0.25, 0.95);
      } else if (this.isLeftDraggingPlay) {
        this.playCamYaw -= dx * 0.0045;
        this.playCamPitch = THREE.MathUtils.clamp(this.playCamPitch + dy * 0.0038, -0.25, 0.95);
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const canvas = this.renderer.domElement;
    if (e.button === 2 || e.button === 1) {
      this.isRightMouseDown = false;
    }
    this.isLeftDraggingPlay = false;

    if (e.target !== canvas || e.button !== 0) return;

    const moveDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (moveDist > 6) return;

    if (this.mode === 'editor') {
      this.handleEditorLeftClick(e);
    }
  };

  private onDoubleClick = (e: MouseEvent) => {
    if (e.target !== this.renderer.domElement) return;
    if (this.mode === 'editor' && this.activeTool.kind === 'road' && this.activeRoadPoints.length >= 2) {
      this.commitActiveRoad();
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (e.target !== this.renderer.domElement) return;
    if (this.mode !== 'editor') return;

    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    if (
      this.activeTool.kind === 'place' ||
      this.activeTool.kind === 'npc' ||
      (this.activeTool.kind === 'select' &&
        (this.selected?.kind === 'object' || this.selected?.kind === 'npc'))
    ) {
      e.preventDefault();
      const base =
        this.activeTool.kind === 'select' && this.selected?.kind === 'object'
          ? (this.placedObjects.get(this.selected.id)?.data.scale ?? 1)
          : this.activeTool.kind === 'select' && this.selected?.kind === 'npc'
            ? (this.npcs.get(this.selected.id)?.data.scale ?? 1)
            : this.placementScale;
      this.setPlacementScale(base + delta);
    } else if (
      this.activeTool.kind === 'road' ||
      (this.activeTool.kind === 'select' && this.selected?.kind === 'road')
    ) {
      e.preventDefault();
      const baseW =
        this.activeTool.kind === 'select' && this.selected?.kind === 'road'
          ? (this.roads.get(this.selected.id)?.data.width ?? this.placementRoadWidth)
          : this.placementRoadWidth;
      this.setRoadWidth(baseW + (delta > 0 ? 0.4 : -0.4));
    } else {
      e.preventDefault();
      this.camera.getWorldDirection(_vecForward);
      this.editorPos.addScaledVector(_vecForward, delta > 0 ? 3.5 : -3.5);
      this.editorPos.y = THREE.MathUtils.clamp(this.editorPos.y, 2.5, 95);
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitSnapshot();
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWebGLContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onContextLost?.();
  };

  private bindEvents() {
    const canvas = this.renderer.domElement;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('webglcontextlost', this.onWebGLContextLost);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private unbindEvents() {
    const canvas = this.renderer.domElement;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('dblclick', this.onDoubleClick);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    canvas.removeEventListener('webglcontextlost', this.onWebGLContextLost);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }

  // ==================== EDITOR CLICK HANDLERS ====================

  private updateCursorGround(e: PointerEvent | MouseEvent): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, _vecA);
    if (!hit) return false;

    const snap = e.altKey ? 0.05 : 0.5;
    let x = THREE.MathUtils.clamp(Math.round(hit.x / snap) * snap, -65, 65);
    let z = THREE.MathUtils.clamp(Math.round(hit.z / snap) * snap, -65, 65);

    this.roadCursorSnapped = false;
    if (this.activeTool.kind === 'road' && !e.altKey) {
      const snapped = this.findRoadSnapPoint(hit.x, hit.z);
      if (snapped.snapped) {
        x = snapped.x;
        z = snapped.z;
        this.roadCursorSnapped = true;
      }
    }

    this.cursorGroundPos.set(x, 0, z);
    this.hasCursorGround = true;
    return true;
  }

  private handleEditorLeftClick(e: PointerEvent) {
    if (this.activeTool.kind === 'place') {
      if (!this.updateCursorGround(e)) return;
      const objData: PlacedObjectData = {
        id: `obj-${Date.now()}-${this.nextIdCounter++}`,
        type: this.activeTool.objectType,
        position: [this.cursorGroundPos.x, 0, this.cursorGroundPos.z],
        rotationY: THREE.MathUtils.degToRad(this.placementRotationDeg),
        scale: this.placementScale,
      };
      this.addPlacedObject(objData);
      this.emitSnapshot();
      return;
    }

    if (this.activeTool.kind === 'npc') {
      if (!this.updateCursorGround(e)) return;
      const npcData: NpcData = {
        ...structuredClone(this.npcDraftTemplate),
        id: `npc-${Date.now()}-${this.nextIdCounter++}`,
        position: [this.cursorGroundPos.x, 0, this.cursorGroundPos.z],
        rotationY: THREE.MathUtils.degToRad(this.placementRotationDeg),
        scale: THREE.MathUtils.clamp(this.placementScale, 0.7, 1.8),
      };
      this.addNpcEntity(npcData);
      this.callbacks.onToast(`"${npcData.name}" sahneye yerleştirildi.`, 'success');
      this.emitSnapshot();
      return;
    }

    if (this.activeTool.kind === 'vehicle') {
      if (!this.updateCursorGround(e)) return;
      const vehData: PlacedVehicleData = {
        id: `veh-${Date.now()}-${this.nextIdCounter++}`,
        type: this.activeTool.vehicleType,
        position: [this.cursorGroundPos.x, 0.15, this.cursorGroundPos.z],
        rotationY: THREE.MathUtils.degToRad(this.placementRotationDeg),
      };
      this.addVehicleEntity(vehData);
      this.callbacks.onToast(`${VEHICLE_LABELS[vehData.type]} sahneye yerleştirildi.`, 'success');
      this.emitSnapshot();
      return;
    }

    if (this.activeTool.kind === 'road') {
      if (!this.updateCursorGround(e)) return;
      this.updateRoadCursorRing();
      const last = this.activeRoadPoints[this.activeRoadPoints.length - 1];
      if (!last || Math.hypot(last[0] - this.cursorGroundPos.x, last[1] - this.cursorGroundPos.z) > 0.75) {
        this.activeRoadPoints.push([this.cursorGroundPos.x, this.cursorGroundPos.z]);
        this.rebuildRoadPreview();
        this.emitSnapshot();
      }
      return;
    }

    if (this.activeTool.kind === 'select') {
      if (this.isMovingSelected && this.selected?.kind === 'object') {
        if (this.updateCursorGround(e)) {
          const runtime = this.placedObjects.get(this.selected.id);
          if (runtime) {
            runtime.data.position = [this.cursorGroundPos.x, 0, this.cursorGroundPos.z];
            this.syncObjectTransform(runtime);
            this.updateSelectionRing();
          }
        }
        this.isMovingSelected = false;
        this.emitSnapshot();
        return;
      }

      if (this.isMovingSelected && this.selected?.kind === 'npc') {
        if (this.updateCursorGround(e)) {
          const npc = this.npcs.get(this.selected.id);
          if (npc) {
            npc.data.position = [this.cursorGroundPos.x, 0, this.cursorGroundPos.z];
            this.syncNpcTransform(npc);
            this.updateSelectionRing();
          }
        }
        this.isMovingSelected = false;
        this.emitSnapshot();
        return;
      }

      if (this.isMovingSelected && this.selected?.kind === 'vehicle') {
        if (this.updateCursorGround(e)) {
          const veh = this.vehicles.get(this.selected.id);
          if (veh) {
            const yKeep = veh.rig.isFlying ? Math.max(0.15, veh.body.position.y) : 0.08;
            veh.data.position = [this.cursorGroundPos.x, yKeep, this.cursorGroundPos.z];
            veh.body.position.set(this.cursorGroundPos.x, yKeep, this.cursorGroundPos.z);
            veh.body.velocity.set(0, 0, 0);
            this.syncVehicleVisuals(veh, 0);
            this.updateSelectionRing();
          }
        }
        this.isMovingSelected = false;
        this.emitSnapshot();
        return;
      }

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouseNdc, this.camera);

      const npcHits = this.raycaster.intersectObjects(this.npcsRoot.children, true);
      const validNpcHit = npcHits.find((h) => !h.object.userData.ignoreRaycast && h.object.userData.entityId);
      if (validNpcHit) {
        this.selected = { kind: 'npc', id: validNpcHit.object.userData.entityId };
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }

      const vehHits = this.raycaster.intersectObjects(this.vehiclesRoot.children, true);
      const validVehHit = vehHits.find((h) => !h.object.userData.ignoreRaycast && h.object.userData.entityId);
      if (validVehHit) {
        this.selected = { kind: 'vehicle', id: validVehHit.object.userData.entityId };
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }

      const objHits = this.raycaster.intersectObjects(this.objectsRoot.children, true);
      const validObjHit = objHits.find((h) => !h.object.userData.ignoreRaycast && h.object.userData.entityId);
      if (validObjHit) {
        this.selected = { kind: 'object', id: validObjHit.object.userData.entityId };
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }

      const roadHits = this.raycaster.intersectObjects(this.roadsRoot.children, true);
      const validRoadHit = roadHits.find((h) => !h.object.userData.ignoreRaycast && h.object.userData.entityId);
      if (validRoadHit) {
        this.selected = { kind: 'road', id: validRoadHit.object.userData.entityId };
        this.updateSelectionRing();
        this.emitSnapshot();
        return;
      }

      this.selected = null;
      this.updateSelectionRing();
      this.emitSnapshot();
    }
  }

  // ==================== UPDATE & RENDER LOOP ====================

  private applyEditorCameraRotation() {
    _euler.set(this.editorPitch, this.editorYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(_euler);
  }

  private updateLighting(dt: number) {
    const target = LIGHTING_PRESETS[this.timeOfDay];
    const t = 1 - Math.exp(-4.0 * dt);

    this.sunLight.position.lerp(target.sunPos, t);
    this.sunLight.color.lerp(target.sunColor, t);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, target.sunIntensity, t);

    this.hemiLight.color.lerp(target.hemiSky, t);
    this.hemiLight.groundColor.lerp(target.hemiGround, t);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, target.hemiIntensity, t);

    this.fillLight.color.lerp(target.fillColor, t);
    this.fillLight.intensity = THREE.MathUtils.lerp(this.fillLight.intensity, target.fillIntensity, t);

    this.fog.color.lerp(target.fogColor, t);
    this.fog.density = THREE.MathUtils.lerp(this.fog.density, target.fogDensity, t);

    this.skyMat.uniforms.topColor.value.lerp(target.skyTop, t);
    this.skyMat.uniforms.horizonColor.value.lerp(target.skyHorizon, t);
    this.skyMat.uniforms.sunDir.value.copy(this.sunLight.position).normalize();
    this.skyMat.uniforms.sunColor.value.lerp(target.sunColor, t);

    this.currentNightFactor = THREE.MathUtils.lerp(this.currentNightFactor, target.nightFactor, t);
    this.skyMat.uniforms.nightMix.value = this.currentNightFactor;
    this.materials.setNightFactor(this.currentNightFactor);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      this.renderer.toneMappingExposure,
      target.exposure,
      t
    );

    const nightStrength = Math.max(0, (this.currentNightFactor - 0.35) / 0.65);
    this.nightAccentLight.intensity = nightStrength * 26;
    this.carNightLight.intensity = nightStrength * 22;
    for (const veh of this.vehicles.values()) {
      for (const beam of veh.rig.headlightGlows) {
        const m = beam.material as THREE.MeshBasicMaterial;
        m.opacity = nightStrength * 0.16;
      }
    }
  }

  private updateEditorCamera(dt: number) {
    this.applyEditorCameraRotation();

    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 34 : 16) * dt;
    _vecForward.set(-Math.sin(this.editorYaw), 0, -Math.cos(this.editorYaw));
    _vecRight.set(Math.cos(this.editorYaw), 0, -Math.sin(this.editorYaw));

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.editorPos.addScaledVector(_vecForward, speed);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.editorPos.addScaledVector(_vecForward, -speed);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.editorPos.addScaledVector(_vecRight, speed);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.editorPos.addScaledVector(_vecRight, -speed);
    if (this.keys.has('KeyE') || this.keys.has('Space')) this.editorPos.y += speed * 0.85;
    if (this.keys.has('KeyQ') || this.keys.has('ControlLeft')) this.editorPos.y -= speed * 0.85;

    this.editorPos.x = THREE.MathUtils.clamp(this.editorPos.x, -95, 95);
    this.editorPos.z = THREE.MathUtils.clamp(this.editorPos.z, -95, 95);
    this.editorPos.y = THREE.MathUtils.clamp(this.editorPos.y, 2.2, 95);

    const damp = 1 - Math.exp(-12 * dt);
    this.camera.position.lerp(this.editorPos, damp);
  }

  private updatePlayPhysicsAndCamera(dt: number) {
    const fixedDt = Math.min(dt, 0.05);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - fixedDt);

    const activeVeh = this.getActiveVehicle();
    if (activeVeh) {
      if (activeVeh.rig.isFlying) {
        this.updateFlyingVehicleControls(activeVeh, fixedDt);
      } else {
        this.updateGroundVehicleControls(activeVeh, fixedDt);
      }
    } else {
      this.updateCharacterControls(fixedDt);
    }

    // Gentle damping on parked ground vehicles
    for (const veh of this.vehicles.values()) {
      if (veh.data.id !== this.activeVehicleId && !veh.rig.isFlying) {
        veh.body.velocity.x *= Math.exp(-3.5 * fixedDt);
        veh.body.velocity.z *= Math.exp(-3.5 * fixedDt);
        veh.speed *= Math.exp(-3.5 * fixedDt);
      }
    }

    this.world.step(1 / 60, fixedDt, 3);

    for (const veh of this.vehicles.values()) {
      if (!veh.rig.isFlying && veh.body.position.y < 0.02) {
        veh.body.position.y = 0.02;
        if (veh.body.velocity.y < 0) veh.body.velocity.y = 0;
      }
      this.syncVehicleVisuals(veh, fixedDt);
    }

    if (activeVeh) {
      _vecA.copy(activeVeh.rig.seatAnchor).applyQuaternion(activeVeh.rig.root.quaternion);
      this.explorer.root.position.copy(activeVeh.rig.root.position).add(_vecA);
      this.explorer.root.rotation.set(0, activeVeh.yaw, 0);
      this.explorer.leftLeg.rotation.x = -1.25;
      this.explorer.rightLeg.rotation.x = -1.25;
      this.explorer.leftArm.rotation.x = -0.95;
      this.explorer.rightArm.rotation.x = -0.95;
      this.nearVehicle = true;
      this.nearVehicleId = activeVeh.data.id;
    } else {
      if (this.playerBody.position.y <= 0.16 && Math.abs(this.playerBody.velocity.y) < 0.8) {
        this.isGrounded = true;
      }
      this.explorer.root.position.set(
        this.playerBody.position.x,
        Math.max(0, this.playerBody.position.y),
        this.playerBody.position.z
      );

      const hSpeed = Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.z);
      if (hSpeed > 0.35 && this.isGrounded) {
        this.walkCycle += fixedDt * hSpeed * 1.9;
        const swing = Math.sin(this.walkCycle) * Math.min(0.75, hSpeed * 0.11);
        this.explorer.leftLeg.rotation.x = swing;
        this.explorer.rightLeg.rotation.x = -swing;
        this.explorer.leftArm.rotation.x = -swing * 0.85;
        this.explorer.rightArm.rotation.x = swing * 0.85;
      } else {
        const settle = 1 - Math.exp(-10 * fixedDt);
        this.explorer.leftLeg.rotation.x = THREE.MathUtils.lerp(this.explorer.leftLeg.rotation.x, 0, settle);
        this.explorer.rightLeg.rotation.x = THREE.MathUtils.lerp(this.explorer.rightLeg.rotation.x, 0, settle);
        this.explorer.leftArm.rotation.x = THREE.MathUtils.lerp(this.explorer.leftArm.rotation.x, 0, settle);
        this.explorer.rightArm.rotation.x = THREE.MathUtils.lerp(this.explorer.rightArm.rotation.x, 0, settle);
      }

      // Find nearest boardable vehicle
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const veh of this.vehicles.values()) {
        const horizDist = Math.hypot(
          this.playerBody.position.x - veh.body.position.x,
          this.playerBody.position.z - veh.body.position.z
        );
        const vertDist = Math.abs(this.playerBody.position.y - veh.body.position.y);
        const maxVert = veh.rig.isFlying ? 12.0 : 3.0;
        if (horizDist < veh.rig.interactRadius && vertDist < maxVert && horizDist < bestDist) {
          bestDist = horizDist;
          bestId = veh.data.id;
        }
      }
      this.nearVehicleId = bestId;
      this.nearVehicle = bestId !== null;
    }

    this.updatePlayCamera(fixedDt);
  }

  private updateCharacterControls(dt: number) {
    const moveF =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const moveR =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

    _vecForward.set(-Math.sin(this.playCamYaw), 0, -Math.cos(this.playCamYaw));
    _vecRight.set(Math.cos(this.playCamYaw), 0, -Math.sin(this.playCamYaw));

    _vecA.set(0, 0, 0);
    _vecA.addScaledVector(_vecForward, moveF);
    _vecA.addScaledVector(_vecRight, moveR);

    const maxSpeed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 10.2 : 6.0;
    if (_vecA.lengthSq() > 0.001) {
      _vecA.normalize();
      const accel = 1 - Math.exp(-14 * dt);
      this.playerBody.velocity.x = THREE.MathUtils.lerp(
        this.playerBody.velocity.x,
        _vecA.x * maxSpeed,
        accel
      );
      this.playerBody.velocity.z = THREE.MathUtils.lerp(
        this.playerBody.velocity.z,
        _vecA.z * maxSpeed,
        accel
      );

      const targetYaw = Math.atan2(_vecA.x, _vecA.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-12 * dt));
      this.explorer.root.rotation.y = this.playerYaw;
    } else {
      const decel = 1 - Math.exp(-11 * dt);
      this.playerBody.velocity.x = THREE.MathUtils.lerp(this.playerBody.velocity.x, 0, decel);
      this.playerBody.velocity.z = THREE.MathUtils.lerp(this.playerBody.velocity.z, 0, decel);
    }

    this.playerBody.position.x = THREE.MathUtils.clamp(this.playerBody.position.x, -92, 92);
    this.playerBody.position.z = THREE.MathUtils.clamp(this.playerBody.position.z, -92, 92);
  }

  private updateGroundVehicleControls(veh: RuntimeVehicle, dt: number) {
    const throttle =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const steerInput =
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
    const handbrake = this.keys.has('Space');

    _quat.set(
      veh.body.quaternion.x,
      veh.body.quaternion.y,
      veh.body.quaternion.z,
      veh.body.quaternion.w
    );
    _euler.setFromQuaternion(_quat, 'YXZ');
    veh.yaw = _euler.y;

    const fwdX = Math.sin(veh.yaw);
    const fwdZ = Math.cos(veh.yaw);
    const rightX = Math.cos(veh.yaw);
    const rightZ = -Math.sin(veh.yaw);

    let fwdSpeed = veh.body.velocity.x * fwdX + veh.body.velocity.z * fwdZ;
    let latSpeed = veh.body.velocity.x * rightX + veh.body.velocity.z * rightZ;

    if (throttle > 0) {
      fwdSpeed += veh.rig.accel * dt;
    } else if (throttle < 0) {
      fwdSpeed -= (fwdSpeed > 0.5 ? 24 : 11) * dt;
    } else {
      fwdSpeed *= Math.exp(-1.8 * dt);
    }

    if (handbrake) {
      fwdSpeed *= Math.exp(-4.5 * dt);
    }
    fwdSpeed = THREE.MathUtils.clamp(fwdSpeed, -9, veh.rig.maxSpeed);

    const grip = handbrake ? 2.4 : 8.5;
    latSpeed *= Math.exp(-grip * dt);

    const targetSteer = steerInput * 0.46;
    veh.steerAngle = THREE.MathUtils.lerp(veh.steerAngle, targetSteer, 1 - Math.exp(-10 * dt));

    const speedFactor = THREE.MathUtils.clamp(Math.abs(fwdSpeed) / 4.2, 0, 1);
    const dirSign = fwdSpeed >= -0.1 ? 1 : -1;
    veh.body.angularVelocity.y = veh.steerAngle * veh.rig.turnRate * speedFactor * dirSign;

    veh.body.velocity.x = fwdX * fwdSpeed + rightX * latSpeed;
    veh.body.velocity.z = fwdZ * fwdSpeed + rightZ * latSpeed;

    if (Math.abs(fwdSpeed) > 1.2 && !this.isLeftDraggingPlay && !this.pointerLocked) {
      const idealCamYaw = veh.yaw + Math.PI;
      let dYaw = idealCamYaw - this.playCamYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.playCamYaw += dYaw * (1 - Math.exp(-3.2 * dt));
    }

    veh.speed = fwdSpeed;
    veh.body.position.x = THREE.MathUtils.clamp(veh.body.position.x, -92, 92);
    veh.body.position.z = THREE.MathUtils.clamp(veh.body.position.z, -92, 92);
  }

  private updateFlyingVehicleControls(veh: RuntimeVehicle, dt: number) {
    const throttle =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const turnInput =
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
    const ascend = this.keys.has('Space') ? 1 : 0;
    const descend =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.keys.has('KeyC') ||
      this.keys.has('ControlLeft')
        ? 1
        : 0;
    const climbInput = ascend - descend;

    // Smooth forward/reverse aerial thrust
    if (throttle > 0) {
      veh.speed += veh.rig.accel * dt;
    } else if (throttle < 0) {
      veh.speed -= veh.rig.accel * 0.9 * dt;
    } else {
      veh.speed *= Math.exp(-1.55 * dt);
    }
    veh.speed = THREE.MathUtils.clamp(veh.speed, -veh.rig.maxSpeed * 0.45, veh.rig.maxSpeed);

    // Smooth yaw turning (works even while hovering!)
    veh.yaw += turnInput * veh.rig.turnRate * dt;
    veh.steerAngle = THREE.MathUtils.lerp(veh.steerAngle, turnInput * 0.5, 1 - Math.exp(-8 * dt));

    // Gentle aerial roll banking into turns
    const targetBank = -turnInput * (veh.rig.type === 'zeppelin' ? 0.11 : 0.24);
    veh.bankAngle = THREE.MathUtils.lerp(veh.bankAngle, targetBank, 1 - Math.exp(-5 * dt));

    // Vertical climb / descend
    const targetVert = climbInput * (veh.rig.type === 'zeppelin' ? 8.5 : 11.5);
    veh.verticalSpeed = THREE.MathUtils.lerp(
      veh.verticalSpeed,
      targetVert,
      1 - Math.exp(-5.5 * dt)
    );

    const fwdX = Math.sin(veh.yaw);
    const fwdZ = Math.cos(veh.yaw);
    veh.body.position.x = THREE.MathUtils.clamp(veh.body.position.x + fwdX * veh.speed * dt, -96, 96);
    veh.body.position.z = THREE.MathUtils.clamp(veh.body.position.z + fwdZ * veh.speed * dt, -96, 96);
    veh.body.position.y = THREE.MathUtils.clamp(
      veh.body.position.y + veh.verticalSpeed * dt,
      0.15,
      58
    );

    veh.body.quaternion.setFromEuler(0, veh.yaw, 0);
    veh.data.position = [veh.body.position.x, veh.body.position.y, veh.body.position.z];
    veh.data.rotationY = veh.yaw;

    if ((Math.abs(veh.speed) > 0.8 || Math.abs(turnInput) > 0) && !this.isLeftDraggingPlay && !this.pointerLocked) {
      const idealCamYaw = veh.yaw + Math.PI;
      let dYaw = idealCamYaw - this.playCamYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.playCamYaw += dYaw * (1 - Math.exp(-2.8 * dt));
    }
  }

  private syncVehicleVisuals(veh: RuntimeVehicle, dt: number) {
    const hoverBob =
      veh.rig.isFlying && veh.body.position.y > 0.45
        ? Math.sin(this.npcAnimTime * 1.9 + veh.body.position.x * 0.2) * 0.18
        : 0;

    veh.rig.root.position.set(
      veh.body.position.x,
      Math.max(0, veh.body.position.y) + hoverBob,
      veh.body.position.z
    );

    if (veh.rig.isFlying) {
      const pitchTilt = THREE.MathUtils.clamp(-veh.verticalSpeed * 0.012, -0.14, 0.14);
      _euler.set(pitchTilt, veh.yaw, veh.bankAngle, 'YXZ');
      veh.rig.root.quaternion.setFromEuler(_euler);
    } else {
      veh.rig.root.quaternion.set(
        veh.body.quaternion.x,
        veh.body.quaternion.y,
        veh.body.quaternion.z,
        veh.body.quaternion.w
      );
    }

    if (veh.rig.frontLeftHub) veh.rig.frontLeftHub.rotation.y = veh.steerAngle;
    if (veh.rig.frontRightHub) veh.rig.frontRightHub.rotation.y = veh.steerAngle;
    if (veh.rig.steeringWheel) veh.rig.steeringWheel.rotation.z = -veh.steerAngle * 2.4;

    if (veh.rig.wheelMeshes.length > 0) {
      const wheelSpin = (veh.speed * dt) / 0.38;
      for (const w of veh.rig.wheelMeshes) {
        w.rotation.x += wheelSpin;
      }
    }

    if (veh.rig.propellerMeshes.length > 0) {
      const isPiloted = veh.data.id === this.activeVehicleId;
      const propSpeed = isPiloted
        ? 9.5 + Math.abs(veh.speed) * 0.65 + Math.abs(veh.verticalSpeed) * 0.5
        : 2.2;
      for (const prop of veh.rig.propellerMeshes) {
        prop.rotation.z += propSpeed * dt;
      }
    }

    // Attach night headlight to active vehicle (or first vehicle)
    if (
      veh.data.id === this.activeVehicleId ||
      (!this.activeVehicleId && veh === this.vehicles.values().next().value)
    ) {
      const fwdX = Math.sin(veh.yaw);
      const fwdZ = Math.cos(veh.yaw);
      this.carNightLight.position.set(
        veh.rig.root.position.x + fwdX * 4.5,
        veh.rig.root.position.y + 1.8,
        veh.rig.root.position.z + fwdZ * 4.5
      );
    }
  }

  private updatePlayCamera(dt: number) {
    const dampPos = 1 - Math.exp(-9.5 * dt);
    const dampLook = 1 - Math.exp(-13 * dt);

    const activeVeh = this.getActiveVehicle();
    if (activeVeh) {
      const dist =
        activeVeh.rig.cameraDist + Math.min(2.2, Math.abs(activeVeh.speed) * 0.08);
      const height =
        activeVeh.rig.cameraHeight + Math.sin(this.playCamPitch) * (activeVeh.rig.isFlying ? 4.5 : 2.2);
      const lookYOffset = activeVeh.rig.type === 'zeppelin' ? 3.8 : 1.35;

      _vecB.set(
        activeVeh.rig.root.position.x + Math.sin(this.playCamYaw) * dist,
        Math.max(1.2, activeVeh.rig.root.position.y + height),
        activeVeh.rig.root.position.z + Math.cos(this.playCamYaw) * dist
      );
      _vecC.set(
        activeVeh.rig.root.position.x - Math.sin(this.playCamYaw) * 2.5,
        activeVeh.rig.root.position.y + lookYOffset,
        activeVeh.rig.root.position.z - Math.cos(this.playCamYaw) * 2.5
      );

      const targetFov = 56 + Math.min(14, Math.abs(activeVeh.speed) * 0.45);
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-5 * dt));
        this.camera.updateProjectionMatrix();
      }
    } else {
      const dist = 3.85;
      const shoulderRight = 0.72;
      const cosP = Math.cos(this.playCamPitch);
      const sinP = Math.sin(this.playCamPitch);

      const rightX = Math.cos(this.playCamYaw);
      const rightZ = -Math.sin(this.playCamYaw);
      const backX = Math.sin(this.playCamYaw);
      const backZ = Math.cos(this.playCamYaw);

      const px = this.explorer.root.position.x;
      const py = this.explorer.root.position.y + 1.65;
      const pz = this.explorer.root.position.z;

      _vecB.set(
        px + backX * dist * cosP + rightX * shoulderRight,
        Math.max(0.85, py + dist * sinP + 0.35),
        pz + backZ * dist * cosP + rightZ * shoulderRight
      );

      _vecC.set(
        px - backX * 4.0 + rightX * (shoulderRight * 0.55),
        py + 0.1 - sinP * 1.4,
        pz - backZ * 4.0 + rightZ * (shoulderRight * 0.55)
      );

      if (Math.abs(this.camera.fov - 56) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 56, 1 - Math.exp(-6 * dt));
        this.camera.updateProjectionMatrix();
      }
    }

    this.currentCamPos.lerp(_vecB, dampPos);
    this.currentCamLook.lerp(_vecC, dampLook);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLook);
  }

  private updateNpcsAndQuests(dt: number) {
    this.npcAnimTime += dt;
    const t = this.npcAnimTime;

    // Animate windmill sails & idle flying vehicle propellers even in Editor Mode
    for (const obj of this.placedObjects.values()) {
      for (const child of obj.group.children) {
        if (child.userData.spinZ) {
          child.rotation.z -= dt * 0.85;
        }
      }
    }
    if (this.mode === 'editor') {
      for (const veh of this.vehicles.values()) {
        for (const prop of veh.rig.propellerMeshes) {
          prop.rotation.z += dt * 1.8;
        }
      }
    }

    const activeVeh = this.getActiveVehicle();
    const actorX = activeVeh ? activeVeh.body.position.x : this.playerBody.position.x;
    const actorZ = activeVeh ? activeVeh.body.position.z : this.playerBody.position.z;

    let closestNpcId: string | null = null;
    let closestDist = 3.8;

    let idx = 0;
    for (const npc of this.npcs.values()) {
      const phase = idx * 1.37;
      idx += 1;

      // Subtle breathing & quest badge bobbing
      npc.rig.torso.position.y = 0.9 + Math.sin(t * 2.1 + phase) * 0.014;
      npc.rig.questMarker.position.y = 2.78 + Math.sin(t * 3.4 + phase) * 0.09;

      const dist = Math.hypot(npc.data.position[0] - actorX, npc.data.position[2] - actorZ);
      const isPlayerClose = this.mode === 'play' && !this.inVehicle && dist < 4.5;

      if (this.mode === 'play' && !this.inVehicle && dist < closestDist) {
        closestDist = dist;
        closestNpcId = npc.data.id;
      }

      // Smoothly turn toward approaching player in Play Mode and wave
      const targetYaw = isPlayerClose
        ? Math.atan2(actorX - npc.data.position[0], actorZ - npc.data.position[2])
        : npc.baseYaw;

      let dYaw = targetYaw - npc.rig.group.rotation.y;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      npc.rig.group.rotation.y += dYaw * (1 - Math.exp(-6.5 * dt));

      const waveArm = npc.data.outfit === 'guard' ? npc.rig.leftArm : npc.rig.rightArm;
      const idleArm = npc.data.outfit === 'guard' ? npc.rig.rightArm : npc.rig.leftArm;
      if (isPlayerClose) {
        waveArm.rotation.z = THREE.MathUtils.lerp(
          waveArm.rotation.z,
          (npc.data.outfit === 'guard' ? 1 : -1) * (2.35 + Math.sin(t * 7.5) * 0.25),
          1 - Math.exp(-9 * dt)
        );
      } else {
        waveArm.rotation.z = THREE.MathUtils.lerp(waveArm.rotation.z, 0, 1 - Math.exp(-7 * dt));
      }
      idleArm.rotation.x = Math.sin(t * 1.4 + phase) * 0.06;
    }

    this.nearNpcId = closestNpcId;

    // Animate 3D quest beacons & update active quest progress in Play Mode
    for (const [npcId, beacon] of this.questBeacons.entries()) {
      beacon.group.visible = this.mode === 'play';
      const diamond = beacon.group.getObjectByName('questDiamond');
      if (diamond) {
        diamond.rotation.y += dt * 1.8;
        diamond.position.y = 2.6 + Math.sin(t * 3.0) * 0.28;
      }
      if (this.mode === 'play') {
        const qState = this.questStates.get(npcId);
        if (qState && qState.status === 'active' && qState.quest.objectiveType === 'visit') {
          const d = Math.hypot(beacon.target[0] - actorX, beacon.target[1] - actorZ);
          qState.progress = Math.max(0, Math.round(qState.target - d));
          if (d < 4.2) {
            qState.status = 'ready';
            qState.progress = qState.target;
            this.removeQuestBeacon(npcId);
            const npc = this.npcs.get(npcId);
            npc?.rig.setQuestMarkerStatus('ready');
            this.callbacks.onToast(
              `Hedefe ulaşıldı! Ödül için ${qState.npcName} ile konuşun (F).`,
              'success'
            );
            this.emitSnapshot();
          }
        }
      }
    }

    if (this.mode === 'play') {
      const walkDelta = !this.inVehicle
        ? Math.hypot(this.playerBody.velocity.x, this.playerBody.velocity.z) * dt
        : 0;
      const driveDelta = activeVeh ? Math.abs(activeVeh.speed) * dt : 0;

      for (const [npcId, qState] of this.questStates.entries()) {
        if (qState.status !== 'active') continue;
        if (qState.quest.objectiveType === 'explore' && walkDelta > 0.002) {
          qState.progress = Math.min(qState.target, qState.progress + walkDelta);
        } else if (qState.quest.objectiveType === 'drive' && driveDelta > 0.005) {
          qState.progress = Math.min(qState.target, qState.progress + driveDelta);
        }
        if (
          (qState.quest.objectiveType === 'explore' || qState.quest.objectiveType === 'drive') &&
          qState.progress >= qState.target
        ) {
          qState.status = 'ready';
          qState.progress = qState.target;
          const npc = this.npcs.get(npcId);
          npc?.rig.setQuestMarkerStatus('ready');
          this.callbacks.onToast(
            `"${qState.quest.title}" tamamlandı! Ödül için ${qState.npcName} ile konuşun (F).`,
            'success'
          );
          this.emitSnapshot();
        }
      }
    }
  }

  private emitSnapshot() {
    let selectedInfo: SelectedEntityInfo | null = null;
    if (this.selected?.kind === 'object') {
      const r = this.placedObjects.get(this.selected.id);
      if (r) {
        selectedInfo = {
          kind: 'object',
          id: r.data.id,
          label: PLACEABLE_LABELS[r.data.type],
          position: [
            Math.round(r.data.position[0] * 10) / 10,
            Math.round(r.data.position[1] * 10) / 10,
            Math.round(r.data.position[2] * 10) / 10,
          ],
          rotationDeg: Math.round(((THREE.MathUtils.radToDeg(r.data.rotationY) % 360) + 360) % 360),
          scale: Math.round(r.data.scale * 100) / 100,
        };
      }
    } else if (this.selected?.kind === 'road') {
      const r = this.roads.get(this.selected.id);
      if (r) {
        selectedInfo = {
          kind: 'road',
          id: r.data.id,
          label: ROAD_STYLE_LABELS[r.data.style] ?? 'Yol',
          pointCount: r.data.points.length,
          roadStyle: r.data.style,
          roadWidth: Math.round(r.data.width * 10) / 10,
        };
      }
    } else if (this.selected?.kind === 'npc') {
      const n = this.npcs.get(this.selected.id);
      if (n) {
        selectedInfo = {
          kind: 'npc',
          id: n.data.id,
          label: n.data.name,
          position: [
            Math.round(n.data.position[0] * 10) / 10,
            Math.round(n.data.position[1] * 10) / 10,
            Math.round(n.data.position[2] * 10) / 10,
          ],
          rotationDeg: Math.round(((THREE.MathUtils.radToDeg(n.data.rotationY) % 360) + 360) % 360),
          scale: Math.round(n.data.scale * 100) / 100,
          npcData: structuredClone(n.data),
        };
      }
    } else if (this.selected?.kind === 'vehicle') {
      const v = this.vehicles.get(this.selected.id);
      if (v) {
        selectedInfo = {
          kind: 'vehicle',
          id: v.data.id,
          label: VEHICLE_LABELS[v.data.type],
          position: [
            Math.round(v.body.position.x * 10) / 10,
            Math.round(v.body.position.y * 10) / 10,
            Math.round(v.body.position.z * 10) / 10,
          ],
          rotationDeg: Math.round(((THREE.MathUtils.radToDeg(v.yaw) % 360) + 360) % 360),
          vehicleType: v.data.type,
        };
      }
    }

    const questsObj: Record<string, ActiveQuestRuntime> = {};
    for (const [id, q] of this.questStates.entries()) {
      questsObj[id] = { ...q, progress: Math.round(q.progress) };
    }

    const nearNpc = this.nearNpcId ? (this.npcs.get(this.nearNpcId)?.data ?? null) : null;
    const activeVeh = this.getActiveVehicle();
    const nearVeh = this.nearVehicleId ? (this.vehicles.get(this.nearVehicleId) ?? null) : null;

    this.callbacks.onSnapshot({
      mode: this.mode,
      timeOfDay: this.timeOfDay,
      activeTool: this.activeTool,
      placementRotationDeg: this.placementRotationDeg,
      placementScale: this.placementScale,
      placementRoadWidth: this.placementRoadWidth,
      isMovingSelected: this.isMovingSelected,
      selected: selectedInfo,
      activeRoadPoints: this.activeRoadPoints.length,
      showGrid: this.showGrid,
      objectCount: this.placedObjects.size,
      roadCount: this.roads.size,
      vehicleCount: this.vehicles.size,
      npcCount: this.npcs.size,
      npcsList: Array.from(this.npcs.values()).map((n) => n.data),
      npcRelations: this.npcRelations.map((r) => ({ ...r })),
      inVehicle: this.inVehicle,
      activeVehicleName: activeVeh ? VEHICLE_LABELS[activeVeh.data.type] : null,
      activeVehicleIsFlying: activeVeh ? activeVeh.rig.isFlying : false,
      nearVehicle: this.nearVehicle,
      nearVehicleName: nearVeh ? VEHICLE_LABELS[nearVeh.data.type] : null,
      nearVehicleIsFlying: nearVeh ? nearVeh.rig.isFlying : false,
      nearNpc,
      quests: questsObj,
      playerRewards: { ...this.playerRewards, items: [...this.playerRewards.items] },
      speedKmh: activeVeh ? Math.round(Math.abs(activeVeh.speed) * 3.6) : 0,
      altitudeM: activeVeh ? Math.max(0, Math.round(activeVeh.body.position.y)) : 0,
      pointerLocked: this.pointerLocked,
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.08);
    this.updateLighting(dt);
    this.updateNpcsAndQuests(dt);

    if (this.mode === 'editor') {
      this.updateEditorCamera(dt);
    } else {
      this.updatePlayPhysicsAndCamera(dt);
      const now = performance.now();
      if (now - this.lastHudSync > 110) {
        this.lastHudSync = now;
        this.emitSnapshot();
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };
}
