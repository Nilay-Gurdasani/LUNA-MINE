import * as THREE from 'three';

/**
 * Procedural 4K / Ultra-HDR Lunar Texture & Shader Generators
 * Synthesizes photorealistic Lunar Regolith PBR maps, Gold MLI thermal blankets,
 * Solar arrays, and Earth textures without requiring heavy external asset downloads.
 */

// Simple deterministic pseudo-random noise for reproducible high-frequency detail
function pseudoNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = pseudoNoise(i, j);
  const n10 = pseudoNoise(i + 1, j);
  const n01 = pseudoNoise(i, j + 1);
  const n11 = pseudoNoise(i + 1, j + 1);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fractalNoise(x: number, y: number, octaves = 5): number {
  let val = 0;
  let freq = 1;
  let amp = 0.5;
  let max = 0;
  for (let o = 0; o < octaves; o++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    freq *= 2.1;
    amp *= 0.5;
  }
  return val / max;
}

/**
 * Generates photorealistic Lunar Regolith PBR Textures:
 * 1. Albedo Map: True lunar soil coloration, anorthosite ejecta rays, titanium basalt tones.
 * 2. Normal Map: Sobel-filtered tangent-space micro-topography (pebbles, pitted craters, breccia).
 * 3. Roughness Map: Hapke retroreflective lunar dust response with crystalline impact spherules.
 */
