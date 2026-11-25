import * as THREE from 'three';
import { PlaceableType, RoadStyle } from '../types/sandbox';
import { ProceduralTextureLibrary } from './textures';
import { buildExtendedPlaceableAsset } from './modelsExtended';
import { buildMiddleEarthAsset, MiddleEarthPlaceableType } from './middleEarthModels';

export interface ColliderBoxDef {
  /** Local center relative to object bottom-center origin */
  offset: [number, number, number];
  /** Full width, height, depth (Cannon uses half-extents internally) */
  size: [number, number, number];
}

export interface BuiltAsset {
  group: THREE.Group;
  colliders: ColliderBoxDef[];
  selectionRadius: number;
}

export interface MaterialLibrary {
  stuccoWarm: THREE.MeshStandardMaterial;
  stuccoTerracotta: THREE.MeshStandardMaterial;
  stuccoCream: THREE.MeshStandardMaterial;
  travertine: THREE.MeshStandardMaterial;
  travertineDark: THREE.MeshStandardMaterial;
  roofTile: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  ancientStone: THREE.MeshStandardMaterial;
  dirtRoad: THREE.MeshStandardMaterial;
  cobblestone: THREE.MeshStandardMaterial;
  wroughtIron: THREE.MeshStandardMaterial;
  bronzeGold: THREE.MeshStandardMaterial;
  woodCedar: THREE.MeshStandardMaterial;
  awningFabric: THREE.MeshStandardMaterial;
  awningBlue: THREE.MeshStandardMaterial;
  terracottaPot: THREE.MeshStandardMaterial;
  palmTrunk: THREE.MeshStandardMaterial;
  palmFrondDark: THREE.MeshStandardMaterial;
  palmFrondLight: THREE.MeshStandardMaterial;
  foliageCypress: THREE.MeshStandardMaterial;
  foliageOlive: THREE.MeshStandardMaterial;
  foliagePine: THREE.MeshStandardMaterial;
  foliageOak: THREE.MeshStandardMaterial;
  flowerRed: THREE.MeshStandardMaterial;
  flowerGold: THREE.MeshStandardMaterial;
  waterTurquoise: THREE.MeshPhysicalMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  modernGlass: THREE.MeshStandardMaterial;
  shopGlass: THREE.MeshStandardMaterial;
  lampGlass: THREE.MeshStandardMaterial;
  torchFlame: THREE.MeshStandardMaterial;
  clockDial: THREE.MeshStandardMaterial;
  carBodyPaint: THREE.MeshPhysicalMaterial;
  carChrome: THREE.MeshStandardMaterial;
  carLeather: THREE.MeshStandardMaterial;
  carTire: THREE.MeshStandardMaterial;
  carHeadlight: THREE.MeshStandardMaterial;
  carTaillight: THREE.MeshStandardMaterial;
  carWindshield: THREE.MeshPhysicalMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  setNightFactor: (factor: number) => void;
  dispose: () => void;
}

