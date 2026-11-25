import * as THREE from 'three';

export interface ProceduralTextureLibrary {
  asphaltMap: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  ancientStoneMap: THREE.CanvasTexture;
  ancientStoneBump: THREE.CanvasTexture;
  dirtRoadMap: THREE.CanvasTexture;
  dirtRoadBump: THREE.CanvasTexture;
  cobblestoneMap: THREE.CanvasTexture;
  cobblestoneBump: THREE.CanvasTexture;
  terrainMap: THREE.CanvasTexture;
  stuccoMap: THREE.CanvasTexture;
  travertineMap: THREE.CanvasTexture;
  travertineBump: THREE.CanvasTexture;
  roofTileMap: THREE.CanvasTexture;
  woodSlatsMap: THREE.CanvasTexture;
  awningMap: THREE.CanvasTexture;
  bazaarAwningBlueMap: THREE.CanvasTexture;
  clockFaceMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureLibrary {
  const created: THREE.CanvasTexture[] = [];
  const register = (tex: THREE.CanvasTexture) => {
    created.push(tex);
    return tex;
  };

  // 1. Asphalt Road Albedo + Bump (crisp Mediterranean boulevard tarmac)
  const [asphaltCanvas, aCtx] = makeCanvas(512, 512);
  const [asphaltBumpCanvas, abCtx] = makeCanvas(512, 512);
  const randA = mulberry32(101);
  aCtx.fillStyle = '#2d3138';
  aCtx.fillRect(0, 0, 512, 512);
  abCtx.fillStyle = '#7a7a7a';
  abCtx.fillRect(0, 0, 512, 512);

  // Darker gutter strips along both road edges
  const gutterL = aCtx.createLinearGradient(0, 0, 44, 0);
  gutterL.addColorStop(0, 'rgba(14,16,20,0.45)');
  gutterL.addColorStop(1, 'rgba(14,16,20,0)');
  aCtx.fillStyle = gutterL;
  aCtx.fillRect(0, 0, 44, 512);

  const gutterR = aCtx.createLinearGradient(468, 0, 512, 0);
  gutterR.addColorStop(0, 'rgba(14,16,20,0)');
  gutterR.addColorStop(1, 'rgba(14,16,20,0.45)');
  aCtx.fillStyle = gutterR;
  aCtx.fillRect(468, 0, 44, 512);

  // Subtle dual-lane tire wear sheen
  const wearLeft = aCtx.createLinearGradient(96, 0, 212, 0);
  wearLeft.addColorStop(0, 'rgba(18,20,25,0)');
  wearLeft.addColorStop(0.5, 'rgba(15,17,22,0.34)');
  wearLeft.addColorStop(1, 'rgba(18,20,25,0)');
  aCtx.fillStyle = wearLeft;
  aCtx.fillRect(96, 0, 116, 512);

  const wearRight = aCtx.createLinearGradient(300, 0, 416, 0);
  wearRight.addColorStop(0, 'rgba(18,20,25,0)');
  wearRight.addColorStop(0.5, 'rgba(15,17,22,0.34)');
  wearRight.addColorStop(1, 'rgba(18,20,25,0)');
  aCtx.fillStyle = wearRight;
  aCtx.fillRect(300, 0, 116, 512);

  // Fine mineral aggregate speckle
  for (let i = 0; i < 18000; i++) {
    const x = randA() * 512;
    const y = randA() * 512;
    const v = Math.floor(34 + randA() * 44);
    const s = randA() > 0.86 ? 2.1 : 1.25;
    aCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    aCtx.fillRect(x, y, s, s);
    const bv = Math.floor(85 + randA() * 100);
    abCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    abCtx.fillRect(x, y, s, s);
  }

  // Crisp white solid edge lines
  aCtx.fillStyle = 'rgba(246, 242, 232, 0.92)';
  aCtx.fillRect(24, 0, 13, 512);
  aCtx.fillRect(475, 0, 13, 512);

  // Crisp warm-amber dashed centerline
  aCtx.fillStyle = 'rgba(246, 210, 118, 0.95)';
  aCtx.fillRect(249, 36, 14, 186);
  aCtx.fillRect(249, 292, 14, 186);

  const asphaltMap = register(finalizeTexture(asphaltCanvas, maxAnisotropy, true));
  const asphaltBump = register(finalizeTexture(asphaltBumpCanvas, maxAnisotropy, false));

  // 2. Sidewalk Travertine Paving (Normal Kaldırım)
  const [swCanvas, swCtx] = makeCanvas(256, 256);
  const randSw = mulberry32(202);
  swCtx.fillStyle = '#8b8071';
  swCtx.fillRect(0, 0, 256, 256);
  const tile = 64;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const shade = Math.floor(208 + (randSw() - 0.5) * 20);
      swCtx.fillStyle = `rgb(${shade}, ${shade - 7}, ${shade - 18})`;
      swCtx.fillRect(gx * tile + 2.5, gy * tile + 2.5, tile - 5, tile - 5);
      // Subtle top-left bevel highlight
      swCtx.fillStyle = 'rgba(255, 251, 242, 0.28)';
      swCtx.fillRect(gx * tile + 2.5, gy * tile + 2.5, tile - 5, 3);
      swCtx.fillRect(gx * tile + 2.5, gy * tile + 2.5, 3, tile - 5);
    }
  }
  for (let i = 0; i < 2800; i++) {
    const x = randSw() * 256;
    const y = randSw() * 256;
    const v = Math.floor(158 + randSw() * 62);
    swCtx.fillStyle = `rgba(${v},${v - 10},${v - 20},0.24)`;
    swCtx.fillRect(x, y, 2, 2);
  }
  swCtx.strokeStyle = 'rgba(92, 82, 70, 0.68)';
  swCtx.lineWidth = 2.5;
  for (let i = 0; i <= 256; i += tile) {
    swCtx.beginPath();
    swCtx.moveTo(i, 0);
    swCtx.lineTo(i, 256);
    swCtx.stroke();
    swCtx.beginPath();
    swCtx.moveTo(0, i);
    swCtx.lineTo(256, i);
    swCtx.stroke();
  }
  const sidewalkMap = register(finalizeTexture(swCanvas, maxAnisotropy, true));

  // 3. Ancient Roman Polygonal Stone Path Albedo + Bump
  const [ancCanvas, anCtx] = makeCanvas(512, 512);
  const [ancBumpCanvas, anbCtx] = makeCanvas(512, 512);
  const randAn = mulberry32(303);
  anCtx.fillStyle = '#53493b';
  anCtx.fillRect(0, 0, 512, 512);
  anbCtx.fillStyle = '#1e1e1e';
  anbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1100; i++) {
    anCtx.fillStyle = 'rgba(84, 102, 58, 0.32)';
    anCtx.fillRect(randAn() * 512, randAn() * 512, 4, 4);
  }

  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -((r % 2) * 32);
    while (x < 512) {
      const w = 64 + Math.floor(randAn() * 56);
      const pad = 5.5;
      const base = 188 + Math.floor((randAn() - 0.5) * 38);
      const warm = Math.floor((randAn() - 0.5) * 16);
      const rx = x + pad;
      const ry = r * rowH + pad;
      const rw = w - pad * 2;
      const rh = rowH - pad * 2;

      const drawStone = (ctx: CanvasRenderingContext2D, fill: string, inset = 0) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(
          rx + inset,
          ry + inset,
          Math.max(4, rw - inset * 2),
          Math.max(4, rh - inset * 2),
          9
        );
        ctx.fill();
      };

      drawStone(anCtx, `rgb(${base + warm - 18}, ${base - 24 + warm * 0.5}, ${base - 36})`);
      drawStone(anCtx, `rgb(${base + warm}, ${base - 8 + warm * 0.5}, ${base - 22})`, 3);
      drawStone(anbCtx, '#c6c6c6');
      drawStone(anbCtx, '#f4f4f4', 5);

      for (let s = 0; s < 40; s++) {
        const sx = rx + randAn() * rw;
        const sy = ry + randAn() * rh;
        anCtx.fillStyle = randAn() > 0.5 ? 'rgba(255,248,235,0.2)' : 'rgba(78,66,52,0.22)';
        anCtx.fillRect(sx, sy, 3, 2);
      }
      x += w;
    }
  }
  const ancientStoneMap = register(finalizeTexture(ancCanvas, maxAnisotropy, true));
  const ancientStoneBump = register(finalizeTexture(ancBumpCanvas, maxAnisotropy, false));

  // 4. Dirt Road (Toprak Yol) with distinct terracotta-ochre earth, tire ruts & gravel
  const [dirtCanvas, dCtx] = makeCanvas(512, 512);
  const [dirtBumpCanvas, dbCtx] = makeCanvas(512, 512);
  const randD = mulberry32(344);
  dCtx.fillStyle = '#8b6843';
  dCtx.fillRect(0, 0, 512, 512);
  dbCtx.fillStyle = '#888888';
  dbCtx.fillRect(0, 0, 512, 512);

  // Subtle dusty center crown strip
  const centerCrown = dCtx.createLinearGradient(200, 0, 312, 0);
  centerCrown.addColorStop(0, 'rgba(176, 146, 102, 0)');
  centerCrown.addColorStop(0.5, 'rgba(176, 146, 102, 0.32)');
  centerCrown.addColorStop(1, 'rgba(176, 146, 102, 0)');
  dCtx.fillStyle = centerCrown;
  dCtx.fillRect(200, 0, 112, 512);

  // Soft grassy/sandy edges
  const leftEdge = dCtx.createLinearGradient(0, 0, 84, 0);
  leftEdge.addColorStop(0, 'rgba(118, 120, 74, 0.62)');
  leftEdge.addColorStop(1, 'rgba(118, 120, 74, 0)');
  dCtx.fillStyle = leftEdge;
  dCtx.fillRect(0, 0, 84, 512);

  const rightEdge = dCtx.createLinearGradient(428, 0, 512, 0);
  rightEdge.addColorStop(0, 'rgba(118, 120, 74, 0)');
  rightEdge.addColorStop(1, 'rgba(118, 120, 74, 0.62)');
  dCtx.fillStyle = rightEdge;
  dCtx.fillRect(428, 0, 84, 512);

  // Compacted wagon/tire tracks
  for (const cx of [158, 354]) {
    const rut = dCtx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    rut.addColorStop(0, 'rgba(72, 48, 28, 0)');
    rut.addColorStop(0.5, 'rgba(72, 48, 28, 0.56)');
    rut.addColorStop(1, 'rgba(72, 48, 28, 0)');
    dCtx.fillStyle = rut;
    dCtx.fillRect(cx - 56, 0, 112, 512);

    const bRut = dbCtx.createLinearGradient(cx - 50, 0, cx + 50, 0);
    bRut.addColorStop(0, 'rgba(32,32,32,0)');
    bRut.addColorStop(0.5, 'rgba(32,32,32,0.55)');
    bRut.addColorStop(1, 'rgba(32,32,32,0)');
    dbCtx.fillStyle = bRut;
    dbCtx.fillRect(cx - 50, 0, 100, 512);
  }

  // Pebbles & coarse gravel grain
  for (let i = 0; i < 14000; i++) {
    const x = randD() * 512;
    const y = randD() * 512;
    const v = Math.floor(96 + randD() * 80);
    const sz = randD() > 0.88 ? 3.2 : 1.6;
    dCtx.fillStyle = `rgb(${v + 22}, ${v - 2}, ${v - 28})`;
    dCtx.fillRect(x, y, sz, sz);
    const bv = Math.floor(65 + randD() * 150);
    dbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    dbCtx.fillRect(x, y, sz, sz);
  }
  const dirtRoadMap = register(finalizeTexture(dirtCanvas, maxAnisotropy, true));
  const dirtRoadBump = register(finalizeTexture(dirtBumpCanvas, maxAnisotropy, false));

  // 5. Cobblestone (Arnavut Kaldırımı) - curved basalt/granite fan setts
  const [cobCanvas, cCtx] = makeCanvas(512, 512);
  const [cobBumpCanvas, cbCtx] = makeCanvas(512, 512);
  const randC = mulberry32(388);
  cCtx.fillStyle = '#33302c';
  cCtx.fillRect(0, 0, 512, 512);
  cbCtx.fillStyle = '#181818';
  cbCtx.fillRect(0, 0, 512, 512);

  const cobRows = 16;
  const cobCols = 14;
  const cellW = 512 / cobCols;
  const cellH = 512 / cobRows;
  for (let r = 0; r < cobRows; r++) {
    for (let col = -1; col <= cobCols; col++) {
      const waveY = Math.sin(((col + 0.5) / cobCols) * Math.PI * 2) * 9;
      const offsetX = (r % 2) * (cellW * 0.5);
      const sx = col * cellW + offsetX + 2.5;
      const sy = r * cellH + waveY + 2.5;
      const sw = cellW - 5;
      const sh = cellH - 5;
      const shade = 112 + Math.floor((randC() - 0.5) * 52);
      const warmTint = Math.floor((randC() - 0.5) * 20);

      cCtx.fillStyle = `rgb(${shade + warmTint - 14}, ${shade + warmTint * 0.4 - 12}, ${shade - 10})`;
      cCtx.beginPath();
      cCtx.roundRect(sx, sy, sw, sh, 6);
      cCtx.fill();

      cCtx.fillStyle = `rgb(${shade + warmTint + 8}, ${shade + warmTint * 0.5 + 6}, ${shade + 4})`;
      cCtx.beginPath();
      cCtx.roundRect(sx + 2, sy + 2, Math.max(2, sw - 4), Math.max(2, sh - 4), 5);
      cCtx.fill();

      cbCtx.fillStyle = '#c4c4c4';
      cbCtx.beginPath();
      cbCtx.roundRect(sx, sy, sw, sh, 6);
      cbCtx.fill();
      cbCtx.fillStyle = '#f5f5f5';
      cbCtx.beginPath();
      cbCtx.roundRect(sx + 3, sy + 3, Math.max(2, sw - 6), Math.max(2, sh - 6), 4);
      cbCtx.fill();
    }
  }
  const cobblestoneMap = register(finalizeTexture(cobCanvas, maxAnisotropy, true));
  const cobblestoneBump = register(finalizeTexture(cobBumpCanvas, maxAnisotropy, false));

  // 6. Mediterranean Coastal Ground Terrain
  const [terCanvas, tCtx] = makeCanvas(512, 512);
  const randT = mulberry32(404);
  tCtx.fillStyle = '#b9a687';
  tCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 160; i++) {
    const cx = randT() * 512;
    const cy = randT() * 512;
    const rad = 24 + randT() * 68;
    const isOlive = randT() > 0.45;
    const grad = tCtx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    if (isOlive) {
      grad.addColorStop(0, 'rgba(130, 138, 92, 0.28)');
      grad.addColorStop(1, 'rgba(130, 138, 92, 0)');
    } else {
      grad.addColorStop(0, 'rgba(208, 188, 152, 0.25)');
      grad.addColorStop(1, 'rgba(208, 188, 152, 0)');
    }
    tCtx.fillStyle = grad;
    tCtx.beginPath();
    tCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    tCtx.fill();
  }
  for (let i = 0; i < 9000; i++) {
    const x = randT() * 512;
    const y = randT() * 512;
    tCtx.fillStyle = randT() > 0.5 ? 'rgba(235,222,195,0.18)' : 'rgba(104,92,72,0.16)';
    tCtx.fillRect(x, y, 2, 2);
  }
  const terrainMap = register(finalizeTexture(terCanvas, maxAnisotropy, true, 36, 36));

  // 7. Mediterranean Stucco Wall Texture
  const [stuccoCanvas, stCtx] = makeCanvas(256, 256);
  const randSt = mulberry32(505);
  stCtx.fillStyle = '#e8d8c0';
  stCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const x = randSt() * 256;
    const y = randSt() * 256;
    stCtx.fillStyle = randSt() > 0.5 ? 'rgba(255,250,240,0.22)' : 'rgba(176,154,126,0.18)';
    stCtx.fillRect(x, y, 2, 2);
  }
  stCtx.strokeStyle = 'rgba(160, 140, 118, 0.14)';
  stCtx.lineWidth = 1;
  for (let y = 32; y < 256; y += 32) {
    stCtx.beginPath();
    stCtx.moveTo(0, y);
    stCtx.lineTo(256, y);
    stCtx.stroke();
  }
  const stuccoMap = register(finalizeTexture(stuccoCanvas, maxAnisotropy, true, 2, 2));

  // 8. Aged Roman Travertine Marble Albedo + Bump
  const [travCanvas, trCtx] = makeCanvas(512, 512);
  const [travBumpCanvas, trbCtx] = makeCanvas(512, 512);
  const randTr = mulberry32(606);
  trCtx.fillStyle = '#dfd4be';
  trCtx.fillRect(0, 0, 512, 512);
  trbCtx.fillStyle = '#c8c8c8';
  trbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 240; i++) {
    const y = randTr() * 512;
    const h = 1 + randTr() * 5;
    const alpha = 0.06 + randTr() * 0.12;
    trCtx.fillStyle = randTr() > 0.4 ? `rgba(148,132,108,${alpha})` : `rgba(250,244,230,${alpha})`;
    trCtx.fillRect(0, y, 512, h);
  }
  const bH = 64;
  trCtx.strokeStyle = 'rgba(116, 102, 82, 0.45)';
  trCtx.lineWidth = 2;
  trbCtx.strokeStyle = '#555555';
  trbCtx.lineWidth = 3;
  for (let r = 0; r < 8; r++) {
    const y = r * bH;
    trCtx.beginPath();
    trCtx.moveTo(0, y);
    trCtx.lineTo(512, y);
    trCtx.stroke();
    trbCtx.beginPath();
    trbCtx.moveTo(0, y);
    trbCtx.lineTo(512, y);
    trbCtx.stroke();

    const offset = (r % 2) * 64;
    for (let x = offset; x < 512; x += 128) {
      trCtx.beginPath();
      trCtx.moveTo(x, y);
      trCtx.lineTo(x, y + bH);
      trCtx.stroke();
      trbCtx.beginPath();
      trbCtx.moveTo(x, y);
      trbCtx.lineTo(x, y + bH);
      trbCtx.stroke();
    }
  }
  const travertineMap = register(finalizeTexture(travCanvas, maxAnisotropy, true, 1.5, 1.5));
  const travertineBump = register(finalizeTexture(travBumpCanvas, maxAnisotropy, false, 1.5, 1.5));

  // 9. Terracotta Mediterranean Roof Tiles
  const [roofCanvas, rfCtx] = makeCanvas(256, 256);
  const randRf = mulberry32(655);
  rfCtx.fillStyle = '#a94f35';
  rfCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const shade = Math.floor((randRf() - 0.5) * 28);
      rfCtx.fillStyle = `rgb(${172 + shade}, ${82 + shade * 0.5}, ${54 + shade * 0.4})`;
      rfCtx.beginPath();
      rfCtx.roundRect(c * 32 + 2, r * 32 + 2, 28, 28, [4, 4, 12, 12]);
      rfCtx.fill();
    }
  }
  const roofTileMap = register(finalizeTexture(roofCanvas, maxAnisotropy, true, 2, 2));

  // 10. Warm Cedar Wood Grain
  const [woodCanvas, wCtx] = makeCanvas(256, 256);
  const randW = mulberry32(707);
  wCtx.fillStyle = '#9c6239';
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    const y = randW() * 256;
    wCtx.fillStyle = randW() > 0.5 ? 'rgba(65,36,16,0.22)' : 'rgba(195,140,92,0.18)';
    wCtx.fillRect(0, y, 256, 1 + randW() * 3);
  }
  const woodSlatsMap = register(finalizeTexture(woodCanvas, maxAnisotropy, true));

  // 11. Terracotta & Cream Awning Stripes
  const [awnCanvas, awCtx] = makeCanvas(256, 256);
  for (let i = 0; i < 8; i++) {
    awCtx.fillStyle = i % 2 === 0 ? '#b84a32' : '#f4ebdc';
    awCtx.fillRect(i * 32, 0, 32, 256);
  }
  const awningMap = register(finalizeTexture(awnCanvas, maxAnisotropy, true));

  // 12. Aegean Blue & Cream Bazaar Stripes
  const [awnBlueCanvas, awbCtx] = makeCanvas(256, 256);
  for (let i = 0; i < 8; i++) {
    awbCtx.fillStyle = i % 2 === 0 ? '#2b5f87' : '#f4ebdc';
    awbCtx.fillRect(i * 32, 0, 32, 256);
  }
  const bazaarAwningBlueMap = register(finalizeTexture(awnBlueCanvas, maxAnisotropy, true));

  // 13. Classic Clock Tower Dial
  const [clkCanvas, clCtx] = makeCanvas(256, 256);
  clCtx.fillStyle = '#f5eedc';
  clCtx.fillRect(0, 0, 256, 256);
  clCtx.strokeStyle = '#26231f';
  clCtx.lineWidth = 10;
  clCtx.beginPath();
  clCtx.arc(128, 128, 114, 0, Math.PI * 2);
  clCtx.stroke();
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    clCtx.lineWidth = h % 3 === 0 ? 7 : 4;
    clCtx.beginPath();
    clCtx.moveTo(128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84);
    clCtx.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
    clCtx.stroke();
  }
  // Hour & minute hands (classic 10:10 composition)
  clCtx.lineWidth = 8;
  clCtx.beginPath();
  clCtx.moveTo(128, 128);
  clCtx.lineTo(80, 92);
  clCtx.stroke();
  clCtx.lineWidth = 5;
  clCtx.beginPath();
  clCtx.moveTo(128, 128);
  clCtx.lineTo(185, 86);
  clCtx.stroke();
  const clockFaceMap = register(finalizeTexture(clkCanvas, maxAnisotropy, true));

  // 14. Soft Radial Contact Shadow Decal
  const [shCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(10, 8, 6, 0.58)');
  shGrad.addColorStop(0.55, 'rgba(10, 8, 6, 0.28)');
  shGrad.addColorStop(1, 'rgba(10, 8, 6, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = register(finalizeTexture(shCanvas, maxAnisotropy, true));
  contactShadowMap.wrapS = THREE.ClampToEdgeWrapping;
  contactShadowMap.wrapT = THREE.ClampToEdgeWrapping;

  return {
    asphaltMap,
    asphaltBump,
    sidewalkMap,
    ancientStoneMap,
    ancientStoneBump,
    dirtRoadMap,
    dirtRoadBump,
    cobblestoneMap,
    cobblestoneBump,
    terrainMap,
    stuccoMap,
    travertineMap,
    travertineBump,
    roofTileMap,
    woodSlatsMap,
    awningMap,
    bazaarAwningBlueMap,
    clockFaceMap,
    contactShadowMap,
    dispose: () => {
      for (const t of created) {
        t.dispose();
      }
    },
  };
}
