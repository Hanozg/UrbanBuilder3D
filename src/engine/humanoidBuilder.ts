import * as THREE from 'three';
import { NpcGender, NpcOutfit } from '../types/sandbox';
import { MaterialLibrary } from './models';

export interface ArticulatedHumanoidParts {
  root: THREE.Group;
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
  ownedMaterials: THREE.Material[];
  ownedTextures: THREE.Texture[];
}

export interface HumanoidSpec {
  kind: 'explorer' | 'npc';
  gender: NpcGender;
  outfit: NpcOutfit;
  skinColor: string | number;
  hairColor: string | number;
  primaryColor: string | number;
  secondaryColor: string | number;
  eyeColor?: number;
  isGhost?: boolean;
}

// ==================== SHARED PROCEDURAL MICRO-BUMP TEXTURES ====================

let cachedFabricBump: THREE.CanvasTexture | null = null;
let cachedSkinBump: THREE.CanvasTexture | null = null;

function getFabricBumpTexture(): THREE.CanvasTexture {
  if (cachedFabricBump) return cachedFabricBump;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);

  // Fine woven linen/wool cross-hatch micro-texture
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      const weave = ((x + y) % 4 === 0 ? 18 : -14) + (((x * 13 + y * 29) % 11) - 5);
      const v = Math.max(0, Math.min(255, 128 + weave));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.needsUpdate = true;
  cachedFabricBump = tex;
  return tex;
}

function getSkinBumpTexture(): THREE.CanvasTexture {
  if (cachedSkinBump) return cachedSkinBump;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  let seed = 4219;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = 122 + ((seed % 13) - 6);
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  cachedSkinBump = tex;
  return tex;
}

// ==================== PARAMETRIC ANATOMICAL GEOMETRY BUILDERS ====================

interface LoftSlice {
  y: number;
  rx: number;
  rz: number;
  zOffset?: number;
  xOffset?: number;
  /** Subtle chest/pectoral or bust fullness on front (+Z) */
  chestLift?: number;
  /** Subtle spinal indentation along the back (-Z) */
  backGroove?: number;
  /** Slight squaring of shoulders/ribcage (0 = ellipse, 0.25 = natural torso) */
  squareness?: number;
  /** Vertical drapery fold amplitude for skirts/togas/capes */
  pleatAmp?: number;
  pleatFreq?: number;
  /** Open front gap angle (for open jackets/vests) — unused if 0 */
  chestSplit?: number;
}

/**
 * Builds a closed, smoothly shaded anatomical BufferGeometry lofted through
 * custom non-circular human cross-sections (unlike radially symmetric LatheGeometry).
 */
