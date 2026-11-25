import * as THREE from 'three';
import { BuiltAsset, ColliderBoxDef, MaterialLibrary } from './models';

export type SummerPlaceableType =
  | 'seaWaterPatch'
  | 'sandyBeachShore'
  | 'beachVolleyball'
  | 'summerVilla'
  | 'beachBungalow'
  | 'swimmingPool'
  | 'woodenPier'
  | 'beachCabanaSet'
  | 'lifeguardTower'
  | 'beachBarTiki'
  | 'sailboatDocked'
  | 'surfboardRack';

function addShadows(group: THREE.Group, cast = true, receive = true) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

function makeMat(params: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(params);
}

// Lazily cached procedural textures for summer assets (zero external files, fast reuse)
let cachedSeaTex: THREE.CanvasTexture | null = null;
let cachedSandTex: THREE.CanvasTexture | null = null;
let cachedNetTex: THREE.CanvasTexture | null = null;

function getSeaTexture(): THREE.CanvasTexture {
  if (cachedSeaTex) return cachedSeaTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#0f86a6');
  grad.addColorStop(0.5, '#19a7bd');
  grad.addColorStop(1, '#0c7a9c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle sunlit caustic wave arcs
  ctx.strokeStyle = 'rgba(210, 252, 255, 0.26)';
  ctx.lineWidth = 2.2;
  for (let y = 14; y < 256; y += 22) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const wy = y + Math.sin((x / 256) * Math.PI * 4 + y * 0.15) * 4.5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  // Sparkling sunlit glints
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 65; i++) {
    const gx = (i * 53) % 256;
    const gy = (i * 97) % 256;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 5 + (i % 5), 1.6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSeaTex = tex;
  return tex;
}

function getSandTexture(): THREE.CanvasTexture {
  if (cachedSandTex) return cachedSandTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e8cf97';
  ctx.fillRect(0, 0, 256, 256);

  // Gentle wind-swept sand ripples
  ctx.fillStyle = 'rgba(214, 182, 122, 0.35)';
  for (let y = 8; y < 256; y += 18) {
    ctx.beginPath();
    ctx.ellipse(128, y, 130, 3.2, 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fine warm mineral grain
  for (let i = 0; i < 1800; i++) {
    const x = (i * 79) % 256;
    const y = (i * 131) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,246,220,0.35)' : 'rgba(176,142,88,0.28)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSandTex = tex;
  return tex;
}

function getVolleyballNetTexture(): THREE.CanvasTexture {
  if (cachedNetTex) return cachedNetTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);

  // Net mesh grid
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, 58);
    ctx.stroke();
  }
  for (let y = 8; y <= 56; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // Thick top & bottom vinyl tape
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 7);
  ctx.fillRect(0, 57, 256, 7);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedNetTex = tex;
  return tex;
}

function makeBeachUmbrella(
  colorA: number,
  colorB: number,
  poleMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.45, 8), poleMat);
  pole.position.y = 1.22;
  g.add(pole);

  const matA = makeMat({ color: colorA, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
  const matB = makeMat({ color: colorB, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const startAngle = (i / segments) * Math.PI * 2;
    const slice = new THREE.Mesh(
      new THREE.ConeGeometry(1.48, 0.56, 1, 1, true, startAngle, (Math.PI * 2) / segments),
      i % 2 === 0 ? matA : matB
    );
    slice.position.y = 2.38;
    g.add(slice);
  }
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), poleMat);
  finial.position.y = 2.68;
  g.add(finial);
  return g;
}

function makeSunLounger(
  frameMat: THREE.Material,
  cushionColor: number,
  towelColor: number
): THREE.Group {
  const g = new THREE.Group();
  const cushionMat = makeMat({ color: cushionColor, roughness: 0.85, metalness: 0.02 });
  const towelMat = makeMat({ color: towelColor, roughness: 0.9, metalness: 0.01 });

  // Frame base & legs
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 1.92), frameMat);
  deck.position.set(0, 0.34, 0);
  g.add(deck);
  for (const sx of [-0.32, 0.32]) {
    for (const sz of [-0.76, 0.76]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), frameMat);
      leg.position.set(sx, 0.17, sz);
      g.add(leg);
    }
  }
  // Flat cushion
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 1.24), cushionMat);
  pad.position.set(0, 0.42, 0.28);
  g.add(pad);
  // Reclined backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.72), cushionMat);
  back.position.set(0, 0.64, -0.56);
  back.rotation.x = 0.58;
  g.add(back);
  // Rolled summer beach towel on headrest
  const towel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.58, 10), towelMat);
  towel.rotation.z = Math.PI / 2;
  towel.position.set(0, 0.83, -0.74);
  g.add(towel);

  return g;
}

