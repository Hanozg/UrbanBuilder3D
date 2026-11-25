import * as THREE from 'three';
import { NpcData, QuestStatus } from '../types/sandbox';
import { MaterialLibrary } from './models';

export interface NpcRig {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  questMarker: THREE.Sprite;
  nameSprite: THREE.Sprite;
  setQuestMarkerStatus: (status: QuestStatus | null) => void;
  disposeOwned: () => void;
}

function createNameTagTexture(name: string, roleTitle: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(15, 17, 21, 0.86)';
  ctx.strokeStyle = 'rgba(229, 154, 60, 0.65)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(16, 14, 480, 100, 22);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8f2e8';
  ctx.font = '600 36px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(name.slice(0, 24), 256, 50);

  ctx.fillStyle = '#e8b366';
  ctx.font = '500 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText((roleTitle || 'Şehir Sakini').slice(0, 32), 256, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createQuestBadgeTexture(symbol: '!' | '?' | '✓', bgHex: string, fgHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fillStyle = bgHex;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#14110c';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fgHex;
  ctx.font = '800 66px "Outfit", system-ui, sans-serif';
  ctx.fillText(symbol, 64, 67);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function enableShadows(obj: THREE.Object3D, cast: boolean, receive: boolean) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Builds an articulated, fully customizable 3D NPC character supporting gender silhouettes,
 * 6 distinct Mediterranean/Ancient outfits, custom colors, floating quest badge, and nameplate.
 */
export function buildNpcCharacter(
  npc: Pick<
    NpcData,
    'name' | 'roleTitle' | 'gender' | 'outfit' | 'primaryColor' | 'secondaryColor' | 'skinTone' | 'hairColor' | 'quest'
  >,
  sharedMats: MaterialLibrary,
  isGhost = false
): NpcRig {
  const group = new THREE.Group();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];

  const regMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };
  const regTex = <T extends THREE.Texture>(t: T): T => {
    ownedTextures.push(t);
    return t;
  };

  const skinMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.skinTone || '#e3b38e'),
      roughness: 0.65,
      metalness: 0.02,
    })
  );
  const primaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.primaryColor || '#b84a32'),
      roughness: npc.outfit === 'guard' ? 0.36 : 0.78,
      metalness: npc.outfit === 'guard' ? 0.62 : 0.06,
    })
  );
  const secondaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.secondaryColor || '#e8dcc8'),
      roughness: npc.outfit === 'guard' || npc.outfit === 'noble' ? 0.42 : 0.82,
      metalness: npc.outfit === 'guard' || npc.outfit === 'noble' ? 0.45 : 0.04,
    })
  );
  const hairMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.hairColor || '#2a1d14'),
      roughness: 0.82,
      metalness: 0.04,
    })
  );
  const pantsMat = regMat(
    new THREE.MeshStandardMaterial({
      color: npc.outfit === 'romanToga' ? new THREE.Color(npc.primaryColor || '#efe6d5') : 0x2e3138,
      roughness: 0.84,
      metalness: 0.02,
    })
  );
  const leatherMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b301c,
      roughness: 0.72,
      metalness: 0.06,
    })
  );

  const isFemale = npc.gender === 'female';
  const shoulderW = isFemale ? 0.39 : 0.47;
  const waistW = isFemale ? 0.31 : 0.41;
  const torsoH = isFemale ? 0.54 : 0.58;

  // Torso Root (pivots at hip height y = 0.90)
  const torso = new THREE.Group();
  torso.position.y = 0.9;
  group.add(torso);

  // Chest / Upper Tunic
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(shoulderW * 0.56, waistW * 0.54, torsoH, 10),
    primaryMat
  );
  chest.scale.set(1.05, 1, 0.62);
  chest.position.y = torsoH * 0.5;
  torso.add(chest);

  // Belt / Waist Sash
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(waistW + 0.05, 0.09, 0.25),
    npc.outfit === 'merchant' || npc.outfit === 'romanToga' ? secondaryMat : leatherMat
  );
  belt.position.y = 0.07;
  torso.add(belt);

  // Outfit-specific 3D accessories
  if (npc.outfit === 'romanToga') {
    // Draped diagonal senator sash + floor tunic skirt
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.64, 0.27), secondaryMat);
    sash.position.set(0.02, 0.3, 0.01);
    sash.rotation.z = 0.42;
    torso.add(sash);

    const togaSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(waistW * 0.58, 0.31, 0.76, 12),
      primaryMat
    );
    togaSkirt.position.y = -0.36;
    torso.add(togaSkirt);
  } else if (npc.outfit === 'merchant') {
    // Vest lapels + leather satchel
    for (const sx of [-0.14, 0.14]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.11, torsoH * 0.92, 0.26), secondaryMat);
      lapel.position.set(sx, torsoH * 0.5, 0.015);
      torso.add(lapel);
    }
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.22), leatherMat);
    satchel.position.set(-waistW * 0.62, 0.04, 0);
    torso.add(satchel);
  } else if (npc.outfit === 'guard') {
    // Armored breastplate + shoulder pauldrons + spear
    const plate = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.92, 0.42, 0.28), secondaryMat);
    plate.position.set(0, 0.32, 0.02);
    torso.add(plate);

    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
        secondaryMat
      );
      pauldron.position.set(sx * (shoulderW * 0.58), torsoH - 0.03, 0);
      torso.add(pauldron);
    }
  } else if (npc.outfit === 'artisan') {
    // Craftsman apron front
    const apron = new THREE.Mesh(new THREE.BoxGeometry(waistW * 0.95, 0.72, 0.06), secondaryMat);
    apron.position.set(0, 0.08, 0.145);
    torso.add(apron);
  } else if (npc.outfit === 'noble') {
    // Flowing back cape + gold collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 16), secondaryMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, torsoH + 0.01, 0);
    torso.add(collar);

    const cape = new THREE.Mesh(new THREE.BoxGeometry(shoulderW + 0.08, 1.05, 0.06), secondaryMat);
    cape.position.set(0, 0.04, -0.17);
    cape.rotation.x = 0.08;
    torso.add(cape);
  }

  // Female skirt silhouette for citizen / noble / merchant
  if (isFemale && npc.outfit !== 'romanToga' && npc.outfit !== 'guard') {
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(waistW * 0.55, 0.32, 0.52, 12),
      npc.outfit === 'artisan' ? pantsMat : primaryMat
    );
    skirt.position.y = -0.22;
    torso.add(skirt);
  }

  // Head & Hair
  const head = new THREE.Group();
  head.position.y = torsoH + 0.16;
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10), skinMat);
  neck.position.y = -0.1;
  head.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skinMat);
  head.add(skull);

  // Subtle facial eyes for lifelike readability
  const eyeMat = regMat(new THREE.MeshStandardMaterial({ color: 0x1b1a18, roughness: 0.4 }));
  for (const sx of [-0.055, 0.055]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeMat);
    eye.position.set(sx, 0.02, 0.145);
    head.add(eye);
  }

  // Hair & Headgear
  if (npc.outfit === 'guard') {
    // Crested Roman / Mediterranean Guard Helmet
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      secondaryMat
    );
    helm.position.y = 0.02;
    head.add(helm);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.28), primaryMat);
    crest.position.set(0, 0.21, -0.02);
    head.add(crest);
  } else {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.set(0, 0.02, -0.015);
    head.add(hairCap);

    if (isFemale) {
      // Flowing back hair + bun
      const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.11), hairMat);
      backHair.position.set(0, -0.06, -0.11);
      head.add(backHair);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), hairMat);
      bun.position.set(0, 0.07, -0.16);
      head.add(bun);
    }

    if (npc.outfit === 'merchant') {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.155, 0.13, 12), secondaryMat);
      cap.position.y = 0.16;
      head.add(cap);
    } else if (npc.outfit === 'romanToga') {
      const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 6, 16), secondaryMat);
      laurel.rotation.x = Math.PI / 2 - 0.15;
      laurel.position.y = 0.08;
      head.add(laurel);
    } else if (npc.outfit === 'artisan') {
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.08, 12), primaryMat);
      beret.position.set(0, 0.15, -0.02);
      beret.rotation.x = -0.12;
      head.add(beret);
    } else if (npc.outfit === 'noble') {
      if (isFemale) {
        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 16), secondaryMat);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 0.15;
        head.add(crown);
      } else {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 16), primaryMat);
        brim.position.y = 0.14;
        head.add(brim);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 14), primaryMat);
        crown.position.y = 0.21;
        head.add(crown);
      }
    }
  }

  // Arms
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulderW * 0.56 + 0.05), torsoH - 0.06, 0);
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.054, 0.34, 8),
      npc.outfit === 'artisan' ? secondaryMat : primaryMat
    );
    sleeve.position.y = -0.17;
    arm.add(sleeve);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.044, 0.26, 8),
      npc.outfit === 'artisan' || npc.outfit === 'romanToga' ? skinMat : primaryMat
    );
    forearm.position.y = -0.44;
    arm.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
    hand.position.y = -0.58;
    arm.add(hand);

    // Guard holds upright ceremonial spear in right hand
    if (side === 1 && npc.outfit === 'guard') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 2.25, 8), leatherMat);
      pole.position.set(0.02, -0.05, 0.1);
      arm.add(pole);
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.28, 6), secondaryMat);
      spearTip.position.set(0.02, 1.15, 0.1);
      arm.add(spearTip);
    }

    torso.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * (isFemale ? 0.1 : 0.125), 0.9, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.74, 8), pantsMat);
    upper.position.y = -0.37;
    leg.add(upper);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.24), leatherMat);
    boot.position.set(0, -0.82, 0.04);
    leg.add(boot);

    group.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Ground Contact Shadow
  if (!isGhost) {
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), sharedMats.contactShadow);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.025;
    shadowPlane.userData.ignoreRaycast = true;
    group.add(shadowPlane);
  }

  enableShadows(group, !isGhost, !isGhost);

  // Floating Nameplate Sprite
  const nameTex = regTex(createNameTagTexture(npc.name, npc.roleTitle));
  const nameMat = regMat(
    new THREE.SpriteMaterial({
      map: nameTex,
      transparent: true,
      depthWrite: false,
    })
  );
  const nameSprite = new THREE.Sprite(nameMat);
  nameSprite.position.set(0, 2.28, 0);
  nameSprite.scale.set(1.85, 0.46, 1);
  nameSprite.userData.ignoreRaycast = true;
  nameSprite.visible = !isGhost;
  group.add(nameSprite);

  // Floating Quest Badge Sprite (!, ?, ✓)
  const texAvailable = regTex(createQuestBadgeTexture('!', '#f2ad43', '#14110c'));
  const texActive = regTex(createQuestBadgeTexture('?', '#9aa4b2', '#14110c'));
  const texReady = regTex(createQuestBadgeTexture('?', '#ffd15c', '#14110c'));
  const texDone = regTex(createQuestBadgeTexture('✓', '#34c98d', '#14110c'));

  const badgeMat = regMat(
    new THREE.SpriteMaterial({
      map: texAvailable,
      transparent: true,
      depthWrite: false,
    })
  );
  const questMarker = new THREE.Sprite(badgeMat);
  questMarker.position.set(0, 2.78, 0);
  questMarker.scale.set(0.46, 0.46, 1);
  questMarker.userData.ignoreRaycast = true;
  questMarker.visible = !isGhost && npc.quest.enabled;
  group.add(questMarker);

  const setQuestMarkerStatus = (status: QuestStatus | null) => {
    if (isGhost || !status) {
      questMarker.visible = false;
      return;
    }
    questMarker.visible = true;
    if (status === 'available') {
      badgeMat.map = texAvailable;
    } else if (status === 'active') {
      badgeMat.map = texActive;
    } else if (status === 'ready') {
      badgeMat.map = texReady;
    } else {
      badgeMat.map = texDone;
    }
    badgeMat.needsUpdate = true;
  };

  return {
    group,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    questMarker,
    nameSprite,
    setQuestMarkerStatus,
    disposeOwned: () => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
        }
      });
      for (const m of ownedMaterials) m.dispose();
      for (const t of ownedTextures) t.dispose();
    },
  };
}

/**
 * Glowing Golden Pillar Beacon rendered in Play Mode for active 'visit' NPC quests.
 */
export function buildQuestBeaconMesh(): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const ringGeo = new THREE.RingGeometry(1.15, 1.55, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4bc52,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.14;
  group.add(ring);

  const beamGeo = new THREE.CylinderGeometry(0.42, 0.72, 16, 18, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xf7c55f,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 8;
  group.add(beam);

  const diamondGeo = new THREE.OctahedronGeometry(0.55, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xe59a3c,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.5,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  diamond.position.y = 2.6;
  diamond.name = 'questDiamond';
  group.add(diamond);

  group.traverse((c) => {
    c.userData.ignoreRaycast = true;
  });

  return {
    group,
    dispose: () => {
      ringGeo.dispose();
      ringMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      diamondGeo.dispose();
      diamondMat.dispose();
    },
  };
}