export function createMaterialLibrary(
  textures: ProceduralTextureLibrary,
  isSoftwareGl: boolean
): MaterialLibrary {
  const all: THREE.Material[] = [];
  const reg = <T extends THREE.Material>(m: T): T => {
    all.push(m);
    return m;
  };

  const stuccoWarm = reg(
    new THREE.MeshStandardMaterial({
      color: 0xe7cfa9,
      map: textures.stuccoMap,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const stuccoTerracotta = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc97b59,
      map: textures.stuccoMap,
      roughness: 0.84,
      metalness: 0.03,
    })
  );

  const stuccoCream = reg(
    new THREE.MeshStandardMaterial({
      color: 0xf1e6d2,
      map: textures.stuccoMap,
      roughness: 0.82,
      metalness: 0.02,
    })
  );

  const travertine = reg(
    new THREE.MeshStandardMaterial({
      color: 0xe3d6be,
      map: textures.travertineMap,
      bumpMap: textures.travertineBump,
      bumpScale: 0.06,
      roughness: 0.88,
      metalness: 0.02,
    })
  );

  const travertineDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb9aa90,
      map: textures.travertineMap,
      bumpMap: textures.travertineBump,
      bumpScale: 0.08,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const roofTile = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.roofTileMap,
      roughness: 0.82,
      metalness: 0.04,
    })
  );

  const asphalt = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.asphaltMap,
      bumpMap: textures.asphaltBump,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const sidewalk = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.sidewalkMap,
      roughness: 0.84,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const ancientStone = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.ancientStoneMap,
      bumpMap: textures.ancientStoneBump,
      bumpScale: 0.08,
      roughness: 0.9,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const dirtRoad = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.dirtRoadMap,
      bumpMap: textures.dirtRoadBump,
      bumpScale: 0.06,
      roughness: 0.96,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const cobblestone = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.cobblestoneMap,
      bumpMap: textures.cobblestoneBump,
      bumpScale: 0.09,
      roughness: 0.82,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const wroughtIron = reg(
    new THREE.MeshStandardMaterial({
      color: 0x262a30,
      roughness: 0.42,
      metalness: 0.78,
    })
  );

  const bronzeGold = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb68a46,
      roughness: 0.28,
      metalness: 0.84,
    })
  );

  const woodCedar = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc28352,
      map: textures.woodSlatsMap,
      roughness: 0.72,
      metalness: 0.05,
    })
  );

  const awningFabric = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.awningMap,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );

  const awningBlue = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.bazaarAwningBlueMap,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
  );

  const terracottaPot = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb65e3d,
      roughness: 0.8,
      metalness: 0.02,
    })
  );

  const palmTrunk = reg(
    new THREE.MeshStandardMaterial({
      color: 0x7c6047,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const palmFrondDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0x3b6334,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );

  const palmFrondLight = reg(
    new THREE.MeshStandardMaterial({
      color: 0x56803e,
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );

  const foliageCypress = reg(
    new THREE.MeshStandardMaterial({
      color: 0x26482b,
      roughness: 0.84,
      metalness: 0.02,
    })
  );

  const foliageOlive = reg(
    new THREE.MeshStandardMaterial({
      color: 0x738762,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const foliagePine = reg(
    new THREE.MeshStandardMaterial({
      color: 0x355c37,
      roughness: 0.82,
      metalness: 0.02,
    })
  );

  const foliageOak = reg(
    new THREE.MeshStandardMaterial({
      color: 0x4c7838,
      roughness: 0.8,
      metalness: 0.02,
    })
  );

  const flowerRed = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc93b3b,
      roughness: 0.72,
      metalness: 0.0,
    })
  );

  const flowerGold = reg(
    new THREE.MeshStandardMaterial({
      color: 0xe6ac3c,
      roughness: 0.68,
      metalness: 0.02,
    })
  );

  const waterTurquoise = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x34a8b8,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    })
  );

  const windowGlass = reg(
    new THREE.MeshStandardMaterial({
      color: 0x2c3b4a,
      roughness: 0.16,
      metalness: 0.65,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0.18,
    })
  );

  const modernGlass = reg(
    new THREE.MeshStandardMaterial({
      color: 0x4b748c,
      roughness: 0.12,
      metalness: 0.82,
      emissive: new THREE.Color(0x9bd2ff),
      emissiveIntensity: 0.12,
    })
  );

  const shopGlass = reg(
    new THREE.MeshStandardMaterial({
      color: 0x433b33,
      roughness: 0.14,
      metalness: 0.45,
      emissive: new THREE.Color(0xffc978),
      emissiveIntensity: 0.35,
    })
  );

  const lampGlass = reg(
    new THREE.MeshStandardMaterial({
      color: 0xfff3d4,
      roughness: 0.25,
      metalness: 0.1,
      emissive: new THREE.Color(0xffbb55),
      emissiveIntensity: 0.55,
    })
  );

  const torchFlame = reg(
    new THREE.MeshStandardMaterial({
      color: 0xff7b29,
      roughness: 0.35,
      metalness: 0.0,
      emissive: new THREE.Color(0xff6b1a),
      emissiveIntensity: 1.4,
    })
  );

  const clockDial = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.clockFaceMap,
      roughness: 0.35,
      metalness: 0.1,
      emissive: new THREE.Color(0xffe1a6),
      emissiveIntensity: 0.2,
    })
  );

  const carBodyPaint = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0xb52424,
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    })
  );

  const carChrome = reg(
    new THREE.MeshStandardMaterial({
      color: 0xe6eaef,
      roughness: 0.14,
      metalness: 0.94,
    })
  );

  const carLeather = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8d522c,
      roughness: 0.68,
      metalness: 0.06,
    })
  );

  const carTire = reg(
    new THREE.MeshStandardMaterial({
      color: 0x1b1d20,
      roughness: 0.86,
      metalness: 0.08,
    })
  );

  const carHeadlight = reg(
    new THREE.MeshStandardMaterial({
      color: 0xfff8e6,
      roughness: 0.12,
      metalness: 0.2,
      emissive: new THREE.Color(0xffe6a8),
      emissiveIntensity: 0.6,
    })
  );

  const carTaillight = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb81a1a,
      roughness: 0.22,
      metalness: 0.2,
      emissive: new THREE.Color(0xff2c1a),
      emissiveIntensity: 0.5,
    })
  );

  const carWindshield = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0xdaf0ff,
      roughness: 0.06,
      metalness: 0.08,
      transparent: true,
      opacity: isSoftwareGl ? 0.36 : 0.45,
      clearcoat: 1.0,
    })
  );

  const contactShadow = reg(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );

  const setNightFactor = (factor: number) => {
    windowGlass.emissiveIntensity = THREE.MathUtils.lerp(0.03, 1.35, factor);
    modernGlass.emissiveIntensity = THREE.MathUtils.lerp(0.04, 1.05, factor);
    shopGlass.emissiveIntensity = THREE.MathUtils.lerp(0.08, 1.85, factor);
    lampGlass.emissiveIntensity = THREE.MathUtils.lerp(0.08, 3.2, factor);
    torchFlame.emissiveIntensity = THREE.MathUtils.lerp(0.9, 3.6, factor);
    clockDial.emissiveIntensity = THREE.MathUtils.lerp(0.04, 1.1, factor);
    carHeadlight.emissiveIntensity = THREE.MathUtils.lerp(0.15, 2.8, factor);
    carTaillight.emissiveIntensity = THREE.MathUtils.lerp(0.25, 1.9, factor);
  };

  return {
    stuccoWarm,
    stuccoTerracotta,
    stuccoCream,
    travertine,
    travertineDark,
    roofTile,
    asphalt,
    sidewalk,
    ancientStone,
    dirtRoad,
    cobblestone,
    wroughtIron,
    bronzeGold,
    woodCedar,
    awningFabric,
    awningBlue,
    terracottaPot,
    palmTrunk,
    palmFrondDark,
    palmFrondLight,
    foliageCypress,
    foliageOlive,
    foliagePine,
    foliageOak,
    flowerRed,
    flowerGold,
    waterTurquoise,
    windowGlass,
    modernGlass,
    shopGlass,
    lampGlass,
    torchFlame,
    clockDial,
    carBodyPaint,
    carChrome,
    carLeather,
    carTire,
    carHeadlight,
    carTaillight,
    carWindshield,
    contactShadow,
    setNightFactor,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}

function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

function addContactShadow(group: THREE.Group, mat: THREE.Material, radiusX: number, radiusZ: number) {
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2), mat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  shadowPlane.receiveShadow = false;
  shadowPlane.castShadow = false;
  shadowPlane.userData.ignoreRaycast = true;
  group.add(shadowPlane);
}

/** 1. 5-Story Balcony Mediterranean Apartment */
function buildApartment5(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 10;
  const D = 8;
  const floorH = 3.1;
  const totalH = floorH * 5 + 0.8;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.35, 3.1, D + 0.35), mats.travertine);
  plinth.position.y = 1.55;
  group.add(plinth);

  const upperH = floorH * 4;
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(W, upperH, D), mats.stuccoWarm);
  upperBody.position.y = 3.1 + upperH / 2;
  group.add(upperBody);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.45, D + 0.7), mats.stuccoCream);
  cornice.position.y = 3.1 + upperH + 0.22;
  group.add(cornice);

  const parapetL = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.75, 0.35), mats.stuccoCream);
  parapetL.position.set(0, totalH - 0.1, D / 2 - 0.1);
  group.add(parapetL);
  const parapetR = parapetL.clone();
  parapetR.position.z = -D / 2 + 0.1;
  group.add(parapetR);

  const roofHood = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.8), mats.stuccoTerracotta);
  roofHood.position.set(-2.2, totalH + 0.45, -1.2);
  group.add(roofHood);

  const solarTank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 12), mats.carChrome);
  solarTank.rotation.z = Math.PI / 2;
  solarTank.position.set(2.4, totalH + 0.65, -1.6);
  group.add(solarTank);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 0.3), mats.travertineDark);
  doorFrame.position.set(0, 1.25, D / 2 + 0.16);
  group.add(doorFrame);

  const doorWood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.25, 0.25), mats.woodCedar);
  doorWood.position.set(0, 1.13, D / 2 + 0.22);
  group.add(doorWood);

  const bayXs = [-3.2, 0, 3.2];
  const winGeo = new THREE.BoxGeometry(1.45, 1.8, 0.18);
  const frameGeo = new THREE.BoxGeometry(1.68, 2.0, 0.12);
  const balcSlabGeo = new THREE.BoxGeometry(2.6, 0.2, 1.15);
  const railFrontGeo = new THREE.BoxGeometry(2.55, 0.08, 0.08);
  const railPostGeo = new THREE.BoxGeometry(0.06, 0.92, 0.06);

  for (let floor = 1; floor <= 4; floor++) {
    const yBase = 3.1 + (floor - 1) * floorH;
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.18, 0.14, D + 0.18), mats.stuccoCream);
    band.position.y = yBase;
    group.add(band);

    for (const side of [1, -1]) {
      const zFace = side * (D / 2);
      for (const bx of bayXs) {
        const frame = new THREE.Mesh(frameGeo, mats.stuccoCream);
        frame.position.set(bx, yBase + 1.55, zFace + side * 0.04);
        group.add(frame);

        const glass = new THREE.Mesh(winGeo, mats.windowGlass);
        glass.position.set(bx, yBase + 1.55, zFace + side * 0.09);
        group.add(glass);

        if (side === 1 || bx === 0) {
          const slab = new THREE.Mesh(balcSlabGeo, mats.stuccoCream);
          slab.position.set(bx, yBase + 0.12, zFace + side * 0.56);
          group.add(slab);

          const topRail = new THREE.Mesh(railFrontGeo, mats.wroughtIron);
          topRail.position.set(bx, yBase + 1.05, zFace + side * 1.08);
          group.add(topRail);

          const midRail = new THREE.Mesh(railFrontGeo, mats.wroughtIron);
          midRail.position.set(bx, yBase + 0.62, zFace + side * 1.08);
          group.add(midRail);

          for (const px of [-1.22, -0.4, 0.4, 1.22]) {
            const post = new THREE.Mesh(railPostGeo, mats.wroughtIron);
            post.position.set(bx + px, yBase + 0.6, zFace + side * 1.08);
            group.add(post);
          }

          for (const sx of [-1.24, 1.24]) {
            const sideBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.08), mats.wroughtIron);
            sideBar.position.set(bx + sx, yBase + 1.05, zFace + side * 0.56);
            group.add(sideBar);
          }
        }
      }
    }

    for (const xSide of [1, -1]) {
      for (const bz of [-1.8, 1.8]) {
        const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 1.15), mats.windowGlass);
        sGlass.position.set(xSide * (W / 2 + 0.04), yBase + 1.6, bz);
        group.add(sGlass);
      }
    }
  }

  for (const bx of [-3.1, 3.1]) {
    const gWin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.65, 0.2), mats.windowGlass);
    gWin.position.set(bx, 1.6, D / 2 + 0.16);
    group.add(gWin);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, W * 0.62, D * 0.62);

  return {
    group,
    colliders: [{ offset: [0, totalH / 2, 0], size: [W + 0.5, totalH, D + 0.5] }],
    selectionRadius: 6.8,
  };
}