/** 1. Turkuaz Deniz Parçası (20 × 20 m walkable/sail-ready sea surface tile) */
function buildSeaWaterPatch(): BuiltAsset {
  const group = new THREE.Group();
  const seaTex = getSeaTexture();
  const deepBedMat = makeMat({ color: 0x0a536b, roughness: 0.9, metalness: 0.02 });
  const waterMat = makeMat({
    color: 0x2ec4d6,
    map: seaTex,
    roughness: 0.14,
    metalness: 0.14,
    transparent: true,
    opacity: 0.86,
  });
  const foamMat = makeMat({
    color: 0xf4fcff,
    emissive: 0x9de8f5,
    emissiveIntensity: 0.18,
    roughness: 0.4,
    transparent: true,
    opacity: 0.65,
  });

  // Seabed underlay so ground never bleeds harsh green through shallow sea
  const bed = new THREE.Mesh(new THREE.BoxGeometry(20, 0.04, 20), deepBedMat);
  bed.position.y = 0.02;
  group.add(bed);

  // Shimmering turquoise ocean surface
  const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.075;
  water.userData.waterUvScroll = true;
  group.add(water);

  // Gentle white wave crest ribbons across the surface
  for (let i = 0; i < 4; i++) {
    const wave = new THREE.Mesh(new THREE.BoxGeometry(7.2 + (i % 2) * 3.5, 0.025, 0.42), foamMat);
    wave.position.set(-4.5 + i * 3.1, 0.095, -6.5 + i * 4.2);
    wave.userData.waveFoam = true;
    wave.userData.wavePhase = i * 1.45;
    wave.userData.waveBaseZ = wave.position.z;
    group.add(wave);
  }

  // Two floating maritime swim buoys bobbing on the water
  const buoyRed = makeMat({ color: 0xe64539, roughness: 0.35, metalness: 0.08 });
  const buoyWhite = makeMat({ color: 0xfafafa, roughness: 0.38, metalness: 0.05 });
  const buoyPositions: [number, number][] = [
    [-5.8, -4.6],
    [6.2, 5.4],
  ];
  buoyPositions.forEach(([bx, bz], idx) => {
    const buoy = new THREE.Group();
    buoy.position.set(bx, 0.22, bz);
    buoy.userData.bobY = true;
    buoy.userData.bobBaseY = 0.22;
    buoy.userData.bobPhase = idx * 2.1;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), idx === 0 ? buoyRed : buoyWhite);
    buoy.add(sphere);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.295, 0.295, 0.11, 12),
      idx === 0 ? buoyWhite : buoyRed
    );
    buoy.add(band);
    group.add(buoy);
  });

  addShadows(group, false, true);
  return {
    group,
    colliders: [],
    selectionRadius: 10.2,
  };
}

/** 2. Kumsal & Dalga Kıyısı (16 × 14 m golden beach with foaming tide) */
function buildSandyBeachShore(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const sandTex = getSandTexture();
  const drySand = makeMat({ color: 0xf1d69b, map: sandTex, roughness: 0.92, metalness: 0.01 });
  const wetSand = makeMat({ color: 0xc8a46b, map: sandTex, roughness: 0.56, metalness: 0.06 });
  const shallowWater = makeMat({
    color: 0x3bd4df,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.72,
  });
  const foamMat = makeMat({
    color: 0xffffff,
    roughness: 0.45,
    transparent: true,
    opacity: 0.82,
  });

  // Main dry golden sand beach terrace
  const drySlab = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.14, 14), drySand);
  drySlab.position.set(-2.3, 0.07, 0);
  group.add(drySlab);

  // Damp shoreline sand strip transitioning toward sea (+X edge)
  const wetSlab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 14), wetSand);
  wetSlab.position.set(4.9, 0.045, 0);
  group.add(wetSlab);

  // Shallow translucent turquoise surf edge
  const surf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 14), shallowWater);
  surf.position.set(7.2, 0.035, 0);
  group.add(surf);

  // Animated white shoreline foam bands
  for (let i = 0; i < 3; i++) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 13.6), foamMat);
    foam.position.set(5.6 + i * 0.78, 0.085, 0);
    foam.userData.waveFoam = true;
    foam.userData.wavePhase = i * 1.1;
    foam.userData.waveBaseX = foam.position.x;
    group.add(foam);
  }

  // Weathered timber beach boardwalk access planks on land side (-X)
  for (let i = -5; i <= 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.92), mats.woodCedar);
    plank.position.set(-7.1, 0.15, i * 1.16);
    group.add(plank);
  }

  // Decorative smooth sea pebbles & orange starfish accents
  const pebbleMat = makeMat({ color: 0x9b968d, roughness: 0.76 });
  const starfishMat = makeMat({ color: 0xe86b42, roughness: 0.75 });
  const pebbleCoords: [number, number, number][] = [
    [3.8, 0.12, -4.6],
    [4.2, 0.12, -4.1],
    [3.6, 0.12, 3.8],
    [4.4, 0.12, 4.9],
    [2.1, 0.15, -5.8],
  ];
  for (const [px, py, pz] of pebbleCoords) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), pebbleMat);
    rock.scale.set(1.25, 0.52, 0.95);
    rock.position.set(px, py, pz);
    group.add(rock);
  }

  for (const [sx, sz] of [
    [3.9, 1.4],
    [4.5, -2.2],
  ] as [number, number][]) {
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 5), starfishMat);
    star.position.set(sx, 0.11, sz);
    group.add(star);
  }

  addShadows(group, false, true);
  return {
    group,
    colliders: [],
    selectionRadius: 8.8,
  };
}

