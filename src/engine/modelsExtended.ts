import * as THREE from 'three';
import { PlaceableType } from '../types/sandbox';
import { BuiltAsset, MaterialLibrary } from './models';

function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

function addContactShadow(group: THREE.Group, mat: THREE.Material, rx: number, rz: number) {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.receiveShadow = false;
  shadow.castShadow = false;
  shadow.userData.ignoreRaycast = true;
  group.add(shadow);
}

// ==================== BİNALAR & EVLER ====================

/** Akdeniz Taş Ev (2 Katlı, Kiremit Çatılı, Panjurlu) */
function buildMedVilla(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 8.0;
  const D = 6.8;

  // Ground stone floor + upper warm cream stucco floor
  const lower = new THREE.Mesh(new THREE.BoxGeometry(W, 3.1, D), mats.travertine);
  lower.position.y = 1.55;
  group.add(lower);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 3.0, D - 0.15), mats.stuccoCream);
  upper.position.y = 4.6;
  group.add(upper);

  // Overhanging gabled terracotta tiled roof
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-W / 2 - 0.5, 0);
  roofShape.lineTo(0, 2.3);
  roofShape.lineTo(W / 2 + 0.5, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: D + 0.8, bevelEnabled: false });
  roofGeo.translate(0, 6.08, -(D + 0.8) / 2);
  const roof = new THREE.Mesh(roofGeo, mats.roofTile);
  group.add(roof);

  // Stone chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.2, 0.75), mats.travertineDark);
  chimney.position.set(2.3, 7.3, -1.5);
  group.add(chimney);

  // Wooden front entrance + small stone steps
  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 1.0), mats.travertineDark);
  steps.position.set(0, 0.15, D / 2 + 0.45);
  group.add(steps);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.18), mats.woodCedar);
  door.position.set(0, 1.35, D / 2 + 0.04);
  group.add(door);

  // Upper wooden balcony & wrought-iron rail
  const balc = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 1.2), mats.woodCedar);
  balc.position.set(0, 3.22, D / 2 + 0.56);
  group.add(balc);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.88, 0.08), mats.wroughtIron);
  rail.position.set(0, 3.74, D / 2 + 1.1);
  group.add(rail);

  // Windows with Mediterranean Aegean blue shutters
  const winPositions: [number, number, number][] = [
    [-2.4, 1.65, D / 2 + 0.06],
    [2.4, 1.65, D / 2 + 0.06],
    [-2.4, 4.65, D / 2 + 0.02],
    [0, 4.65, D / 2 + 0.02],
    [2.4, 4.65, D / 2 + 0.02],
  ];
  for (const [wx, wy, wz] of winPositions) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.12), mats.windowGlass);
    win.position.set(wx, wy, wz);
    group.add(win);
    for (const s of [-0.72, 0.72]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.48, 0.08), mats.awningBlue);
      shutter.position.set(wx + s, wy, wz + 0.04);
      group.add(shutter);
    }
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 4.8, 4.2);

  return {
    group,
    colliders: [{ offset: [0, 4.0, 0], size: [W + 0.4, 8.0, D + 0.5] }],
    selectionRadius: 5.5,
  };
}

/** Bahçeli Köy Evi (Tek Katlı Sundurmalı Ev) */
function buildCottageHouse(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 6.4;
  const D = 5.4;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, 3.0, D), mats.stuccoWarm);
  walls.position.y = 1.5;
  group.add(walls);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.5, D + 0.2), mats.travertineDark);
  plinth.position.y = 0.25;
  group.add(plinth);

  // Hip-style terracotta roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.2, 4), mats.roofTile);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.1;
  group.add(roof);

  // Front wooden veranda porch
  const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.26, 1.7), mats.woodCedar);
  porchDeck.position.set(0, 0.13, D / 2 + 0.85);
  group.add(porchDeck);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.14, 1.9), mats.roofTile);
  porchRoof.position.set(0, 2.7, D / 2 + 0.9);
  porchRoof.rotation.x = 0.22;
  group.add(porchRoof);

  for (const px of [-2.8, -0.95, 0.95, 2.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), mats.woodCedar);
    post.position.set(px, 1.4, D / 2 + 1.55);
    group.add(post);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.1, 0.16), mats.woodCedar);
  door.position.set(0, 1.25, D / 2 + 0.04);
  group.add(door);

  for (const wx of [-2.0, 2.0]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.15, 0.14), mats.windowGlass);
    win.position.set(wx, 1.65, D / 2 + 0.05);
    group.add(win);
    const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.26, 0.3), mats.terracottaPot);
    flowerBox.position.set(wx, 0.95, D / 2 + 0.2);
    group.add(flowerBox);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mats.flowerRed);
    bloom.scale.set(2.1, 0.7, 0.8);
    bloom.position.set(wx, 1.16, D / 2 + 0.2);
    group.add(bloom);
  }

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.65), mats.stuccoTerracotta);
  chimney.position.set(-1.7, 4.6, -1.0);
  group.add(chimney);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 4.2, 4.2);

  return {
    group,
    colliders: [{ offset: [0, 2.4, 0.4], size: [W + 0.3, 4.8, D + 1.8] }],
    selectionRadius: 4.5,
  };
}