function createAnatomicalLoft(
  slices: LoftSlice[],
  radialSegments = 28,
  capBottom = true,
  capTop = true
): THREE.BufferGeometry {
  const ringVerts = radialSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const yMin = slices[0].y;
  const yMax = slices[slices.length - 1].y;
  const ySpan = Math.max(0.0001, yMax - yMin);

  for (let s = 0; s < slices.length; s++) {
    const sl = slices[s];
    const v = (sl.y - yMin) / ySpan;
    const zOff = sl.zOffset ?? 0;
    const xOff = sl.xOffset ?? 0;
    const chestLift = sl.chestLift ?? 0;
    const backGroove = sl.backGroove ?? 0;
    const sq = sl.squareness ?? 0;
    const pleatAmp = sl.pleatAmp ?? 0;
    const pleatFreq = sl.pleatFreq ?? 8;
    const chestSplit = sl.chestSplit ?? 0;

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;
      // theta = 0 -> +X, PI/2 -> +Z (front), PI -> -X, 3PI/2 -> -Z (back)
      const c = Math.cos(theta);
      const sn = Math.sin(theta);

      // Soft superellipse shaping for realistic human ribcage / shoulder fullness
      const shapeFactor = sq > 0 ? 1 + sq * Math.pow(Math.sin(2 * theta), 2) * 0.35 : 1;

      let rx = sl.rx * shapeFactor;
      let rz = sl.rz * shapeFactor;

      // Cloth drapery pleats
      if (pleatAmp > 0) {
        const pleat = 1 + pleatAmp * Math.cos(theta * pleatFreq);
        rx *= pleat;
        rz *= pleat;
      }

      let x = xOff + c * rx;
      let z = zOff + sn * rz;

      // Front anatomical chest/pectoral/bust contouring (+Z)
      if (sn > 0.15 && chestLift > 0) {
        // Dual pectoral / bust mounds centered around |x| ~ 0.45 * rx
        const sideNorm = Math.abs(c);
        const mound = Math.exp(-Math.pow((sideNorm - 0.44) / 0.34, 2)) * Math.pow(sn, 1.3);
        const sternumDip = chestSplit > 0 ? Math.exp(-Math.pow(c / 0.22, 2)) * sn * chestSplit : 0;
        z += chestLift * mound - sternumDip;
      }

      // Subtle dorsal spine groove on the back (-Z)
      if (sn < -0.25 && backGroove > 0) {
        const spine = Math.exp(-Math.pow(c / 0.28, 2)) * Math.pow(-sn, 1.4);
        z += backGroove * spine; // pushes slightly inward (+Z) along the back
      }

      positions.push(x, sl.y, z);
      uvs.push(u, v);
    }
  }

  for (let s = 0; s < slices.length - 1; s++) {
    const rowA = s * ringVerts;
    const rowB = (s + 1) * ringVerts;
    for (let i = 0; i < radialSegments; i++) {
      const a = rowA + i;
      const b = rowA + i + 1;
      const c = rowB + i + 1;
      const d = rowB + i;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  if (capBottom) {
    const sl = slices[0];
    const centerIdx = positions.length / 3;
    positions.push(sl.xOffset ?? 0, sl.y, sl.zOffset ?? 0);
    uvs.push(0.5, 0);
    for (let i = 0; i < radialSegments; i++) {
      indices.push(centerIdx, i, i + 1);
    }
  }

  if (capTop) {
    const sl = slices[slices.length - 1];
    const centerIdx = positions.length / 3;
    positions.push(sl.xOffset ?? 0, sl.y, sl.zOffset ?? 0);
    uvs.push(0.5, 1);
    const topRow = (slices.length - 1) * ringVerts;
    for (let i = 0; i < radialSegments; i++) {
      indices.push(centerIdx, topRow + i + 1, topRow + i);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a tapered curved hair lock / sash / eyebrow ribbon along a 3D CatmullRomCurve3
 * with elliptical cross-section and smooth tapering at both ends.
 */
function createTaperedStrand(
  points: THREE.Vector3[],
  baseRadiusX: number,
  baseRadiusY: number,
  tubularSegments = 20,
  radialSegments = 10,
  tipTaperStart = 0.25,
  tipTaperEnd = 0.15
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const ringVerts = radialSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pt = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, pt);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    // Smooth taper at root and tip
    let taper = 1.0;
    if (t < 0.14) {
      taper = THREE.MathUtils.lerp(tipTaperStart, 1.0, t / 0.14);
    } else if (t > 0.62) {
      const k = (t - 0.62) / 0.38;
      taper = THREE.MathUtils.lerp(1.0, tipTaperEnd, k * k);
    }

    const rx = baseRadiusX * taper;
    const ry = baseRadiusY * taper;

    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const angle = u * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      v.copy(pt).addScaledVector(N, ca * rx).addScaledVector(B, sa * ry);
      positions.push(v.x, v.y, v.z);
      uvs.push(u, t);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    const rowA = i * ringVerts;
    const rowB = (i + 1) * ringVerts;
    for (let j = 0; j < radialSegments; j++) {
      const a = rowA + j;
      const b = rowA + j + 1;
      const c = rowB + j + 1;
      const d = rowB + j;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Anatomically sculpted human head mesh: cranial dome, slightly narrower temples,
 * brow ridge, recessed orbital eye sockets, cheekbones, tapered jaw & rounded chin.
 * Face looks toward +Z, height ~0.23m.
 */
function createSculptedHeadGeometry(isFemale: boolean): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 40, 32);
  const pos = geo.attributes.position;

  const scaleX = isFemale ? 0.088 : 0.094;
  const scaleY = isFemale ? 0.114 : 0.119;
  const scaleZ = isFemale ? 0.102 : 0.107;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const ax = Math.abs(x);

    // 1. Cranium fullness in the upper-back (occipital/parietal dome)
    if (y > 0.05 && z < 0.2) {
      const backWeight = Math.max(0, -z + 0.25) * Math.min(1, y * 1.4);
      z -= backWeight * 0.09;
      y += backWeight * 0.04;
    }

    // 2. Slight temple narrowing at upper sides
    if (y > 0.05 && y < 0.65 && ax > 0.55) {
      const temple = Math.exp(-Math.pow((y - 0.3) / 0.28, 2)) * Math.max(0, ax - 0.55);
      x *= 1 - temple * 0.14;
    }

    // 3. Tapered jawline & distinct human chin (lower face y < 0)
    if (y < 0.05) {
      const lowerT = Math.min(1, (0.05 - y) / 1.05);
      // Taper width smoothly toward chin; female slightly narrower heart-oval, male stronger jaw
      const jawTaper = isFemale
        ? 1 - Math.pow(lowerT, 1.35) * 0.44
        : 1 - Math.pow(lowerT, 1.65) * 0.34;
      x *= jawTaper;

      // Slight defined jaw angle (gonion) on male around y = -0.45
      if (!isFemale && z < 0.25 && z > -0.35 && y < -0.15 && y > -0.68) {
        const jawAngle = Math.exp(-Math.pow((y + 0.42) / 0.18, 2)) * ax;
        x += Math.sign(x) * jawAngle * 0.06;
      }

      // Forward chin projection at bottom-front
      if (z > 0.15 && y < -0.45) {
        const chin =
          Math.exp(-Math.pow(ax / 0.38, 2)) *
          Math.exp(-Math.pow((y + 0.78) / 0.24, 2)) *
          Math.max(0, z);
        z += chin * (isFemale ? 0.11 : 0.15);
        y -= chin * 0.05;
      }

      // Under-chin/jaw tuck toward the neck in the back-bottom
      if (z < 0.05 && y < -0.35) {
        const under = Math.min(1, (-0.35 - y) / 0.65) * Math.max(0, 0.1 - z);
        y += under * 0.22;
      }
    }

    // 4. Sculpted front face planes (z > 0.25)
    if (z > 0.25) {
      const frontMask = Math.min(1, (z - 0.25) / 0.45);

      // Subtle forehead slope
      if (y > 0.32) {
        const fSlope = Math.min(1, (y - 0.32) / 0.55) * frontMask;
        z -= fSlope * 0.055;
      }

      // Subtle brow ridge above eye sockets
      const brow =
        Math.exp(-Math.pow((y - 0.22) / 0.11, 2)) *
        Math.exp(-Math.pow(ax / 0.62, 2)) *
        frontMask;
      z += brow * (isFemale ? 0.032 : 0.058);

      // Recessed orbital eye sockets (so eyeballs sit naturally inside!)
      const eyeSocket =
        Math.exp(-Math.pow((ax - 0.34) / 0.19, 2)) *
        Math.exp(-Math.pow((y - 0.06) / 0.13, 2)) *
        frontMask;
      z -= eyeSocket * 0.115;

      // Malar cheekbones (outer-lower sides of eye sockets)
      const cheek =
        Math.exp(-Math.pow((ax - 0.54) / 0.22, 2)) *
        Math.exp(-Math.pow((y + 0.11) / 0.17, 2)) *
        frontMask;
      z += cheek * (isFemale ? 0.068 : 0.055);
      x += Math.sign(x) * cheek * 0.045;

      // Subtle muzzle / mouth mound so lips sit naturally on a curved dental arch
      const mouthMound =
        Math.exp(-Math.pow(ax / 0.34, 2)) *
        Math.exp(-Math.pow((y + 0.41) / 0.17, 2)) *
        frontMask;
      z += mouthMound * 0.055;
    }

    pos.setXYZ(i, x * scaleX, y * scaleY, z * scaleZ);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a contoured human shoe / boot / sandal sitting cleanly on y = 0 at local bottom.
 * Local origin is at the ankle center (y = 0 at top of heel/ankle joint, sole at y = -0.105).
 */
function createSculptedShoeGroup(
  shoeMat: THREE.Material,
  soleMat: THREE.Material,
  isFemale: boolean,
  isSandal: boolean,
  skinMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const wScale = isFemale ? 0.88 : 1.0;
  const lScale = isFemale ? 0.91 : 1.0;

  // Flat ergonomic shoe sole (extruded rounded footprint)
  const soleShape = new THREE.Shape();
  const hw = 0.052 * wScale;
  const heelZ = -0.065 * lScale;
  const toeZ = 0.165 * lScale;
  soleShape.moveTo(0, heelZ);
  soleShape.bezierCurveTo(hw * 0.88, heelZ, hw * 0.92, -0.01, hw * 0.78, 0.03);
  soleShape.bezierCurveTo(hw * 1.08, 0.08, hw * 0.98, toeZ * 0.86, 0, toeZ);
  soleShape.bezierCurveTo(-hw * 0.98, toeZ * 0.86, -hw * 1.08, 0.08, -hw * 0.78, 0.03);
  soleShape.bezierCurveTo(-hw * 0.92, -0.01, -hw * 0.88, heelZ, 0, heelZ);

  const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 16,
  });
  soleGeo.rotateX(Math.PI / 2); // shape Y becomes +Z, extrude depth goes -Y
  const sole = new THREE.Mesh(soleGeo, soleMat);
  sole.position.y = -0.078; // sole bottom reaches y = -0.105
  g.add(sole);

  // Upper foot / boot vamp sculpted via loft along Z (rotated: y' = -z, z' = +y)
  const footSlices: LoftSlice[] = [
    { y: heelZ + 0.008, rx: hw * 0.82, rz: 0.032, zOffset: -0.002 },
    { y: -0.01, rx: hw * 0.88, rz: 0.044, zOffset: -0.016 },
    { y: 0.045, rx: hw * 0.92, rz: 0.036, zOffset: -0.006 },
    { y: 0.105 * lScale, rx: hw * 0.95, rz: 0.025, zOffset: 0.008 },
    { y: toeZ - 0.008, rx: hw * 0.56, rz: 0.015, zOffset: 0.016 },
    { y: toeZ, rx: 0.012, rz: 0.008, zOffset: 0.02 },
  ];
  const upperGeo = createAnatomicalLoft(footSlices, 20, true, true);
  upperGeo.rotateX(Math.PI / 2); // loft Y -> +Z, loft Z -> -Y
  const upper = new THREE.Mesh(upperGeo, isSandal ? skinMat : shoeMat);
  upper.position.y = -0.06;
  g.add(upper);

  if (isSandal) {
    // Classic Roman leather sandal straps across instep & ankle
    for (const sz of [0.02, 0.075]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(hw * 0.96, 0.007, 8, 18, Math.PI),
        shoeMat
      );
      strap.position.set(0, -0.068, sz);
      strap.scale.set(1.0, 0.72, 1.0);
      g.add(strap);
    }
    const ankleStrap = new THREE.Mesh(new THREE.TorusGeometry(0.047 * wScale, 0.008, 8, 20), shoeMat);
    ankleStrap.rotation.x = Math.PI / 2;
    ankleStrap.position.y = 0.015;
    g.add(ankleStrap);
  } else {
    // Boot/shoe collar wrapping ankle seamlessly
    const cuffGeo = createAnatomicalLoft(
      [
        { y: -0.055, rx: 0.054 * wScale, rz: 0.062 * lScale, zOffset: 0.005 },
        { y: 0.01, rx: 0.052 * wScale, rz: 0.056 * lScale, zOffset: 0.0 },
        { y: 0.075, rx: 0.055 * wScale, rz: 0.058 * lScale, zOffset: -0.003 },
      ],
      20
    );
    const cuff = new THREE.Mesh(cuffGeo, shoeMat);
    g.add(cuff);
  }

  return g;
}

/**
 * Builds a realistic sculpted human hand (tapered palm + slightly curved fingers + opposable thumb).
 * Origin at the wrist joint; extends downward along -Y (~0.15m).
 */
function createSculptedHandGroup(
  side: -1 | 1,
  skinMat: THREE.Material,
  isFemale: boolean
): THREE.Group {
  const hand = new THREE.Group();
  const sc = isFemale ? 0.9 : 1.0;

  // Tapered anatomical palm (flatter in X, wider in Z along thumb-to-pinky axis when arms hang naturally!)
  // When arms hang at sides, palm faces inward (-side * X), thumb faces forward (+Z)!
  const palmGeo = createAnatomicalLoft(
    [
      { y: -0.088 * sc, rx: 0.018 * sc, rz: 0.042 * sc, zOffset: 0.005 },
      { y: -0.045 * sc, rx: 0.022 * sc, rz: 0.045 * sc, zOffset: 0.003 },
      { y: 0.0, rx: 0.024 * sc, rz: 0.032 * sc, zOffset: 0.0 },
    ],
    16
  );
  const palm = new THREE.Mesh(palmGeo, skinMat);
  hand.add(palm);

  // 4 sculpted gently curled fingers
  const fingerOffsets = [
    { z: 0.028, len: 0.064, r: 0.0092 },
    { z: 0.01, len: 0.072, r: 0.0095 },
    { z: -0.009, len: 0.066, r: 0.009 },
    { z: -0.027, len: 0.052, r: 0.008 },
  ];
  for (const f of fingerOffsets) {
    const fCurve = [
      new THREE.Vector3(0, -0.082 * sc, f.z * sc),
      new THREE.Vector3(-side * 0.008 * sc, (-0.082 - f.len * 0.55) * sc, f.z * sc),
      new THREE.Vector3(-side * 0.022 * sc, (-0.082 - f.len) * sc, (f.z + 0.002) * sc),
    ];
    const finger = new THREE.Mesh(
      createTaperedStrand(fCurve, f.r * sc, f.r * sc, 8, 8, 1.0, 0.65),
      skinMat
    );
    hand.add(finger);
  }

  // Opposable thumb on the front (+Z) curving slightly inward
  const thumbCurve = [
    new THREE.Vector3(-side * 0.005 * sc, -0.03 * sc, 0.032 * sc),
    new THREE.Vector3(-side * 0.018 * sc, -0.065 * sc, 0.054 * sc),
    new THREE.Vector3(-side * 0.026 * sc, -0.098 * sc, 0.046 * sc),
  ];
  const thumb = new THREE.Mesh(
    createTaperedStrand(thumbCurve, 0.0115 * sc, 0.0105 * sc, 8, 8, 1.0, 0.68),
    skinMat
  );
  hand.add(thumb);

  return hand;
}

/**
 * Adds realistic facial features (recessed eyeballs with sclera/iris/pupil/catchlight,
 * upper eyelid lash line, sculpted eyebrows, sculpted nasal bridge & tip, soft lips, ears)
 * onto the sculpted head group.
 */
function addRealisticFacialFeatures(
  headGroup: THREE.Group,
  isFemale: boolean,
  skinMat: THREE.MeshStandardMaterial,
  hairMat: THREE.MeshStandardMaterial,
  regMat: <T extends THREE.Material>(m: T) => T,
  eyeHex: number
) {
  const skinColor = skinMat.color;
  const lipColor = skinColor.clone().lerp(new THREE.Color(isFemale ? '#b85c58' : '#a8645a'), isFemale ? 0.42 : 0.28);
  const lidColor = skinColor.clone().multiplyScalar(0.68);

  const scleraMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f1eb,
      roughness: 0.22,
      metalness: 0.02,
      flatShading: false,
    })
  );
  const irisMat = regMat(
    new THREE.MeshStandardMaterial({
      color: eyeHex,
      roughness: 0.2,
      metalness: 0.08,
      flatShading: false,
    })
  );
  const pupilMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0e0e11,
      roughness: 0.1,
      metalness: 0.05,
      flatShading: false,
    })
  );
  const glintMat = regMat(
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const lashMat = regMat(
    new THREE.MeshStandardMaterial({
      color: hairMat.color.clone().multiplyScalar(0.45),
      roughness: 0.72,
      metalness: 0.02,
      flatShading: false,
    })
  );
  const lidMat = regMat(
    new THREE.MeshStandardMaterial({
      color: lidColor,
      roughness: 0.72,
      metalness: 0.02,
      flatShading: false,
    })
  );
  const lipMat = regMat(
    new THREE.MeshStandardMaterial({
      color: lipColor,
      roughness: 0.56,
      metalness: 0.02,
      flatShading: false,
    })
  );

  const eyeX = isFemale ? 0.031 : 0.0335;
  const eyeY = 0.008;
  const eyeZ = isFemale ? 0.084 : 0.088;

  // Eyes nestled in orbital sockets
  for (const sx of [-1, 1]) {
    const eyePivot = new THREE.Group();
    eyePivot.position.set(sx * eyeX, eyeY, eyeZ);
    eyePivot.rotation.y = sx * 0.14;

    // Eyeball (sclera)
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 18, 14), scleraMat);
    sclera.scale.set(1.04, 0.88, 0.85);
    eyePivot.add(sclera);

    // Iris
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 16, 12), irisMat);
    iris.scale.set(1.0, 1.0, 0.45);
    iris.position.set(0, 0, 0.0095);
    eyePivot.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0044, 12, 10), pupilMat);
    pupil.scale.set(1.0, 1.0, 0.42);
    pupil.position.set(0, 0, 0.0114);
    eyePivot.add(pupil);

    // Tiny glossy catchlight dot (brings the face instantly to life!)
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0017, 8, 8), glintMat);
    glint.position.set(0.0028, 0.0026, 0.0124);
    eyePivot.add(glint);

    // Sculpted upper eyelid hood + subtle dark lash line
    const upperLidCurve = [
      new THREE.Vector3(-sx * 0.0145, -0.001, 0.004),
      new THREE.Vector3(0, 0.0088, 0.0118),
      new THREE.Vector3(sx * 0.0145, 0.001, 0.0055),
    ];
    const lashLine = new THREE.Mesh(
      createTaperedStrand(upperLidCurve, 0.0022, 0.0024, 12, 8, 0.4, 0.45),
      lashMat
    );
    eyePivot.add(lashLine);

    const upperLidFold = new THREE.Mesh(
      createTaperedStrand(
        [
          new THREE.Vector3(-sx * 0.015, 0.002, 0.005),
          new THREE.Vector3(0, 0.0115, 0.0115),
          new THREE.Vector3(sx * 0.015, 0.0035, 0.006),
        ],
        0.0034,
        0.0026,
        12,
        8,
        0.4,
        0.4
      ),
      lidMat
    );
    eyePivot.add(upperLidFold);

    headGroup.add(eyePivot);

    // Sculpted arched eyebrow
    const browPts = [
      new THREE.Vector3(sx * (eyeX - 0.017), eyeY + 0.019, eyeZ + 0.011),
      new THREE.Vector3(sx * (eyeX + 0.002), eyeY + (isFemale ? 0.0255 : 0.0235), eyeZ + 0.012),
      new THREE.Vector3(sx * (eyeX + 0.019), eyeY + (isFemale ? 0.0195 : 0.018), eyeZ + 0.001),
    ];
    const brow = new THREE.Mesh(
      createTaperedStrand(
        browPts,
        isFemale ? 0.0028 : 0.0042,
        isFemale ? 0.0022 : 0.003,
        12,
        8,
        0.55,
        0.25
      ),
      hairMat
    );
    headGroup.add(brow);
  }

  // Sculpted Anatomical Nose (curved bridge -> soft tip -> nostril wings)
  const nosePts = [
    new THREE.Vector3(0, 0.014, eyeZ + 0.011),
    new THREE.Vector3(0, -0.007, eyeZ + 0.021),
    new THREE.Vector3(0, -0.024, eyeZ + (isFemale ? 0.026 : 0.029)),
    new THREE.Vector3(0, -0.032, eyeZ + 0.017),
  ];
  const noseBridge = new THREE.Mesh(
    createTaperedStrand(
      nosePts,
      isFemale ? 0.0072 : 0.0086,
      isFemale ? 0.007 : 0.0082,
      14,
      10,
      0.7,
      0.85
    ),
    skinMat
  );
  headGroup.add(noseBridge);

  for (const sx of [-1, 1]) {
    const nostril = new THREE.Mesh(
      new THREE.SphereGeometry(isFemale ? 0.0056 : 0.0068, 12, 10),
      skinMat
    );
    nostril.scale.set(1.05, 0.78, 0.9);
    nostril.position.set(sx * (isFemale ? 0.0078 : 0.0092), -0.027, eyeZ + 0.017);
    headGroup.add(nostril);
  }

  // Sculpted Upper & Lower Lips (soft calm expression)
  const lipZ = eyeZ + 0.012;
  const mouthW = isFemale ? 0.022 : 0.025;
  const upperLipPts = [
    new THREE.Vector3(-mouthW, -0.052, lipZ - 0.008),
    new THREE.Vector3(-mouthW * 0.42, -0.048, lipZ + 0.001),
    new THREE.Vector3(0, -0.0495, lipZ + 0.0025),
    new THREE.Vector3(mouthW * 0.42, -0.048, lipZ + 0.001),
    new THREE.Vector3(mouthW, -0.052, lipZ - 0.008),
  ];
  const upperLip = new THREE.Mesh(
    createTaperedStrand(upperLipPts, 0.0044, isFemale ? 0.0046 : 0.0038, 16, 8, 0.25, 0.25),
    lipMat
  );
  headGroup.add(upperLip);

  const lowerLipPts = [
    new THREE.Vector3(-mouthW * 0.88, -0.053, lipZ - 0.007),
    new THREE.Vector3(0, -0.0575, lipZ + 0.0018),
    new THREE.Vector3(mouthW * 0.88, -0.053, lipZ - 0.007),
  ];
  const lowerLip = new THREE.Mesh(
    createTaperedStrand(lowerLipPts, 0.0052, isFemale ? 0.0054 : 0.0046, 14, 8, 0.25, 0.25),
    lipMat
  );
  headGroup.add(lowerLip);

  // Sculpted Human Ears
  for (const sx of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(sx * (isFemale ? 0.086 : 0.092), -0.008, -0.004);
    earGroup.rotation.y = sx * -0.22;

    const earShell = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 12), skinMat);
    earShell.scale.set(0.42, 1.25, 0.72);
    earGroup.add(earShell);

    const earRim = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0038, 8, 16, Math.PI * 1.4), skinMat);
    earRim.rotation.y = Math.PI / 2;
    earRim.rotation.z = -0.35;
    earRim.scale.set(0.8, 1.22, 1.0);
    earGroup.add(earRim);

    headGroup.add(earGroup);
  }
}