/** 2. Ground-Floor Artisan Shopfront */
function buildShopGround(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 8.2;
  const D = 6.0;
  const H = 4.3;

  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats.stuccoTerracotta);
  shell.position.y = H / 2;
  group.add(shell);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.65, H + 0.1, 0.65), mats.travertine);
      pilaster.position.set(sx * (W / 2 - 0.15), H / 2, sz * (D / 2 - 0.15));
      group.add(pilaster);
    }
  }

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.36, D + 0.6), mats.stuccoCream);
  cornice.position.y = H + 0.15;
  group.add(cornice);

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 0.72, 0.32), mats.woodCedar);
  fascia.position.set(0, 3.35, D / 2 + 0.08);
  group.add(fascia);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.42, 0.08), mats.stuccoCream);
  plaque.position.set(0, 3.35, D / 2 + 0.25);
  group.add(plaque);

  for (const vx of [-2.2, 2.2]) {
    const vitrineFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.35, 0.24), mats.woodCedar);
    vitrineFrame.position.set(vx, 1.55, D / 2 + 0.06);
    group.add(vitrineFrame);

    const vitrineGlass = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.9, 0.16), mats.shopGlass);
    vitrineGlass.position.set(vx, 1.62, D / 2 + 0.12);
    group.add(vitrineGlass);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.55, 0.18), mats.woodCedar);
  door.position.set(0, 1.28, D / 2 + 0.05);
  group.add(door);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.12), mats.shopGlass);
  doorGlass.position.set(0, 1.65, D / 2 + 0.11);
  group.add(doorGlass);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(W - 0.9, 0.1, 1.85), mats.awningFabric);
  awning.position.set(0, 2.86, D / 2 + 0.85);
  awning.rotation.x = 0.28;
  group.add(awning);

  const valance = new THREE.Mesh(new THREE.BoxGeometry(W - 0.9, 0.34, 0.06), mats.awningFabric);
  valance.position.set(0, 2.48, D / 2 + 1.72);
  group.add(valance);

  for (const rx of [-3.3, 3.3]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.75, 8), mats.wroughtIron);
    rod.rotation.x = Math.PI / 2 - 0.24;
    rod.position.set(rx, 2.58, D / 2 + 0.85);
    group.add(rod);
  }

  for (const px of [-3.4, 3.4]) {
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.65), mats.travertineDark);
    pot.position.set(px, 0.325, D / 2 + 0.52);
    group.add(pot);

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), mats.palmFrondLight);
    bush.position.set(px, 0.88, D / 2 + 0.52);
    group.add(bush);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, W * 0.62, D * 0.68);

  return {
    group,
    colliders: [{ offset: [0, H / 2, 0], size: [W + 0.3, H + 0.4, D + 0.4] }],
    selectionRadius: 5.4,
  };
}

/** 3. Ancient Roman Triumphal Arch */
function buildRomanArch(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const totalW = 10.2;
  const depth = 3.0;
  const openingRadius = 2.25;
  const pierHeight = 3.5;
  const archTopY = pierHeight + openingRadius + 1.1;

  const shape = new THREE.Shape();
  shape.moveTo(-totalW / 2, 0);
  shape.lineTo(-openingRadius, 0);
  shape.lineTo(-openingRadius, pierHeight);
  shape.absarc(0, pierHeight, openingRadius, Math.PI, 0, true);
  shape.lineTo(openingRadius, 0);
  shape.lineTo(totalW / 2, 0);
  shape.lineTo(totalW / 2, archTopY);
  shape.lineTo(-totalW / 2, archTopY);
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 24,
  });
  extrudeGeo.translate(0, 0, -depth / 2);

  group.add(new THREE.Mesh(extrudeGeo, mats.travertine));

  for (const sx of [-1, 1]) {
    const cx = sx * ((totalW / 2 + openingRadius) / 2);
    const pierW = totalW / 2 - openingRadius;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(pierW + 0.45, 0.72, depth + 0.6),
      mats.travertineDark
    );
    base.position.set(cx, 0.36, 0);
    group.add(base);

    const impost = new THREE.Mesh(
      new THREE.BoxGeometry(pierW + 0.35, 0.34, depth + 0.45),
      mats.travertineDark
    );
    impost.position.set(cx, pierHeight, 0);
    group.add(impost);

    for (const sz of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 5.4, 12), mats.travertine);
      col.position.set(sx * (totalW / 2 - 0.65), 3.4, sz * (depth / 2 + 0.22));
      group.add(col);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.85), mats.travertineDark);
      cap.position.set(sx * (totalW / 2 - 0.65), 6.2, sz * (depth / 2 + 0.22));
      group.add(cap);
    }
  }

  const keystone = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.05, depth + 0.42),
    mats.travertineDark
  );
  keystone.position.set(0, pierHeight + openingRadius + 0.2, 0);
  group.add(keystone);

  const entablature = new THREE.Mesh(
    new THREE.BoxGeometry(totalW + 1.0, 0.55, depth + 0.95),
    mats.travertineDark
  );
  entablature.position.y = archTopY + 0.25;
  group.add(entablature);

  const attic = new THREE.Mesh(
    new THREE.BoxGeometry(totalW - 0.4, 1.35, depth - 0.25),
    mats.travertine
  );
  attic.position.y = archTopY + 1.15;
  group.add(attic);

  const atticCap = new THREE.Mesh(
    new THREE.BoxGeometry(totalW + 0.2, 0.28, depth + 0.3),
    mats.travertineDark
  );
  atticCap.position.y = archTopY + 1.9;
  group.add(atticCap);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, totalW * 0.58, depth * 0.85);

  const pierW = totalW / 2 - openingRadius;
  const pierCenter = (totalW / 2 + openingRadius) / 2;

  return {
    group,
    colliders: [
      { offset: [-pierCenter, 2.9, 0], size: [pierW + 0.3, 5.8, depth + 0.4] },
      { offset: [pierCenter, 2.9, 0], size: [pierW + 0.3, 5.8, depth + 0.4] },
      { offset: [0, archTopY + 0.4, 0], size: [totalW + 0.6, 2.8, depth + 0.6] },
    ],
    selectionRadius: 5.8,
  };
}