/** Modern Cam Plaza (7 Katlı Ofis / Rezidans Kulesi) */
function buildModernTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 10.6;
  const D = 10.6;
  const H = 24.5;

  // Lobby podium
  const podium = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 3.6, D + 0.8), mats.travertineDark);
  podium.position.y = 1.8;
  group.add(podium);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 2.4), mats.wroughtIron);
  canopy.position.set(0, 3.4, D / 2 + 1.4);
  group.add(canopy);

  // Glass curtain-wall core
  const glassCore = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, H - 3.6, D - 0.2), mats.modernGlass);
  glassCore.position.y = 3.6 + (H - 3.6) / 2;
  group.add(glassCore);

  // Horizontal steel/stone floor slab fins + vertical corner piers
  for (let i = 0; i <= 6; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.35, 0.28, D + 0.35), mats.stuccoCream);
    slab.position.y = 3.6 + i * 3.1;
    group.add(slab);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.85, H, 0.85), mats.stuccoCream);
      corner.position.set(sx * (W / 2 - 0.1), H / 2, sz * (D / 2 - 0.1));
      group.add(corner);
    }
  }

  // Rooftop mechanical crown & helipad rim
  const crown = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.1, 7.2), mats.wroughtIron);
  crown.position.y = H + 0.9;
  group.add(crown);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 6.4, 6.4);

  return {
    group,
    colliders: [{ offset: [0, H / 2, 0], size: [W + 0.8, H, D + 0.8] }],
    selectionRadius: 7.4,
  };
}

/** Meydan Saat Kulesi */
function buildClockTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Stepped square base
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 4.2), mats.travertineDark);
  base1.position.y = 0.45;
  group.add(base1);

  const base2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.4), mats.travertine);
  base2.position.y = 2.5;
  group.add(base2);

  // Main shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.8, 8.0, 2.8), mats.travertine);
  shaft.position.y = 8.1;
  group.add(shaft);

  // Clock belfry chamber
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(3.15, 2.9, 3.15), mats.stuccoCream);
  chamber.position.y = 13.4;
  group.add(chamber);

  // 4 Luminous Clock Faces
  const dialGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.12, 24);
  const dirs: [number, number, number, number][] = [
    [0, 13.4, 1.6, Math.PI / 2],
    [0, 13.4, -1.6, -Math.PI / 2],
    [1.6, 13.4, 0, Math.PI / 2],
    [-1.6, 13.4, 0, -Math.PI / 2],
  ];
  dirs.forEach(([x, y, z], idx) => {
    const dial = new THREE.Mesh(dialGeo, mats.clockDial);
    dial.position.set(x, y, z);
    if (idx < 2) {
      dial.rotation.x = Math.PI / 2;
    } else {
      dial.rotation.z = Math.PI / 2;
    }
    group.add(dial);
  });

  // Copper/bronze cupola spire
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.bronzeGold);
  dome.position.y = 14.85;
  group.add(dome);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.24, 2.4, 10), mats.bronzeGold);
  spire.position.y = 17.2;
  group.add(spire);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.8, 2.8);

  return {
    group,
    colliders: [{ offset: [0, 8.5, 0], size: [4.2, 17, 4.2] }],
    selectionRadius: 3.1,
  };
}

// ==================== ÇARŞI & TİCARET ====================

/** Pazar Tezgahı (Gölgelikli, Meyve/Baharat Kasalı) */
function buildBazaarStall(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 3.5;
  const D = 2.0;

  // Wooden counter body
  const counter = new THREE.Mesh(new THREE.BoxGeometry(W, 0.95, 1.1), mats.woodCedar);
  counter.position.set(0, 0.475, 0.25);
  group.add(counter);

  // 4 Wooden awning posts
  for (const px of [-W / 2 + 0.12, W / 2 - 0.12]) {
    for (const pz of [-0.75, 0.85]) {
      const h = pz > 0 ? 2.55 : 2.95;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 8), mats.woodCedar);
      post.position.set(px, h / 2, pz);
      group.add(post);
    }
  }

  // Sloped striped bazaar canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.08, D + 0.6), mats.awningBlue);
  canopy.position.set(0, 2.75, 0.05);
  canopy.rotation.x = 0.22;
  group.add(canopy);

  // Display produce crates (spices, citrus, olives)
  const crateColors = [mats.flowerRed, mats.flowerGold, mats.palmFrondLight];
  for (let i = 0; i < 3; i++) {
    const cx = -1.05 + i * 1.05;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 0.72), mats.woodCedar);
    crate.position.set(cx, 1.08, 0.28);
    group.add(crate);

    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), crateColors[i]);
    mound.scale.set(1.25, 0.55, 1.05);
    mound.position.set(cx, 1.24, 0.28);
    group.add(mound);
  }

  // Hanging lantern under canopy
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mats.lampGlass);
  bulb.position.set(0, 2.42, 0.25);
  group.add(bulb);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.1, 1.4);

  return {
    group,
    colliders: [{ offset: [0, 1.35, 0.1], size: [W + 0.2, 2.7, D + 0.2] }],
    selectionRadius: 2.3,
  };
}

/** Tarihi Kapalı Çarşı Kemeri / Han Geçidi (İçi Yürünür!) */
function buildCoveredBazaar(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const totalW = 10.2;
  const depth = 5.4;
  const openR = 2.4;

  // Vaulted stone arcade front/back facade via ExtrudeGeometry
  const shape = new THREE.Shape();
  shape.moveTo(-totalW / 2, 0);
  shape.lineTo(-openR, 0);
  shape.lineTo(-openR, 3.0);
  shape.absarc(0, 3.0, openR, Math.PI, 0, true);
  shape.lineTo(openR, 0);
  shape.lineTo(totalW / 2, 0);
  shape.lineTo(totalW / 2, 6.2);
  shape.lineTo(-totalW / 2, 6.2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 });
  geo.translate(0, 0, -depth / 2);
  const body = new THREE.Mesh(geo, mats.stuccoWarm);
  group.add(body);

  // Twin side shop vitrines facing inward & outward
  for (const sx of [-3.75, 3.75]) {
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.2), mats.shopGlass);
    vitrine.position.set(sx, 1.4, depth / 2 + 0.05);
    group.add(vitrine);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.1), mats.awningFabric);
    awning.position.set(sx, 2.65, depth / 2 + 0.5);
    awning.rotation.x = 0.26;
    group.add(awning);
  }

  // Lead-coated Ottoman/Mediterranean rooftop domes
  const mainDome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.travertineDark);
  mainDome.position.y = 6.2;
  group.add(mainDome);

  for (const sx of [-3.6, 3.6]) {
    const sideDome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.travertineDark);
    sideDome.position.set(sx, 6.2, 0);
    group.add(sideDome);
  }

  // Hanging brass lantern inside vaulted passage
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.42, 8), mats.lampGlass);
  lantern.position.set(0, 4.7, 0);
  group.add(lantern);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 5.8, 3.4);

  const pierW = totalW / 2 - openR;
  const pierX = (totalW / 2 + openR) / 2;
  return {
    group,
    colliders: [
      { offset: [-pierX, 3.1, 0], size: [pierW + 0.2, 6.2, depth + 0.2] },
      { offset: [pierX, 3.1, 0], size: [pierW + 0.2, 6.2, depth + 0.2] },
      { offset: [0, 5.9, 0], size: [totalW + 0.2, 1.6, depth + 0.2] },
    ],
    selectionRadius: 6.0,
  };
}