/** 3. Plaj Voleybolu Sahası (16 × 9 m regulation sand court with net & referee chair) */
function buildBeachVolleyball(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const sandMat = makeMat({ color: 0xf2d99e, map: getSandTexture(), roughness: 0.92 });
  const lineMat = makeMat({ color: 0xfafcff, roughness: 0.65 });
  const postMat = makeMat({ color: 0x1d5ea8, roughness: 0.35, metalness: 0.45 });
  const padMat = makeMat({ color: 0xf5c036, roughness: 0.62 });
  const netMat = new THREE.MeshStandardMaterial({
    map: getVolleyballNetTexture(),
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    roughness: 0.75,
  });

  // Raised golden sand court bed + cedar border frame
  const sandBed = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.16, 9.2), sandMat);
  sandBed.position.y = 0.08;
  group.add(sandBed);

  const borderLong1 = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.22, 0.22), mats.woodCedar);
  borderLong1.position.set(0, 0.11, 4.65);
  group.add(borderLong1);
  const borderLong2 = borderLong1.clone();
  borderLong2.position.z = -4.65;
  group.add(borderLong2);

  const borderShort1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 9.52), mats.woodCedar);
  borderShort1.position.set(8.18, 0.11, 0);
  group.add(borderShort1);
  const borderShort2 = borderShort1.clone();
  borderShort2.position.x = -8.18;
  group.add(borderShort2);

  // Crisp white regulation court lines (14 × 7.2 m)
  const lineTop = new THREE.Mesh(new THREE.BoxGeometry(14, 0.025, 0.12), lineMat);
  lineTop.position.set(0, 0.17, 3.6);
  group.add(lineTop);
  const lineBot = lineTop.clone();
  lineBot.position.z = -3.6;
  group.add(lineBot);

  const lineLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 7.32), lineMat);
  lineLeft.position.set(-7, 0.17, 0);
  group.add(lineLeft);
  const lineRight = lineLeft.clone();
  lineRight.position.x = 7;
  group.add(lineRight);

  const lineCenter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 7.2), lineMat);
  lineCenter.position.set(0, 0.17, 0);
  group.add(lineCenter);

  // Twin steel net posts with yellow safety padding + red-white antennas
  for (const sz of [-4.05, 4.05]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.75, 10), postMat);
    post.position.set(0, 1.45, sz);
    group.add(post);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.45, 10), padMat);
    pad.position.set(0, 0.92, sz);
    group.add(pad);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.35, 6),
      makeMat({ color: 0xe33d35, roughness: 0.4 })
    );
    antenna.position.set(0, 2.48, sz > 0 ? 3.6 : -3.6);
    group.add(antenna);
  }

  // Volleyball Net suspended across center
  const net = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 1.05), netMat);
  net.rotation.y = Math.PI / 2;
  net.position.set(0, 2.08, 0);
  group.add(net);

  // Elevated wooden Referee Stand beside north post
  const refGroup = new THREE.Group();
  refGroup.position.set(0, 0.16, -4.95);
  for (const lx of [-0.36, 0.36]) {
    for (const lz of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.85, 0.07), mats.woodCedar);
      leg.position.set(lx, 0.92, lz);
      refGroup.add(leg);
    }
  }
  const refSeat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.78), mats.stuccoCream);
  refSeat.position.set(0, 1.88, 0);
  refGroup.add(refSeat);
  const refBack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.55, 0.08), mats.stuccoCream);
  refBack.position.set(0, 2.18, -0.35);
  refGroup.add(refBack);
  const refShade = makeBeachUmbrella(0x1f6fb2, 0xffffff, mats.carChrome);
  refShade.scale.setScalar(0.65);
  refShade.position.set(0, 1.3, -0.25);
  refGroup.add(refShade);
  group.add(refGroup);

  // Colorful Beach Volleyballs (1 on court + 2 in rack)
  const makeBall = (x: number, y: number, z: number) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, y, z);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 14, 12),
      makeMat({ color: 0xf7d336, roughness: 0.45 })
    );
    bGroup.add(core);
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.195, 0.032, 6, 16),
      makeMat({ color: 0x1d66ba, roughness: 0.45 })
    );
    bGroup.add(stripe);
    group.add(bGroup);
  };
  makeBall(2.2, 0.37, 0.85);
  makeBall(-1.4, 0.37, 4.9);
  makeBall(-1.9, 0.37, 4.9);

  addShadows(group);
  const colliders: ColliderBoxDef[] = [
    { offset: [0, 1.4, -4.5], size: [1.1, 2.8, 1.7] },
    { offset: [0, 1.4, 4.05], size: [0.45, 2.8, 0.45] },
  ];
  return {
    group,
    colliders,
    selectionRadius: 8.6,
  };
}

