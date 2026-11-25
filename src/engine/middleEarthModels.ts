import * as THREE from 'three';
import { BuiltAsset, ColliderBoxDef, MaterialLibrary } from './models';

export type MiddleEarthPlaceableType =
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

function addShadows(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function makeMat(params: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(params);
}

/** 1. Hobbit Hillside Round-Door Burrow */
function buildHobbitBurrow(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const grassHill = makeMat({ color: 0x4f7d3a, roughness: 0.92, metalness: 0.02 });
  const roundDoorMat = makeMat({ color: 0x2c6e45, roughness: 0.68, metalness: 0.06 });
  const brassMat = makeMat({ color: 0xd9a845, roughness: 0.3, metalness: 0.85 });
  const brickMat = makeMat({ color: 0x9b543b, roughness: 0.85, metalness: 0.04 });

  // Lush grassy earthen hill dome
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    grassHill
  );
  mound.scale.set(1.06, 0.78, 0.94);
  mound.position.set(0, -0.15, -0.35);
  group.add(mound);

  // Stone front retaining facade
  const facade = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.5, 1.3), mats.stuccoCream);
  facade.position.set(0, 1.25, 2.75);
  group.add(facade);

  // Curved timber beam over front facade
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.22, 1.48), mats.woodCedar);
  lintel.position.set(0, 2.52, 2.75);
  group.add(lintel);

  // Iconic Round Green Hobbit Door + stone surround + brass center knob
  const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 10, 24), mats.woodCedar);
  doorFrame.position.set(0, 1.05, 3.43);
  group.add(doorFrame);

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 24), roundDoorMat);
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 1.05, 3.4);
  group.add(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), brassMat);
  knob.position.set(0, 1.05, 3.52);
  group.add(knob);

  // Flanking round glowing windows
  for (const sx of [-1.85, 1.85]) {
    const winFrame = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 8, 18), mats.woodCedar);
    winFrame.position.set(sx, 1.38, 3.42);
    group.add(winFrame);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 18), mats.lampGlass);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(sx, 1.38, 3.4);
    group.add(glass);
  }

  // Cozy brick chimney poking through grassy roof
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.75, 0.68), brickMat);
  chimney.position.set(1.4, 3.3, -0.4);
  group.add(chimney);

  // Low garden fence & flower tufts
  for (const sx of [-2.4, 2.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), mats.woodCedar);
    post.position.set(sx, 0.36, 4.15);
    group.add(post);
  }
  const flowerColors = [0xe86b7a, 0xf2c94c, 0xa87de8];
  for (let i = 0; i < 6; i++) {
    const fl = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      makeMat({ color: flowerColors[i % flowerColors.length], roughness: 0.8 })
    );
    fl.position.set(-2.2 + i * 0.88, 2.65 + (i % 2) * 0.25, 2.35 - (i % 3) * 0.35);
    group.add(fl);
  }

  addShadows(group);
  return {
    group,
    colliders: [{ size: [8.4, 3.6, 7.6], offset: [0, 1.8, 0] }],
    selectionRadius: 4.9,
  };
}