/** Sokak Kafesi (Şemsiyeli Masalar ve Servis Barı) */
function buildStreetCafe(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Raised wooden terrace platform
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.14, 5.0), mats.woodCedar);
  deck.position.y = 0.07;
  group.add(deck);

  // Espresso / Service Kiosk bar at back
  const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 1.0), mats.stuccoCream);
  bar.position.set(0, 0.68, -1.75);
  group.add(bar);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 1.15), mats.woodCedar);
  barTop.position.set(0, 1.26, -1.75);
  group.add(barTop);

  // Two cafe umbrella tables + 4 bistro chairs
  for (const tx of [-1.65, 1.65]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.55, 8), mats.wroughtIron);
    pole.position.set(tx, 1.38, 0.65);
    group.add(pole);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 16), mats.stuccoCream);
    tableTop.position.set(tx, 0.88, 0.65);
    group.add(tableTop);

    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.45, 8), tx < 0 ? mats.awningFabric : mats.awningBlue);
    umbrella.position.set(tx, 2.65, 0.65);
    group.add(umbrella);

    for (const cx of [-0.72, 0.72]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), mats.woodCedar);
      seat.position.set(tx + cx, 0.56, 0.65);
      group.add(seat);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 6), mats.wroughtIron);
      leg.position.set(tx + cx, 0.33, 0.65);
      group.add(leg);
    }
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 3.6, 2.9);

  return {
    group,
    colliders: [
      { offset: [0, 0.75, -1.75], size: [5.4, 1.5, 1.2] },
      { offset: [-1.65, 0.7, 0.65], size: [1.5, 1.4, 1.3] },
      { offset: [1.65, 0.7, 0.65], size: [1.5, 1.4, 1.3] },
    ],
    selectionRadius: 4.1,
  };
}

/** Taş Fırın & Pastane */
function buildBakeryOven(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 6.0;
  const D = 5.4;

  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 3.6, D), mats.stuccoCream);
  base.position.y = 1.8;
  group.add(base);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.35, D + 0.5), mats.roofTile);
  roof.position.y = 3.72;
  group.add(roof);

  // Domed brick wood-fired oven chimney at corner
  const ovenDome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.stuccoTerracotta);
  ovenDome.position.set(-1.5, 3.85, -1.0);
  group.add(ovenDome);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.3, 10), mats.stuccoTerracotta);
  stack.position.set(-1.5, 5.4, -1.0);
  group.add(stack);

  // Warm glowing bakery pastry display window & awning
  const win = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.85, 0.2), mats.shopGlass);
  win.position.set(-0.9, 1.5, D / 2 + 0.06);
  group.add(win);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.35, 0.18), mats.woodCedar);
  door.position.set(1.85, 1.18, D / 2 + 0.05);
  group.add(door);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.08, 1.5), mats.awningFabric);
  awning.position.set(0, 2.75, D / 2 + 0.72);
  awning.rotation.x = 0.28;
  group.add(awning);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 3.6, 3.3);

  return {
    group,
    colliders: [{ offset: [0, 2.1, 0], size: [W + 0.3, 4.2, D + 0.4] }],
    selectionRadius: 4.3,
  };
}

// ==================== ANTİK KENT & ESERLER ====================

/** Antik Su Kemeri (İki Katlı Kemerli Modül - Altı Geçilebilir!) */
function buildAqueductSpan(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const totalW = 12.0;
  const depth = 2.4;

  // Lower tier with 2 wide Roman arches (open underneath!)
  const shape = new THREE.Shape();
  shape.moveTo(-6, 0);
  shape.lineTo(-4.8, 0);
  shape.lineTo(-4.8, 3.4);
  shape.absarc(-3.0, 3.4, 1.8, Math.PI, 0, true);
  shape.lineTo(-1.2, 0);
  shape.lineTo(1.2, 0);
  shape.lineTo(1.2, 3.4);
  shape.absarc(3.0, 3.4, 1.8, Math.PI, 0, true);
  shape.lineTo(4.8, 0);
  shape.lineTo(6, 0);
  shape.lineTo(6, 6.2);
  shape.lineTo(-6, 6.2);
  shape.closePath();

  const lowerGeo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
  lowerGeo.translate(0, 0, -depth / 2);
  group.add(new THREE.Mesh(lowerGeo, mats.travertine));

  // Cornice band between tiers
  const midBand = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.4, 0.4, depth + 0.4), mats.travertineDark);
  midBand.position.y = 6.35;
  group.add(midBand);

  // Upper tier with 4 smaller arches + water channel trough
  const upperShape = new THREE.Shape();
  upperShape.moveTo(-6, 0);
  for (let i = 0; i < 4; i++) {
    const cx = -4.5 + i * 3.0;
    upperShape.lineTo(cx - 0.95, 0);
    upperShape.lineTo(cx - 0.95, 1.4);
    upperShape.absarc(cx, 1.4, 0.95, Math.PI, 0, true);
    upperShape.lineTo(cx + 0.95, 0);
  }
  upperShape.lineTo(6, 0);
  upperShape.lineTo(6, 3.2);
  upperShape.lineTo(-6, 3.2);
  upperShape.closePath();

  const upperGeo = new THREE.ExtrudeGeometry(upperShape, { depth: depth - 0.4, bevelEnabled: false, curveSegments: 12 });
  upperGeo.translate(0, 6.5, -(depth - 0.4) / 2);
  group.add(new THREE.Mesh(upperGeo, mats.travertine));

  // Top water channel coping
  const topCoping = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.3, 0.35, depth), mats.travertineDark);
  topCoping.position.y = 9.85;
  group.add(topCoping);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 6.4, 1.9);

  return {
    group,
    colliders: [
      { offset: [-5.4, 3.1, 0], size: [1.3, 6.2, depth + 0.3] },
      { offset: [0, 3.1, 0], size: [2.4, 6.2, depth + 0.3] },
      { offset: [5.4, 3.1, 0], size: [1.3, 6.2, depth + 0.3] },
      { offset: [0, 7.8, 0], size: [totalW + 0.2, 4.0, depth + 0.3] },
    ],
    selectionRadius: 6.4,
  };
}