/** 4. Ancient Fluted Roman Column */
function buildAncientColumn(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.32, 1.65), mats.travertineDark);
  plinth1.position.y = 0.16;
  group.add(plinth1);

  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.26, 1.32), mats.travertine);
  plinth2.position.y = 0.45;
  group.add(plinth2);

  const baseProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.62, 0),
    new THREE.Vector2(0.66, 0.14),
    new THREE.Vector2(0.54, 0.26),
    new THREE.Vector2(0.58, 0.38),
    new THREE.Vector2(0.46, 0.48),
  ];
  const atticBase = new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 20), mats.travertine);
  atticBase.position.y = 0.58;
  group.add(atticBase);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.46, 4.7, 16), mats.travertine);
  shaft.position.y = 3.41;
  group.add(shaft);

  for (const ry of [2.4, 4.1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.028, 8, 20), mats.travertineDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    group.add(ring);
  }

  const echinus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.38, 0.34, 16),
    mats.travertineDark
  );
  echinus.position.y = 5.9;
  group.add(echinus);

  for (const sx of [-0.52, 0.52]) {
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.92, 12), mats.travertine);
    scroll.rotation.x = Math.PI / 2;
    scroll.position.set(sx, 6.08, 0);
    group.add(scroll);
  }

  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.24, 1.38), mats.travertineDark);
  abacus.position.y = 6.28;
  group.add(abacus);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 1.25, 1.25);

  return {
    group,
    colliders: [{ offset: [0, 3.2, 0], size: [1.45, 6.4, 1.45] }],
    selectionRadius: 1.5,
  };
}

/** 5. Mediterranean Date Palm Tree */
function buildPalmTree(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const baseFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.6, 10), mats.palmTrunk);
  baseFlare.position.y = 0.3;
  group.add(baseFlare);

  const segments = 9;
  let curY = 0.5;
  let curX = 0;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const rBot = THREE.MathUtils.lerp(0.34, 0.19, t);
    const rTop = THREE.MathUtils.lerp(0.31, 0.17, t);
    const segH = 0.72;
    const tilt = Math.sin(t * Math.PI * 0.65) * 0.11;

    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.08, 9), mats.palmTrunk);
    seg.position.set(curX, curY + segH / 2, 0);
    seg.rotation.z = -tilt;
    group.add(seg);

    curX += Math.sin(tilt) * segH;
    curY += Math.cos(tilt) * segH;
  }

  const crownCenter = new THREE.Vector3(curX, curY + 0.1, 0);
  const heart = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), mats.palmTrunk);
  heart.position.copy(crownCenter);
  group.add(heart);

  const createFrond = (length: number, mat: THREE.Material) => {
    const frond = new THREE.Group();
    const pieces = 5;
    let fx = 0;
    let fy = 0;
    for (let p = 0; p < pieces; p++) {
      const pt = p / (pieces - 1);
      const pieceLen = length / pieces;
      const width = Math.sin(pt * Math.PI * 0.88 + 0.2) * 0.62;
      const droop = pt * 0.85 - 0.32;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(pieceLen + 0.08, 0.05, width), mat);
      blade.position.set(
        fx + (pieceLen * Math.cos(droop)) / 2,
        fy - (pieceLen * Math.sin(droop)) / 2,
        0
      );
      blade.rotation.z = -droop;
      frond.add(blade);
      fx += pieceLen * Math.cos(droop);
      fy -= pieceLen * Math.sin(droop);
    }
    return frond;
  };

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const frond = createFrond(3.15, i % 2 === 0 ? mats.palmFrondDark : mats.palmFrondLight);
    frond.position.copy(crownCenter);
    frond.rotation.y = angle;
    frond.rotation.z = 0.08;
    group.add(frond);
  }

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.35;
    const frond = createFrond(2.55, mats.palmFrondLight);
    frond.position.copy(crownCenter).add(new THREE.Vector3(0, 0.22, 0));
    frond.rotation.y = angle;
    frond.rotation.z = 0.42;
    group.add(frond);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.2, 2.2);

  return {
    group,
    colliders: [{ offset: [0.25, 3.2, 0], size: [0.8, 6.4, 0.8] }],
    selectionRadius: 2.2,
  };
}

/** 6. Wrought-Iron Mediterranean Street Lamp */
function buildStreetLamp(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.75, 8), mats.wroughtIron);
  base.position.y = 0.375;
  group.add(base);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 14), mats.wroughtIron);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.78;
  group.add(collar);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.11, 3.85, 10), mats.wroughtIron);
  post.position.y = 2.675;
  group.add(post);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.45, 0),
    new THREE.Vector3(0, 5.05, 0.25),
    new THREE.Vector3(0, 5.12, 0.72),
    new THREE.Vector3(0, 4.78, 0.95),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.042, 8, false), mats.wroughtIron));

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.26, 6), mats.wroughtIron);
  cap.position.set(0, 4.72, 0.95);
  group.add(cap);

  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.42, 6), mats.lampGlass);
  glass.position.set(0, 4.42, 0.95);
  group.add(glass);

  const bottomRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.1, 6), mats.wroughtIron);
  bottomRim.position.set(0, 4.18, 0.95);
  group.add(bottomRim);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 0.65, 0.65);

  return {
    group,
    colliders: [{ offset: [0, 2.3, 0], size: [0.5, 4.6, 0.5] }],
    selectionRadius: 1.0,
  };
}