/** 2. Dark Obsidian Wizard Tower (Orthanc-inspired) */
function buildWizardTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const obsidian = makeMat({ color: 0x20232b, roughness: 0.42, metalness: 0.38 });
  const arcaneCyan = makeMat({
    color: 0x78e8ff,
    emissive: 0x2ac5f0,
    emissiveIntensity: 1.9,
    roughness: 0.15,
  });

  // Stepped octagonal base plinth
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.1, 2.4, 8), obsidian);
  base.position.y = 1.2;
  group.add(base);

  // Tall fluted dark monolith shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.85, 16.5, 8), obsidian);
  shaft.position.y = 10.2;
  group.add(shaft);

  // 4 dramatic buttress ribs + sharp crown prongs at summit
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.72, 17.5, 1.25), obsidian);
    rib.position.set(Math.cos(ang) * 2.0, 9.8, Math.sin(ang) * 2.0);
    rib.rotation.y = -ang;
    group.add(rib);

    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.58, 3.9, 4), obsidian);
    prong.position.set(Math.cos(ang) * 1.48, 20.1, Math.sin(ang) * 1.48);
    prong.rotation.y = -ang;
    group.add(prong);
  }

  // Floating glowing arcane crystal orb in the crown
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), arcaneCyan);
  orb.position.set(0, 19.6, 0);
  group.add(orb);

  // Narrow glowing vertical rune slits along tower
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.14), arcaneCyan);
    slit.position.set(Math.cos(ang) * 2.22, 11.8, Math.sin(ang) * 2.22);
    slit.rotation.y = -ang + Math.PI / 2;
    group.add(slit);
  }

  // Arched portal doorway
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.4, 0.4), mats.wroughtIron);
  door.position.set(0, 1.2, 3.65);
  group.add(door);

  addShadows(group);
  return {
    group,
    colliders: [{ size: [6.4, 19.0, 6.4], offset: [0, 9.5, 0] }],
    selectionRadius: 4.3,
  };
}

/** 3. Elven Starlight Pavilion (Rivendell-inspired) */
function buildElvenPavilion(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const silverMarble = makeMat({ color: 0xf1ece2, roughness: 0.36, metalness: 0.14 });
  const leafGold = makeMat({ color: 0xd9b056, roughness: 0.3, metalness: 0.8 });
  const starGlow = makeMat({
    color: 0xe6f8ff,
    emissive: 0x9ce2ff,
    emissiveIntensity: 1.7,
    roughness: 0.2,
  });

  // Circular stepped dais
  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.35, 18), silverMarble);
  step1.position.y = 0.175;
  group.add(step1);
  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.35, 0.32, 18), silverMarble);
  step2.position.y = 0.5;
  group.add(step2);

  // 6 slender fluted Elven columns
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const x = Math.cos(a) * 2.75;
    const z = Math.sin(a) * 2.75;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 4.6, 12), silverMarble);
    col.position.set(x, 2.95, z);
    group.add(col);

    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 14), leafGold);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(x, 5.2, z);
    group.add(cap);
  }

  // Ribbed graceful pointed Elven canopy dome
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.14, 10, 28), leafGold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 5.25;
  group.add(ring);

  const dome = new THREE.Mesh(
    new THREE.ConeGeometry(3.05, 3.4, 12, 1, true),
    makeMat({ color: 0x456b5e, roughness: 0.5, metalness: 0.28, side: THREE.DoubleSide })
  );
  dome.position.y = 6.95;
  group.add(dome);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 8), leafGold);
  finial.position.y = 9.2;
  group.add(finial);

  // Hanging starlight crystal lantern in center
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), leafGold);
  chain.position.y = 5.55;
  group.add(chain);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), starGlow);
  crystal.position.y = 4.35;
  group.add(crystal);

  void mats;
  addShadows(group);
  return {
    group,
    colliders: [{ size: [5.6, 6.0, 5.6], offset: [0, 3.0, 0] }],
    selectionRadius: 4.1,
  };
}