/** Antik Sur Duvarı (Mazgallı Kesme Taş Duvar) */
function buildAncientWall(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 10.0;
  const H = 4.8;
  const D = 2.0;

  // Battered stone base plinth
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.9, D + 0.4), mats.travertineDark);
  base.position.y = 0.45;
  group.add(base);

  // Main ashlar stone wall
  const mainWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats.travertine);
  mainWall.position.y = 0.9 + H / 2;
  group.add(mainWall);

  // Battlement walkway & merlons (mazgallar)
  const coping = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.26, D + 0.3), mats.travertineDark);
  coping.position.y = 5.75;
  group.add(coping);

  for (let i = -4; i <= 4; i += 2) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 0.55), mats.travertine);
    merlon.position.set(i, 6.32, D / 2 - 0.22);
    group.add(merlon);
  }

  // Structural buttress pilasters
  for (const bx of [-4.4, 0, 4.4]) {
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.3, D + 0.5), mats.travertineDark);
    buttress.position.set(bx, 2.75, 0);
    group.add(buttress);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 5.4, 1.7);

  return {
    group,
    colliders: [{ offset: [0, 3.4, 0], size: [W + 0.2, 6.8, D + 0.4] }],
    selectionRadius: 5.5,
  };
}

/** Antik Kent Kapısı (Çift Kuleli Kemerli Giriş - Altı Geçilebilir!) */
function buildAncientGate(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Flanking twin bastion towers
  for (const sx of [-4.4, 4.4]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.6, 4.2), mats.travertine);
    tower.position.set(sx, 4.3, 0);
    group.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 4.6), mats.travertineDark);
    crown.position.set(sx, 8.75, 0);
    group.add(crown);

    for (const mx of [-1.2, 0, 1.2]) {
      const mFront = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.5), mats.travertine);
      mFront.position.set(sx + mx, 9.35, 1.9);
      group.add(mFront);
      const mBack = mFront.clone();
      mBack.position.z = -1.9;
      group.add(mBack);
    }
  }

  // Central arched bridge connecting the towers
  const bridgeShape = new THREE.Shape();
  bridgeShape.moveTo(-2.7, 0);
  bridgeShape.lineTo(-2.2, 0);
  bridgeShape.lineTo(-2.2, 3.2);
  bridgeShape.absarc(0, 3.2, 2.2, Math.PI, 0, true);
  bridgeShape.lineTo(2.2, 0);
  bridgeShape.lineTo(2.7, 0);
  bridgeShape.lineTo(2.7, 7.2);
  bridgeShape.lineTo(-2.7, 7.2);
  bridgeShape.closePath();

  const bGeo = new THREE.ExtrudeGeometry(bridgeShape, { depth: 3.2, bevelEnabled: false, curveSegments: 20 });
  bGeo.translate(0, 0, -1.6);
  group.add(new THREE.Mesh(bGeo, mats.travertine));

  // Decorative iron portcullis teeth raised at arch top
  const portcullis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 0.25), mats.wroughtIron);
  portcullis.position.set(0, 5.2, 0);
  group.add(portcullis);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 6.6, 2.8);

  return {
    group,
    colliders: [
      { offset: [-4.4, 4.5, 0], size: [3.6, 9.0, 4.4] },
      { offset: [4.4, 4.5, 0], size: [3.6, 9.0, 4.4] },
      { offset: [0, 6.4, 0], size: [5.6, 1.8, 3.4] },
    ],
    selectionRadius: 6.8,
  };
}

