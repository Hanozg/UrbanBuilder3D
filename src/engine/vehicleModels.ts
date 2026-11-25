import * as THREE from 'three';
import { VehicleType } from '../types/sandbox';
import { buildClassicConvertible, MaterialLibrary } from './models';

export interface VehicleRig {
  type: VehicleType;
  root: THREE.Group;
  frontLeftHub?: THREE.Group;
  frontRightHub?: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  propellerMeshes: THREE.Object3D[];
  steeringWheel?: THREE.Object3D;
  seatAnchor: THREE.Vector3;
  headlightGlows: THREE.Mesh[];
  isFlying: boolean;
  maxSpeed: number; // m/s
  accel: number;
  turnRate: number;
  interactRadius: number;
  cameraDist: number;
  cameraHeight: number;
  colliderHalfExtents: [number, number, number];
  colliderOffsetY: number;
  selectionRadius: number;
  disposeOwned: () => void;
}

function makeMat(params: THREE.MeshStandardMaterialParameters, owned: THREE.Material[]) {
  const m = new THREE.MeshStandardMaterial(params);
  owned.push(m);
  return m;
}

function makePhysMat(params: THREE.MeshPhysicalMaterialParameters, owned: THREE.Material[]) {
  const m = new THREE.MeshPhysicalMaterial(params);
  owned.push(m);
  return m;
}

function enableShadows(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.ignoreRaycast) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function makeDisposeFn(root: THREE.Group, ownedMats: THREE.Material[]) {
  return () => {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
      }
    });
    for (const m of ownedMats) m.dispose();
  };
}

