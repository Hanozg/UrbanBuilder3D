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
    if (child instanceof THREE.Mesh && !child.userData.ignoreRaycast) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Builds an organically sculpted, articulated 3D NPC character using high-segment
 * CapsuleGeometry, LatheGeometry, TubeGeometry, and smooth SphereGeometry joints
 * with smooth-shaded MeshStandardMaterials and full shadow casting/receiving.
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
      roughness: 0.7,
      metalness: 0.03,
      flatShading: false,
    })
  );
  const primaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.primaryColor || '#b84a32'),
      roughness: npc.outfit === 'guard' ? 0.52 : 0.7,
      metalness: npc.outfit === 'guard' ? 0.34 : 0.05,
      flatShading: false,
    })
  );
  const secondaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.secondaryColor || '#e8dcc8'),
      roughness: npc.outfit === 'guard' || npc.outfit === 'noble' ? 0.48 : 0.7,
      metalness: npc.outfit === 'guard' || npc.outfit === 'noble' ? 0.32 : 0.05,
      flatShading: false,
    })
  );
  const hairMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(npc.hairColor || '#2a1d14'),
      roughness: 0.7,
      metalness: 0.05,
      flatShading: false,
    })
  );
  const pantsMat = regMat(
    new THREE.MeshStandardMaterial({
      color: npc.outfit === 'romanToga' ? new THREE.Color(npc.primaryColor || '#efe6d5') : 0x2e3138,
      roughness: 0.72,
      metalness: 0.04,
      flatShading: false,
    })
  );
  const leatherMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b301c,
      roughness: 0.7,
      metalness: 0.08,
      flatShading: false,
    })
  );

  const isFemale = npc.gender === 'female';
  const shoulderW = isFemale ? 0.40 : 0.48;
  const waistW = isFemale ? 0.29 : 0.39;
  const torsoH = isFemale ? 0.54 : 0.58;

  // Torso Root (pivots cleanly at hip height y = 0.90)
  const torso = new THREE.Group();
  torso.position.y = 0.9;
  group.add(torso);

  // Smooth Pelvis Bridge (eliminates hard hip seams)
  const pelvis = new THREE.Mesh(
    new THREE.SphereGeometry(waistW * 0.56, 24, 18),
    npc.outfit === 'romanToga' ? primaryMat : pantsMat
  );
  pelvis.scale.set(1.06, 0.72, 0.74);
  pelvis.position.y = -0.02;
  torso.add(pelvis);

  // Sculpted LatheGeometry Torso (anatomical taper from hips -> waist -> chest -> collar)
  const torsoProfile = isFemale
    ? [
        new THREE.Vector2(0.005, -0.02),
        new THREE.Vector2(0.185, 0.01),
        new THREE.Vector2(0.165, 0.09),
        new THREE.Vector2(0.145, 0.19),
        new THREE.Vector2(0.188, 0.34),
        new THREE.Vector2(0.205, 0.45),
        new THREE.Vector2(0.165, 0.52),
        new THREE.Vector2(0.085, 0.555),
        new THREE.Vector2(0.005, 0.56),
      ]
    : [
        new THREE.Vector2(0.005, -0.02),
        new THREE.Vector2(0.195, 0.01),
        new THREE.Vector2(0.188, 0.14),
        new THREE.Vector2(0.205, 0.28),
        new THREE.Vector2(0.242, 0.44),
        new THREE.Vector2(0.228, 0.52),
        new THREE.Vector2(0.165, 0.575),
        new THREE.Vector2(0.092, 0.6),
        new THREE.Vector2(0.005, 0.605),
      ];
  const chest = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 32), primaryMat);
  chest.scale.set(1.04, 1.0, 0.7);
  torso.add(chest);

  // Smooth Contoured Waist Belt / Sash (oval TorusGeometry hugging the sculpted waist)
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(waistW * 0.53, 0.036, 14, 32),
    npc.outfit === 'merchant' || npc.outfit === 'romanToga' ? secondaryMat : leatherMat
  );
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.06, 0.72, 1.0);
  belt.position.y = 0.075;
  torso.add(belt);

  // Outfit-specific sculpted organic accessories (zero BoxGeometry)
  if (npc.outfit === 'romanToga') {
    // Draped curved diagonal senator sash via TubeGeometry
    const sashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.17, 0.52, -0.02),
      new THREE.Vector3(-0.11, 0.42, 0.155),
      new THREE.Vector3(0.06, 0.24, 0.165),
      new THREE.Vector3(0.19, 0.08, 0.02),
      new THREE.Vector3(0.12, 0.14, -0.155),
      new THREE.Vector3(-0.08, 0.35, -0.155),
      new THREE.Vector3(-0.17, 0.52, -0.02),
    ]);
    const sash = new THREE.Mesh(new THREE.TubeGeometry(sashCurve, 36, 0.044, 14, true), secondaryMat);
    torso.add(sash);

    // Gracefully flared LatheGeometry floor-length toga skirt
    const togaSkirtProfile = [
      new THREE.Vector2(0.32, -0.78),
      new THREE.Vector2(0.30, -0.58),
      new THREE.Vector2(0.26, -0.32),
      new THREE.Vector2(0.22, -0.08),
      new THREE.Vector2(waistW * 0.56, 0.06),
    ];
    const togaSkirt = new THREE.Mesh(new THREE.LatheGeometry(togaSkirtProfile, 32), primaryMat);
    togaSkirt.scale.set(1.04, 1, 0.82);
    torso.add(togaSkirt);
  } else if (npc.outfit === 'merchant') {
    // Curved tailored vest lapel braids
    for (const sx of [-1, 1]) {
      const lapelCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 0.09, torsoH - 0.03, 0.09),
        new THREE.Vector3(sx * 0.14, torsoH * 0.55, 0.15),
        new THREE.Vector3(sx * 0.12, 0.09, 0.13),
      ]);
      const lapel = new THREE.Mesh(new THREE.TubeGeometry(lapelCurve, 20, 0.032, 12, false), secondaryMat);
      torso.add(lapel);
    }
    // Rounded leather satchel slung via curved shoulder strap
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, torsoH - 0.02, 0.01),
      new THREE.Vector3(0.03, torsoH * 0.52, 0.165),
      new THREE.Vector3(-waistW * 0.6, 0.08, 0.05),
      new THREE.Vector3(-0.04, torsoH * 0.45, -0.155),
      new THREE.Vector3(0.15, torsoH - 0.02, 0.01),
    ]);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 32, 0.016, 10, true), leatherMat);
    torso.add(strap);

    const satchel = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.11, 10, 18), leatherMat);
    satchel.scale.set(0.78, 1.0, 1.15);
    satchel.position.set(-waistW * 0.62, 0.02, 0.01);
    torso.add(satchel);
  } else if (npc.outfit === 'guard') {
    // Contoured sculpted bronze/steel breastplate (LatheGeometry)
    const cuirassProfile = [
      new THREE.Vector2(0.17, 0.09),
      new THREE.Vector2(0.21, 0.24),
      new THREE.Vector2(0.248, 0.42),
      new THREE.Vector2(0.22, 0.53),
      new THREE.Vector2(0.12, 0.57),
    ];
    const plate = new THREE.Mesh(new THREE.LatheGeometry(cuirassProfile, 28), secondaryMat);
    plate.scale.set(1.06, 1.0, 0.74);
    torso.add(plate);

    // Rounded domed shoulder pauldrons
    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.135, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        secondaryMat
      );
      pauldron.position.set(sx * (shoulderW * 0.56), torsoH - 0.03, 0);
      pauldron.rotation.z = sx * -0.26;
      torso.add(pauldron);
    }
  } else if (npc.outfit === 'artisan') {
    // Curved contoured craftsman apron (partial smooth cylinder + neck loop)
    const apron = new THREE.Mesh(
      new THREE.CylinderGeometry(
        waistW * 0.52,
        waistW * 0.62,
        0.68,
        24,
        1,
        true,
        -Math.PI * 0.36,
        Math.PI * 0.72
      ),
      secondaryMat
    );
    apron.scale.set(1.04, 1, 0.76);
    apron.position.set(0, 0.06, 0.02);
    torso.add(apron);

    const apronStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.016, 10, 24),
      leatherMat
    );
    apronStrap.rotation.x = Math.PI / 2 - 0.25;
    apronStrap.position.set(0, torsoH + 0.01, 0.02);
    torso.add(apronStrap);
  } else if (npc.outfit === 'noble') {
    // Gilded collar ring + gracefully draping curved shoulder cloak
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.032, 14, 28), secondaryMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, torsoH + 0.01, 0);
    torso.add(collar);

    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(
        shoulderW * 0.44,
        shoulderW * 0.76,
        1.02,
        24,
        1,
        true,
        Math.PI * 0.66,
        Math.PI * 0.68
      ),
      secondaryMat
    );
    cape.position.set(0, 0.04, -0.02);
    cape.rotation.x = 0.07;
    torso.add(cape);
  }

  // Smooth flared LatheGeometry skirt for female citizen / noble / merchant
  if (isFemale && npc.outfit !== 'romanToga' && npc.outfit !== 'guard') {
    const skirtProfile = [
      new THREE.Vector2(0.32, -0.52),
      new THREE.Vector2(0.285, -0.34),
      new THREE.Vector2(0.23, -0.14),
      new THREE.Vector2(waistW * 0.56, 0.04),
    ];
    const skirt = new THREE.Mesh(
      new THREE.LatheGeometry(skirtProfile, 32),
      npc.outfit === 'artisan' ? pantsMat : primaryMat
    );
    skirt.scale.set(1.04, 1, 0.82);
    torso.add(skirt);
  }

  // Head, Neck & Sculpted Hair
  const head = new THREE.Group();
  head.position.y = torsoH + 0.16;
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.09, 10, 20), skinMat);
  neck.position.y = -0.1;
  head.add(neck);

  // Subtle oval sculpted human cranium + jawline
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.158, 28, 22), skinMat);
  skull.scale.set(0.95, 1.07, 0.98);
  head.add(skull);

  // Subtle sculpted nose & rounded ears
  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.028, 8, 12), skinMat);
  nose.position.set(0, -0.005, 0.152);
  nose.rotation.x = -0.22;
  head.add(nose);

  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), skinMat);
    ear.scale.set(0.55, 1.15, 0.8);
    ear.position.set(sx * 0.15, -0.005, -0.005);
    head.add(ear);
  }

  // Expressive eyes
  const eyeMat = regMat(
    new THREE.MeshStandardMaterial({ color: 0x1b1a18, roughness: 0.3, metalness: 0.1, flatShading: false })
  );
  for (const sx of [-0.054, 0.054]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 12), eyeMat);
    eye.position.set(sx, 0.022, 0.142);
    head.add(eye);
  }

  // Hair & Sculpted Headgear
  if (npc.outfit === 'guard') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.178, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
      secondaryMat
    );
    helm.scale.set(0.98, 1.06, 1.02);
    helm.position.y = 0.018;
    head.add(helm);

    const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.016, 10, 28), secondaryMat);
    helmRim.rotation.x = Math.PI / 2;
    helmRim.position.y = 0.03;
    head.add(helmRim);

    // Sweeping arched Roman crest plume via TubeGeometry
    const crestCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.16, 0.12),
      new THREE.Vector3(0, 0.255, 0.02),
      new THREE.Vector3(0, 0.23, -0.12),
      new THREE.Vector3(0, 0.11, -0.2),
    ]);
    const crest = new THREE.Mesh(new THREE.TubeGeometry(crestCurve, 24, 0.032, 12, false), primaryMat);
    head.add(crest);
  } else {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.169, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    hairCap.scale.set(0.98, 1.08, 1.02);
    hairCap.position.set(0, 0.022, -0.014);
    head.add(hairCap);

    if (isFemale) {
      // Sculpted flowing curved hair locks + smooth chignon bun
      for (const sx of [-0.075, 0, 0.075]) {
        const lockCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 0.09, -0.11),
          new THREE.Vector3(sx * 1.15, -0.04, -0.155),
          new THREE.Vector3(sx * 0.95, -0.18, -0.135),
        ]);
        const lock = new THREE.Mesh(new THREE.TubeGeometry(lockCurve, 18, 0.048, 12, false), hairMat);
        head.add(lock);
      }
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 16), hairMat);
      bun.position.set(0, 0.065, -0.168);
      head.add(bun);
      const hairTie = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.014, 10, 20), secondaryMat);
      hairTie.position.set(0, 0.065, -0.145);
      head.add(hairTie);
    }

    if (npc.outfit === 'merchant') {
      const turbanProfile = [
        new THREE.Vector2(0.148, 0.0),
        new THREE.Vector2(0.172, 0.045),
        new THREE.Vector2(0.162, 0.11),
        new THREE.Vector2(0.115, 0.155),
        new THREE.Vector2(0.005, 0.165),
      ];
      const cap = new THREE.Mesh(new THREE.LatheGeometry(turbanProfile, 28), secondaryMat);
      cap.position.y = 0.085;
      head.add(cap);
    } else if (npc.outfit === 'romanToga') {
      const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.166, 0.02, 12, 28), secondaryMat);
      laurel.rotation.x = Math.PI / 2 - 0.15;
      laurel.position.y = 0.085;
      head.add(laurel);
    } else if (npc.outfit === 'artisan') {
      const beretProfile = [
        new THREE.Vector2(0.138, 0.0),
        new THREE.Vector2(0.185, 0.035),
        new THREE.Vector2(0.175, 0.085),
        new THREE.Vector2(0.08, 0.115),
        new THREE.Vector2(0.005, 0.12),
      ];
      const beret = new THREE.Mesh(new THREE.LatheGeometry(beretProfile, 28), primaryMat);
      beret.position.set(0, 0.11, -0.02);
      beret.rotation.x = -0.14;
      head.add(beret);
    } else if (npc.outfit === 'noble') {
      if (isFemale) {
        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.022, 12, 28), secondaryMat);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 0.152;
        head.add(crown);
      } else {
        const hatProfile = [
          new THREE.Vector2(0.265, 0.0),
          new THREE.Vector2(0.255, 0.022),
          new THREE.Vector2(0.165, 0.03),
          new THREE.Vector2(0.155, 0.135),
          new THREE.Vector2(0.125, 0.168),
          new THREE.Vector2(0.005, 0.172),
        ];
        const hat = new THREE.Mesh(new THREE.LatheGeometry(hatProfile, 32), primaryMat);
        hat.position.y = 0.125;
        head.add(hat);
      }
    }
  }

  // Smooth Articulated Arms (CapsuleGeometry + spherical shoulder/elbow joints)
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulderW * 0.54 + 0.045), torsoH - 0.065, 0);

    const upperMat = npc.outfit === 'artisan' ? secondaryMat : primaryMat;
    const lowerMat = npc.outfit === 'artisan' || npc.outfit === 'romanToga' ? skinMat : primaryMat;

    // Rounded shoulder deltoid cap smoothing torso-to-arm joint
    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 14), upperMat);
    arm.add(shoulderJoint);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.21, 10, 18), upperMat);
    upperArm.position.y = -0.155;
    arm.add(upperArm);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), lowerMat);
    elbow.position.y = -0.29;
    arm.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.18, 10, 18), lowerMat);
    forearm.position.y = -0.42;
    arm.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 14), skinMat);
    hand.scale.set(0.88, 1.12, 0.78);
    hand.position.y = -0.565;
    arm.add(hand);

    // Guard holds upright ceremonial spear with LatheGeometry sculpted blade
    if (side === 1 && npc.outfit === 'guard') {
      const pole = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 2.2, 8, 16), leatherMat);
      pole.position.set(0.02, -0.05, 0.1);
      arm.add(pole);

      const spearProfile = [
        new THREE.Vector2(0.028, 0.0),
        new THREE.Vector2(0.044, 0.05),
        new THREE.Vector2(0.062, 0.12),
        new THREE.Vector2(0.036, 0.24),
        new THREE.Vector2(0.002, 0.34),
      ];
      const spearTip = new THREE.Mesh(new THREE.LatheGeometry(spearProfile, 16), secondaryMat);
      spearTip.scale.set(1.0, 1.0, 0.45);
      spearTip.position.set(0.02, 1.04, 0.1);
      arm.add(spearTip);
    }

    torso.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Smooth Articulated Legs (CapsuleGeometry thigh/calf + spherical knee + rounded boots)
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * (isFemale ? 0.102 : 0.122), 0.9, 0);

    const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.082, 18, 14), pantsMat);
    leg.add(hipJoint);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.28, 10, 20), pantsMat);
    thigh.position.y = -0.21;
    leg.add(thigh);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), pantsMat);
    knee.position.y = -0.41;
    leg.add(knee);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.27, 10, 20), pantsMat);
    calf.position.y = -0.6;
    leg.add(calf);

    // Sculpted rounded leather boot (ankle capsule + rounded toe capsule)
    const ankleCuff = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.07, 10, 18), leatherMat);
    ankleCuff.position.set(0, -0.77, 0);
    leg.add(ankleCuff);

    const bootFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.11, 10, 18), leatherMat);
    bootFoot.rotation.x = Math.PI / 2;
    bootFoot.scale.set(1.04, 1.0, 0.85);
    bootFoot.position.set(0, -0.84, 0.045);
    leg.add(bootFoot);

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

  const beamGeo = new THREE.CylinderGeometry(0.42, 0.72, 16, 24, 1, true);
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

  const diamondGeo = new THREE.OctahedronGeometry(0.55, 1);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xe59a3c,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    metalness: 0.35,
    flatShading: false,
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