/** 4. Dwarven Stone Hall & Magma Forge */
function buildDwarvenHall(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const granite = makeMat({ color: 0x575b63, roughness: 0.82, metalness: 0.14 });
  const runeGold = makeMat({ color: 0xd49c3d, roughness: 0.34, metalness: 0.84 });
  const magma = makeMat({
    color: 0xff8a2b,
    emissive: 0xff5a12,
    emissiveIntensity: 1.85,
    roughness: 0.3,
  });

  // Massive angular granite hall body
  const hall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 6.2, 6.4), granite);
  hall.position.set(0, 3.1, -0.4);
  group.add(hall);

  // Stepped trapezoidal stone crown
  const crown = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.4, 5.4), granite);
  crown.position.set(0, 6.9, -0.4);
  group.add(crown);

  // Colossal geometric carved front pillars with gold rune inlays
  for (const sx of [-3.4, -1.65, 1.65, 3.4]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.6, 1.25), granite);
    pil.position.set(sx, 3.3, 2.95);
    group.add(pil);

    const band = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.28, 1.32), runeGold);
    band.position.set(sx, 5.4, 2.95);
    group.add(band);
  }

  // Deep recessed Dwarven gate with bronze trim
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.3, 4.1, 0.35), mats.wroughtIron);
  gate.position.set(0, 2.05, 2.75);
  group.add(gate);

  const lintelGold = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.55), runeGold);
  lintelGold.position.set(0, 4.45, 2.98);
  group.add(lintelGold);

  // Twin blazing forge braziers flanking the stairs
  for (const sx of [-2.4, 2.4]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 1.15, 6), granite);
    bowl.position.set(sx, 0.58, 3.95);
    group.add(bowl);
    const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), magma);
    fire.position.set(sx, 1.28, 3.95);
    group.add(fire);
  }

  addShadows(group);
  return {
    group,
    colliders: [{ size: [9.6, 6.8, 7.0], offset: [0, 3.4, 0] }],
    selectionRadius: 5.8,
  };
}

/** 5. Medieval Stone Castle Keep */
function buildMedievalKeep(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const bannerMat = makeMat({ color: 0xa62626, roughness: 0.72, metalness: 0.05 });

  // Central stone fortress block
  const main = new THREE.Mesh(new THREE.BoxGeometry(7.8, 9.2, 7.8), mats.travertine);
  main.position.y = 4.6;
  group.add(main);

  // 4 Corner Turrets with battlements & flags
  for (const sx of [-3.9, 3.9]) {
    for (const sz of [-3.9, 3.9]) {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 11.2, 12), mats.travertine);
      turret.position.set(sx, 5.6, sz);
      group.add(turret);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.72, 2.4, 12), mats.roofTile);
      cap.position.set(sx, 12.35, sz);
      group.add(cap);
    }
  }

  // Roofline crenellations (merlons)
  for (let i = -3; i <= 3; i += 1.5) {
    for (const sz of [-3.8, 3.8]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.45), mats.travertine);
      merlon.position.set(i, 9.65, sz);
      group.add(merlon);
    }
  }

  // Iron portcullis gate & royal banners
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.35), mats.wroughtIron);
  gate.position.set(0, 1.7, 3.92);
  group.add(gate);

  for (const sx of [-2.1, 2.1]) {
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.6, 0.08), bannerMat);
    banner.position.set(sx, 6.2, 3.96);
    group.add(banner);
  }

  addShadows(group);
  return {
    group,
    colliders: [{ size: [9.4, 11.0, 9.4], offset: [0, 5.5, 0] }],
    selectionRadius: 6.2,
  };
}

/** 6. Cozy Middle-earth Half-Timbered Tavern / Inn */
function buildFantasyTavern(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const slateRoof = makeMat({ color: 0x383e48, roughness: 0.78, metalness: 0.12 });
  const signGold = makeMat({ color: 0xdca43c, roughness: 0.35, metalness: 0.72 });

  // Stone ground floor
  const lower = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.2, 6.2), mats.travertine);
  lower.position.y = 1.6;
  group.add(lower);

  // Overhanging half-timbered upper floor
  const upper = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.0, 6.8), mats.stuccoCream);
  upper.position.y = 4.7;
  group.add(upper);

  // Exposed dark cedar timber beams on upper story
  for (const sx of [-4.42, -2.2, 0, 2.2, 4.42]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.05, 6.9), mats.woodCedar);
    post.position.set(sx, 4.7, 0);
    group.add(post);
  }
  const midBeam = new THREE.Mesh(new THREE.BoxGeometry(8.92, 0.24, 6.95), mats.woodCedar);
  midBeam.position.y = 3.25;
  group.add(midBeam);

  // Steep pitched slate roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3.4, 4), slateRoof);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.12, 1, 0.92);
  roof.position.y = 7.9;
  group.add(roof);

  // Stone fireplace chimney
  const chim = new THREE.Mesh(new THREE.BoxGeometry(1.15, 5.8, 1.15), mats.travertine);
  chim.position.set(3.2, 6.6, -1.6);
  group.add(chim);

  // Warm glowing tavern windows & hanging sign
  for (const sx of [-2.4, 2.4]) {
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 0.12), mats.lampGlass);
    w1.position.set(sx, 1.75, 3.12);
    group.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.12), mats.lampGlass);
    w2.position.set(sx, 4.75, 3.42);
    group.add(w2);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.25, 0.16), mats.woodCedar);
  door.position.set(0, 1.12, 3.12);
  group.add(door);

  const signArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.25), mats.wroughtIron);
  signArm.position.set(1.35, 2.95, 3.65);
  group.add(signArm);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.85), signGold);
  signBoard.position.set(1.35, 2.45, 3.95);
  group.add(signBoard);

  // Ale barrels by entrance
  for (const bx of [-1.45, -2.05]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.78, 10), mats.woodCedar);
    barrel.position.set(bx, 0.39, 3.55);
    group.add(barrel);
  }

  addShadows(group);
  return {
    group,
    colliders: [{ size: [8.8, 7.6, 7.0], offset: [0, 3.8, 0] }],
    selectionRadius: 5.5,
  };
}