/** 4. Havuzlu Beyaz Yazlık (Bodrum / Alaçatı Aegean Whitewashed Summer Villa) */
function buildSummerVilla(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const whitewash = makeMat({ color: 0xf7f5ef, roughness: 0.84, metalness: 0.02 });
  const aegeanBlue = makeMat({ color: 0x1b6db2, roughness: 0.48, metalness: 0.08 });
  const bougainvillea = makeMat({ color: 0xd92b7a, roughness: 0.78 });
  const poolTile = makeMat({ color: 0x1482a8, roughness: 0.35 });
  const poolWater = makeMat({
    color: 0x35d5e6,
    roughness: 0.12,
    metalness: 0.14,
    transparent: true,
    opacity: 0.82,
  });

  // Wide travertine terrace plinth
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.36, 9.6), mats.travertine);
  terrace.position.y = 0.18;
  group.add(terrace);

  // Main whitewashed ground story
  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.2, 5.8), whitewash);
  groundFloor.position.set(-1.5, 1.96, -1.4);
  group.add(groundFloor);

  // Cantilevered upper Aegean cubic suite
  const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.9, 5.4), whitewash);
  upperFloor.position.set(-2.3, 5.0, -1.5);
  group.add(upperFloor);

  // Parapet coping trim along flat roofs
  const parapetTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.24, 5.6), whitewash);
  parapetTop.position.set(-2.3, 6.52, -1.5);
  group.add(parapetTop);

  // Upper sun terrace glass railing + wooden pergola slats
  const glassRail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.08), mats.modernGlass);
  glassRail.position.set(1.5, 4.05, 1.25);
  group.add(glassRail);
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.14), mats.woodCedar);
    slat.position.set(1.5, 5.65, -3.4 + i * 0.92);
    group.add(slat);
  }
  for (const sz of [-3.5, 1.2]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.15, 0.18), mats.woodCedar);
    col.position.set(2.55, 4.62, sz);
    group.add(col);
  }

  // Iconic Aegean cobalt-blue doors & shuttered windows
  const mainDoor = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.25, 0.14), aegeanBlue);
  mainDoor.position.set(-2.4, 1.48, 1.54);
  group.add(mainDoor);

  const winPositions: [number, number, number][] = [
    [0.2, 1.95, 1.54],
    [-3.6, 5.05, 1.24],
    [-1.2, 5.05, 1.24],
  ];
  for (const [wx, wy, wz] of winPositions) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.2, 0.1), mats.lampGlass);
    glass.position.set(wx, wy, wz);
    group.add(glass);
    for (const sx of [-0.74, 0.74]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.24, 0.12), aegeanBlue);
      shutter.position.set(wx + sx, wy, wz + 0.03);
      group.add(shutter);
    }
  }

  // Vibrant magenta bougainvillea cascade climbing the corner wall
  const flowerSpots: [number, number, number, number][] = [
    [-5.35, 2.6, 1.1, 0.55],
    [-5.32, 3.4, 0.6, 0.62],
    [-5.18, 4.3, 1.1, 0.58],
    [-4.65, 5.1, 1.28, 0.48],
    [-5.36, 1.8, 1.45, 0.42],
  ];
  for (const [fx, fy, fz, fr] of flowerSpots) {
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(fr, 0), bougainvillea);
    bush.position.set(fx, fy, fz);
    group.add(bush);
  }

  // Private turquoise plunge pool on the sunlit front-right terrace
  const poolRim = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 3.2), mats.travertine);
  poolRim.position.set(2.9, 0.44, 2.5);
  group.add(poolRim);
  const poolBasin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 2.6), poolTile);
  poolBasin.position.set(2.9, 0.48, 2.5);
  group.add(poolBasin);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 2.55), poolWater);
  water.rotation.x = -Math.PI / 2;
  water.position.set(2.9, 0.58, 2.5);
  group.add(water);

  // Two poolside sunbeds
  const bed1 = makeSunLounger(mats.woodCedar, 0xffffff, 0x1b6db2);
  bed1.position.set(-1.4, 0.36, 3.2);
  bed1.rotation.y = Math.PI / 2;
  group.add(bed1);

  const bed2 = makeSunLounger(mats.woodCedar, 0xffffff, 0xe85f4b);
  bed2.position.set(-3.8, 0.36, 3.2);
  bed2.rotation.y = Math.PI / 2;
  group.add(bed2);

  addShadows(group);
  return {
    group,
    colliders: [
      { offset: [-1.5, 3.3, -1.4], size: [7.8, 6.6, 6.0] },
    ],
    selectionRadius: 6.8,
  };
}