/** Antik Tapınak Harabesi (Basamaklı Podyum, 4 Sütun, Kırık Alınlık) */
function buildTempleRuins(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // 3-step crepidoma stone podium
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.35, 7.0), mats.travertineDark);
  step1.position.y = 0.175;
  group.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.35, 6.2), mats.travertine);
  step2.position.y = 0.525;
  group.add(step2);
  const step3 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.35, 5.4), mats.travertineDark);
  step3.position.y = 0.875;
  group.add(step3);

  // 4 Standing fluted columns + 1 broken column stub
  const colCoords: [number, number, number][] = [
    [-3.0, 4.8, 1.9],
    [-1.0, 4.8, 1.9],
    [1.0, 4.8, 1.9],
    [3.0, 2.3, 1.9], // broken front right
    [-3.0, 4.8, -1.9],
    [3.0, 3.4, -1.9], // broken back right
  ];
  for (const [cx, h, cz] of colCoords) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, h, 14), mats.travertine);
    shaft.position.set(cx, 1.05 + h / 2, cz);
    group.add(shaft);
    if (h > 4.2) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.95), mats.travertineDark);
      cap.position.set(cx, 1.05 + h + 0.12, cz);
      group.add(cap);
    }
  }

  // Surviving architrave beam & partial triangular pediment over intact columns
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.65, 1.15), mats.travertine);
  beam.position.set(-1.1, 6.3, 1.9);
  group.add(beam);

  const pedShape = new THREE.Shape();
  pedShape.moveTo(-2.8, 0);
  pedShape.lineTo(0.4, 1.45);
  pedShape.lineTo(2.4, 0.55);
  pedShape.lineTo(2.4, 0);
  pedShape.closePath();
  const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 0.95, bevelEnabled: false });
  pedGeo.translate(-1.1, 6.62, 1.42);
  group.add(new THREE.Mesh(pedGeo, mats.travertineDark));

  // Fallen column drum resting on podium
  const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 1.5, 12), mats.travertine);
  fallen.rotation.z = Math.PI / 2;
  fallen.rotation.y = 0.45;
  fallen.position.set(1.2, 1.4, -0.4);
  group.add(fallen);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 5.2, 4.0);

  return {
    group,
    colliders: [
      { offset: [0, 0.55, 0], size: [9.0, 1.1, 6.8] },
      { offset: [-1.1, 3.6, 1.9], size: [5.4, 5.6, 1.2] },
    ],
    selectionRadius: 5.5,
  };
}

/** Dikilitaş & Antik Eser Anıtı */
function buildObeliskMonument(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 3.2), mats.travertineDark);
  step1.position.y = 0.2;
  group.add(step1);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.65, 2.1), mats.travertine);
  pedestal.position.y = 1.22;
  group.add(pedestal);

  // Bronze corner lion-paw plinth blocks
  for (const sx of [-0.68, 0.68]) {
    for (const sz of [-0.68, 0.68]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), mats.bronzeGold);
      foot.position.set(sx, 2.2, sz);
      group.add(foot);
    }
  }

  // Tapered monolithic obelisk shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.78, 6.6, 4), mats.travertineDark);
  shaft.rotation.y = Math.PI / 4;
  shaft.position.y = 2.35 + 3.3;
  group.add(shaft);

  // Golden gilded pyramidion apex
  const apex = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.95, 4), mats.bronzeGold);
  apex.rotation.y = Math.PI / 4;
  apex.position.y = 9.42;
  group.add(apex);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.1, 2.1);

  return {
    group,
    colliders: [{ offset: [0, 4.8, 0], size: [3.0, 9.6, 3.0] }],
    selectionRadius: 2.3,
  };
}

/** Antik Amfora & Kalıntı Kümesi */
function buildAmphoraCluster(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Weather-worn stone slab base
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 1.9), mats.travertineDark);
  slab.position.y = 0.12;
  group.add(slab);

  // Broken fluted drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.95, 14), mats.travertine);
  drum.position.set(-0.55, 0.7, -0.2);
  group.add(drum);

  // LatheGeometry Mediterranean ceramic amphorae
  const ampProfile = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.14, 0.08),
    new THREE.Vector2(0.32, 0.48),
    new THREE.Vector2(0.28, 0.82),
    new THREE.Vector2(0.11, 1.02),
    new THREE.Vector2(0.14, 1.24),
    new THREE.Vector2(0.19, 1.3),
  ];
  const ampGeo = new THREE.LatheGeometry(ampProfile, 16);

  const a1 = new THREE.Mesh(ampGeo, mats.terracottaPot);
  a1.position.set(0.48, 0.24, 0.15);
  group.add(a1);

  const a2 = new THREE.Mesh(ampGeo, mats.terracottaPot);
  a2.scale.setScalar(0.8);
  a2.position.set(0.1, 0.24, 0.45);
  a2.rotation.z = 0.18;
  group.add(a2);

  const a3 = new THREE.Mesh(ampGeo, mats.terracottaPot);
  a3.scale.setScalar(0.72);
  a3.position.set(0.65, 0.42, -0.42);
  a3.rotation.x = 1.35;
  a3.rotation.z = 0.5;
  group.add(a3);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 1.5, 1.3);

  return {
    group,
    colliders: [{ offset: [0, 0.7, 0], size: [2.2, 1.4, 1.9] }],
    selectionRadius: 1.6,
  };
}

// ==================== EĞLENCE & MEYDAN ====================

/** Meydan Fıskiyesi */
function buildFountain(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Octagonal marble outer basin wall
  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.85, 0.72, 8), mats.travertine);
  outerWall.position.y = 0.36;
  group.add(outerWall);

  // Sparkling turquoise water basin surface
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.12, 8), mats.waterTurquoise);
  water.position.y = 0.68;
  group.add(water);

  // Center pedestal + 2 carved bowls + top finial jet
  const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.3, 12), mats.travertineDark);
  stem1.position.y = 1.15;
  group.add(stem1);

  const bowl1 = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 0.45, 0.38, 16), mats.travertine);
  bowl1.position.y = 1.85;
  group.add(bowl1);

  const water1 = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.08, 16), mats.waterTurquoise);
  water1.position.y = 2.02;
  group.add(water1);

  const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.9, 12), mats.travertineDark);
  stem2.position.y = 2.45;
  group.add(stem2);

  const bowl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.25, 0.28, 14), mats.travertine);
  bowl2.position.y = 2.92;
  group.add(bowl2);

  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 10), mats.waterTurquoise);
  jet.position.y = 3.45;
  group.add(jet);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 3.1, 3.1);

  return {
    group,
    colliders: [{ offset: [0, 1.4, 0], size: [5.4, 2.8, 5.4] }],
    selectionRadius: 3.1,
  };
}