/** 1. Flyable Steampunk / Middle-earth Grand Zeppelin */
function buildZeppelin(mats: MaterialLibrary): VehicleRig {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const envelopeMat = makeMat({ color: 0xe9dec8, roughness: 0.78, metalness: 0.04 }, owned);
  const stripeMat = makeMat({ color: 0x8e2c24, roughness: 0.65, metalness: 0.06 }, owned);
  const brassMat = makeMat({ color: 0xc9963e, roughness: 0.32, metalness: 0.82 }, owned);
  const woodDark = makeMat({ color: 0x5c3c24, roughness: 0.78, metalness: 0.05 }, owned);
  const finCanvas = makeMat({ color: 0xcfb994, roughness: 0.82, metalness: 0.04 }, owned);
  const lanternGlow = makeMat(
    { color: 0xffe49c, emissive: 0xffa838, emissiveIntensity: 1.5, roughness: 0.2 },
    owned
  );

  // Gondola cabin sitting cleanly near ground (y = 0.25..2.0)
  const gondolaHull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 5.4), woodDark);
  gondolaHull.position.set(0, 0.95, 0);
  root.add(gondolaHull);

  // Tapered prow & stern of gondola
  const prow = new THREE.Mesh(new THREE.ConeGeometry(1.18, 1.85, 4), woodDark);
  prow.rotation.x = Math.PI / 2;
  prow.rotation.z = Math.PI / 4;
  prow.scale.set(0.95, 1, 0.56);
  prow.position.set(0, 0.95, 3.45);
  root.add(prow);

  const stern = new THREE.Mesh(new THREE.ConeGeometry(1.12, 1.5, 4), woodDark);
  stern.rotation.x = -Math.PI / 2;
  stern.rotation.z = Math.PI / 4;
  stern.scale.set(0.95, 1, 0.56);
  stern.position.set(0, 0.95, -3.35);
  root.add(stern);

  // Brass railing & landing skids
  for (const sx of [-1.05, 1.05]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 4.8), brassMat);
    skid.position.set(sx * 0.85, 0.1, 0);
    root.add(skid);

    for (const sz of [-1.5, 1.5]) {
      const skidStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.45, 8), brassMat);
      skidStrut.position.set(sx * 0.85, 0.3, sz);
      root.add(skidStrut);
    }

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 5.1), brassMat);
    rail.position.set(sx, 1.88, 0);
    root.add(rail);
  }

  // Captain's brass helm wheel at front deck
  const helmGroup = new THREE.Group();
  helmGroup.position.set(0, 1.72, 1.85);
  helmGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 18), brassMat));
  helmGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), brassMat));
  helmGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.04), brassMat));
  root.add(helmGroup);

  // Glowing front beacon lantern
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), lanternGlow);
  lantern.position.set(0, 1.65, 3.65);
  root.add(lantern);

  // Giant Zeppelin Gas Envelope suspended above gondola
  const envY = 6.2;
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(3.2, 26, 18), envelopeMat);
  envelope.scale.set(1.0, 0.94, 2.55);
  envelope.position.set(0, envY, 0.15);
  root.add(envelope);

  // Decorative crimson belly bands & brass structural rings
  for (const rz of [-4.4, -1.6, 1.6, 4.4]) {
    const t = rz / 8.15;
    const rad = Math.sqrt(Math.max(0.15, 1 - t * t)) * 3.22;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(rad, rz === -1.6 || rz === 1.6 ? 0.12 : 0.08, 10, 28),
      rz === -1.6 || rz === 1.6 ? stripeMat : brassMat
    );
    band.position.set(0, envY, rz + 0.15);
    band.scale.set(1, 0.94, 1);
    root.add(band);
  }

  // Brass nose cone & tail cone
  const noseCap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.95, 14), brassMat);
  noseCap.rotation.x = Math.PI / 2;
  noseCap.position.set(0, envY, 8.45);
  root.add(noseCap);

  // Tail stabilizer fins (vertical & horizontal)
  const topFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 3.0), finCanvas);
  topFin.position.set(0, envY + 2.35, -5.8);
  root.add(topFin);

  const bottomRudder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 2.4), stripeMat);
  bottomRudder.position.set(0, envY - 2.2, -5.9);
  root.add(bottomRudder);

  for (const sx of [-1, 1]) {
    const sideFin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 2.7), finCanvas);
    sideFin.position.set(sx * 2.45, envY, -5.85);
    root.add(sideFin);
  }

  // Suspension cables connecting gondola to envelope
  for (const sx of [-1.05, 1.05]) {
    for (const sz of [-2.1, 0, 2.1]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.45, 6), brassMat);
      cable.position.set(sx * 1.15, 2.85, sz);
      cable.rotation.z = sx * -0.18;
      root.add(cable);
    }
  }

  // Side engine nacelles with spinning propellers!
  const propellerMeshes: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.24), brassMat);
    arm.position.set(sx * 1.55, 1.25, -0.8);
    root.add(arm);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.25, 12), brassMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(sx * 2.15, 1.25, -0.8);
    root.add(engine);

    const prop = new THREE.Group();
    prop.position.set(sx * 2.15, 1.25, -1.52);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.carChrome);
    prop.add(hub);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.04), woodDark);
      blade.rotation.z = (i * Math.PI) / 4;
      prop.add(blade);
    }
    root.add(prop);
    propellerMeshes.push(prop);
  }

  // Rear push propeller under gondola
  const rearProp = new THREE.Group();
  rearProp.position.set(0, 0.95, -4.18);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 0.04), brassMat);
    blade.rotation.z = (i * Math.PI) / 3;
    rearProp.add(blade);
  }
  root.add(rearProp);
  propellerMeshes.push(rearProp);

  // Subtle headlight beam cone for night flights
  const beamGeo = new THREE.ConeGeometry(2.4, 14, 14, 1, true);
  beamGeo.translate(0, -7, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  owned.push(beamMat);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 1.65, 3.8);
  beam.rotation.x = 0.25;
  beam.userData.ignoreRaycast = true;
  root.add(beam);

  enableShadows(root);

  return {
    type: 'zeppelin',
    root,
    wheelMeshes: [],
    propellerMeshes,
    steeringWheel: helmGroup,
    seatAnchor: new THREE.Vector3(0, 1.0, 0.85),
    headlightGlows: [beam],
    isFlying: true,
    maxSpeed: 21,
    accel: 11.5,
    turnRate: 1.55,
    interactRadius: 6.2,
    cameraDist: 17.5,
    cameraHeight: 5.4,
    colliderHalfExtents: [1.5, 1.0, 3.2],
    colliderOffsetY: 1.0,
    selectionRadius: 4.8,
    disposeOwned: makeDisposeFn(root, owned),
  };
}