/** 5. Ahşap Plaj Bungalovu (Elevated tropical/Mediterranean resort bungalow with hammock) */
function buildBeachBungalow(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const thatchMat = makeMat({ color: 0xc9a255, roughness: 0.94, metalness: 0.01 });
  const bambooMat = makeMat({ color: 0xb68a4d, roughness: 0.78 });
  const hammockMat = makeMat({ color: 0xe6654c, roughness: 0.85, side: THREE.DoubleSide });

  // Stilts elevating deck above beach sand
  for (const sx of [-2.8, 0, 2.8]) {
    for (const sz of [-2.6, 0, 2.6]) {
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.9, 8), mats.woodCedar);
      stilt.position.set(sx, 0.45, sz);
      group.add(stilt);
    }
  }

  // Elevated veranda deck + steps
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 6.0), mats.woodCedar);
  deck.position.y = 0.92;
  group.add(deck);
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.38), mats.woodCedar);
    step.position.set(0, 0.24 + s * 0.28, 3.6 - s * 0.34);
    group.add(step);
  }

  // Timber cabin walls
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.65, 3.6), bambooMat);
  cabin.position.set(0, 2.34, -0.75);
  group.add(cabin);

  // Glowing front glass door & side windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.12), mats.lampGlass);
  door.position.set(0, 2.08, 1.08);
  group.add(door);

  // Veranda posts + woven hammock slung across left porch
  for (const sx of [-2.95, 2.95]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 2.75, 8), mats.woodCedar);
    p.position.set(sx, 2.38, 2.75);
    group.add(p);
  }
  const hammockCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.9, 2.15, 2.65),
    new THREE.Vector3(-1.95, 1.48, 2.2),
    new THREE.Vector3(-0.95, 2.15, 1.25),
  ]);
  const hammock = new THREE.Mesh(
    new THREE.TubeGeometry(hammockCurve, 14, 0.26, 6, false),
    hammockMat
  );
  hammock.scale.set(1, 0.35, 1);
  group.add(hammock);

  // Thick overhanging thatched hip roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.95, 2.35, 4), thatchMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.06, 1, 1.0);
  roof.position.set(0, 4.85, 0.1);
  group.add(roof);

  // Hanging warm resort lantern
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.lampGlass);
  lantern.position.set(1.6, 3.15, 2.1);
  group.add(lantern);

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 2.4, -0.2], size: [6.2, 4.8, 5.6] }],
    selectionRadius: 4.5,
  };
}

/** 6. Yüzme Havuzu & Teras (11 × 8 m resort pool with floating coral ring & sunbeds) */
function buildSwimmingPool(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const tileBlue = makeMat({ color: 0x1680ad, roughness: 0.32 });
  const waterMat = makeMat({
    color: 0x36d7e8,
    map: getSeaTexture(),
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.84,
  });
  const floatMat = makeMat({ color: 0xff6b8b, roughness: 0.32, metalness: 0.05 });

  // Sunlit travertine terrace deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.24, 8.0), mats.travertine);
  deck.position.y = 0.12;
  group.add(deck);

  // Raised pool coping rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 4.8), mats.stuccoCream);
  rim.position.set(-0.9, 0.28, 0);
  group.add(rim);

  // Pool interior blue mosaic & glowing turquoise water
  const basin = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 4.1), tileBlue);
  basin.position.set(-0.9, 0.32, 0);
  group.add(basin);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(6.42, 4.02), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-0.9, 0.4, 0);
  water.userData.waterUvScroll = true;
  group.add(water);

  // Chrome poolside ladder
  for (const sz of [-0.32, 0.32]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), mats.carChrome);
    rail.position.set(2.35, 0.72, sz);
    group.add(rail);
  }

  // Bobbing coral swim ring on pool water
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.16, 10, 20), floatMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(-1.6, 0.46, 0.55);
  ring.userData.bobY = true;
  ring.userData.bobBaseY = 0.46;
  ring.userData.bobPhase = 0.7;
  group.add(ring);

  // Two poolside sun loungers + striped umbrella on right deck
  const b1 = makeSunLounger(mats.woodCedar, 0xffffff, 0x22b2c9);
  b1.position.set(3.95, 0.24, -1.65);
  b1.rotation.y = -Math.PI / 2;
  group.add(b1);

  const b2 = makeSunLounger(mats.woodCedar, 0xffffff, 0xf2a93b);
  b2.position.set(3.95, 0.24, 1.65);
  b2.rotation.y = -Math.PI / 2;
  group.add(b2);

  const umbrella = makeBeachUmbrella(0x22a6c4, 0xffffff, mats.woodCedar);
  umbrella.position.set(4.1, 0.24, 0);
  group.add(umbrella);

  addShadows(group);
  return {
    group,
    colliders: [],
    selectionRadius: 6.4,
  };
}

/** 7. Ahşap Deniz İskelesi (14 × 4.5 m timber pier with pilings, bollards & dock lights) */
function buildWoodenPier(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const darkWood = makeMat({ color: 0x6b4c32, roughness: 0.86 });
  const plankWood = makeMat({ color: 0x9c7248, roughness: 0.82 });
  const ropeMat = makeMat({ color: 0xd9c28f, roughness: 0.92 });

  // 12 vertical timber pilings + cross stringers
  for (let i = 0; i < 6; i++) {
    const px = -6.0 + i * 2.4;
    for (const pz of [-1.65, 1.65]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 1.42, 8), darkWood);
      pile.position.set(px, 0.68, pz);
      group.add(pile);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 3.6), darkWood);
    cross.position.set(px, 0.62, 0);
    group.add(cross);
  }

  // Planked timber boardwalk deck
  for (let i = 0; i < 24; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 3.85), plankWood);
    plank.position.set(-6.55 + i * 0.57, 0.74, 0);
    group.add(plank);
  }

  // Side rope railing posts & mooring bollards
  for (const px of [-6.0, -1.2, 3.6, 6.0]) {
    for (const pz of [-1.75, 1.75]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.52, 8), darkWood);
      bollard.position.set(px, 1.02, pz);
      group.add(bollard);
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), ropeMat);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.set(px, 1.05, pz);
      group.add(wrap);
    }
  }

  // Glowing solar dock lanterns at seaward tip (+X)
  for (const pz of [-1.75, 1.75]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mats.lampGlass);
    lamp.position.set(6.0, 1.38, pz);
    group.add(lamp);
  }

  // Chrome diving ladder at the pier head
  for (const pz of [-0.36, 0.36]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), mats.carChrome);
    rail.position.set(6.75, 0.62, pz);
    group.add(rail);
  }

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 0.38, 0], size: [13.8, 0.76, 3.8] }],
    selectionRadius: 7.4,
  };
}