/** 7. Cedar & Cast-Iron Park Bench */
function buildBench(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 2.2;

  for (const sx of [-0.92, 0.92]) {
    const frontLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.08), mats.wroughtIron);
    frontLeg.position.set(sx, 0.23, 0.24);
    group.add(frontLeg);

    const backLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 0.08), mats.wroughtIron);
    backLeg.position.set(sx, 0.44, -0.24);
    backLeg.rotation.x = -0.1;
    group.add(backLeg);

    const seatBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.56), mats.wroughtIron);
    seatBar.position.set(sx, 0.44, 0);
    group.add(seatBar);

    const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.46), mats.wroughtIron);
    armRest.position.set(sx, 0.64, 0.04);
    group.add(armRest);

    const armSupport = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), mats.wroughtIron);
    armSupport.position.set(sx, 0.54, 0.24);
    group.add(armSupport);
  }

  for (let i = 0; i < 4; i++) {
    const z = -0.18 + i * 0.135;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.045, 0.11), mats.woodCedar);
    slat.position.set(0, 0.47, z);
    group.add(slat);
  }

  for (let i = 0; i < 3; i++) {
    const y = 0.64 + i * 0.135;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.042), mats.woodCedar);
    slat.position.set(0, y, -0.24 - i * 0.02);
    slat.rotation.x = -0.15;
    group.add(slat);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 1.35, 0.65);

  return {
    group,
    colliders: [{ offset: [0, 0.45, 0], size: [W + 0.1, 0.9, 0.72] }],
    selectionRadius: 1.5,
  };
}

const MIDDLE_EARTH_TYPES = new Set<string>([
  'hobbitBurrow',
  'wizardTower',
  'elvenPavilion',
  'dwarvenHall',
  'medievalKeep',
  'fantasyTavern',
  'windmillTower',
  'beaconTower',
  'runeMonolith',
  'dragonStatue',
]);

export function buildPlaceableAsset(type: PlaceableType, mats: MaterialLibrary): BuiltAsset {
  if (MIDDLE_EARTH_TYPES.has(type)) {
    return buildMiddleEarthAsset(type as MiddleEarthPlaceableType, mats);
  }

  const extended = buildExtendedPlaceableAsset(type, mats);
  if (extended) return extended;

  switch (type) {
    case 'apartment5':
      return buildApartment5(mats);
    case 'shopGround':
      return buildShopGround(mats);
    case 'romanArch':
      return buildRomanArch(mats);
    case 'ancientColumn':
      return buildAncientColumn(mats);
    case 'palmTree':
      return buildPalmTree(mats);
    case 'streetLamp':
      return buildStreetLamp(mats);
    case 'bench':
    default:
      return buildBench(mats);
  }
}

interface RoadProfile {
  curbWidth: number;
  curbLipWidth: number;
  curbHeight: number;
  deckY: number;
  crownHeight: number;
  taperedShoulder: boolean;
  uvTileLen: number;
  previewColor: number;
  roadMat: (m: MaterialLibrary) => THREE.Material;
  curbMat: (m: MaterialLibrary) => THREE.Material;
  lipMat: (m: MaterialLibrary) => THREE.Material;
}

const ROAD_PROFILES: Record<RoadStyle, RoadProfile> = {
  asphalt: {
    curbWidth: 1.55,
    curbLipWidth: 0.22,
    curbHeight: 0.16,
    deckY: 0.055,
    crownHeight: 0.025,
    taperedShoulder: false,
    uvTileLen: 7.5,
    previewColor: 0xe59a3c,
    roadMat: (m) => m.asphalt,
    curbMat: (m) => m.sidewalk,
    lipMat: (m) => m.travertineDark,
  },
  ancientStone: {
    curbWidth: 0.68,
    curbLipWidth: 0,
    curbHeight: 0.105,
    deckY: 0.072,
    crownHeight: 0.015,
    taperedShoulder: false,
    uvTileLen: 4.0,
    previewColor: 0xd4b279,
    roadMat: (m) => m.ancientStone,
    curbMat: (m) => m.travertineDark,
    lipMat: (m) => m.travertineDark,
  },
  cobblestone: {
    curbWidth: 0.85,
    curbLipWidth: 0,
    curbHeight: 0.105,
    deckY: 0.065,
    crownHeight: 0.022,
    taperedShoulder: false,
    uvTileLen: 4.2,
    previewColor: 0x9aa3b2,
    roadMat: (m) => m.cobblestone,
    curbMat: (m) => m.travertineDark,
    lipMat: (m) => m.travertineDark,
  },
  dirtRoad: {
    curbWidth: 0.85,
    curbLipWidth: 0,
    curbHeight: 0,
    deckY: 0.044,
    crownHeight: 0.02,
    taperedShoulder: true,
    uvTileLen: 5.2,
    previewColor: 0xb68a5c,
    roadMat: (m) => m.dirtRoad,
    curbMat: (m) => m.dirtRoad,
    lipMat: (m) => m.dirtRoad,
  },
  sidewalkPath: {
    curbWidth: 0.28,
    curbLipWidth: 0,
    curbHeight: 0.028,
    deckY: 0.125,
    crownHeight: 0.0,
    taperedShoulder: false,
    uvTileLen: 2.5,
    previewColor: 0xd9d2c5,
    roadMat: (m) => m.sidewalk,
    curbMat: (m) => m.travertineDark,
    lipMat: (m) => m.travertineDark,
  },
};

export function getRoadTotalWidth(style: RoadStyle, width: number): number {
  const p = ROAD_PROFILES[style];
  return width + (p.curbWidth + p.curbLipWidth) * 2;
}

interface MeshBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

function createMeshBuffers(): MeshBuffers {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

/**
 * Emits a quad (p0, p1, p2, p3) whose triangle winding is mathematically guaranteed
 * to align with `expectedNormal`, preventing any backface culling issues.
 */
function pushOrientedQuad(
  buf: MeshBuffers,
  p0: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  expectedNormal: [number, number, number],
  u0: number,
  u1: number,
  v0: number,
  v1: number
) {
  const base = buf.positions.length / 3;
  buf.positions.push(...p0, ...p1, ...p2, ...p3);
  buf.normals.push(...expectedNormal, ...expectedNormal, ...expectedNormal, ...expectedNormal);
  buf.uvs.push(u0, v0, u1, v0, u0, v1, u1, v1);

  const e1x = p1[0] - p0[0];
  const e1y = p1[1] - p0[1];
  const e1z = p1[2] - p0[2];
  const e2x = p2[0] - p0[0];
  const e2y = p2[1] - p0[1];
  const e2z = p2[2] - p0[2];
  const cx = e1y * e2z - e1z * e2y;
  const cy = e1z * e2x - e1x * e2z;
  const cz = e1x * e2y - e1y * e2x;
  const dot = cx * expectedNormal[0] + cy * expectedNormal[1] + cz * expectedNormal[2];

  if (dot >= 0) {
    buf.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  } else {
    buf.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
}

function finalizeBufferGeometry(buf: MeshBuffers): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uvs, 2));
  geo.setIndex(buf.indices);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/**
 * Curved Catmull-Rom 3D Architectural Road / Walkway Generator for all 5 Road Styles.
 * Features crowned road decks, raised granite/travertine curbs, grounded side walls,
 * tapered dirt shoulders, and closed start/end caps with guaranteed outward normals.
 */