/** 2. Flyable Elven / Arcane Sky Skiff */
function buildSkySkiff(mats: MaterialLibrary): VehicleRig {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const ivoryWood = makeMat({ color: 0xe6dcc8, roughness: 0.45, metalness: 0.1 }, owned);
  const goldTrim = makeMat({ color: 0xdca84a, roughness: 0.28, metalness: 0.85 }, owned);
  const crystalGlow = makeMat(
    { color: 0x7ef2ff, emissive: 0x2ec8e8, emissiveIntensity: 1.75, roughness: 0.15 },
    owned
  );
  const sailMat = makeMat(
    { color: 0xf5f0e2, roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide },
    owned
  );

  // Sleek tapered boat hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 4.4), ivoryWood);
  hull.position.set(0, 0.68, 0);
  root.add(hull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.9, 4), ivoryWood);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.z = Math.PI / 4;
  bow.scale.set(0.92, 1, 0.48);
  bow.position.set(0, 0.72, 3.12);
  root.add(bow);

  const stern = new THREE.Mesh(new THREE.ConeGeometry(0.88, 1.35, 4), ivoryWood);
  stern.rotation.x = -Math.PI / 2;
  stern.rotation.z = Math.PI / 4;
  stern.scale.set(0.92, 1, 0.48);
  stern.position.set(0, 0.72, -2.85);
  root.add(stern);

  // Gold rails & sweeping side glide wings
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 4.2), goldTrim);
    rail.position.set(sx * 0.88, 1.02, 0);
    root.add(rail);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 1.25), sailMat);
    wing.position.set(sx * 1.65, 0.86, -0.35);
    wing.rotation.z = sx * 0.14;
    wing.rotation.y = sx * -0.22;
    root.add(wing);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), crystalGlow);
    crystal.scale.set(0.8, 1.5, 0.8);
    crystal.position.set(sx * 1.25, 0.48, 0.65);
    root.add(crystal);
  }

  // Central mast & crescent Elven sail fin
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 10), goldTrim);
  mast.position.set(0, 2.25, 0.6);
  root.add(mast);

  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 2.1), sailMat);
  sail.position.set(0, 2.35, -0.45);
  root.add(sail);

  // Arcane stern crystal turbine
  const prop = new THREE.Group();
  prop.position.set(0, 0.78, -3.55);
  prop.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalGlow));
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.04), goldTrim);
    fin.rotation.z = (i * Math.PI) / 4;
    prop.add(fin);
  }
  root.add(prop);

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.7), mats.carLeather);
  seat.position.set(0, 0.92, -0.35);
  root.add(seat);

  enableShadows(root);

  return {
    type: 'skySkiff',
    root,
    wheelMeshes: [],
    propellerMeshes: [prop],
    seatAnchor: new THREE.Vector3(0, 0.48, -0.25),
    headlightGlows: [],
    isFlying: true,
    maxSpeed: 26.5,
    accel: 16.5,
    turnRate: 2.3,
    interactRadius: 4.8,
    cameraDist: 9.8,
    cameraHeight: 3.6,
    colliderHalfExtents: [1.1, 0.6, 2.4],
    colliderOffsetY: 0.7,
    selectionRadius: 3.1,
    disposeOwned: makeDisposeFn(root, owned),
  };
}