/** 8. Şezlong & Şemsiye Seti (6 × 4.5 m striped parasols, 3 sunbeds, drinks & beach ball) */
function buildBeachCabanaSet(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const sandPad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.45, 0.08, 18),
    makeMat({ color: 0xf1d69b, map: getSandTexture(), roughness: 0.92 })
  );
  sandPad.position.y = 0.04;
  group.add(sandPad);

  // Two striped beach umbrellas
  const umb1 = makeBeachUmbrella(0xe85a47, 0xffffff, mats.woodCedar);
  umb1.position.set(-1.35, 0.06, -0.55);
  umb1.rotation.z = 0.08;
  group.add(umb1);

  const umb2 = makeBeachUmbrella(0x1f8fb8, 0xffffff, mats.woodCedar);
  umb2.position.set(1.45, 0.06, -0.45);
  umb2.rotation.z = -0.07;
  group.add(umb2);

  // Three teak sun loungers
  const l1 = makeSunLounger(mats.woodCedar, 0xffffff, 0xe85a47);
  l1.position.set(-1.95, 0.08, 0.55);
  l1.rotation.y = 0.14;
  group.add(l1);

  const l2 = makeSunLounger(mats.woodCedar, 0xffffff, 0xf2b830);
  l2.position.set(0.0, 0.08, 0.62);
  group.add(l2);

  const l3 = makeSunLounger(mats.woodCedar, 0xffffff, 0x1f8fb8);
  l3.position.set(1.95, 0.08, 0.52);
  l3.rotation.y = -0.14;
  group.add(l3);

  // Low bamboo drinks table with two colorful tropical smoothies
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12), mats.woodCedar);
  tableTop.position.set(-0.98, 0.48, 0.72);
  group.add(tableTop);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.44, 8), mats.woodCedar);
  tableLeg.position.set(-0.98, 0.24, 0.72);
  group.add(tableLeg);

  const drink1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.045, 0.18, 8),
    makeMat({ color: 0xff8c32, roughness: 0.22 })
  );
  drink1.position.set(-1.1, 0.6, 0.72);
  group.add(drink1);
  const drink2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.045, 0.18, 8),
    makeMat({ color: 0x3bd4a8, roughness: 0.22 })
  );
  drink2.position.set(-0.86, 0.6, 0.76);
  group.add(drink2);

  // Colorful beach ball
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    makeMat({ color: 0xf7cf3b, roughness: 0.35 })
  );
  ball.position.set(1.05, 0.34, 1.72);
  group.add(ball);

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 0.5, 0.2], size: [4.8, 1.0, 2.4] }],
    selectionRadius: 3.6,
  };
}

/** 9. Cankurtaran Kulesi (4 × 4 m elevated coastal lifeguard tower with lifebuoy & surfboard) */
function buildLifeguardTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const whitePaint = makeMat({ color: 0xf7f8fa, roughness: 0.62 });
  const rescueRed = makeMat({ color: 0xd9302c, roughness: 0.48 });
  const surfYellow = makeMat({ color: 0xf6c934, roughness: 0.32 });

  // 4 splayed support stilts + cross braces
  for (const sx of [-1.25, 1.25]) {
    for (const sz of [-1.25, 1.25]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.65, 0.18), whitePaint);
      leg.position.set(sx, 1.32, sz);
      leg.rotation.z = sx > 0 ? 0.08 : -0.08;
      leg.rotation.x = sz > 0 ? -0.08 : 0.08;
      group.add(leg);
    }
  }

  // Elevated observation platform deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 3.2), whitePaint);
  deck.position.y = 2.65;
  group.add(deck);

  // Slatted lifeguard hut cabin
  const hut = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.0, 2.0), whitePaint);
  hut.position.set(0, 3.74, -0.25);
  group.add(hut);

  // Red accent band & window cutout
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.36, 2.06), rescueRed);
  stripe.position.set(0, 3.15, -0.25);
  group.add(stripe);

  const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.12), mats.modernGlass);
  windowGlass.position.set(0, 4.05, 0.76);
  group.add(windowGlass);

  // Slanted sunshade roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.16, 2.95), rescueRed);
  roof.position.set(0, 4.92, -0.08);
  roof.rotation.x = -0.14;
  group.add(roof);

  // Slanted wooden ladder up the front
  for (const lx of [-0.34, 0.34]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 0.08), mats.woodCedar);
    rail.position.set(lx, 1.35, 1.78);
    rail.rotation.x = -0.28;
    group.add(rail);
  }
  for (let r = 0; r < 6; r++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.07), mats.woodCedar);
    rung.position.set(0, 0.4 + r * 0.42, 2.05 - r * 0.12);
    group.add(rung);
  }

  // Iconic red-and-white lifebuoy ring hung on side
  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.11, 8, 18), rescueRed);
  buoy.rotation.y = Math.PI / 2;
  buoy.position.set(1.14, 3.55, 0.1);
  group.add(buoy);

  // Yellow rescue surfboard leaning against stilt
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.15, 0.08), surfYellow);
  board.position.set(-1.52, 1.05, 0.85);
  board.rotation.z = -0.22;
  group.add(board);

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 2.4, 0], size: [3.1, 4.8, 3.1] }],
    selectionRadius: 3.1,
  };
}