export function createLunarRegolithTextures(size = 1024): {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const heightData = new Float32Array(size * size);

  // --- Step 1: Compute composite multi-scale heightfield ---
  // Seed distinct craters
  const microCraters: { cx: number; cy: number; r: number; d: number }[] = [];
  const craterCount = 45;
  for (let c = 0; c < craterCount; c++) {
    microCraters.push({
      cx: pseudoNoise(c * 3.1, c * 7.9) * size,
      cy: pseudoNoise(c * 5.7, c * 2.3) * size,
      r: 6 + pseudoNoise(c * 11.1, c * 13.3) * 38,
      d: 0.15 + pseudoNoise(c * 17.7, c * 19.1) * 0.35,
    });
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // Multi-octave regolith ground noise
      let h = fractalNoise(x * 0.035, y * 0.035, 5) * 0.45;
      h += fractalNoise(x * 0.12, y * 0.12, 3) * 0.15;

      // Micro pebbles and gritty soil grains
      const grain = pseudoNoise(x * 0.8, y * 0.8);
      if (grain > 0.88) {
        h += (grain - 0.88) * 1.5; // Raised rock fragments
      }

      // Micro-crater depressions with raised ejecta rims
      for (let i = 0; i < craterCount; i++) {
        const mc = microCraters[i];
        let dx = Math.abs(x - mc.cx);
        let dy = Math.abs(y - mc.cy);
        if (dx > size * 0.5) dx = size - dx; // Seamless wrap
        if (dy > size * 0.5) dy = size - dy;
        const dist = Math.hypot(dx, dy);

        if (dist < mc.r * 1.5) {
          const u = dist / mc.r;
          if (u < 1.0) {
            // Inner parabolic crater bowl
            h -= mc.d * (1 - u * u);
          } else {
            // Overturned rim and ejecta crest
            const rim = Math.sin((u - 1.0) / 0.5 * Math.PI);
            h += mc.d * 0.35 * Math.max(0, rim);
          }
        }
      }

      heightData[idx] = h;
    }
  }

  // --- Step 2: Render Albedo Map ---
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  // --- Step 3: Render Normal Map (Sobel filter) ---
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(size, size);

  // --- Step 4: Render Roughness Map ---
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const h = heightData[idx];

      // --- Albedo Calculation ---
      // Real lunar regolith reflectance: Albedo ranges from ~0.07 (mare basalt) to ~0.24 (highland anorthosite)
      const baseTone = 110 + h * 65;
      // High-frequency dust variation
      const dustNoise = fractalNoise(x * 0.08, y * 0.08, 3);
      // Subtle titanium-rich blue/iron-rich warm tinting
      const rVal = Math.min(240, Math.max(40, baseTone + dustNoise * 20));
      const gVal = Math.min(240, Math.max(40, baseTone + dustNoise * 18 - 2));
      const bVal = Math.min(245, Math.max(45, baseTone + dustNoise * 22 + 4));

      const pIdx = idx * 4;
      aImg.data[pIdx] = rVal;
      aImg.data[pIdx + 1] = gVal;
      aImg.data[pIdx + 2] = bVal;
      aImg.data[pIdx + 3] = 255;

      // --- Normal Calculation (Sobel filter over heightfield) ---
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dhdx = (heightData[y * size + xR] - heightData[y * size + xL]) * 2.8;
      const dhdy = (heightData[yD * size + x] - heightData[yU * size + x]) * 2.8;

      let nx = -dhdx;
      let ny = -dhdy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      nImg.data[pIdx] = Math.floor((nx * 0.5 + 0.5) * 255);
      nImg.data[pIdx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      nImg.data[pIdx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      nImg.data[pIdx + 3] = 255;

      // --- Roughness Calculation ---
      // Lunar regolith is overwhelmingly diffuse retroreflective dust (roughness 0.92-0.98),
      // with occasional glassy impact melt beads showing specular sheen (roughness ~0.45)
      const isGlassy = h > 0.42 && pseudoNoise(x * 1.5, y * 1.5) > 0.85;
      const roughVal = isGlassy ? 115 : Math.floor(235 + dustNoise * 18);
      rImg.data[pIdx] = roughVal;
      rImg.data[pIdx + 1] = roughVal;
      rImg.data[pIdx + 2] = roughVal;
      rImg.data[pIdx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // Paint subtle high-albedo ejecta ray streaks
  aCtx.strokeStyle = 'rgba(235, 242, 255, 0.18)';
  aCtx.lineWidth = 1.8;
  for (let r = 0; r < 14; r++) {
    aCtx.beginPath();
    const cx = size * (0.2 + pseudoNoise(r, 1) * 0.6);
    const cy = size * (0.2 + pseudoNoise(r, 2) * 0.6);
    const angle = pseudoNoise(r, 3) * Math.PI * 2;
    const len = 80 + pseudoNoise(r, 4) * 220;
    aCtx.moveTo(cx, cy);
    aCtx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    aCtx.stroke();
  }

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(6, 6);
  albedo.anisotropy = 8;

  const normal = new THREE.CanvasTexture(normalCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(6, 6);
  normal.anisotropy = 8;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(6, 6);

  return { albedo, normal, roughness };
}

/**
 * Generates procedural Spacecraft Gold Multi-Layer Insulation (MLI) Thermal Foil
 * Features realistic crinkled faceted creases, Kapton thermal coating, and gold sheen.
 */
export function createGoldMLITexture(size = 512): {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nCtx = normCanvas.getContext('2d')!;

  const imgData = ctx.createImageData(size, size);
  const nData = nCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Crinkle folds using multi-frequency cellular/ridge noise
      const crinkle = Math.abs(smoothNoise(x * 0.08, y * 0.08) - 0.5) * 2.0;
      const micro = smoothNoise(x * 0.35, y * 0.35) * 0.4;
      const combined = (crinkle + micro) * 0.7;

      // Deep aerospace gold / amber Kapton tone
      imgData.data[idx] = Math.floor(225 * combined + 28);
      imgData.data[idx + 1] = Math.floor(175 * combined + 18);
      imgData.data[idx + 2] = Math.floor(45 * combined + 5);
      imgData.data[idx + 3] = 255;

      // Normal map calculation
      const dx = (smoothNoise((x + 1) * 0.12, y * 0.12) - smoothNoise((x - 1) * 0.12, y * 0.12)) * 3.5;
      const dy = (smoothNoise(x * 0.12, (y + 1) * 0.12) - smoothNoise(x * 0.12, (y - 1) * 0.12)) * 3.5;
      const len = Math.hypot(-dx, -dy, 1.0);

      nData.data[idx] = Math.floor(((-dx / len) * 0.5 + 0.5) * 255);
      nData.data[idx + 1] = Math.floor(((-dy / len) * 0.5 + 0.5) * 255);
      nData.data[idx + 2] = Math.floor(((1.0 / len) * 0.5 + 0.5) * 255);
      nData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  nCtx.putImageData(nData, 0, 0);

  // Draw aerospace thermal tape grid seams
  ctx.strokeStyle = '#c69214';
  ctx.lineWidth = 2.5;
  const cellSize = size / 6;
  for (let i = 0; i <= size; i += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(2, 2);

  const normal = new THREE.CanvasTexture(normCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(2, 2);

  return { diffuse, normal };
}

/**
 * Generates high-efficiency Gallium Arsenide (GaAs) triple-junction solar array texture
 */
export function createSolarCellTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep iridescent midnight-blue/purple GaAs base
  ctx.fillStyle = '#080d26';
  ctx.fillRect(0, 0, size, size);

  // Solar cell wafer grid (6x6 cells)
  const cols = 6;
  const rows = 6;
  const w = size / cols;
  const h = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * w + 2;
      const y = r * h + 2;
      const cw = w - 4;
      const ch = h - 4;

      // Cell iridescent gradient
      const grad = ctx.createLinearGradient(x, y, x + cw, y + ch);
      grad.addColorStop(0, '#101a4e');
      grad.addColorStop(0.5, '#0a1033');
      grad.addColorStop(1, '#1b2a6b');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cw, ch);

      // Gold collector grid lines
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 0.8;
      for (let g = y + 5; g < y + ch; g += 5) {
        ctx.beginPath();
        ctx.moveTo(x + 2, g);
        ctx.lineTo(x + cw - 2, g);
        ctx.stroke();
      }

      // Main silver busbars
      ctx.strokeStyle = '#c0d4ed';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.33, y);
      ctx.lineTo(x + cw * 0.33, y + ch);
      ctx.moveTo(x + cw * 0.66, y);
      ctx.lineTo(x + cw * 0.66, y + ch);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Generates photorealistic high-definition Earth Texture with oceans, continents,
 * swirling cloud weather patterns, and atmospheric terminator.
 */
export function createUltraEarthTexture(width = 1024, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep oceanic blue
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c2340');
  oceanGrad.addColorStop(0.5, '#0a3260');
  oceanGrad.addColorStop(1, '#0c2340');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw landmasses with fractal noise
  const imgData = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    const lat = (y / height - 0.5) * Math.PI; // -pi/2 to pi/2
    const cosLat = Math.cos(lat);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lon = (x / width) * Math.PI * 2;

      // Spherical projection noise
      const nx = Math.cos(lon) * cosLat;
      const ny = Math.sin(lat);
      const nz = Math.sin(lon) * cosLat;

      const continent = fractalNoise(nx * 2.2 + 3.0, ny * 2.2 + nz * 2.2, 4);

      // Polar ice caps
      const isPolar = Math.abs(lat) > 1.22;

      if (isPolar) {
        imgData.data[idx] = 235;
        imgData.data[idx + 1] = 245;
        imgData.data[idx + 2] = 255;
      } else if (continent > 0.54) {
        // Landmass vegetation & desert
        const isDesert = continent < 0.62 && Math.abs(lat) < 0.55;
        if (isDesert) {
          imgData.data[idx] = 195;
          imgData.data[idx + 1] = 160;
          imgData.data[idx + 2] = 105;
        } else {
          imgData.data[idx] = 55;
          imgData.data[idx + 1] = 110;
          imgData.data[idx + 2] = 60;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Swirling atmospheric white cloud bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let c = 0; c < 28; c++) {
    ctx.beginPath();
    const cx = (c / 28) * width + Math.sin(c) * 40;
    const cy = height * 0.2 + pseudoNoise(c, 9) * (height * 0.6);
    const rad = 25 + pseudoNoise(c, 11) * 85;
    ctx.ellipse(cx % width, cy, rad * 1.8, rad * 0.5, Math.sin(c) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