/** 3. Modern Sapphire Sport Coupe */
function buildSportCoupe(mats: MaterialLibrary): VehicleRig {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const paint = makePhysMat(
    { color: 0x1d5ca8, roughness: 0.16, metalness: 0.45, clearcoat: 1.0, clearcoatRoughness: 0.08 },
    owned
  );
  const darkTrim = makeMat({ color: 0x1b1e24, roughness: 0.45, metalness: 0.55 }, owned);

  // Low wide body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.46, 4.5), paint);
  body.position.set(0, 0.56, 0);
  root.add(body);

  // Sloped hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 1.75), paint);
  hood.position.set(0, 0.82, 1.2);
  hood.rotation.x = 0.07;
  root.add(hood);

  // Aerodynamic cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.48, 1.75), mats.carWindshield);
  cabin.position.set(0, 1.04, -0.25);
  root.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 1.25), paint);
  roof.position.set(0, 1.28, -0.35);
  root.add(roof);

  // Rear racing wing spoiler
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.34), darkTrim);
  wing.position.set(0, 1.15, -2.06);
  root.add(wing);
  for (const sx of [-0.68, 0.68]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.18), darkTrim);
    strut.position.set(sx, 0.96, -2.02);
    root.add(strut);
  }

  // Headlights & tail lights
  const headlightGlows: THREE.Mesh[] = [];
  for (const sx of [-0.72, 0.72]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.08), mats.carHeadlight);
    hl.position.set(sx, 0.68, 2.26);
    root.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), mats.carTaillight);
    tl.position.set(sx, 0.68, -2.26);
    root.add(tl);

    const beamGeo = new THREE.ConeGeometry(1.3, 9.2, 12, 1, true);
    beamGeo.translate(0, -4.6, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xdff2ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    owned.push(beamMat);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(sx, 0.68, 2.3);
    beam.rotation.x = 0.06;
    beam.userData.ignoreRaycast = true;
    root.add(beam);
    headlightGlows.push(beam);
  }

  // Wheels
  const wheelMeshes: THREE.Object3D[] = [];
  const makeWheel = () => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 18), mats.carTire);
    tire.rotation.z = Math.PI / 2;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 14), mats.carChrome);
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    wheelMeshes.push(w);
    return w;
  };

  const frontLeftHub = new THREE.Group();
  frontLeftHub.position.set(0.98, 0.36, 1.38);
  frontLeftHub.add(makeWheel());
  root.add(frontLeftHub);

  const frontRightHub = new THREE.Group();
  frontRightHub.position.set(-0.98, 0.36, 1.38);
  frontRightHub.add(makeWheel());
  root.add(frontRightHub);

  const rl = makeWheel();
  rl.position.set(0.98, 0.36, -1.38);
  root.add(rl);
  const rr = makeWheel();
  rr.position.set(-0.98, 0.36, -1.38);
  root.add(rr);

  enableShadows(root);

  return {
    type: 'sportCoupe',
    root,
    frontLeftHub,
    frontRightHub,
    wheelMeshes,
    propellerMeshes: [],
    seatAnchor: new THREE.Vector3(0.38, 0.35, -0.25),
    headlightGlows,
    isFlying: false,
    maxSpeed: 34,
    accel: 24,
    turnRate: 3.3,
    interactRadius: 4.5,
    cameraDist: 6.9,
    cameraHeight: 2.5,
    colliderHalfExtents: [1.05, 0.55, 2.25],
    colliderOffsetY: 0.65,
    selectionRadius: 2.6,
    disposeOwned: makeDisposeFn(root, owned),
  };
}