/** 10. Sahil Tiki Bar & Dondurmacı (6.5 × 5 m thatched beach bar with stools & drinks) */
function buildBeachBarTiki(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const thatchMat = makeMat({ color: 0xc9a04e, roughness: 0.94 });
  const bambooMat = makeMat({ color: 0xb07d42, roughness: 0.78 });
  const turquoiseMat = makeMat({ color: 0x1fb2c9, roughness: 0.42 });

  // Sand & timber floor pad
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.14, 4.6), mats.woodCedar);
  floor.position.y = 0.07;
  group.add(floor);

  // Bamboo front bar counter + glossy counter top
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.12, 1.25), bambooMat);
  counter.position.set(0, 0.68, 0.55);
  group.add(counter);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.1, 1.52), mats.stuccoCream);
  counterTop.position.set(0, 1.26, 0.55);
  group.add(counterTop);

  // Back shelf cabinet + turquoise beach menu sign
  const backBar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.85, 0.72), bambooMat);
  backBar.position.set(0, 1.06, -1.35);
  group.add(backBar);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.58, 0.1), turquoiseMat);
  sign.position.set(0, 2.75, 1.26);
  group.add(sign);

  // 4 corner bamboo pillars supporting conical palm-thatch roof
  for (const sx of [-2.15, 2.15]) {
    for (const sz of [-1.45, 1.15]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 3.05, 8), mats.woodCedar);
      post.position.set(sx, 1.62, sz);
      group.add(post);
    }
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.85, 1.85, 8), thatchMat);
  roof.scale.set(1.15, 1, 0.92);
  roof.position.set(0, 3.92, -0.15);
  group.add(roof);

  // Warm string light bulbs along front eaves
  for (let i = -3; i <= 3; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mats.lampGlass);
    bulb.position.set(i * 0.62, 2.92, 1.38);
    group.add(bulb);
  }

  // 4 wooden beach bar stools
  for (let i = 0; i < 4; i++) {
    const sx = -1.65 + i * 1.1;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.76, 8), mats.woodCedar);
    stem.position.set(sx, 0.45, 1.72);
    group.add(stem);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10), mats.stuccoCream);
    seat.position.set(sx, 0.85, 1.72);
    group.add(seat);
  }

  // Colorful summer drinks on counter
  const drinkColors = [0xff6347, 0xffd23f, 0x2ec4b6, 0xff70a6];
  drinkColors.forEach((col, i) => {
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.045, 0.2, 8),
      makeMat({ color: col, roughness: 0.22 })
    );
    glass.position.set(-1.35 + i * 0.9, 1.41, 0.65);
    group.add(glass);
  });

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 1.6, -0.1], size: [5.4, 3.2, 3.8] }],
    selectionRadius: 4.1,
  };
}