export function buildRoadGroup(
  points: [number, number][],
  style: RoadStyle,
  width: number,
  mats: MaterialLibrary,
  isPreview = false
): THREE.Group {
  const group = new THREE.Group();
  if (points.length < 2) return group;

  const vecPoints = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(vecPoints, false, 'centripetal', 0.5);
  const approxLen = curve.getLength();
  if (approxLen < 0.15) return group;

  const profile = ROAD_PROFILES[style];
  const steps = Math.max(8, Math.min(240, Math.ceil(approxLen / 0.75)));
  const sampled = curve.getSpacedPoints(steps);

  const halfRoad = width / 2;
  const lipW = profile.curbLipWidth;
  const curbW = profile.curbWidth;
  const yBoost = isPreview ? 0.055 : 0;
  const deckY = profile.deckY + yBoost;
  const crownY = deckY + profile.crownHeight;
  const curbTopY = deckY + profile.curbHeight;
  const yBot = -0.04;

  const roadBuf = createMeshBuffers();
  const curbBuf = createMeshBuffers();
  const lipBuf = createMeshBuffers();

  const rightVecs: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const dists: number[] = [0];

  for (let i = 0; i < sampled.length; i++) {
    if (i > 0) {
      dists.push(dists[i - 1] + sampled[i].distanceTo(sampled[i - 1]));
    }
    const prev = sampled[Math.max(0, i - 1)];
    const next = sampled[Math.min(sampled.length - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();
    tangents.push(tangent);
    // tangent x up = (-tz, 0, tx) -> exact right-hand normal on XZ plane
    rightVecs.push(new THREE.Vector3(-tangent.z, 0, tangent.x));
  }

  // 1. Crowned Road Deck (2 strips: left-to-center and center-to-right for realistic camber)
  for (let i = 0; i < sampled.length - 1; i++) {
    const pA = sampled[i];
    const pB = sampled[i + 1];
    const rA = rightVecs[i];
    const rB = rightVecs[i + 1];
    const vA = dists[i] / profile.uvTileLen;
    const vB = dists[i + 1] / profile.uvTileLen;

    const lA: [number, number, number] = [pA.x - rA.x * halfRoad, deckY, pA.z - rA.z * halfRoad];
    const cA: [number, number, number] = [pA.x, crownY, pA.z];
    const rtA: [number, number, number] = [pA.x + rA.x * halfRoad, deckY, pA.z + rA.z * halfRoad];

    const lB: [number, number, number] = [pB.x - rB.x * halfRoad, deckY, pB.z - rB.z * halfRoad];
    const cB: [number, number, number] = [pB.x, crownY, pB.z];
    const rtB: [number, number, number] = [pB.x + rB.x * halfRoad, deckY, pB.z + rB.z * halfRoad];

    pushOrientedQuad(roadBuf, lA, cA, lB, cB, [0, 1, 0], 0, 0.5, vA, vB);
    pushOrientedQuad(roadBuf, cA, rtA, cB, rtB, [0, 1, 0], 0.5, 1, vA, vB);

    // Tapered organic earthen shoulders for dirtRoad
    if (profile.taperedShoulder) {
      const shOutA_L: [number, number, number] = [
        pA.x - rA.x * (halfRoad + curbW),
        -0.008,
        pA.z - rA.z * (halfRoad + curbW),
      ];
      const shOutB_L: [number, number, number] = [
        pB.x - rB.x * (halfRoad + curbW),
        -0.008,
        pB.z - rB.z * (halfRoad + curbW),
      ];
      const shOutA_R: [number, number, number] = [
        pA.x + rA.x * (halfRoad + curbW),
        -0.008,
        pA.z + rA.z * (halfRoad + curbW),
      ];
      const shOutB_R: [number, number, number] = [
        pB.x + rB.x * (halfRoad + curbW),
        -0.008,
        pB.z + rB.z * (halfRoad + curbW),
      ];
      pushOrientedQuad(roadBuf, shOutA_L, lA, shOutB_L, lB, [0, 1, 0], 0, 0.14, vA, vB);
      pushOrientedQuad(roadBuf, rtA, shOutA_R, rtB, shOutB_R, [0, 1, 0], 0.86, 1, vA, vB);
    }
  }

  // Closed road deck start & end vertical lips (for non-dirt roads)
  if (!profile.taperedShoulder) {
    const startIdx = 0;
    const endIdx = sampled.length - 1;
    for (const endCap of [
      { idx: startIdx, dir: -1 },
      { idx: endIdx, dir: 1 },
    ]) {
      const p = sampled[endCap.idx];
      const r = rightVecs[endCap.idx];
      const t = tangents[endCap.idx];
      const n: [number, number, number] = [t.x * endCap.dir, 0, t.z * endCap.dir];
      const lTop: [number, number, number] = [p.x - r.x * halfRoad, deckY, p.z - r.z * halfRoad];
      const rTop: [number, number, number] = [p.x + r.x * halfRoad, deckY, p.z + r.z * halfRoad];
      const lBot: [number, number, number] = [p.x - r.x * halfRoad, yBot, p.z - r.z * halfRoad];
      const rBot: [number, number, number] = [p.x + r.x * halfRoad, yBot, p.z + r.z * halfRoad];
      pushOrientedQuad(roadBuf, lBot, rBot, lTop, rTop, n, 0, 1, 0, 0.2);
    }
  }

  const roadGeo = finalizeBufferGeometry(roadBuf);
  const roadMat = isPreview
    ? new THREE.MeshStandardMaterial({
        color: profile.previewColor,
        map: (profile.roadMat(mats) as THREE.MeshStandardMaterial).map ?? null,
        roughness: 0.7,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      })
    : profile.roadMat(mats);

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = !isPreview;
  roadMesh.castShadow = false;
  group.add(roadMesh);

  // 2. Architectural Raised Curbs & Sidewalks (for non-dirt roads)
  if (!profile.taperedShoulder && (curbW > 0 || lipW > 0)) {
    const lipTopY = curbTopY + (lipW > 0 ? 0.015 : 0);

    for (const side of [-1, 1] as const) {
      for (let i = 0; i < sampled.length - 1; i++) {
        const pA = sampled[i];
        const pB = sampled[i + 1];
        const rA = rightVecs[i];
        const rB = rightVecs[i + 1];
        const vA = dists[i] / 2.2;
        const vB = dists[i + 1] / 2.2;

        const inNormal: [number, number, number] = [-side * rA.x, 0, -side * rA.z];
        const outNormal: [number, number, number] = [side * rA.x, 0, side * rA.z];

        const d0 = halfRoad;
        const dLip = halfRoad + lipW;
        const dOut = halfRoad + lipW + curbW;

        // Raised granite curb lip (e.g., Asphalt boulevard kerbstone)
        if (lipW > 0) {
          const inA: [number, number, number] = [pA.x + side * rA.x * d0, lipTopY, pA.z + side * rA.z * d0];
          const outA: [number, number, number] = [pA.x + side * rA.x * dLip, lipTopY, pA.z + side * rA.z * dLip];
          const inB: [number, number, number] = [pB.x + side * rB.x * d0, lipTopY, pB.z + side * rB.z * d0];
          const outB: [number, number, number] = [pB.x + side * rB.x * dLip, lipTopY, pB.z + side * rB.z * dLip];

          const inBotA: [number, number, number] = [pA.x + side * rA.x * d0, yBot, pA.z + side * rA.z * d0];
          const inBotB: [number, number, number] = [pB.x + side * rB.x * d0, yBot, pB.z + side * rB.z * d0];

          pushOrientedQuad(lipBuf, inA, outA, inB, outB, [0, 1, 0], 0, 0.3, vA, vB);
          pushOrientedQuad(lipBuf, inBotA, inA, inBotB, inB, inNormal, 0, 0.25, vA, vB);
        }

        // Main sidewalk / stone curb deck
        if (curbW > 0) {
          const startD = lipW > 0 ? dLip : d0;
          const swInA: [number, number, number] = [pA.x + side * rA.x * startD, curbTopY, pA.z + side * rA.z * startD];
          const swOutA: [number, number, number] = [pA.x + side * rA.x * dOut, curbTopY, pA.z + side * rA.z * dOut];
          const swInB: [number, number, number] = [pB.x + side * rB.x * startD, curbTopY, pB.z + side * rB.z * startD];
          const swOutB: [number, number, number] = [pB.x + side * rB.x * dOut, curbTopY, pB.z + side * rB.z * dOut];

          const swOutBotA: [number, number, number] = [pA.x + side * rA.x * dOut, yBot, pA.z + side * rA.z * dOut];
          const swOutBotB: [number, number, number] = [pB.x + side * rB.x * dOut, yBot, pB.z + side * rB.z * dOut];

          // Top surface
          pushOrientedQuad(curbBuf, swInA, swOutA, swInB, swOutB, [0, 1, 0], 0, 1, vA, vB);
          // Outer grounded wall
          pushOrientedQuad(curbBuf, swOutBotA, swOutA, swOutBotB, swOutB, outNormal, 0, 0.25, vA, vB);

          // Inner curb wall if no separate lip
          if (lipW === 0) {
            const swInBotA: [number, number, number] = [pA.x + side * rA.x * startD, yBot, pA.z + side * rA.z * startD];
            const swInBotB: [number, number, number] = [pB.x + side * rB.x * startD, yBot, pB.z + side * rB.z * startD];
            pushOrientedQuad(curbBuf, swInBotA, swInA, swInBotB, swInB, inNormal, 0, 0.25, vA, vB);
          }
        }
      }

      // Closed Start & End Caps for Curbs
      for (const endCap of [
        { idx: 0, dir: -1 },
        { idx: sampled.length - 1, dir: 1 },
      ]) {
        const p = sampled[endCap.idx];
        const r = rightVecs[endCap.idx];
        const t = tangents[endCap.idx];
        const capN: [number, number, number] = [t.x * endCap.dir, 0, t.z * endCap.dir];
        const dIn = halfRoad;
        const dOut = halfRoad + lipW + curbW;
        const pInTop: [number, number, number] = [p.x + side * r.x * dIn, curbTopY, p.z + side * r.z * dIn];
        const pOutTop: [number, number, number] = [p.x + side * r.x * dOut, curbTopY, p.z + side * r.z * dOut];
        const pInBot: [number, number, number] = [p.x + side * r.x * dIn, yBot, p.z + side * r.z * dIn];
        const pOutBot: [number, number, number] = [p.x + side * r.x * dOut, yBot, p.z + side * r.z * dOut];
        pushOrientedQuad(curbBuf, pInBot, pOutBot, pInTop, pOutTop, capN, 0, 1, 0, 0.25);
      }
    }

    if (lipBuf.positions.length > 0) {
      const lipGeo = finalizeBufferGeometry(lipBuf);
      const lipMat = isPreview
        ? new THREE.MeshBasicMaterial({
            color: 0xf4c563,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          })
        : profile.lipMat(mats);
      const lipMesh = new THREE.Mesh(lipGeo, lipMat);
      lipMesh.receiveShadow = !isPreview;
      lipMesh.castShadow = !isPreview;
      group.add(lipMesh);
    }

    if (curbBuf.positions.length > 0) {
      const curbGeo = finalizeBufferGeometry(curbBuf);
      const curbMat = isPreview
        ? new THREE.MeshStandardMaterial({
            color: profile.previewColor,
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          })
        : profile.curbMat(mats);
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.receiveShadow = !isPreview;
      curbMesh.castShadow = !isPreview;
      group.add(curbMesh);
    }
  }

  // 3. Preview Centerline Guide for crisp visual feedback while laying roads
  if (isPreview) {
    const linePts = sampled.map((p) => new THREE.Vector3(p.x, curbTopY + 0.12, p.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffe094 });
    const guideLine = new THREE.Line(lineGeo, lineMat);
    guideLine.userData.ignoreRaycast = true;
    group.add(guideLine);
  }

  return group;
}

/**
 * Glowing amber centerline + control nodes overlay for a selected road in Editor Mode.
 */
export function buildRoadHighlightGroup(
  points: [number, number][],
  style: RoadStyle,
  width: number
): THREE.Group {
  const group = new THREE.Group();
  if (points.length < 2) return group;

  const vecPoints = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(vecPoints, false, 'centripetal', 0.5);
  const approxLen = curve.getLength();
  if (approxLen < 0.15) return group;

  const steps = Math.max(8, Math.min(180, Math.ceil(approxLen / 0.8)));
  const sampled = curve.getSpacedPoints(steps);
  const totalHalf = getRoadTotalWidth(style, width) * 0.5 + 0.18;
  const y = 0.28;

  const leftEdge: THREE.Vector3[] = [];
  const rightEdge: THREE.Vector3[] = [];
  const centerLine: THREE.Vector3[] = [];

  for (let i = 0; i < sampled.length; i++) {
    const prev = sampled[Math.max(0, i - 1)];
    const next = sampled[Math.min(sampled.length - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(next, prev);
    t.y = 0;
    if (t.lengthSq() < 1e-6) t.set(1, 0, 0);
    t.normalize();
    const rX = -t.z;
    const rZ = t.x;
    const p = sampled[i];
    leftEdge.push(new THREE.Vector3(p.x - rX * totalHalf, y, p.z - rZ * totalHalf));
    rightEdge.push(new THREE.Vector3(p.x + rX * totalHalf, y, p.z + rZ * totalHalf));
    centerLine.push(new THREE.Vector3(p.x, y + 0.04, p.z));
  }

  const edgeMat = new THREE.LineBasicMaterial({ color: 0xf4ae44 });
  const centerMat = new THREE.LineBasicMaterial({ color: 0xfff0be });

  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftEdge), edgeMat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightEdge), edgeMat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(centerLine), centerMat));

  const nodeGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xf4ae44 });
  for (const [x, z] of points) {
    const m = new THREE.Mesh(nodeGeo, nodeMat);
    m.position.set(x, y, z);
    group.add(m);
  }

  group.traverse((c) => {
    c.userData.ignoreRaycast = true;
  });

  return group;
}