/**
 * Builds natural multi-layered human hair (hairline skull base + swept layered locks)
 * rather than a flat helmet sphere.
 */
function addLayeredHumanHair(
  headGroup: THREE.Group,
  isFemale: boolean,
  hairMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  variant: 'explorer' | NpcOutfit
) {
  const rx = isFemale ? 0.094 : 0.099;
  const ry = isFemale ? 0.116 : 0.121;
  const rz = isFemale ? 0.108 : 0.112;

  // Sculpted base hair cap tilted back to expose forehead cleanly with a natural hairline
  const hairBase = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairBase.scale.set(rx, ry, rz);
  hairBase.position.set(0, 0.008, -0.01);
  hairBase.rotation.x = -0.26;
  headGroup.add(hairBase);

  // Lower nape hair volume hugging the back of the cranium
  const napeCap = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 16, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.45),
    hairMat
  );
  napeCap.scale.set(rx * 0.99, ry * 0.96, rz * 1.02);
  napeCap.position.set(0, -0.006, -0.012);
  headGroup.add(napeCap);

  if (isFemale) {
    // Soft side-parted swept forehead/temple bangs
    const leftBang = [
      new THREE.Vector3(-0.025, 0.105, 0.065),
      new THREE.Vector3(-0.068, 0.072, 0.072),
      new THREE.Vector3(-0.092, 0.005, 0.048),
      new THREE.Vector3(-0.088, -0.085, 0.025),
    ];
    const rightBang = [
      new THREE.Vector3(-0.015, 0.108, 0.068),
      new THREE.Vector3(0.042, 0.085, 0.076),
      new THREE.Vector3(0.086, 0.032, 0.056),
      new THREE.Vector3(0.092, -0.075, 0.028),
    ];
    headGroup.add(new THREE.Mesh(createTaperedStrand(leftBang, 0.024, 0.016, 18, 10, 0.55, 0.25), hairMat));
    headGroup.add(new THREE.Mesh(createTaperedStrand(rightBang, 0.028, 0.018, 18, 10, 0.55, 0.25), hairMat));

    // Crown layered volume waves
    for (const sx of [-0.045, 0, 0.045]) {
      const topWave = [
        new THREE.Vector3(sx * 0.6, 0.106, 0.05),
        new THREE.Vector3(sx * 1.15, 0.118, -0.01),
        new THREE.Vector3(sx * 1.2, 0.075, -0.095),
      ];
      headGroup.add(new THREE.Mesh(createTaperedStrand(topWave, 0.032, 0.019, 14, 10, 0.5, 0.65), hairMat));
    }

    if (variant === 'noble' || variant === 'romanToga') {
      // Elegant sculpted braided low chignon + decorative ribbon
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 16), hairMat);
      bun.scale.set(1.15, 0.92, 0.88);
      bun.position.set(0, -0.015, -0.122);
      headGroup.add(bun);

      const braidRing = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.011, 10, 22), accentMat);
      braidRing.position.set(0, -0.012, -0.104);
      headGroup.add(braidRing);
    } else {
      // Flowing shoulder-length layered waves cascading behind neck and shoulders
      const backAngles = [-0.072, -0.038, 0, 0.038, 0.072];
      for (const bx of backAngles) {
        const edgePull = Math.abs(bx) * 0.35;
        const lockPts = [
          new THREE.Vector3(bx, 0.075, -0.088 + edgePull),
          new THREE.Vector3(bx * 1.18, -0.01, -0.116 + edgePull),
          new THREE.Vector3(bx * 1.12, -0.115, -0.105 + edgePull * 1.4),
          new THREE.Vector3(bx * 1.05, -0.195, -0.085 + edgePull * 1.8),
        ];
        headGroup.add(
          new THREE.Mesh(createTaperedStrand(lockPts, 0.028, 0.017, 18, 10, 0.75, 0.22), hairMat)
        );
      }
    }
  } else {
    // Male natural layered swept haircut (textured top locks + neat sideburns)
    const lockConfigs = [
      { x0: -0.045, x1: -0.058, yTop: 0.116, zF: 0.074, r: 0.026 },
      { x0: -0.01, x1: 0.005, yTop: 0.124, zF: 0.082, r: 0.031 },
      { x0: 0.032, x1: 0.052, yTop: 0.118, zF: 0.076, r: 0.028 },
      { x0: 0.065, x1: 0.082, yTop: 0.098, zF: 0.054, r: 0.022 },
      { x0: -0.072, x1: -0.086, yTop: 0.092, zF: 0.048, r: 0.021 },
    ];
    for (const lc of lockConfigs) {
      const pts = [
        new THREE.Vector3(lc.x0, 0.072, lc.zF),
        new THREE.Vector3(lc.x1, lc.yTop, 0.015),
        new THREE.Vector3(lc.x1 * 1.04, 0.078, -0.072),
        new THREE.Vector3(lc.x1 * 0.92, -0.008, -0.106),
      ];
      headGroup.add(new THREE.Mesh(createTaperedStrand(pts, lc.r, lc.r * 0.62, 16, 10, 0.42, 0.35), hairMat));
    }

    // Subtle sculpted sideburns framing ears
    for (const sx of [-1, 1]) {
      const burn = [
        new THREE.Vector3(sx * 0.088, 0.035, 0.022),
        new THREE.Vector3(sx * 0.089, -0.005, 0.024),
        new THREE.Vector3(sx * 0.084, -0.036, 0.026),
      ];
      headGroup.add(new THREE.Mesh(createTaperedStrand(burn, 0.009, 0.006, 8, 6, 0.7, 0.25), hairMat));
    }

    // Refined short sculpted beard for merchant & artisan male characters
    if (variant === 'merchant' || variant === 'artisan') {
      const jawBeard = [
        new THREE.Vector3(-0.074, -0.036, 0.024),
        new THREE.Vector3(-0.058, -0.078, 0.058),
        new THREE.Vector3(0, -0.098, 0.082),
        new THREE.Vector3(0.058, -0.078, 0.058),
        new THREE.Vector3(0.074, -0.036, 0.024),
      ];
      headGroup.add(
        new THREE.Mesh(createTaperedStrand(jawBeard, 0.018, 0.014, 18, 8, 0.35, 0.35), hairMat)
      );
    }
  }
}