/** 4. Middle-earth Covered Wooden Carriage */
function buildMedievalCarriage(mats: MaterialLibrary): VehicleRig {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const timber = makeMat({ color: 0x6b472a, roughness: 0.85, metalness: 0.05 }, owned);
  const darkWood = makeMat({ color: 0x472f1c, roughness: 0.88, metalness: 0.05 }, owned);
  const canopyMat = makeMat({ color: 0xe6dac4, roughness: 0.88, metalness: 0.02 }, owned);
  const ironMat = makeMat({ color: 0x2f3237, roughness: 0.55, metalness: 0.72 }, owned);
  const lanternMat = makeMat(
    { color: 0xffe4a0, emissive: 0xff9f2e, emissiveIntensity: 1.4, roughness: 0.25 },
    owned
  );

  // Wagon bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 3.85), darkWood);
  bed.position.set(0, 0.88, -0.15);
  root.add(bed);

  // Wooden side walls
  for (const sx of [-0.9, 0.9]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 3.4), timber);
    side.position.set(sx, 1.38, -0.3);
    root.add(side);
  }
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.85, 0.12), timber);
  backWall.position.set(0, 1.38, -2.0);
  root.add(backWall);

  // Arched canvas wagon canopy
  const canopy = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.02, 2.95, 14, 1, false, 0, Math.PI),
    canopyMat
  );
  canopy.rotation.z = Math.PI / 2;
  canopy.rotation.y = Math.PI / 2;
  canopy.position.set(0, 1.72, -0.52);
  root.add(canopy);

  // Driver's front bench & brass lanterns
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.55), timber);
  bench.position.set(0, 1.38, 1.25);
  root.add(bench);

  for (const sx of [-0.85, 0.85]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), lanternMat);
    lamp.position.set(sx, 1.75, 1.52);
    root.add(lamp);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.55), darkWood);
    shaft.position.set(sx * 0.65, 0.88, 2.45);
    root.add(shaft);
  }

  // Spoked wooden wagon wheels (large rear, medium front)
  const wheelMeshes: THREE.Object3D[] = [];
  const makeSpokedWheel = (radius: number) => {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075, 8, 20), ironMat);
    rim.rotation.y = Math.PI / 2;
    g.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10), darkWood);
    hub.rotation.z = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, radius * 1.9, 0.05), timber);
      spoke.rotation.x = (i * Math.PI) / 6;
      g.add(spoke);
    }
    wheelMeshes.push(g);
    return g;
  };

  const frontLeftHub = new THREE.Group();
  frontLeftHub.position.set(1.06, 0.56, 1.15);
  frontLeftHub.add(makeSpokedWheel(0.56));
  root.add(frontLeftHub);

  const frontRightHub = new THREE.Group();
  frontRightHub.position.set(-1.06, 0.56, 1.15);
  frontRightHub.add(makeSpokedWheel(0.56));
  root.add(frontRightHub);

  const rl = makeSpokedWheel(0.74);
  rl.position.set(1.06, 0.74, -1.25);
  root.add(rl);
  const rr = makeSpokedWheel(0.74);
  rr.position.set(-1.06, 0.74, -1.25);
  root.add(rr);

  // Subtle unused reference to mats to satisfy TS cleanly
  void mats;
  enableShadows(root);

  return {
    type: 'medievalCarriage',
    root,
    frontLeftHub,
    frontRightHub,
    wheelMeshes,
    propellerMeshes: [],
    seatAnchor: new THREE.Vector3(0, 0.82, 1.25),
    headlightGlows: [],
    isFlying: false,
    maxSpeed: 16,
    accel: 11.5,
    turnRate: 2.5,
    interactRadius: 4.8,
    cameraDist: 7.6,
    cameraHeight: 3.1,
    colliderHalfExtents: [1.05, 0.9, 2.05],
    colliderOffsetY: 1.0,
    selectionRadius: 2.8,
    disposeOwned: makeDisposeFn(root, owned),
  };
}