/** Articulated Third-Person Explorer Character */
export interface ExplorerRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torso: THREE.Group;
}

export function buildExplorerCharacter(mats: MaterialLibrary): ExplorerRig {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe3b38e, roughness: 0.65 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2c4b5c, roughness: 0.78 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2d34, roughness: 0.84 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.82 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x4b2f1c, roughness: 0.72 });

  const torso = new THREE.Group();
  torso.position.y = 0.92;
  root.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), jacketMat);
  chest.position.y = 0.28;
  torso.add(chest);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.27), shirtMat);
  collar.position.set(0, 0.52, 0.01);
  torso.add(collar);

  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.26), mats.carLeather);
  bag.position.set(-0.26, 0.12, -0.02);
  torso.add(bag);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 14), skinMat);
  head.position.y = 0.72;
  torso.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hair.position.set(0, 0.74, -0.01);
  torso.add(hair);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.06), mats.wroughtIron);
  shades.position.set(0, 0.73, 0.145);
  torso.add(shades);

  const makeArm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.52, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 10), jacketMat);
    sleeve.position.y = -0.22;
    pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
    hand.position.y = -0.46;
    pivot.add(hand);
    torso.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-0.3);
  const rightArm = makeArm(0.3);

  const makeLeg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.92, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.76, 10), pantsMat);
    thigh.position.y = -0.38;
    pivot.add(thigh);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.24), bootMat);
    boot.position.set(0, -0.84, 0.04);
    pivot.add(boot);
    root.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-0.125);
  const rightLeg = makeLeg(0.125);

  enableShadows(root, true, true);
  addContactShadow(root, mats.contactShadow, 0.52, 0.52);

  return { root, leftLeg, rightLeg, leftArm, rightArm, torso };
}