/** 11. Yelkenli Tekne & Yat (8.5 × 3.5 m coastal white-navy sailboat with billowing sails) */
function buildSailboatDocked(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const hullWhite = makeMat({ color: 0xf7f9fc, roughness: 0.28, metalness: 0.08 });
  const hullNavy = makeMat({ color: 0x163d6b, roughness: 0.34, metalness: 0.1 });
  const sailCream = makeMat({ color: 0xfbf5e6, roughness: 0.78, side: THREE.DoubleSide });
  const pennantRed = makeMat({ color: 0xe03e36, roughness: 0.65, side: THREE.DoubleSide });

  const boatRig = new THREE.Group();
  boatRig.position.y = 0.2;
  boatRig.userData.bobY = true;
  boatRig.userData.bobBaseY = 0.2;
  boatRig.userData.bobPhase = 1.2;

  // Sculpted yacht hull (main body + tapered bow cone)
  const hullBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.95, 5.4), hullWhite);
  hullBody.position.set(0, 0.48, -0.5);
  boatRig.add(hullBody);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.42, 2.75, 4), hullWhite);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(0.84, 1, 0.48);
  bow.position.set(0, 0.56, 3.45);
  boatRig.add(bow);

  // Navy waterline trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.2, 5.55), hullNavy);
  trim.position.set(0, 0.22, -0.5);
  boatRig.add(trim);

  // Teak deck & low cabin house
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.08, 5.1), mats.woodCedar);
  deck.position.set(0, 0.98, -0.45);
  boatRig.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.62, 2.25), hullWhite);
  cabin.position.set(0, 1.32, 0.2);
  boatRig.add(cabin);
  const cabinWin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.26, 1.4), mats.modernGlass);
  cabinWin.position.set(0, 1.38, 0.25);
  boatRig.add(cabinWin);

  // Aluminum mast & horizontal boom
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 7.6, 10), mats.carChrome);
  mast.position.set(0, 4.75, 0.45);
  boatRig.add(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), mats.carChrome);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 2.15, -1.2);
  boatRig.add(boom);

  // Triangular Mainsail + Foresail (Jib)
  const mainSailShape = new THREE.Shape();
  mainSailShape.moveTo(0, 0);
  mainSailShape.lineTo(0, 6.2);
  mainSailShape.lineTo(-3.2, 0.2);
  mainSailShape.closePath();
  const mainSail = new THREE.Mesh(new THREE.ShapeGeometry(mainSailShape), sailCream);
  mainSail.rotation.y = Math.PI / 2 + 0.12;
  mainSail.position.set(0.06, 2.2, 0.4);
  boatRig.add(mainSail);

  const jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0);
  jibShape.lineTo(0, 5.4);
  jibShape.lineTo(2.9, 0.0);
  jibShape.closePath();
  const jibSail = new THREE.Mesh(new THREE.ShapeGeometry(jibShape), sailCream);
  jibSail.rotation.y = Math.PI / 2 - 0.14;
  jibSail.position.set(-0.06, 2.1, 0.58);
  boatRig.add(jibSail);

  // Red masthead pennant flag
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.85), pennantRed);
  flag.position.set(0, 8.45, 0.02);
  boatRig.add(flag);

  group.add(boatRig);
  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 1.0, 0.2], size: [2.6, 2.0, 7.8] }],
    selectionRadius: 4.8,
  };
}

/** 12. Sörf & Kano İstasyonu (5 × 2.8 m colorful surfboard rack & sea kayak) */
function buildSurfboardRack(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Wooden A-frame beach rack
  for (const sx of [-1.45, 1.45]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.15), mats.woodCedar);
    base.position.set(sx, 0.06, -0.35);
    group.add(base);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.55, 0.12), mats.woodCedar);
    post.position.set(sx, 0.82, -0.58);
    group.add(post);
  }
  const railMid = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.1, 0.1), mats.woodCedar);
  railMid.position.set(0, 1.12, -0.52);
  group.add(railMid);

  // 4 brightly painted surfboards upright in rack
  const boardColors = [0xff5e4d, 0x1fc1d6, 0xf7c936, 0x2065b0];
  boardColors.forEach((col, i) => {
    const bx = -1.05 + i * 0.7;
    const board = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 1.65, 6, 10),
      makeMat({ color: col, roughness: 0.26, metalness: 0.08 })
    );
    board.scale.set(1.0, 1.0, 0.22);
    board.position.set(bx, 1.06, -0.35);
    board.rotation.x = -0.18;
    group.add(board);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.75, 0.12),
      makeMat({ color: 0xffffff, roughness: 0.3 })
    );
    stripe.position.set(bx, 1.06, -0.34);
    stripe.rotation.x = -0.18;
    group.add(stripe);
  });

  // Bright yellow sea kayak resting in front on the sand + paddle
  const kayak = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36, 2.65, 8, 12),
    makeMat({ color: 0xf7b924, roughness: 0.32 })
  );
  kayak.rotation.z = Math.PI / 2;
  kayak.scale.set(0.68, 1.0, 1.0);
  kayak.position.set(0.15, 0.24, 0.78);
  group.add(kayak);

  const cockpit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12),
    mats.wroughtIron
  );
  cockpit.scale.set(1.5, 1, 0.85);
  cockpit.position.set(0.15, 0.44, 0.78);
  group.add(cockpit);

  const paddleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), mats.carChrome);
  paddleShaft.rotation.z = Math.PI / 2;
  paddleShaft.rotation.y = 0.22;
  paddleShaft.position.set(0.15, 0.52, 0.82);
  group.add(paddleShaft);

  addShadows(group);
  return {
    group,
    colliders: [{ offset: [0, 0.9, 0.1], size: [3.6, 1.8, 2.1] }],
    selectionRadius: 2.8,
  };
}

export function buildSummerAsset(
  type: SummerPlaceableType,
  mats: MaterialLibrary
): BuiltAsset {
  switch (type) {
    case 'seaWaterPatch':
      return buildSeaWaterPatch();
    case 'sandyBeachShore':
      return buildSandyBeachShore(mats);
    case 'beachVolleyball':
      return buildBeachVolleyball(mats);
    case 'summerVilla':
      return buildSummerVilla(mats);
    case 'beachBungalow':
      return buildBeachBungalow(mats);
    case 'swimmingPool':
      return buildSwimmingPool(mats);
    case 'woodenPier':
      return buildWoodenPier(mats);
    case 'beachCabanaSet':
      return buildBeachCabanaSet(mats);
    case 'lifeguardTower':
      return buildLifeguardTower(mats);
    case 'beachBarTiki':
      return buildBeachBarTiki(mats);
    case 'sailboatDocked':
      return buildSailboatDocked(mats);
    case 'surfboardRack':
      return buildSurfboardRack(mats);
  }
}