/** 7. Countryside Fantasy Windmill Tower */
function buildWindmillTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const sailCanvas = makeMat({ color: 0xf0e4ce, roughness: 0.88, metalness: 0.02 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.75, 8.8, 14), mats.stuccoCream);
  tower.position.y = 4.4;
  group.add(tower);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 2.7, 14), mats.roofTile);
  roof.position.y = 10.1;
  group.add(roof);

  // 4-blade timber & canvas windmill rotor (tagged for gentle animation if desired)
  const rotor = new THREE.Group();
  rotor.position.set(0, 7.8, 2.25);
  rotor.userData.spinZ = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.65, 10), mats.woodCedar);
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);

  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2 + 0.35;
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.4, 0.14), mats.woodCedar);
    spar.position.y = 2.2;
    arm.add(spar);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.4, 0.05), sailCanvas);
    sail.position.set(0.48, 2.45, 0.04);
    arm.add(sail);
    rotor.add(arm);
  }
  group.add(rotor);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.2), mats.woodCedar);
  door.position.set(0, 1.05, 2.62);
  group.add(door);

  addShadows(group);
  return {
    group,
    colliders: [{ size: [5.2, 9.0, 5.2], offset: [0, 4.5, 0] }],
    selectionRadius: 3.6,
  };
}

/** 8. Gondor-style Warning Beacon Fire Tower */
function buildBeaconTower(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const fireMat = makeMat({
    color: 0xffb347,
    emissive: 0xff6210,
    emissiveIntensity: 2.1,
    roughness: 0.25,
  });

  // Elevated stepped stone base
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.6, 4.8), mats.travertine);
  plinth.position.y = 1.3;
  group.add(plinth);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 5.2), mats.travertine);
  rim.position.y = 2.75;
  group.add(rim);

  // Stacked timber log pyre
  for (let row = 0; row < 3; row++) {
    for (const s of [-0.75, 0, 0.75]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.4 - row * 0.3, 8), mats.woodCedar);
      log.rotation.z = Math.PI / 2;
      if (row % 2 === 1) log.rotation.y = Math.PI / 2;
      log.position.set(row % 2 === 0 ? 0 : s, 3.15 + row * 0.36, row % 2 === 0 ? s : 0);
      group.add(log);
    }
  }

  // Blazing warning flame spire
  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 8), fireMat);
  flameOuter.position.y = 5.1;
  group.add(flameOuter);

  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 1.9, 7),
    makeMat({ color: 0xfff099, emissive: 0xffc838, emissiveIntensity: 2.4 })
  );
  flameInner.position.y = 4.9;
  group.add(flameInner);

  addShadows(group);
  return {
    group,
    colliders: [{ size: [5.0, 4.4, 5.0], offset: [0, 2.2, 0] }],
    selectionRadius: 3.4,
  };
}