/** Classic Open-Top Mediterranean Convertible Roadster */
export interface ConvertibleRig {
  root: THREE.Group;
  frontLeftHub: THREE.Group;
  frontRightHub: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  steeringWheel: THREE.Object3D;
  seatAnchor: THREE.Vector3;
  headlightGlows: THREE.Mesh[];
}

export function buildClassicConvertible(mats: MaterialLibrary): ConvertibleRig {
  const root = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 4.15), mats.wroughtIron);
  floor.position.y = 0.42;
  root.add(floor);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.52, 4.35), mats.carBodyPaint);
  hull.position.y = 0.72;
  root.add(hull);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.26, 1.65), mats.carBodyPaint);
  hood.position.set(0, 1.02, 1.25);
  root.add(hood);

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.24, 1.25), mats.carBodyPaint);
  trunk.position.set(0, 1.0, -1.48);
  root.add(trunk);

  for (const sx of [-0.84, 0.84]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 1.48), mats.carBodyPaint);
    door.position.set(sx, 1.01, -0.18);
    root.add(door);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 3.85), mats.carChrome);
    trim.position.set(sx + Math.sign(sx) * 0.11, 0.82, 0.0);
    root.add(trim);
  }

  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 1.45), mats.carLeather);
  cabinFloor.position.set(0, 0.62, -0.18);
  root.add(cabinFloor);

  for (const sx of [-0.42, 0.42]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.58), mats.carLeather);
    cushion.position.set(sx, 0.78, -0.35);
    root.add(cushion);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.16), mats.carLeather);
    backrest.position.set(sx, 1.08, -0.62);
    backrest.rotation.x = -0.18;
    root.add(backrest);
  }

  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.26, 0.34), mats.woodCedar);
  dash.position.set(0, 1.04, 0.42);
  root.add(dash);

  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(0.42, 1.12, 0.22);
  steeringGroup.rotation.x = 0.55;
  steeringGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 8, 20), mats.woodCedar));
  steeringGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.03), mats.carChrome));
  root.add(steeringGroup);

  const wsGroup = new THREE.Group();
  wsGroup.position.set(0, 1.16, 0.52);
  wsGroup.rotation.x = -0.52;
  const wsGlass = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.56, 0.04), mats.carWindshield);
  wsGlass.position.y = 0.28;
  wsGroup.add(wsGlass);

  const wsTop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.06, 0.06), mats.carChrome);
  wsTop.position.y = 0.56;
  wsGroup.add(wsTop);
  for (const sx of [-0.81, 0.81]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.06), mats.carChrome);
    pillar.position.set(sx, 0.28, 0);
    wsGroup.add(pillar);
  }
  root.add(wsGroup);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.1), mats.carChrome);
  grille.position.set(0, 0.74, 2.18);
  root.add(grille);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.14, 0.18), mats.carChrome);
  frontBumper.position.set(0, 0.48, 2.24);
  root.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.14, 0.18), mats.carChrome);
  rearBumper.position.set(0, 0.48, -2.24);
  root.add(rearBumper);

  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.62), mats.carChrome);
  rack.position.set(0, 1.16, -1.52);
  root.add(rack);

  const headlightGlows: THREE.Mesh[] = [];
  for (const sx of [-0.68, 0.68]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.14, 14), mats.carChrome);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(sx, 0.84, 2.15);
    root.add(bezel);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), mats.carHeadlight);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(sx, 0.84, 2.21);
    root.add(lens);

    const beamGeo = new THREE.ConeGeometry(1.35, 8.5, 14, 1, true);
    beamGeo.translate(0, -4.25, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(sx, 0.82, 2.25);
    beam.rotation.x = 0.08;
    beam.userData.ignoreRaycast = true;
    root.add(beam);
    headlightGlows.push(beam);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), mats.carTaillight);
    tail.position.set(sx, 0.82, -2.18);
    root.add(tail);
  }

  const wheelMeshes: THREE.Object3D[] = [];
  const makeWheel = () => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 18), mats.carTire);
    tire.rotation.z = Math.PI / 2;
    w.add(tire);

    const rimDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 14), mats.carChrome);
    rimDisc.rotation.z = Math.PI / 2;
    w.add(rimDisc);

    w.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.05), mats.wroughtIron));
    w.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.36), mats.wroughtIron));

    wheelMeshes.push(w);
    return w;
  };

  const frontLeftHub = new THREE.Group();
  frontLeftHub.position.set(0.95, 0.38, 1.38);
  frontLeftHub.add(makeWheel());
  root.add(frontLeftHub);

  const frontRightHub = new THREE.Group();
  frontRightHub.position.set(-0.95, 0.38, 1.38);
  frontRightHub.add(makeWheel());
  root.add(frontRightHub);

  const rearLeft = makeWheel();
  rearLeft.position.set(0.95, 0.38, -1.35);
  root.add(rearLeft);

  const rearRight = makeWheel();
  rearRight.position.set(-0.95, 0.38, -1.35);
  root.add(rearRight);

  enableShadows(root, true, true);
  addContactShadow(root, mats.contactShadow, 1.4, 2.5);

  return {
    root,
    frontLeftHub,
    frontRightHub,
    wheelMeshes,
    steeringWheel: steeringGroup,
    seatAnchor: new THREE.Vector3(0.42, 0.55, -0.35),
    headlightGlows,
  };
}