/** Park Kameriyesi (6 Sütunlu Kubbeli Çardak - İçi Yürünebilir!) */
function buildGazebo(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const R = 2.4;

  // Raised hexagonal floor platform
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.25, R + 0.38, 0.28, 6), mats.travertine);
  floor.position.y = 0.14;
  group.add(floor);

  // 6 Slim columns around perimeter
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 10), mats.stuccoCream);
    col.position.set(Math.cos(a) * R, 1.82, Math.sin(a) * R);
    group.add(col);
  }

  // Hexagonal cornice ring + pitched terracotta roof + bronze finial
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.26, 6), mats.stuccoCream);
  ring.position.y = 3.45;
  group.add(ring);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(R + 0.55, 1.55, 6), mats.roofTile);
  roof.position.y = 4.35;
  group.add(roof);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.bronzeGold);
  finial.position.y = 5.18;
  group.add(finial);

  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.lampGlass);
  lantern.position.y = 3.22;
  group.add(lantern);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.9, 2.9);

  // Perimeter column colliders keep interior open to walk into!
  const colliders = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    colliders.push({
      offset: [Math.cos(a) * R, 1.75, Math.sin(a) * R] as [number, number, number],
      size: [0.35, 3.5, 0.35] as [number, number, number],
    });
  }
  return { group, colliders, selectionRadius: 3.0 };
}

/** Açık Hava Sahnesi / Konser Amfisi */
function buildBandstand(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const W = 9.0;
  const D = 5.6;

  // Raised wooden stage deck + front stairs
  const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.85, D), mats.woodCedar);
  deck.position.y = 0.425;
  group.add(deck);

  const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.8), mats.travertineDark);
  step.position.set(0, 0.21, D / 2 + 0.4);
  group.add(step);

  // Curved acoustic shell backdrop wall
  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 4.4, 0.45), mats.stuccoCream);
  backdrop.position.set(0, 3.0, -D / 2 + 0.3);
  group.add(backdrop);

  // Stage truss canopy roof
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.3), mats.wroughtIron);
  canopy.position.set(0, 5.25, 0);
  group.add(canopy);

  for (const sx of [-W / 2 + 0.35, W / 2 - 0.35]) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.4, 0.26), mats.wroughtIron);
    truss.position.set(sx, 3.0, D / 2 - 0.35);
    group.add(truss);

    // Stage speaker stacks
    const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.4, 0.65), mats.carTire);
    speaker.position.set(sx * 0.82, 1.55, D / 2 - 0.9);
    group.add(speaker);
  }

  // Row of glowing stage floodlights along top front bar
  for (let i = -3; i <= 3; i += 1.5) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), mats.lampGlass);
    light.position.set(i, 5.05, D / 2 - 0.1);
    group.add(light);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 5.0, 3.4);

  return {
    group,
    colliders: [
      { offset: [0, 0.42, 0], size: [W, 0.85, D] },
      { offset: [0, 3.0, -D / 2 + 0.3], size: [W, 4.6, 0.7] },
    ],
    selectionRadius: 5.5,
  };
}

/** Lunapark Atlıkarınca (Klasik Meydan Karuseli) */
function buildCarouselKiosk(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const R = 3.5;

  // Circular stage base
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.25, 0.45, 20), mats.woodCedar);
  deck.position.y = 0.225;
  group.add(deck);

  // Ornate central mirrored column
  const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 3.8, 14), mats.bronzeGold);
  centerCol.position.y = 2.35;
  group.add(centerCol);

  // Festive striped circus canopy & valance ring with glowing marquee bulbs
  const fascia = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.55, 20), mats.stuccoTerracotta);
  fascia.position.y = 4.35;
  group.add(fascia);

  const tent = new THREE.Mesh(new THREE.ConeGeometry(R + 0.2, 2.2, 16), mats.awningFabric);
  tent.position.y = 5.7;
  group.add(tent);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 8), mats.bronzeGold);
  spire.position.y = 7.1;
  group.add(spire);

  // 6 Brass poles with stylized carousel figures + glowing marquee lights
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * (R - 0.85);
    const pz = Math.sin(a) * (R - 0.85);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 8), mats.bronzeGold);
    pole.position.set(px, 2.35, pz);
    group.add(pole);

    // Stylized horse silhouette
    const figY = 1.45 + (i % 2) * 0.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.82), i % 2 === 0 ? mats.stuccoCream : mats.carBodyPaint);
    body.position.set(px, figY, pz);
    body.rotation.y = -a;
    group.add(body);

    // Warm marquee bulb on outer rim
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), mats.lampGlass);
    bulb.position.set(Math.cos(a) * (R + 0.16), 4.35, Math.sin(a) * (R + 0.16));
    group.add(bulb);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 4.0, 4.0);

  return {
    group,
    colliders: [{ offset: [0, 3.0, 0], size: [R * 2, 6.0, R * 2] }],
    selectionRadius: 4.1,
  };
}

/** Çocuk Parkı Oyun Kulesi ve Kaydırak */
function buildPlaygroundSlide(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Timber tower posts & deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 1.75), mats.woodCedar);
  deck.position.set(-0.9, 1.8, 0);
  group.add(deck);

  for (const px of [-1.7, -0.1]) {
    for (const pz of [-0.8, 0.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), mats.woodCedar);
      post.position.set(px, 1.6, pz);
      group.add(post);
    }
  }

  // Colorful pitched play roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.0, 4), mats.awningBlue);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-0.9, 3.65, 0);
  group.add(roof);

  // Curved / angled red slide chute
  const slide = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 0.72), mats.carBodyPaint);
  slide.position.set(1.15, 0.98, 0);
  slide.rotation.z = -0.62;
  group.add(slide);

  for (const sz of [-0.36, 0.36]) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 0.06), mats.flowerGold);
    lip.position.set(1.15, 1.08, sz);
    lip.rotation.z = -0.62;
    group.add(lip);
  }

  // Climbing ladder on left
  for (let r = 0; r < 5; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), mats.flowerGold);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(-1.95 + r * 0.08, 0.35 + r * 0.35, 0);
    group.add(rung);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.7, 1.4);

  return {
    group,
    colliders: [{ offset: [0.1, 1.8, 0], size: [4.6, 3.6, 2.1] }],
    selectionRadius: 2.8,
  };
}