function enableShadows(obj: THREE.Object3D, cast: boolean, receive: boolean) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.userData.ignoreRaycast) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

// ==================== MAIN SCULPTED HUMANOID FACTORY ====================

/**
 * Builds a realistic, 7.5-head proportioned, anatomically sculpted & articulated 3D human
 * (Explorer Avatar or Customizable NPC) with natural facial features, layered hair,
 * non-circular lofted torso & limbs, articulated knees/elbows, hands, and tailored outfits.
 */
export function buildSculptedHumanoid(
  spec: HumanoidSpec,
  sharedMats: MaterialLibrary
): ArticulatedHumanoidParts {
  const root = new THREE.Group();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];

  const regMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };

  const fabricBump = getFabricBumpTexture();
  const skinBump = getSkinBumpTexture();
  const isFemale = spec.gender === 'female';
  const isExplorer = spec.kind === 'explorer';
  const isGhost = Boolean(spec.isGhost);

  // Materials with realistic PBR roughness/metalness contrast & micro-bump depth
  const skinMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.skinColor),
      bumpMap: skinBump,
      bumpScale: 0.0022,
      roughness: 0.66,
      metalness: 0.02,
      flatShading: false,
    })
  );

  const primaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.primaryColor),
      bumpMap: fabricBump,
      bumpScale: spec.outfit === 'guard' ? 0.003 : 0.0075,
      roughness: spec.outfit === 'guard' ? 0.42 : 0.78,
      metalness: spec.outfit === 'guard' ? 0.42 : 0.04,
      flatShading: false,
    })
  );

  const secondaryMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.secondaryColor),
      bumpMap: fabricBump,
      bumpScale: spec.outfit === 'guard' || spec.outfit === 'noble' ? 0.0025 : 0.006,
      roughness: spec.outfit === 'guard' || spec.outfit === 'noble' ? 0.36 : 0.74,
      metalness: spec.outfit === 'guard' || spec.outfit === 'noble' ? 0.52 : 0.05,
      flatShading: false,
    })
  );

  const hairMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.hairColor),
      roughness: 0.64,
      metalness: 0.06,
      flatShading: false,
    })
  );

  const shirtMat = regMat(
    new THREE.MeshStandardMaterial({
      color: isExplorer ? 0xf2eadc : 0xece3d3,
      bumpMap: fabricBump,
      bumpScale: 0.0055,
      roughness: 0.8,
      metalness: 0.02,
      flatShading: false,
    })
  );

  const pantsColor = isExplorer
    ? 0x2c303a
    : spec.outfit === 'romanToga'
      ? new THREE.Color(spec.primaryColor)
      : spec.outfit === 'noble'
        ? 0x232530
        : 0x333640;

  const pantsMat = regMat(
    new THREE.MeshStandardMaterial({
      color: pantsColor,
      bumpMap: fabricBump,
      bumpScale: 0.007,
      roughness: 0.82,
      metalness: 0.03,
      flatShading: false,
    })
  );

  const leatherMat = regMat(
    new THREE.MeshStandardMaterial({
      color: isExplorer ? 0x52341e : 0x4b2f1c,
      bumpMap: skinBump,
      bumpScale: 0.005,
      roughness: 0.56,
      metalness: 0.1,
      flatShading: false,
    })
  );

  const soleMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e1b18,
      roughness: 0.86,
      metalness: 0.04,
      flatShading: false,
    })
  );

  const brassMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xd0a250,
      roughness: 0.3,
      metalness: 0.78,
      flatShading: false,
    })
  );

  // Classical 7.5-head proportions (Total height: ~1.78m male / ~1.69m female)
  const hipY = isExplorer ? 0.92 : 0.90;
  const torsoH = isFemale ? 0.51 : 0.55;
  const shoulderHalfW = isFemale ? 0.172 : 0.205;
  const hipHalfW = isFemale ? 0.095 : 0.104;

  // ==================== 1. TORSO & PELVIS (PARAMETRIC ANATOMICAL LOFT) ====================
  const torso = new THREE.Group();
  torso.position.y = hipY;
  root.add(torso);

  // Sculpted anatomical pelvis/hips connecting smoothly to upper thighs
  const pelvisGeo = createAnatomicalLoft(
    [
      { y: -0.095, rx: isFemale ? 0.138 : 0.142, rz: 0.088, zOffset: -0.006, backGroove: 0.008 },
      { y: -0.035, rx: isFemale ? 0.168 : 0.158, rz: 0.106, zOffset: -0.005, backGroove: 0.01 },
      { y: 0.045, rx: isFemale ? 0.156 : 0.155, rz: 0.102, zOffset: 0.0, backGroove: 0.008 },
    ],
    28
  );
  const pelvis = new THREE.Mesh(
    pelvisGeo,
    spec.outfit === 'romanToga' ? primaryMat : pantsMat
  );
  torso.add(pelvis);

  // Sculpted anatomical torso (natural ribcage, chest/bust contour, spinal furrow, sloped shoulders)
  const torsoSlices: LoftSlice[] = isFemale
    ? [
        { y: -0.02, rx: 0.166, rz: 0.106, zOffset: -0.003, backGroove: 0.008, squareness: 0.1 },
        { y: 0.07, rx: 0.132, rz: 0.092, zOffset: 0.002, backGroove: 0.012, squareness: 0.1 },
        { y: 0.17, rx: 0.126, rz: 0.09, zOffset: 0.005, backGroove: 0.014, squareness: 0.12 },
        { y: 0.29, rx: 0.154, rz: 0.104, zOffset: 0.008, chestLift: 0.042, chestSplit: 0.014, backGroove: 0.012, squareness: 0.14 },
        { y: 0.39, rx: 0.174, rz: 0.104, zOffset: 0.004, chestLift: 0.028, backGroove: 0.01, squareness: 0.18 },
        { y: 0.46, rx: 0.172, rz: 0.092, zOffset: -0.002, backGroove: 0.006, squareness: 0.2 },
        { y: 0.505, rx: 0.115, rz: 0.074, zOffset: -0.004, squareness: 0.12 },
        { y: 0.53, rx: 0.058, rz: 0.056, zOffset: -0.004 },
      ]
    : [
        { y: -0.02, rx: 0.162, rz: 0.108, zOffset: -0.002, backGroove: 0.008, squareness: 0.14 },
        { y: 0.09, rx: 0.154, rz: 0.104, zOffset: 0.003, backGroove: 0.012, squareness: 0.16 },
        { y: 0.21, rx: 0.164, rz: 0.11, zOffset: 0.006, backGroove: 0.014, squareness: 0.18 },
        { y: 0.34, rx: 0.194, rz: 0.122, zOffset: 0.009, chestLift: 0.026, chestSplit: 0.008, backGroove: 0.014, squareness: 0.22 },
        { y: 0.44, rx: 0.212, rz: 0.116, zOffset: 0.004, chestLift: 0.016, backGroove: 0.01, squareness: 0.24 },
        { y: 0.505, rx: 0.192, rz: 0.098, zOffset: -0.003, backGroove: 0.006, squareness: 0.2 },
        { y: 0.545, rx: 0.122, rz: 0.078, zOffset: -0.005, squareness: 0.1 },
        { y: 0.568, rx: 0.064, rz: 0.062, zOffset: -0.004 },
      ];

  const torsoMesh = new THREE.Mesh(
    createAnatomicalLoft(torsoSlices, 32, true, true),
    isExplorer || spec.outfit !== 'artisan' ? primaryMat : shirtMat
  );
  torso.add(torsoMesh);

  // Tailored waist belt with metallic brass buckle
  const beltW = isFemale ? 0.138 : 0.164;
  const beltD = isFemale ? 0.098 : 0.112;
  const beltGeo = createAnatomicalLoft(
    [
      { y: 0.042, rx: beltW, rz: beltD, zOffset: 0.002, squareness: 0.14 },
      { y: 0.068, rx: beltW + 0.004, rz: beltD + 0.004, zOffset: 0.002, squareness: 0.14 },
      { y: 0.094, rx: beltW, rz: beltD, zOffset: 0.002, squareness: 0.14 },
    ],
    28
  );
  const beltMat =
    spec.outfit === 'merchant' || spec.outfit === 'romanToga' ? secondaryMat : leatherMat;
  torso.add(new THREE.Mesh(beltGeo, beltMat));

  // Belt buckle front accent
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0055, 8, 16), brassMat);
  buckle.scale.set(1.2, 0.9, 0.5);
  buckle.position.set(0, 0.068, beltD + 0.006);
  torso.add(buckle);

  // ==================== 2. TAILORED OUTFIT LAYERS ====================
  if (isExplorer) {
    // Inner cream shirt placket visible at open V-neck
    const innerShirtGeo = createAnatomicalLoft(
      [
        { y: 0.24, rx: 0.062, rz: 0.115, zOffset: 0.012 },
        { y: 0.42, rx: 0.072, rz: 0.118, zOffset: 0.012 },
        { y: 0.53, rx: 0.068, rz: 0.08, zOffset: 0.004 },
      ],
      18
    );
    torso.add(new THREE.Mesh(innerShirtGeo, shirtMat));

    // Sculpted open jacket lapels & collar
    for (const sx of [-1, 1]) {
      const lapelPts = [
        new THREE.Vector3(sx * 0.068, 0.545, -0.02),
        new THREE.Vector3(sx * 0.092, 0.515, 0.065),
        new THREE.Vector3(sx * 0.072, 0.36, 0.128),
        new THREE.Vector3(sx * 0.048, 0.02, 0.112),
      ];
      torso.add(
        new THREE.Mesh(createTaperedStrand(lapelPts, 0.024, 0.012, 18, 8, 0.75, 0.85), primaryMat)
      );
    }

    // Tailored jacket lower hem flaring slightly over hips
    const jacketHem = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.095, rx: 0.175, rz: 0.116, zOffset: -0.002, squareness: 0.14 },
          { y: -0.01, rx: 0.168, rz: 0.112, zOffset: 0.0, squareness: 0.14 },
          { y: 0.045, rx: 0.16, rz: 0.106, zOffset: 0.002, squareness: 0.14 },
        ],
        28,
        false,
        false
      ),
      primaryMat
    );
    torso.add(jacketHem);

    // Crossbody explorer leather strap + flat contoured messenger satchel
    const strapPts = [
      new THREE.Vector3(0.125, 0.535, 0.005),
      new THREE.Vector3(0.025, 0.33, 0.132),
      new THREE.Vector3(-0.178, 0.04, 0.02),
      new THREE.Vector3(-0.045, 0.28, -0.122),
      new THREE.Vector3(0.125, 0.535, 0.005),
    ];
    torso.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPts), 36, 0.013, 8, true), leatherMat)
    );

    const bagGeo = createAnatomicalLoft(
      [
        { y: -0.14, rx: 0.036, rz: 0.088, squareness: 0.22 },
        { y: -0.06, rx: 0.044, rz: 0.098, squareness: 0.22 },
        { y: 0.03, rx: 0.038, rz: 0.092, squareness: 0.22 },
      ],
      18
    );
    const bag = new THREE.Mesh(bagGeo, leatherMat);
    bag.position.set(-0.195, -0.01, -0.005);
    bag.rotation.z = 0.08;
    torso.add(bag);

    const bagClasp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), brassMat);
    bagClasp.position.set(-0.236, -0.04, 0.005);
    torso.add(bagClasp);
  } else if (spec.outfit === 'romanToga') {
    // Draped pleated Roman toga wrap across left shoulder & waist
    const togaPts = [
      new THREE.Vector3(-0.135, torsoH - 0.01, -0.01),
      new THREE.Vector3(-0.085, torsoH * 0.76, 0.126),
      new THREE.Vector3(0.055, torsoH * 0.44, 0.128),
      new THREE.Vector3(0.165, 0.11, 0.015),
      new THREE.Vector3(0.095, 0.2, -0.118),
      new THREE.Vector3(-0.075, torsoH * 0.68, -0.118),
      new THREE.Vector3(-0.135, torsoH - 0.01, -0.01),
    ];
    torso.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(togaPts), 40, 0.034, 12, true), secondaryMat)
    );

    // Graceful pleated ankle-length toga tunic skirt
    const togaSkirt = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.74, rx: 0.235, rz: 0.185, pleatAmp: 0.055, pleatFreq: 10 },
          { y: -0.46, rx: 0.208, rz: 0.158, pleatAmp: 0.042, pleatFreq: 10 },
          { y: -0.18, rx: 0.184, rz: 0.132, pleatAmp: 0.025, pleatFreq: 10 },
          { y: 0.05, rx: isFemale ? 0.15 : 0.162, rz: 0.108 },
        ],
        36,
        false,
        false
      ),
      primaryMat
    );
    torso.add(togaSkirt);
  } else if (spec.outfit === 'merchant') {
    // Open embroidered waistcoat panels over tunic
    for (const sx of [-1, 1]) {
      const vestPts = [
        new THREE.Vector3(sx * 0.082, torsoH - 0.02, 0.04),
        new THREE.Vector3(sx * 0.115, torsoH * 0.56, 0.124),
        new THREE.Vector3(sx * 0.105, 0.04, 0.112),
      ];
      torso.add(
        new THREE.Mesh(createTaperedStrand(vestPts, 0.034, 0.015, 16, 8, 0.7, 0.9), secondaryMat)
      );
    }
    // Crossbody strap + leather merchant pouch
    const mStrap = [
      new THREE.Vector3(0.13, torsoH - 0.01, 0),
      new THREE.Vector3(0.02, torsoH * 0.52, 0.13),
      new THREE.Vector3(-0.17, 0.05, 0.02),
      new THREE.Vector3(-0.04, torsoH * 0.48, -0.118),
      new THREE.Vector3(0.13, torsoH - 0.01, 0),
    ];
    torso.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mStrap), 32, 0.012, 8, true), leatherMat)
    );
    const pouch = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.12, rx: 0.036, rz: 0.072 },
          { y: -0.04, rx: 0.046, rz: 0.082 },
          { y: 0.03, rx: 0.028, rz: 0.052 },
        ],
        16
      ),
      leatherMat
    );
    pouch.position.set(-0.185, 0.0, 0.01);
    torso.add(pouch);
  } else if (spec.outfit === 'guard') {
    // Anatomically sculpted bronze/steel breastplate cuirass
    const cuirass = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: 0.07, rx: isFemale ? 0.14 : 0.162, rz: 0.108, zOffset: 0.004, squareness: 0.16 },
          { y: 0.24, rx: isFemale ? 0.162 : 0.182, rz: 0.122, zOffset: 0.008, chestLift: 0.03, squareness: 0.2 },
          { y: 0.41, rx: isFemale ? 0.184 : 0.218, rz: 0.124, zOffset: 0.006, chestLift: 0.022, squareness: 0.22 },
          { y: 0.51, rx: isFemale ? 0.155 : 0.185, rz: 0.098, zOffset: -0.002, squareness: 0.16 },
        ],
        28,
        false,
        false
      ),
      secondaryMat
    );
    torso.add(cuirass);

    // Layered Roman leather pteruges (armored hip skirt)
    const pteruges = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.24, rx: isFemale ? 0.195 : 0.202, rz: 0.138, pleatAmp: 0.08, pleatFreq: 14 },
          { y: -0.08, rx: isFemale ? 0.175 : 0.18, rz: 0.122, pleatAmp: 0.06, pleatFreq: 14 },
          { y: 0.05, rx: isFemale ? 0.155 : 0.166, rz: 0.112 },
        ],
        36,
        false,
        false
      ),
      leatherMat
    );
    torso.add(pteruges);

    // Contoured layered shoulder pauldrons
    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        secondaryMat
      );
      pauldron.scale.set(1.18, 0.86, 1.05);
      pauldron.position.set(sx * (shoulderHalfW + 0.018), torsoH - 0.03, 0);
      pauldron.rotation.z = sx * -0.35;
      torso.add(pauldron);
    }
  } else if (spec.outfit === 'artisan') {
    // Heavy tailored leather work apron with contoured chest bib
    const apron = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.32, rx: isFemale ? 0.185 : 0.182, rz: 0.128, zOffset: 0.016, pleatAmp: 0.025, pleatFreq: 8 },
          { y: 0.02, rx: isFemale ? 0.158 : 0.168, rz: 0.116, zOffset: 0.012 },
          { y: 0.36, rx: isFemale ? 0.132 : 0.145, rz: 0.114, zOffset: 0.022 },
        ],
        24,
        false,
        false
      ),
      secondaryMat
    );
    torso.add(apron);

    // Apron neck loop
    const apronLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.01, 8, 22),
      leatherMat
    );
    apronLoop.rotation.x = Math.PI / 2 - 0.32;
    apronLoop.position.set(0, torsoH - 0.01, 0.015);
    torso.add(apronLoop);
  } else if (spec.outfit === 'noble') {
    // High standing embroidered gilded collar
    const nobleCollar = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: torsoH - 0.025, rx: 0.095, rz: 0.085 },
          { y: torsoH + 0.028, rx: 0.104, rz: 0.092 },
        ],
        24,
        false,
        false
      ),
      secondaryMat
    );
    torso.add(nobleCollar);

    // Pleated velvet cape draping naturally from both shoulders
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(
        shoulderHalfW * 0.75,
        shoulderHalfW * 1.45,
        0.96,
        28,
        1,
        true,
        Math.PI * 0.62,
        Math.PI * 0.76
      ),
      secondaryMat
    );
    cape.position.set(0, 0.02, -0.025);
    cape.rotation.x = 0.08;
    torso.add(cape);

    // Gilded shoulder clasp brooch
    const brooch = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 12), brassMat);
    brooch.scale.set(1.15, 1.0, 0.45);
    brooch.position.set(0, torsoH - 0.055, 0.112);
    torso.add(brooch);
  }

  // Graceful pleated midi skirt / dress for female citizen / noble / merchant
  if (!isExplorer && isFemale && spec.outfit !== 'romanToga' && spec.outfit !== 'guard') {
    const skirt = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.48, rx: 0.245, rz: 0.19, pleatAmp: 0.055, pleatFreq: 12 },
          { y: -0.26, rx: 0.205, rz: 0.155, pleatAmp: 0.038, pleatFreq: 12 },
          { y: -0.06, rx: 0.172, rz: 0.118, pleatAmp: 0.015, pleatFreq: 12 },
          { y: 0.06, rx: 0.14, rz: 0.098 },
        ],
        36,
        false,
        false
      ),
      spec.outfit === 'artisan' ? pantsMat : primaryMat
    );
    torso.add(skirt);
  } else if (!isExplorer && !isFemale && (spec.outfit === 'citizen' || spec.outfit === 'merchant' || spec.outfit === 'noble')) {
    // Tailored tunic lower hem extending smoothly past the belt
    const tunicHem = new THREE.Mesh(
      createAnatomicalLoft(
        [
          { y: -0.14, rx: 0.184, rz: 0.125, pleatAmp: 0.025, pleatFreq: 10 },
          { y: -0.03, rx: 0.172, rz: 0.114, squareness: 0.14 },
          { y: 0.05, rx: 0.162, rz: 0.106, squareness: 0.14 },
        ],
        28,
        false,
        false
      ),
      primaryMat
    );
    torso.add(tunicHem);
  }

  // ==================== 3. NECK, SCULPTED HEAD, FACE & LAYERED HAIR ====================
  const head = new THREE.Group();
  head.position.set(0, torsoH + 0.145, 0.008);
  torso.add(head);

  // Natural anatomical neck with gentle trapezius base flare
  const neckGeo = createAnatomicalLoft(
    [
      { y: -0.165, rx: isFemale ? 0.078 : 0.088, rz: 0.072, zOffset: -0.008 },
      { y: -0.11, rx: isFemale ? 0.05 : 0.058, rz: 0.052, zOffset: -0.005 },
      { y: -0.045, rx: isFemale ? 0.048 : 0.055, rz: 0.05, zOffset: -0.002 },
    ],
    22
  );
  head.add(new THREE.Mesh(neckGeo, skinMat));

  // Sculpted human cranium & jaw
  const skull = new THREE.Mesh(createSculptedHeadGeometry(isFemale), skinMat);
  head.add(skull);

  // Realistic eyes, brows, nose, lips & ears
  const defaultEyeHex = isExplorer
    ? 0x4b6b5c
    : spec.outfit === 'noble'
      ? 0x4a6680
      : spec.outfit === 'romanToga'
        ? 0x5c4632
        : 0x4f3a27;
  addRealisticFacialFeatures(head, isFemale, skinMat, hairMat, regMat, spec.eyeColor ?? defaultEyeHex);

  // Hair & Outfit-Specific Headgear
  if (!isExplorer && spec.outfit === 'guard') {
    // Classical sculpted Attic bronze helmet with brow visor, cheek guards & horsehair crest
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
      secondaryMat
    );
    helm.scale.set(0.96, 1.12, 1.06);
    helm.position.set(0, 0.015, -0.006);
    head.add(helm);

    const browBand = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.011, 10, 28), brassMat);
    browBand.rotation.x = Math.PI / 2 + 0.08;
    browBand.position.set(0, 0.036, 0.002);
    head.add(browBand);

    for (const sx of [-1, 1]) {
      const cheekGuard = new THREE.Mesh(
        createTaperedStrand(
          [
            new THREE.Vector3(sx * 0.094, 0.02, 0.015),
            new THREE.Vector3(sx * 0.088, -0.032, 0.036),
            new THREE.Vector3(sx * 0.064, -0.072, 0.052),
          ],
          0.018,
          0.007,
          10,
          8,
          0.9,
          0.55
        ),
        secondaryMat
      );
      head.add(cheekGuard);
    }

    const crestPts = [
      new THREE.Vector3(0, 0.125, 0.072),
      new THREE.Vector3(0, 0.195, 0.008),
      new THREE.Vector3(0, 0.175, -0.088),
      new THREE.Vector3(0, 0.075, -0.145),
    ];
    head.add(
      new THREE.Mesh(createTaperedStrand(crestPts, 0.018, 0.036, 22, 10, 0.45, 0.55), primaryMat)
    );
  } else {
    addLayeredHumanHair(head, isFemale, hairMat, secondaryMat, isExplorer ? 'explorer' : spec.outfit);

    if (!isExplorer && spec.outfit === 'merchant') {
      const turbanGeo = createAnatomicalLoft(
        [
          { y: 0.055, rx: 0.104, rz: 0.114, zOffset: -0.006 },
          { y: 0.095, rx: 0.122, rz: 0.128, zOffset: -0.008, pleatAmp: 0.035, pleatFreq: 8 },
          { y: 0.142, rx: 0.108, rz: 0.114, zOffset: -0.008 },
          { y: 0.172, rx: 0.052, rz: 0.056, zOffset: -0.008 },
        ],
        28
      );
      head.add(new THREE.Mesh(turbanGeo, secondaryMat));
    } else if (!isExplorer && spec.outfit === 'romanToga') {
      const laurelBand = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.009, 10, 28), brassMat);
      laurelBand.rotation.x = Math.PI / 2 - 0.16;
      laurelBand.position.set(0, 0.068, -0.004);
      head.add(laurelBand);
    } else if (!isExplorer && spec.outfit === 'artisan') {
      const beretGeo = createAnatomicalLoft(
        [
          { y: 0.068, rx: 0.098, rz: 0.108, zOffset: -0.01 },
          { y: 0.105, rx: 0.126, rz: 0.13, zOffset: -0.016 },
          { y: 0.14, rx: 0.098, rz: 0.102, zOffset: -0.018 },
          { y: 0.155, rx: 0.025, rz: 0.025, zOffset: -0.018 },
        ],
        26
      );
      const beret = new THREE.Mesh(beretGeo, primaryMat);
      beret.rotation.x = -0.15;
      head.add(beret);
    } else if (!isExplorer && spec.outfit === 'noble') {
      if (isFemale) {
        const diadem = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 10, 28), brassMat);
        diadem.rotation.x = Math.PI / 2 - 0.2;
        diadem.position.set(0, 0.092, 0.004);
        head.add(diadem);
      } else {
        const nobleCap = createAnatomicalLoft(
          [
            { y: 0.065, rx: 0.105, rz: 0.114, zOffset: -0.006 },
            { y: 0.088, rx: 0.145, rz: 0.155, zOffset: -0.008 },
            { y: 0.135, rx: 0.118, rz: 0.126, zOffset: -0.01 },
            { y: 0.165, rx: 0.045, rz: 0.05, zOffset: -0.01 },
          ],
          28
        );
        head.add(new THREE.Mesh(nobleCap, primaryMat));
      }
    }
  }

  // ==================== 4. ARTICULATED ANATOMICAL ARMS (UPPER + ELBOW + FOREARM + HAND) ====================
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * shoulderHalfW, torsoH - 0.062, -0.004);

    const upperMat = !isExplorer && spec.outfit === 'artisan' ? shirtMat : primaryMat;
    const bareForearm = !isExplorer && (spec.outfit === 'artisan' || spec.outfit === 'romanToga');
    const forearmMat = bareForearm ? skinMat : primaryMat;

    const rScale = isFemale ? 0.86 : 1.0;

    // Smooth anatomical upper arm (rounded deltoid cap -> bicep -> tapered elbow)
    const upperArmGeo = createAnatomicalLoft(
      [
        { y: -0.275, rx: 0.039 * rScale, rz: 0.041 * rScale },
        { y: -0.17, rx: 0.048 * rScale, rz: 0.051 * rScale, zOffset: 0.003 },
        { y: -0.06, rx: 0.055 * rScale, rz: 0.056 * rScale },
        { y: 0.008, rx: 0.054 * rScale, rz: 0.055 * rScale, xOffset: -side * 0.014 },
        { y: 0.048, rx: 0.034 * rScale, rz: 0.038 * rScale, xOffset: -side * 0.025 },
      ],
      20
    );
    const upperArm = new THREE.Mesh(upperArmGeo, upperMat);
    arm.add(upperArm);

    // Articulated Elbow Sub-Group (enables natural bent-arm walking, waving & steering!)
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.275, 0);
    arm.add(elbow);

    // Tapered anatomical forearm (fuller near elbow -> slender oval wrist!)
    const forearmGeo = createAnatomicalLoft(
      [
        { y: -0.255, rx: 0.027 * rScale, rz: 0.033 * rScale },
        { y: -0.17, rx: 0.034 * rScale, rz: 0.038 * rScale },
        { y: -0.075, rx: 0.043 * rScale, rz: 0.045 * rScale, zOffset: 0.003 },
        { y: 0.018, rx: 0.039 * rScale, rz: 0.041 * rScale },
      ],
      20
    );
    elbow.add(new THREE.Mesh(forearmGeo, forearmMat));

    // Sleeve cuff trim for explorer / noble / citizen / guard bracer
    if (!bareForearm) {
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.032 * rScale, 0.006, 8, 18),
        spec.outfit === 'guard' || spec.outfit === 'noble' ? secondaryMat : isExplorer ? shirtMat : secondaryMat
      );
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.245;
      elbow.add(cuff);
    }

    // Sculpted human hand (palm + fingers + thumb)
    const hand = createSculptedHandGroup(side, skinMat, isFemale);
    hand.position.y = -0.255;
    elbow.add(hand);

    // Guard ceremonial spear held in right hand
    if (!isExplorer && side === 1 && spec.outfit === 'guard') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 2.25, 14), leatherMat);
      pole.position.set(0.0, 0.22, 0.055);
      elbow.add(pole);

      const spearBlade = new THREE.Mesh(
        createAnatomicalLoft(
          [
            { y: 0.0, rx: 0.024, rz: 0.018 },
            { y: 0.06, rx: 0.042, rz: 0.014 },
            { y: 0.16, rx: 0.034, rz: 0.01 },
            { y: 0.32, rx: 0.003, rz: 0.003 },
          ],
          12
        ),
        secondaryMat
      );
      spearBlade.position.set(0.0, 1.32, 0.055);
      elbow.add(spearBlade);
    }

    // Slight natural anatomical outward hang angle so arms don't clip hips
    arm.rotation.z = side * 0.065;
    elbow.rotation.x = -0.12;

    torso.add(arm);
    return { arm, elbow };
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);

  // ==================== 5. ARTICULATED ANATOMICAL LEGS (THIGH + KNEE + CALF + FOOT) ====================
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * hipHalfW, hipY, 0);

    const legR = isFemale ? 0.92 : 1.0;
    const kneeDrop = hipY - 0.48; // ~0.42–0.44m thigh length
    const ankleDrop = 0.48 - 0.105; // ~0.375m lower leg length
    const showBareCalf = !isExplorer && spec.outfit === 'romanToga';
    const calfMat = showBareCalf ? skinMat : pantsMat;

    // Anatomically sculpted thigh (full upper quad/hamstring tapering cleanly to knee)
    const thighGeo = createAnatomicalLoft(
      [
        { y: -kneeDrop, rx: 0.056 * legR, rz: 0.06 * legR, zOffset: 0.004 },
        { y: -kneeDrop * 0.65, rx: 0.068 * legR, rz: 0.072 * legR, zOffset: 0.004 },
        { y: -kneeDrop * 0.25, rx: 0.08 * legR, rz: 0.084 * legR, zOffset: -0.002 },
        { y: 0.025, rx: 0.082 * legR, rz: 0.084 * legR, xOffset: -side * 0.01 },
      ],
      22
    );
    leg.add(new THREE.Mesh(thighGeo, pantsMat));

    // Articulated Knee Sub-Group (natural knee bend during walking, running & sitting!)
    const knee = new THREE.Group();
    knee.position.set(0, -kneeDrop, 0);
    leg.add(knee);

    // Anatomically curved lower leg (realistic gastrocnemius calf fullness tapering to slim ankle!)
    const calfGeo = createAnatomicalLoft(
      [
        { y: -ankleDrop, rx: 0.039 * legR, rz: 0.044 * legR, zOffset: -0.004 },
        { y: -ankleDrop * 0.65, rx: 0.048 * legR, rz: 0.054 * legR, zOffset: -0.01 },
        { y: -ankleDrop * 0.32, rx: 0.059 * legR, rz: 0.066 * legR, zOffset: -0.012 },
        { y: -0.02, rx: 0.055 * legR, rz: 0.06 * legR, zOffset: 0.003 },
        { y: 0.028, rx: 0.052 * legR, rz: 0.056 * legR, zOffset: 0.004 },
      ],
      22
    );
    knee.add(new THREE.Mesh(calfGeo, calfMat));

    // Guard shin greaves
    if (!isExplorer && spec.outfit === 'guard') {
      const greaveGeo = createAnatomicalLoft(
        [
          { y: -ankleDrop + 0.02, rx: 0.046 * legR, rz: 0.052 * legR, zOffset: 0.002 },
          { y: -ankleDrop * 0.38, rx: 0.063 * legR, rz: 0.068 * legR, zOffset: -0.004 },
          { y: -0.03, rx: 0.059 * legR, rz: 0.064 * legR, zOffset: 0.006 },
        ],
        20,
        false,
        false
      );
      knee.add(new THREE.Mesh(greaveGeo, secondaryMat));
    }

    // Sculpted human shoe / boot / Roman sandal resting flush on y = 0
    const shoe = createSculptedShoeGroup(
      leatherMat,
      soleMat,
      isFemale,
      !isExplorer && spec.outfit === 'romanToga',
      skinMat
    );
    shoe.position.set(0, -ankleDrop, 0);
    knee.add(shoe);

    root.add(leg);
    return { leg, knee };
  };

  const leftLegRig = makeLeg(-1);
  const rightLegRig = makeLeg(1);

  // Soft Ground Contact Shadow
  if (!isGhost) {
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), sharedMats.contactShadow);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.022;
    shadowPlane.userData.ignoreRaycast = true;
    root.add(shadowPlane);
  }

  enableShadows(root, !isGhost, !isGhost);

  return {
    root,
    torso,
    head,
    leftArm: leftArmRig.arm,
    rightArm: rightArmRig.arm,
    leftElbow: leftArmRig.elbow,
    rightElbow: rightArmRig.elbow,
    leftLeg: leftLegRig.leg,
    rightLeg: rightLegRig.leg,
    leftKnee: leftLegRig.knee,
    rightKnee: rightLegRig.knee,
    ownedMaterials,
    ownedTextures,
  };
}