/** 5. Ancient Roman Bronze War Chariot */
function buildWarChariot(mats: MaterialLibrary): VehicleRig {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const bronze = makeMat({ color: 0xb9863a, roughness: 0.35, metalness: 0.78 }, owned);
  const crimson = makeMat({ color: 0x9b2420, roughness: 0.72, metalness: 0.05 }, owned);
  const timber = makeMat({ color: 0x624024, roughness: 0.85, metalness: 0.05 }, owned);

  // Chariot floor deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.16, 1.7), timber);
  deck.position.set(0, 0.72, -0.2);
  root.add(deck);

  // Curved bronze front shield wall
  const shield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.84, 0.88, 1.05, 16, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
    bronze
  );
  shield.position.set(0, 1.28, -0.15);
  root.add(shield);

  // Crimson inner lining & eagle crest
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.12), crimson);
  crest.position.set(0, 1.48, 0.72);
  root.add(crest);

  // Front yoke pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.6, 8), timber);
  pole.rotation.x = Math.PI / 2;
  pole.position.set(0, 0.72, 1.75);
  root.add(pole);

  const yoke = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.12), bronze);
  yoke.position.set(0, 0.75, 2.85);
  root.add(yoke);

  // Rear war banner
  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.4, 8), bronze);
  bannerPole.position.set(-0.68, 1.9, -0.82);
  root.add(bannerPole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.9), crimson);
  flag.position.set(-0.68, 2.55, -1.25);
  root.add(flag);

  // Twin large bronze spoked wheels
  const wheelMeshes: THREE.Object3D[] = [];
  for (const sx of [-0.95, 0.95]) {
    const w = new THREE.Group();
    w.position.set(sx, 0.74, -0.25);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.075, 8, 20), bronze);
    rim.rotation.y = Math.PI / 2;
    w.add(rim);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.42, 0.05), bronze);
      spoke.rotation.x = (i * Math.PI) / 6;
      w.add(spoke);
    }
    root.add(w);
    wheelMeshes.push(w);
  }

  void mats;
  enableShadows(root);

  return {
    type: 'warChariot',
    root,
    wheelMeshes,
    propellerMeshes: [],
    seatAnchor: new THREE.Vector3(0, 0.75, -0.25),
    headlightGlows: [],
    isFlying: false,
    maxSpeed: 20.5,
    accel: 16.5,
    turnRate: 3.5,
    interactRadius: 4.2,
    cameraDist: 6.2,
    cameraHeight: 2.6,
    colliderHalfExtents: [0.98, 0.65, 1.65],
    colliderOffsetY: 0.75,
    selectionRadius: 2.3,
    disposeOwned: makeDisposeFn(root, owned),
  };
}

/** Main Vehicle Factory */
export function buildVehicleRig(type: VehicleType, mats: MaterialLibrary): VehicleRig {
  switch (type) {
    case 'zeppelin':
      return buildZeppelin(mats);
    case 'skySkiff':
      return buildSkySkiff(mats);
    case 'sportCoupe':
      return buildSportCoupe(mats);
    case 'medievalCarriage':
      return buildMedievalCarriage(mats);
    case 'warChariot':
      return buildWarChariot(mats);
    case 'classicCar':
    default: {
      const classic = buildClassicConvertible(mats);
      const owned = classic.headlightGlows
        .map((m) => m.material)
        .filter((m): m is THREE.Material => !Array.isArray(m));
      return {
        type: 'classicCar',
        root: classic.root,
        frontLeftHub: classic.frontLeftHub,
        frontRightHub: classic.frontRightHub,
        wheelMeshes: classic.wheelMeshes,
        propellerMeshes: [],
        steeringWheel: classic.steeringWheel,
        seatAnchor: classic.seatAnchor,
        headlightGlows: classic.headlightGlows,
        isFlying: false,
        maxSpeed: 25,
        accel: 17.5,
        turnRate: 3.1,
        interactRadius: 4.5,
        cameraDist: 6.8,
        cameraHeight: 2.6,
        colliderHalfExtents: [1.0, 0.6, 2.15],
        colliderOffsetY: 0.7,
        selectionRadius: 2.6,
        disposeOwned: makeDisposeFn(classic.root, owned),
      };
    }
  }
}