/** 9. Ancient Glowing Rune Monolith Stone Circle */
function buildRuneMonolith(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const darkStone = makeMat({ color: 0x5c6166, roughness: 0.88, metalness: 0.08 });
  const runeCyan = makeMat({
    color: 0x7ef2ff,
    emissive: 0x2ec8e8,
    emissiveIntensity: 1.95,
    roughness: 0.2,
  });

  // Center carved standing monolith
  const mono = new THREE.Mesh(new THREE.BoxGeometry(1.35, 5.2, 0.85), darkStone);
  mono.position.y = 2.6;
  group.add(mono);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.2, 4), darkStone);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 5.8;
  group.add(cap);

  // Glowing rune glyphs front & back
  for (const sz of [-0.45, 0.45]) {
    for (let r = 0; r < 3; r++) {
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.58 - r * 0.1, 0.16, 0.06), runeCyan);
      glyph.position.set(0, 1.7 + r * 1.05, sz);
      group.add(glyph);
    }
  }

  // Ring of smaller standing stones
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const h = 1.65 + (i % 3) * 0.45;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.55, h, 0.42), darkStone);
    st.position.set(Math.cos(a) * 2.45, h / 2, Math.sin(a) * 2.45);
    st.rotation.y = -a;
    st.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
    group.add(st);
  }

  void mats;
  addShadows(group);
  return {
    group,
    colliders: [{ size: [1.8, 5.2, 1.6], offset: [0, 2.6, 0] }],
    selectionRadius: 3.2,
  };
}

/** 10. Winged Dragon Guardian Monument Statue */
function buildDragonStatue(mats: MaterialLibrary): BuiltAsset {
  const group = new THREE.Group();
  const bronze = makeMat({ color: 0x8a6d3b, roughness: 0.36, metalness: 0.78 });

  // Stepped marble plinth
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.45, 4.0), mats.travertine);
  base1.position.y = 0.225;
  group.add(base1);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.65, 2.7), mats.travertine);
  base2.position.y = 1.25;
  group.add(base2);

  // Stylized sculpted bronze dragon body, neck, head & spread wings
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.75, 2.0, 10), bronze);
  torso.position.set(0, 3.05, -0.1);
  torso.rotation.x = 0.28;
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.45, 8), bronze);
  neck.position.set(0, 4.25, 0.45);
  neck.rotation.x = 0.35;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.15, 6), bronze);
  head.rotation.x = Math.PI / 2 + 0.15;
  head.position.set(0, 4.82, 1.05);
  group.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 8), bronze);
  tail.rotation.x = -Math.PI * 0.42;
  tail.position.set(0, 2.35, -1.25);
  group.add(tail);

  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.45, 0.14), bronze);
    wing.position.set(sx * 1.25, 3.95, -0.25);
    wing.rotation.z = sx * 0.48;
    wing.rotation.y = sx * -0.3;
    group.add(wing);
  }

  addShadows(group);
  const colliders: ColliderBoxDef[] = [{ size: [4.0, 5.0, 4.0], offset: [0, 2.5, 0] }];
  return {
    group,
    colliders,
    selectionRadius: 3.1,
  };
}

export function buildMiddleEarthAsset(
  type: MiddleEarthPlaceableType,
  mats: MaterialLibrary
): BuiltAsset {
  switch (type) {
    case 'hobbitBurrow':
      return buildHobbitBurrow(mats);
    case 'wizardTower':
      return buildWizardTower(mats);
    case 'elvenPavilion':
      return buildElvenPavilion(mats);
    case 'dwarvenHall':
      return buildDwarvenHall(mats);
    case 'medievalKeep':
      return buildMedievalKeep(mats);
    case 'fantasyTavern':
      return buildFantasyTavern(mats);
    case 'windmillTower':
      return buildWindmillTower(mats);
    case 'beaconTower':
      return buildBeaconTower(mats);
    case 'runeMonolith':
      return buildRuneMonolith(mats);
    case 'dragonStatue':
      return buildDragonStatue(mats);
  }
}