// ==================== AĞAÇ ÇEŞİTLERİ & DOĞA ====================

/** Akdeniz Selvisi (İnce Uzun Konik Selvi) */
function buildCypressTree(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 8), mats.palmTrunk);
  trunk.position.y = 0.8;
  group.add(trunk);

  // Stacked tapered foliage tiers for organic silhouette
  const tiers: [number, number, number][] = [
    [2.1, 0.92, 2.5],
    [3.8, 0.78, 2.7],
    [5.6, 0.6, 2.6],
    [7.2, 0.38, 2.1],
  ];
  for (const [y, r, h] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mats.foliageCypress);
    cone.position.y = y;
    group.add(cone);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 1.25, 1.25);

  return {
    group,
    colliders: [{ offset: [0, 3.0, 0], size: [0.9, 6.0, 0.9] }],
    selectionRadius: 1.4,
  };
}

/** Asırlık Zeytin Ağacı (Boğumlu Gövde + Gümüşi-Yeşil Taç) */
function buildOliveTree(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  // Gnarled split trunk
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 1.5, 9), mats.palmTrunk);
  base.position.y = 0.75;
  group.add(base);

  const branches: [number, number, number, number][] = [
    [-0.45, 2.0, 0.2, 0.35],
    [0.5, 2.1, -0.2, -0.32],
    [0.05, 2.2, 0.45, 0.12],
  ];
  for (const [bx, by, bz, rz] of branches) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.45, 7), mats.palmTrunk);
    b.position.set(bx, by, bz);
    b.rotation.z = rz;
    group.add(b);
  }

  // Multi-lobe silvery olive canopy
  const puffs: [number, number, number, number][] = [
    [0, 3.35, 0, 1.35],
    [-1.15, 2.95, 0.45, 1.05],
    [1.15, 3.0, -0.35, 1.1],
    [0.15, 3.05, 1.05, 0.95],
    [-0.35, 3.1, -0.95, 0.92],
  ];
  for (const [px, py, pz, r] of puffs) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mats.foliageOlive);
    puff.scale.set(1.15, 0.72, 1.1);
    puff.position.set(px, py, pz);
    group.add(puff);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.3, 2.3);

  return {
    group,
    colliders: [{ offset: [0, 1.8, 0], size: [1.1, 3.6, 1.1] }],
    selectionRadius: 2.4,
  };
}

/** Akdeniz Fıstık Çamı (Şemsiye Formlu Çam) */
function buildPineTree(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 5.2, 10), mats.woodCedar);
  trunk.position.y = 2.6;
  group.add(trunk);

  // Forked upper boughs
  for (const a of [0, 2.1, 4.2]) {
    const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.0, 7), mats.woodCedar);
    bough.position.set(Math.cos(a) * 0.65, 5.1, Math.sin(a) * 0.65);
    bough.rotation.z = -Math.cos(a) * 0.55;
    bough.rotation.x = Math.sin(a) * 0.55;
    group.add(bough);
  }

  // Broad umbrella pine canopy
  const umbrellaMain = new THREE.Mesh(new THREE.DodecahedronGeometry(2.45, 1), mats.foliagePine);
  umbrellaMain.scale.set(1.25, 0.48, 1.25);
  umbrellaMain.position.y = 6.2;
  group.add(umbrellaMain);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const lobe = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45, 1), mats.foliagePine);
    lobe.scale.set(1.2, 0.5, 1.2);
    lobe.position.set(Math.cos(a) * 1.45, 5.95, Math.sin(a) * 1.45);
    group.add(lobe);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.8, 2.8);

  return {
    group,
    colliders: [{ offset: [0, 2.8, 0], size: [0.95, 5.6, 0.95] }],
    selectionRadius: 2.9,
  };
}

/** Çınar / Meşe Gölge Ağacı */
function buildOakTree(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 3.0, 10), mats.palmTrunk);
  trunk.position.y = 1.5;
  group.add(trunk);

  const clusters: [number, number, number, number][] = [
    [0, 4.7, 0, 2.0],
    [-1.4, 3.9, 0.8, 1.45],
    [1.45, 4.0, -0.6, 1.5],
    [0.5, 4.1, 1.45, 1.35],
    [-0.9, 4.1, -1.3, 1.35],
  ];
  for (const [x, y, z, r] of clusters) {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mats.foliageOak);
    leaf.position.set(x, y, z);
    group.add(leaf);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 2.9, 2.9);

  return {
    group,
    colliders: [{ offset: [0, 2.2, 0], size: [1.15, 4.4, 1.15] }],
    selectionRadius: 3.0,
  };
}

/** Çiçeklik & Peyzaj Çalısı */
function buildFlowerPlanter(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const box = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 1.05), mats.travertine);
  box.position.y = 0.31;
  group.add(box);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.1, 1.18), mats.travertineDark);
  rim.position.y = 0.64;
  group.add(rim);

  for (let i = -0.7; i <= 0.7; i += 0.7) {
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), mats.palmFrondLight);
    bush.position.set(i, 0.9, 0);
    group.add(bush);

    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), i === 0 ? mats.flowerGold : mats.flowerRed);
    flower.position.set(i, 1.24, 0.12);
    group.add(flower);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 1.4, 0.8);

  return {
    group,
    colliders: [{ offset: [0, 0.55, 0], size: [2.4, 1.1, 1.15] }],
    selectionRadius: 1.5,
  };
}

// ==================== AYDINLATMA & SOKAK ====================

