import * as THREE from 'three';
import { NpcData, QuestStatus } from '../types/sandbox';
import { MaterialLibrary } from './models';
import { buildSculptedHumanoid } from './humanoidBuilder';

export interface NpcRig {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
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

/**
 * Builds an anatomically realistic, articulated 3D NPC character using sculpted facial
 * anatomy, layered hair, parametric non-circular torso/limb lofting, hands, and tailored outfits.
 */
export function buildNpcCharacter(
  npc: Pick<
    NpcData,
    'name' | 'roleTitle' | 'gender' | 'outfit' | 'primaryColor' | 'secondaryColor' | 'skinTone' | 'hairColor' | 'quest'
  >,
  sharedMats: MaterialLibrary,
  isGhost = false
): NpcRig {
  const humanoid = buildSculptedHumanoid(
    {
      kind: 'npc',
      gender: npc.gender,
      outfit: npc.outfit,
      skinColor: npc.skinTone || '#e3b38e',
      hairColor: npc.hairColor || '#2a1d14',
      primaryColor: npc.primaryColor || '#b84a32',
      secondaryColor: npc.secondaryColor || '#e8dcc8',
      isGhost,
    },
    sharedMats
  );

  const group = humanoid.root;
  const ownedMaterials = humanoid.ownedMaterials;
  const ownedTextures = humanoid.ownedTextures;

  const regMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };
  const regTex = <T extends THREE.Texture>(t: T): T => {
    ownedTextures.push(t);
    return t;
  };

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
  nameSprite.position.set(0, 2.22, 0);
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
  questMarker.position.set(0, 2.72, 0);
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
    torso: humanoid.torso,
    head: humanoid.head,
    leftArm: humanoid.leftArm,
    rightArm: humanoid.rightArm,
    leftElbow: humanoid.leftElbow,
    rightElbow: humanoid.rightElbow,
    leftLeg: humanoid.leftLeg,
    rightLeg: humanoid.rightLeg,
    leftKnee: humanoid.leftKnee,
    rightKnee: humanoid.rightKnee,
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