/** Çift Kollu Bulvar Lambası */
function buildDoubleBoulevardLamp(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.9, 8), mats.wroughtIron);
  base.position.y = 0.45;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 4.8, 10), mats.wroughtIron);
  post.position.y = 3.3;
  group.add(post);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), mats.bronzeGold);
  finial.position.y = 5.9;
  group.add(finial);

  for (const dir of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.2, 0),
      new THREE.Vector3(dir * 0.4, 5.75, 0),
      new THREE.Vector3(dir * 0.95, 5.78, 0),
      new THREE.Vector3(dir * 1.15, 5.45, 0),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.045, 8, false), mats.wroughtIron));

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 6), mats.wroughtIron);
    cap.position.set(dir * 1.15, 5.38, 0);
    group.add(cap);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.13, 0.44, 6), mats.lampGlass);
    glass.position.set(dir * 1.15, 5.05, 0);
    group.add(glass);
  }

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 0.8, 0.8);

  return {
    group,
    colliders: [{ offset: [0, 2.8, 0], size: [0.6, 5.6, 0.6] }],
    selectionRadius: 1.3,
  };
}

/** Antik Meşale / Ateş Mangalı */
function buildAncientTorch(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 1.05), mats.travertineDark);
  plinth.position.y = 0.175;
  group.add(plinth);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.55, 10), mats.travertine);
  pedestal.position.y = 1.12;
  group.add(pedestal);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.26, 0.36, 12), mats.bronzeGold);
  bowl.position.y = 2.02;
  group.add(bowl);

  // Glowing stylized ember & flame core
  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 8), mats.torchFlame);
  flameOuter.position.y = 2.48;
  group.add(flameOuter);

  const flameInner = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mats.lampGlass);
  flameInner.position.y = 2.28;
  group.add(flameInner);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 0.85, 0.85);

  return {
    group,
    colliders: [{ offset: [0, 1.2, 0], size: [1.05, 2.4, 1.05] }],
    selectionRadius: 1.0,
  };
}

/** Modern Park Bollard Aydınlatması */
function buildModernBollardLamp(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 12), mats.wroughtIron);
  base.position.y = 0.06;
  group.add(base);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.78, 12), mats.wroughtIron);
  body.position.y = 0.5;
  group.add(body);

  const lightRing = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.26, 12), mats.lampGlass);
  lightRing.position.y = 1.02;
  group.add(lightRing);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), mats.wroughtIron);
  cap.position.y = 1.18;
  group.add(cap);

  enableShadows(group, true, true);
  addContactShadow(group, mats.contactShadow, 0.45, 0.45);

  return {
    group,
    colliders: [{ offset: [0, 0.62, 0], size: [0.38, 1.25, 0.38] }],
    selectionRadius: 0.65,
  };
}

/** Işıklı Sokak Pergolası / Şenlik Işık Kemeri (Altı Geçilebilir!) */
function buildPergolaStringLights(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const halfSpan = 3.1;

  for (const sx of [-halfSpan, halfSpan]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), mats.travertineDark);
    base.position.set(sx, 0.225, 0);
    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.3, 10), mats.wroughtIron);
    pole.position.set(sx, 2.35, 0);
    group.add(pole);
  }

  // Catenary cable draping gracefully across the street with warm festoon bulbs
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = THREE.MathUtils.lerp(-halfSpan, halfSpan, t);
    const sag = Math.sin(t * Math.PI) * 0.55;
    pts.push(new THREE.Vector3(x, 4.35 - sag, 0));
  }
  const cableCurve = new THREE.CatmullRomCurve3(pts);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 20, 0.025, 6, false), mats.wroughtIron));

  for (let i = 1; i < 10; i++) {
    const p = pts[i];
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), mats.lampGlass);
    bulb.position.set(p.x, p.y - 0.12, 0);
    group.add(bulb);
  }

  enableShadows(group, true, true);

  return {
    group,
    colliders: [
      { offset: [-halfSpan, 2.2, 0], size: [0.55, 4.4, 0.55] },
      { offset: [halfSpan, 2.2, 0], size: [0.55, 4.4, 0.55] },
    ],
    selectionRadius: 3.4,
  };
}

export function buildExtendedPlaceableAsset(
  type: PlaceableType,
  mats: MaterialLibrary
): BuiltAsset | null {
  switch (type) {
    case 'medVilla':
      return buildMedVilla(mats);
    case 'cottageHouse':
      return buildCottageHouse(mats);
    case 'modernTower':
      return buildModernTower(mats);
    case 'clockTower':
      return buildClockTower(mats);
    case 'bazaarStall':
      return buildBazaarStall(mats);
    case 'coveredBazaar':
      return buildCoveredBazaar(mats);
    case 'streetCafe':
      return buildStreetCafe(mats);
    case 'bakeryOven':
      return buildBakeryOven(mats);
    case 'aqueductSpan':
      return buildAqueductSpan(mats);
    case 'ancientWall':
      return buildAncientWall(mats);
    case 'ancientGate':
      return buildAncientGate(mats);
    case 'templeRuins':
      return buildTempleRuins(mats);
    case 'obeliskMonument':
      return buildObeliskMonument(mats);
    case 'amphoraCluster':
      return buildAmphoraCluster(mats);
    case 'fountain':
      return buildFountain(mats);
    case 'gazebo':
      return buildGazebo(mats);
    case 'bandstand':
      return buildBandstand(mats);
    case 'carouselKiosk':
      return buildCarouselKiosk(mats);
    case 'playgroundSlide':
      return buildPlaygroundSlide(mats);
    case 'cypressTree':
      return buildCypressTree(mats);
    case 'oliveTree':
      return buildOliveTree(mats);
    case 'pineTree':
      return buildPineTree(mats);
    case 'oakTree':
      return buildOakTree(mats);
    case 'flowerPlanter':
      return buildFlowerPlanter(mats);
    case 'doubleBoulevardLamp':
      return buildDoubleBoulevardLamp(mats);
    case 'ancientTorch':
      return buildAncientTorch(mats);
    case 'modernBollardLamp':
      return buildModernBollardLamp(mats);
    case 'pergolaStringLights':
      return buildPergolaStringLights(mats);
    default:
      return null;
  }
}
