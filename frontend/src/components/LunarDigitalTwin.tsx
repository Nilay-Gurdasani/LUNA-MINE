import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createLunarRegolithTextures,
  createGoldMLITexture,
  createSolarCellTexture,
  createUltraEarthTexture,
} from '../utils/lunarTextures';
import { RoverTelemetry, CandidateSite } from '../types';
import {
  Camera,
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  Navigation,
  Sparkles,
  ShieldAlert,
  Sun,
  Layers,
  Crosshair,
} from 'lucide-react';

interface LunarDigitalTwinProps {
  telemetry: RoverTelemetry;
  selectedSite: CandidateSite | null;
  obstacleDetected: boolean;
  onSelectCoordinate?: (lat: number, lon: number, elevation: number) => void;
}

export const LunarDigitalTwin: React.FC<LunarDigitalTwinProps> = ({
  telemetry,
  selectedSite,
  obstacleDetected,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<'CHASE' | 'MASTCAM' | 'TOP_DOWN' | 'ORBIT'>('CHASE');
  const [showWireframe, setShowWireframe] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [hudVisible, setHudVisible] = useState(true);

  // References to 3D components for per-frame animation and live telemetry updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const roverGroupRef = useRef<THREE.Group | null>(null);
  const chassisRef = useRef<THREE.Group | null>(null);
  const drillBitRef = useRef<THREE.Mesh | null>(null);
  const drillCarriageRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const lidarPuckRef = useRef<THREE.Mesh | null>(null);
  const mastHeadRef = useRef<THREE.Group | null>(null);
  const dishGroupRef = useRef<THREE.Group | null>(null);
  const spotlightLRef = useRef<THREE.SpotLight | null>(null);
  const spotlightRRef = useRef<THREE.SpotLight | null>(null);
  const scanRingRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);
  const obstacleMeshRef = useRef<THREE.Group | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);

  // Keep cameraMode in ref for animation loop
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const headlightsRef = useRef(headlightsOn);
  headlightsRef.current = headlightsOn;

  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  // Toggle wireframe mode
  useEffect(() => {
    if (terrainMeshRef.current) {
      const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.wireframe = showWireframe;
    }
  }, [showWireframe]);

  // Toggle headlights
  useEffect(() => {
    if (spotlightLRef.current && spotlightRRef.current) {
      spotlightLRef.current.intensity = headlightsOn ? 3.5 : 0;
      spotlightRRef.current.intensity = headlightsOn ? 3.5 : 0;
    }
  }, [headlightsOn]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── 1. SCENE SETUP ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010308); // Vacuum of deep space
    // Very subtle far abyss fog (only blends the outermost horizon into black void)
    scene.fog = new THREE.FogExp2(0x010308, 0.0018);
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera (60° FOV for dramatic cinematic depth of field)
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 2000);
    camera.position.set(0, 12, -22);
    cameraRef.current = camera;

    // Renderer: High-Precision WebGL with ACES Filmic HDR Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15; // Soft, calibrated lunar exposure (limits harsh noise and prevents chalky blown-out whites)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ultra-crisp soft shadows
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // OrbitControls for Free Orbit mode
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.48; // Don't clip below lunar ground
    controls.minDistance = 3.5;
    controls.maxDistance = 180;
    controls.enabled = cameraMode === 'ORBIT';
    controlsRef.current = controls;

    // ── 2. PROCEDURAL 4K / HDR TEXTURES ─────────────────────────────────────────
    const regolithTex = createLunarRegolithTextures(1024);
    const mliTex = createGoldMLITexture(512);
    const solarTex = createSolarCellTexture(512);
    const earthTex = createUltraEarthTexture(1024, 512);

    // ── 3. ULTRA-REALISTIC LUNAR POLAR LIGHTING ─────────────────────────────────
    // Low-elevation Polar Sun (Elevation ~4° above horizon, replicating South Pole)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.9); // Natural solar spectrum
    sunLight.position.set(120, 24, 90);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096; // 4K shadow map
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 280;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Earthshine Fill Light (Soft sapphire blue back-scatter from Earth in the sky)
    const earthLight = new THREE.DirectionalLight(0x4080ff, 0.45);
    earthLight.position.set(-140, 80, -180);
    scene.add(earthLight);

    // Secondary Lunar Regolith Inter-reflection (Soft velvety ambient fill)
    const groundBounce = new THREE.HemisphereLight(0x222a36, 0x11161d, 0.42);
    scene.add(groundBounce);

    // ── 4. DEEP SPACE STARFIELD & GALACTIC BAND ─────────────────────────────────
    // Layer 1: Pinpoint Stars
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const r = 400 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPos[idx + 1] = Math.max(12, r * Math.sin(phi) * Math.sin(theta));
      starPos[idx + 2] = r * Math.cos(phi);

      // Star spectral variations: crisp white, subtle blue-white, warm stellar yellow
      const starType = Math.random();
      if (starType > 0.85) {
        starColors[idx] = 0.8; starColors[idx + 1] = 0.9; starColors[idx + 2] = 1.0; // O/B class
      } else if (starType > 0.7) {
        starColors[idx] = 1.0; starColors[idx + 1] = 0.85; starColors[idx + 2] = 0.65; // K/M class
      } else {
        starColors[idx] = 1.0; starColors[idx + 1] = 1.0; starColors[idx + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Layer 2: Galactic Dust Band / Milky Way
    const mwCount = 1200;
    const mwGeo = new THREE.BufferGeometry();
    const mwPos = new Float32Array(mwCount * 3);
    for (let i = 0; i < mwCount; i++) {
      const idx = i * 3;
      const t = (Math.random() - 0.5) * Math.PI * 2;
      const r = 550 + Math.random() * 50;
      const widthSpread = (Math.random() - 0.5) * 45;
      mwPos[idx] = r * Math.cos(t);
      mwPos[idx + 1] = 80 + Math.sin(t * 1.5) * 120 + widthSpread;
      mwPos[idx + 2] = r * Math.sin(t);
    }
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3));
    const mwMat = new THREE.PointsMaterial({
      color: 0x6090c0,
      size: 3.2,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const milkyWay = new THREE.Points(mwGeo, mwMat);
    scene.add(milkyWay);

    // ── 5. PHOTOREALISTIC EARTH IN SKY ──────────────────────────────────────────
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-160, 115, -210);

    const earthGeo = new THREE.SphereGeometry(18, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = (23.5 * Math.PI) / 180; // True axial tilt
    earthGroup.add(earthMesh);

    // Atmospheric Rayleigh Scattering Outer Glow
    const atmosGeo = new THREE.SphereGeometry(19.2, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x55aaff,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);
    scene.add(earthGroup);

    // ── 6. PHOTOREALISTIC LUNAR TERRAIN & CRATERS ───────────────────────────────
    // Real Lunar South Pole Morphometry: Deep craters with raised rim lips & central peaks
    const majorCraters = [
      { x: -38, z: -32, radius: 26, depth: 7.5, centralPeak: 1.8 },
      { x: 42, z: -48, radius: 34, depth: 9.2, centralPeak: 2.2 },
      { x: -28, z: 35, radius: 20, depth: 5.4, centralPeak: 0 },
      { x: 38, z: 28, radius: 24, depth: 6.2, centralPeak: 1.2 },
      { x: 0, z: -14, radius: 10, depth: 2.2, centralPeak: 0 }, // Shallow crater near base
      { x: 18, z: 12, radius: 8, depth: 1.6, centralPeak: 0 },
      { x: -12, z: 14, radius: 7, depth: 1.4, centralPeak: 0 },
    ];

    // Analytical terrain elevation field: used for terrain geometry, physics ground contact, and surface placement
    const getTerrainHeight = (vx: number, vz: number): number => {
      let y =
        Math.sin(vx * 0.035) * 2.2 +
        Math.cos(vz * 0.028) * 2.6 +
        Math.sin((vx + vz) * 0.065) * 0.8 +
        Math.cos((vx - vz) * 0.09) * 0.4;

      for (const c of majorCraters) {
        const dist = Math.hypot(vx - c.x, vz - c.z);
        if (dist < c.radius * 1.8) {
          const norm = dist / c.radius;
          if (norm < 1.0) {
            // Inner depression bowl
            const bowl = Math.cos(norm * Math.PI * 0.5);
            y -= c.depth * Math.pow(bowl, 1.9);
            // Central uplift peak
            if (c.centralPeak > 0 && norm < 0.28) {
              const peakNorm = 1.0 - norm / 0.28;
              y += c.centralPeak * Math.cos((1 - peakNorm) * Math.PI * 0.5);
            }
          } else {
            // Overturned ejecta rim
            const rimNorm = (norm - 1.0) / 0.8;
            const rimHeight = c.depth * 0.28 * Math.sin(rimNorm * Math.PI);
            y += Math.max(0, rimHeight);
          }
        }
      }
      return y;
    };

    const terrainSize = 180;
    const segments = 160;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: regolithTex.albedo,
      normalMap: regolithTex.normal,
      normalScale: new THREE.Vector2(0.65, 0.65), // Soft, realistic lunar micro-relief without harsh grain
      roughnessMap: regolithTex.roughness,
      roughness: 0.98,
      metalness: 0.02,
      flatShading: false,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    terrain.castShadow = false;
    scene.add(terrain);
    terrainMeshRef.current = terrain;

    // Distant Lunar Mountain Horizon (South Pole Peaks of Eternal Light)
    const mountainRadius = 150;
    const mountainSegments = 64;
    const mountainGeo = new THREE.CylinderGeometry(
      mountainRadius,
      mountainRadius + 30,
      28,
      mountainSegments,
      1,
      true
    );
    const mPos = mountainGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const my = mPos.getY(i);
      if (my > 0) {
        const mx = mPos.getX(i);
        const mz = mPos.getZ(i);
        // Jagged mountain peaks
        const jag =
          Math.sin(mx * 0.08) * 9 +
          Math.cos(mz * 0.07) * 7 +
          Math.sin((mx + mz) * 0.15) * 4;
        mPos.setY(i, my + jag + 6);
      }
    }
    mountainGeo.computeVertexNormals();
    const mountainMat = new THREE.MeshStandardMaterial({
      map: regolithTex.albedo,
      normalMap: regolithTex.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.98,
      metalness: 0.02,
      side: THREE.BackSide,
    });
    const mountains = new THREE.Mesh(mountainGeo, mountainMat);
    mountains.position.y = -6;
    mountains.receiveShadow = true;
    scene.add(mountains);

    // ── 7. SCATTERED IMPACT BOULDERS & BRECCIA ──────────────────────────────────
    const boulderGroup = new THREE.Group();
    const boulderGeo = new THREE.DodecahedronGeometry(0.8, 1);
    // Perturb vertices for jagged impact fracture facets
    const bPos = boulderGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const rx = bPos.getX(i);
      const ry = bPos.getY(i);
      const rz = bPos.getZ(i);
      const factor = 0.85 + Math.random() * 0.3;
      bPos.setXYZ(i, rx * factor, ry * factor, rz * factor);
    }
    boulderGeo.computeVertexNormals();

    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x7a828e,
      roughness: 0.95,
      metalness: 0.04,
      normalMap: regolithTex.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
    });

    for (let i = 0; i < 65; i++) {
      const bx = (Math.random() - 0.5) * 140;
      const bz = (Math.random() - 0.5) * 140;
      if (Math.hypot(bx, bz) < 9) continue; // Clear central workspace

      const scale = 0.35 + Math.random() * 1.6;
      const bMesh = new THREE.Mesh(boulderGeo, boulderMat);
      // Strict physics contact: boulder sits on the surface of the moon
      const bGroundY = getTerrainHeight(bx, bz);
      bMesh.position.set(bx, bGroundY + 0.28 * scale, bz);
      bMesh.scale.set(scale, scale * (0.6 + Math.random() * 0.5), scale);
      bMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      boulderGroup.add(bMesh);
    }
    scene.add(boulderGroup);

    // ── 8. HIGH-FIDELITY AUTONOMOUS LUNAR MINING ROVER ──────────────────────────
    // Strictly purpose-built autonomous lunar rover (No JCBs, no digger arms)
    const roverGroup = new THREE.Group();
    roverGroupRef.current = roverGroup;

    // Materials
    const goldMLIMat = new THREE.MeshStandardMaterial({
      map: mliTex.diffuse,
      normalMap: mliTex.normal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughness: 0.28,
      metalness: 0.92,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xd8e0eb,
      roughness: 0.35,
      metalness: 0.85,
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d,
      roughness: 0.55,
      metalness: 0.8,
    });

    const solarPanelMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      roughness: 0.15,
      metalness: 0.95,
    });

    const opticalLensMat = new THREE.MeshStandardMaterial({
      color: 0x2288ff,
      roughness: 0.05,
      metalness: 0.98,
    });

    // A. Main Avionics Hull (Chassis Body)
    const chassisGroup = new THREE.Group();
    chassisRef.current = chassisGroup;

    // Lower equipment tub
    const chassisGeo = new THREE.BoxGeometry(2.6, 0.85, 1.9);
    const chassis = new THREE.Mesh(chassisGeo, titaniumMat);
    chassis.position.y = 1.05;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    chassisGroup.add(chassis);

    // Gold MLI Thermal Insulation Blanket Shell
    const mliGeo = new THREE.BoxGeometry(2.64, 0.65, 1.94);
    const mliShell = new THREE.Mesh(mliGeo, goldMLIMat);
    mliShell.position.set(0, 1.15, 0);
    mliShell.castShadow = true;
    chassisGroup.add(mliShell);

    // Silver Avionics Radiator Louvers (Heat rejection on shaded side)
    const radiatorGeo = new THREE.PlaneGeometry(1.8, 0.45);
    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.95,
      side: THREE.DoubleSide,
    });
    const radLeft = new THREE.Mesh(radiatorGeo, radiatorMat);
    radLeft.position.set(-1.33, 1.1, 0);
    radLeft.rotation.y = -Math.PI / 2;
    chassisGroup.add(radLeft);

    // Front Bumper / Skid Plate & HazCam Mount
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.18, 0.4);
    const bumper = new THREE.Mesh(bumperGeo, darkMetalMat);
    bumper.position.set(0, 0.75, 1.05);
    chassisGroup.add(bumper);

    // Dual Forward HazCams
    const hazCamGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12);
    hazCamGeo.rotateX(Math.PI / 2);
    const hazCamL = new THREE.Mesh(hazCamGeo, opticalLensMat);
    hazCamL.position.set(-0.7, 0.75, 1.25);
    const hazCamR = new THREE.Mesh(hazCamGeo, opticalLensMat);
    hazCamR.position.set(0.7, 0.75, 1.25);
    chassisGroup.add(hazCamL);
    chassisGroup.add(hazCamR);

    // B. Deployable Triple-Junction Solar Wings (Top Deck)
    const wingGeo = new THREE.BoxGeometry(2.4, 0.04, 1.7);
    const solarWing = new THREE.Mesh(wingGeo, solarPanelMat);
    solarWing.position.set(0, 1.5, 0);
    solarWing.castShadow = true;
    chassisGroup.add(solarWing);

    roverGroup.add(chassisGroup);

    // C. Rocker-Bogie 6-Wheel Articulated Suspension
    wheelsRef.current = [];
    const wheelPositions: [number, number, number][] = [
      [-1.45, 0.42, 0.95],  // Front Left
      [-1.52, 0.42, 0.0],   // Middle Left
      [-1.45, 0.42, -0.95], // Rear Left
      [1.45, 0.42, 0.95],   // Front Right
      [1.52, 0.42, 0.0],    // Middle Right
      [1.45, 0.42, -0.95],  // Rear Right
    ];

    const wheelTireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 24);
    wheelTireGeo.rotateZ(Math.PI / 2);
    const wheelRimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.4, 16);
    wheelRimGeo.rotateZ(Math.PI / 2);

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(wx, wy, wz);

      // Machined Titanium Tire with Chevron Treads
      const tire = new THREE.Mesh(wheelTireGeo, darkMetalMat);
      tire.castShadow = true;
      tire.receiveShadow = true;
      wheelAssembly.add(tire);

      // Inner Hubcap (Gold MLI cap)
      const hub = new THREE.Mesh(wheelRimGeo, goldMLIMat);
      wheelAssembly.add(hub);

      // Chevron grousers (tread ribs)
      for (let g = 0; g < 8; g++) {
        const grouserGeo = new THREE.BoxGeometry(0.42, 0.05, 0.05);
        const grouser = new THREE.Mesh(grouserGeo, titaniumMat);
        const angle = (g / 8) * Math.PI * 2;
        grouser.position.set(0, Math.sin(angle) * 0.44, Math.cos(angle) * 0.44);
        grouser.rotation.x = angle;
        wheelAssembly.add(grouser);
      }

      roverGroup.add(wheelAssembly);
      wheelsRef.current.push(wheelAssembly);

      // Articulated Rocker-Bogie Suspension Arm Struts
      const strutArmGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.72);
      const strutArm = new THREE.Mesh(strutArmGeo, titaniumMat);
      strutArm.position.set(wx > 0 ? wx - 0.16 : wx + 0.16, wy + 0.32, wz);
      strutArm.rotation.z = wx > 0 ? -0.32 : 0.32;
      strutArm.castShadow = true;
      roverGroup.add(strutArm);
    });

    // D. Articulated Vertical Core Drill Rig (Autonomous Subsurface Extractor)
    const drillTowerGroup = new THREE.Group();
    drillTowerGroup.position.set(0.65, 1.45, 0.95); // Front-right offset
    roverGroup.add(drillTowerGroup);

    // Twin Carbon Composite Guide Rails
    const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.9, 12);
    const railLeft = new THREE.Mesh(railGeo, titaniumMat);
    railLeft.position.x = -0.16;
    const railRight = new THREE.Mesh(railGeo, titaniumMat);
    railRight.position.x = 0.16;
    drillTowerGroup.add(railLeft);
    drillTowerGroup.add(railRight);

    // Drill Mast Top Crossbar & Linear Feed Motor
    const topFeedGeo = new THREE.BoxGeometry(0.5, 0.18, 0.28);
    const topFeed = new THREE.Mesh(topFeedGeo, darkMetalMat);
    topFeed.position.y = 0.95;
    drillTowerGroup.add(topFeed);

    // Sliding Rotary Percussive Drill Carriage
    const drillCarriage = new THREE.Group();
    drillCarriage.position.y = 0.6;
    drillCarriageRef.current = drillCarriage;
    drillTowerGroup.add(drillCarriage);

    // High-Torque Electric Drill Head
    const motorCasingGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 16);
    const motorCasing = new THREE.Mesh(motorCasingGeo, titaniumMat);
    drillCarriage.add(motorCasing);

    // Fluted Tungsten-Carbide Core Drill Bit
    const bitGeo = new THREE.CylinderGeometry(0.045, 0.025, 1.4, 12);
    const bitMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.1,
      metalness: 0.98,
    });
    const drillBit = new THREE.Mesh(bitGeo, bitMat);
    drillBit.position.y = -0.75;
    drillBit.castShadow = true;
    drillBitRef.current = drillBit;
    drillCarriage.add(drillBit);

    // E. High-Tech Sensor Mast (Front Left)
    const mastGroup = new THREE.Group();
    mastGroup.position.set(-0.7, 1.5, 0.85);
    roverGroup.add(mastGroup);

    // Carbon-fiber mast tube
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.35, 12);
    const mastPillar = new THREE.Mesh(mastGeo, darkMetalMat);
    mastPillar.position.y = 0.675;
    mastPillar.castShadow = true;
    mastGroup.add(mastPillar);

    // Articulated Pan-Tilt Mast Head
    const mastHead = new THREE.Group();
    mastHead.position.set(0, 1.35, 0);
    mastHeadRef.current = mastHead;
    mastGroup.add(mastHead);

    const mastBoxGeo = new THREE.BoxGeometry(0.42, 0.18, 0.24);
    const mastBox = new THREE.Mesh(mastBoxGeo, titaniumMat);
    mastBox.castShadow = true;
    mastHead.add(mastBox);

    // Stereoscopic Science MastCam Lenses
    const lensGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensL = new THREE.Mesh(lensGeo, opticalLensMat);
    lensL.position.set(-0.12, 0.02, 0.13);
    const lensR = new THREE.Mesh(lensGeo, opticalLensMat);
    lensR.position.set(0.12, 0.02, 0.13);
    mastHead.add(lensL);
    mastHead.add(lensR);

    // 360° Spinning LiDAR Puck (Velodyne-style autonomous obstacle sensor)
    const puckGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16);
    const puckMat = new THREE.MeshStandardMaterial({
      color: 0x050810,
      roughness: 0.2,
      metalness: 0.9,
    });
    const lidarPuck = new THREE.Mesh(puckGeo, puckMat);
    lidarPuck.position.set(0, 0.15, 0);
    lidarPuckRef.current = lidarPuck;
    mastHead.add(lidarPuck);

    // F. Steerable High-Gain Parabolic Communications Dish (Pointed at Earth)
    const dishGroup = new THREE.Group();
    dishGroup.position.set(0, 1.8, -0.65);
    dishGroupRef.current = dishGroup;
    roverGroup.add(dishGroup);

    const dishSupportGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55);
    const dishSupport = new THREE.Mesh(dishSupportGeo, titaniumMat);
    dishGroup.add(dishSupport);

    const parabolicDishGeo = new THREE.SphereGeometry(
      0.46,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.42
    );
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.85,
      side: THREE.DoubleSide,
    });
    const parabolicDish = new THREE.Mesh(parabolicDishGeo, dishMat);
    parabolicDish.position.set(0, 0.4, 0);
    parabolicDish.rotation.x = -Math.PI * 0.35; // Aimed up toward Earth
    parabolicDish.rotation.y = Math.PI * 0.2;
    dishGroup.add(parabolicDish);

    // Feed horn
    const feedGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3);
    const feed = new THREE.Mesh(feedGeo, goldMLIMat);
    feed.position.set(0, 0.48, -0.15);
    feed.rotation.x = -Math.PI * 0.35;
    dishGroup.add(feed);

    // G. Dual High-Power LED Matrix Headlights & Real Terrain Spotlights
    const lightL = new THREE.SpotLight(0xfff8e7, 3.5, 30, Math.PI / 5.5, 0.4, 1.2);
    lightL.position.set(-0.7, 1.1, 1.1);
    lightL.castShadow = true;
    lightL.shadow.mapSize.width = 1024;
    lightL.shadow.mapSize.height = 1024;
    lightL.shadow.bias = -0.0005;
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.7, 0.1, 12);
    roverGroup.add(targetL);
    lightL.target = targetL;
    roverGroup.add(lightL);
    spotlightLRef.current = lightL;

    const lightR = new THREE.SpotLight(0xfff8e7, 3.5, 30, Math.PI / 5.5, 0.4, 1.2);
    lightR.position.set(0.7, 1.1, 1.1);
    lightR.castShadow = true;
    lightR.shadow.mapSize.width = 1024;
    lightR.shadow.mapSize.height = 1024;
    lightR.shadow.bias = -0.0005;
    const targetR = new THREE.Object3D();
    targetR.position.set(0.7, 0.1, 12);
    roverGroup.add(targetR);
    lightR.target = targetR;
    roverGroup.add(lightR);
    spotlightRRef.current = lightR;

    // Glowing LED Lens caps
    const ledLensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
    ledLensGeo.rotateX(Math.PI / 2);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });
    const ledL = new THREE.Mesh(ledLensGeo, ledMat);
    ledL.position.set(-0.7, 1.1, 1.05);
    const ledR = new THREE.Mesh(ledLensGeo, ledMat);
    ledR.position.set(0.7, 1.1, 1.05);
    roverGroup.add(ledL);
    roverGroup.add(ledR);

    // H. Surface LiDAR Scanning Pulse Wave Ring (during SCANNING)
    const scanRingGeo = new THREE.RingGeometry(0.1, 0.4, 48);
    scanRingGeo.rotateX(-Math.PI / 2);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.position.y = 0.12;
    scene.add(scanRing);
    scanRingRef.current = scanRing;

    // I. Drilling Regolith Ejecta Dust Cloud (during DRILLING)
    const partCount = 180;
    const partGeo = new THREE.BufferGeometry();
    const partPositions = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i++) partPositions[i] = 0;
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xdde6ed,
      size: 0.3,
      transparent: true,
      opacity: 0.0,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);
    particlesRef.current = particles;

    scene.add(roverGroup);

    // ── 9. NAVIGATIONAL BEACONS & A* TRAVERSE PATH ──────────────────────────────
    // Base Camp Waypoint Beacon (Artemis Base - Cyan Laser)
    const baseGroup = new THREE.Group();
    const baseY = getTerrainHeight(0, 0);
    baseGroup.position.set(0, baseY + 0.04, 0);
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.0, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    baseGroup.add(baseRing);
    const baseBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    baseBeacon.position.y = 6;
    baseGroup.add(baseBeacon);
    scene.add(baseGroup);

    // Target Candidate Site Beacon (ISRU Target - Gold Laser)
    const targetGroup = new THREE.Group();
    const targetY = getTerrainHeight(24, 32);
    targetGroup.position.set(24, targetY + 0.04, 32);
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.7, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    targetGroup.add(targetRing);
    const targetBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75 })
    );
    targetBeacon.position.y = 8;
    targetGroup.add(targetBeacon);
    scene.add(targetGroup);

    // Hazard Obstacle Marker (Red Hazard Beacon & Boulder)
    const obstacleGroup = new THREE.Group();
    const obsY = getTerrainHeight(12, 16);
    obstacleGroup.position.set(12, obsY + 0.04, 16);
    obstacleMeshRef.current = obstacleGroup;
    const obsRing = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    obstacleGroup.add(obsRing);
    const obsBoulder = new THREE.Mesh(
      boulderGeo,
      new THREE.MeshStandardMaterial({ color: 0x5a2d2d, roughness: 0.9 })
    );
    obsBoulder.scale.set(1.8, 1.4, 1.8);
    obsBoulder.position.y = 0.9;
    obsBoulder.castShadow = true;
    obstacleGroup.add(obsBoulder);
    obstacleGroup.visible = obstacleDetected;
    scene.add(obstacleGroup);

    // A* Path Waypoint Line (Conforms strictly to lunar surface profile)
    const pathWaypoints = [
      [0, 0],
      [6, 8],
      [12, 16],
      [18, 24],
      [24, 32]
    ];
    const pathPoints = pathWaypoints.map(([px, pz]) => 
      new THREE.Vector3(px, getTerrainHeight(px, pz) + 0.12, pz)
    );
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineDashedMaterial({
      color: 0x60b8ff,
      linewidth: 3,
      scale: 1,
      dashSize: 1.2,
      gapSize: 0.6,
    });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.computeLineDistances();
    scene.add(pathLine);
    pathLineRef.current = pathLine;

    // ── 10. REAL-TIME ANIMATION & RENDER LOOP ──────────────────────────────────
    let animFrameId: number;
    const clock = new THREE.Clock();
    let scanScale = 0.1;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Earth slow realistic orbital spin
      earthMesh.rotation.y = time * 0.035;

      // LiDAR puck continuous high-speed spin (10 Hz rotation)
      if (lidarPuckRef.current) {
        lidarPuckRef.current.rotation.y += delta * 15;
      }

      // Update Rover Telemetry Position with Strict Surface Physics
      const curTelem = telemetryRef.current;
      if (roverGroupRef.current) {
        const targetX = curTelem.gridX * 0.15;
        const targetZ = curTelem.gridY * 0.15;
        const headingRad = (curTelem.heading * Math.PI) / 180;

        // Strict Surface Elevation Contact Physics:
        // Wheel radius is 0.44m, axle wy = 0.42m => contact point is y - 0.02
        // Anchoring origin at groundY + 0.015 sets tires directly on regolith with ~5mm realistic sinkage
        const groundSurfaceY = getTerrainHeight(targetX, targetZ) + 0.015;

        // Multi-point terrain slope sampling for realistic Newtonian vehicle attitude
        const frontSampleDist = 1.35;
        const sideSampleDist = 1.45;
        const sinH = Math.sin(headingRad);
        const cosH = Math.cos(headingRad);

        const hFront = getTerrainHeight(targetX + sinH * frontSampleDist, targetZ + cosH * frontSampleDist);
        const hRear  = getTerrainHeight(targetX - sinH * frontSampleDist, targetZ - cosH * frontSampleDist);
        const hRight = getTerrainHeight(targetX + cosH * sideSampleDist, targetZ - sinH * sideSampleDist);
        const hLeft  = getTerrainHeight(targetX - cosH * sideSampleDist, targetZ + sinH * sideSampleDist);

        // Strict Newtonian slope pitch (nose up/down) & roll (side camber)
        const targetPitch = Math.atan2(hFront - hRear, frontSampleDist * 2);
        const targetRoll  = Math.atan2(hRight - hLeft, sideSampleDist * 2);

        // Lunar gravity suspension settling (g = 1.62 m/s²)
        const pos = roverGroupRef.current.position;
        pos.x = targetX;
        pos.z = targetZ;
        pos.y += (groundSurfaceY - pos.y) * Math.min(1.0, delta * 14);

        // Physical attitude rotation with smooth damping
        roverGroupRef.current.rotation.order = 'YXZ';
        roverGroupRef.current.rotation.y = headingRad;
        roverGroupRef.current.rotation.x += (targetPitch - roverGroupRef.current.rotation.x) * Math.min(1.0, delta * 9);
        roverGroupRef.current.rotation.z += (-targetRoll - roverGroupRef.current.rotation.z) * Math.min(1.0, delta * 9);

        // Rocker-bogie wheel roll when navigating
        if (curTelem.operation === 'NAVIGATING' || curTelem.operation === 'RETURNING') {
          wheelsRef.current.forEach((wheel) => {
            wheel.children[0].rotation.x += delta * 7; // Wheel roll
          });
          if (chassisRef.current) {
            // Subtle dynamic suspension rocking
            chassisRef.current.position.y = Math.sin(time * 9) * 0.02;
            chassisRef.current.rotation.z = Math.sin(time * 4) * 0.012;
          }
        } else {
          if (chassisRef.current) {
            chassisRef.current.position.y = 0;
            chassisRef.current.rotation.z = 0;
          }
        }

        // Rotary Percussive Drill Animation
        if (curTelem.operation === 'DRILLING') {
          if (drillBitRef.current) {
            drillBitRef.current.rotation.y += delta * 32; // High-speed drill rotation
          }
          if (drillCarriageRef.current) {
            // Plunge drill down into regolith according to depth
            drillCarriageRef.current.position.y = 0.6 - (curTelem.drillDepthM / 2.0) * 0.9;
          }
          // Regolith dust spray (ground-anchored)
          if (particlesRef.current) {
            const pMat = particlesRef.current.material as THREE.PointsMaterial;
            pMat.opacity = 0.85;
            const pAttr = particlesRef.current.geometry.attributes.position;
            const rX = roverGroupRef.current.position.x + 0.65;
            const rZ = roverGroupRef.current.position.z + 0.95;
            const rGround = getTerrainHeight(rX, rZ);
            for (let i = 0; i < partCount; i++) {
              const px = (Math.random() - 0.5) * 0.9;
              const py = Math.random() * 0.75;
              const pz = (Math.random() - 0.5) * 0.9;
              pAttr.setXYZ(i, rX + px, rGround + py, rZ + pz);
            }
            pAttr.needsUpdate = true;
          }
        } else {
          if (drillCarriageRef.current) drillCarriageRef.current.position.y = 0.6;
          if (particlesRef.current) {
            (particlesRef.current.material as THREE.PointsMaterial).opacity = 0.0;
          }
        }

        // Holographic Sonar Pulse (SCANNING)
        if (scanRingRef.current) {
          if (curTelem.operation === 'SCANNING') {
            scanScale += delta * 14;
            if (scanScale > 18) scanScale = 0.1;
            scanRingRef.current.position.set(
              roverGroupRef.current.position.x,
              getTerrainHeight(roverGroupRef.current.position.x, roverGroupRef.current.position.z) + 0.08,
              roverGroupRef.current.position.z
            );
            scanRingRef.current.scale.set(scanScale, scanScale, 1);
            const ringMat = scanRingRef.current.material as THREE.MeshBasicMaterial;
            ringMat.opacity = Math.max(0, 1.0 - scanScale / 18);
          } else {
            scanScale = 0.1;
            (scanRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.0;
          }
        }
      }

      // Camera Modes
      const activeCamMode = cameraModeRef.current;
      if (cameraRef.current && roverGroupRef.current) {
        const roverPos = roverGroupRef.current.position;
        const headingRad = (curTelem.heading * Math.PI) / 180;

        if (activeCamMode === 'CHASE') {
          // Dynamic chase camera with low cinematic angle behind vehicle
          const chaseDistance = 14;
          const chaseHeight = 5.2;
          const targetCamX = roverPos.x - Math.sin(headingRad) * chaseDistance;
          const targetCamZ = roverPos.z - Math.cos(headingRad) * chaseDistance;
          const targetCamY = roverPos.y + chaseHeight;
          cameraRef.current.position.lerp(
            new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
            0.08
          );
          cameraRef.current.lookAt(roverPos.x, roverPos.y + 1.2, roverPos.z);
        } else if (activeCamMode === 'MASTCAM') {
          // First-person stereo camera POV
          cameraRef.current.position.set(
            roverPos.x - 0.7,
            roverPos.y + 2.85,
            roverPos.z + 0.85
          );
          const lookAtTarget = new THREE.Vector3(
            roverPos.x + Math.sin(headingRad) * 25,
            roverPos.y + 0.5,
            roverPos.z + Math.cos(headingRad) * 25
          );
          cameraRef.current.lookAt(lookAtTarget);
        } else if (activeCamMode === 'TOP_DOWN') {
          // High-resolution orthogonal tactical view
          cameraRef.current.position.set(roverPos.x, roverPos.y + 45, roverPos.z + 0.1);
          cameraRef.current.lookAt(roverPos.x, roverPos.y, roverPos.z);
        } else if (activeCamMode === 'ORBIT') {
          // Handled by OrbitControls — track rover position on surface
          if (controlsRef.current) {
            controlsRef.current.target.set(roverPos.x, roverPos.y + 1.0, roverPos.z);
            controlsRef.current.update();
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      regolithTex.albedo.dispose();
      regolithTex.normal.dispose();
      regolithTex.roughness.dispose();
      mliTex.diffuse.dispose();
      mliTex.normal.dispose();
      solarTex.dispose();
      earthTex.dispose();
    };
  }, []);

  // Update controls state when cameraMode changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = cameraMode === 'ORBIT';
      if (cameraMode === 'ORBIT' && roverGroupRef.current) {
        controlsRef.current.target.copy(roverGroupRef.current.position);
      }
    }
  }, [cameraMode]);

  // Update obstacle visibility and path replanning
  useEffect(() => {
    if (obstacleMeshRef.current) {
      obstacleMeshRef.current.visible = obstacleDetected;
    }
    if (pathLineRef.current) {
      const points = obstacleDetected
        ? [
          new THREE.Vector3(0, 0.25, 0),
          new THREE.Vector3(4, 0.25, 10),
          new THREE.Vector3(7, 0.25, 18), // Safe detour around boulder at (12, 16)
          new THREE.Vector3(16, 0.25, 22),
          new THREE.Vector3(24, 0.25, 32),
        ]
        : [
          new THREE.Vector3(0, 0.25, 0),
          new THREE.Vector3(6, 0.25, 8),
          new THREE.Vector3(12, 0.25, 16),
          new THREE.Vector3(18, 0.25, 24),
          new THREE.Vector3(24, 0.25, 32),
        ];
      pathLineRef.current.geometry.setFromPoints(points);
      pathLineRef.current.computeLineDistances();
    }
  }, [obstacleDetected]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#010308] overflow-hidden select-none">
      {/* ThreeJS WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Crosshair Overlay for MastCam POV Mode */}
      {cameraMode === 'MASTCAM' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="w-24 h-24 border border-[#60B8FF]/40 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#60B8FF] rounded-full animate-ping" />
          </div>
          <div className="absolute top-8 left-8 font-mono text-xs text-[#60B8FF]/80 bg-[#09152B]/80 px-2.5 py-1 rounded border border-[#1A2E50]">
            MASTCAM STEREO OPTICAL STREAM [1080p RAW - COLOR CALIBRATED]
          </div>
        </div>
      )}

      {/* Top HUD Toolbar: Camera Modes & Visual Controls */}
      {hudVisible && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 bg-[#09152B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1A2E50] text-xs shadow-xl">
          <span className="text-[#60B8FF] font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Camera className="w-3.5 h-3.5" /> POV:
          </span>
          <button
            type="button"
            onClick={() => setCameraMode('CHASE')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${cameraMode === 'CHASE'
              ? 'bg-[#60B8FF] text-[#050D1B] font-bold shadow-sm'
              : 'text-[#C6CEDA] hover:bg-[#1A2E50]'
              }`}
          >
            Chase
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('MASTCAM')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${cameraMode === 'MASTCAM'
              ? 'bg-[#60B8FF] text-[#050D1B] font-bold shadow-sm'
              : 'text-[#C6CEDA] hover:bg-[#1A2E50]'
              }`}
          >
            MastCam
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('TOP_DOWN')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${cameraMode === 'TOP_DOWN'
              ? 'bg-[#60B8FF] text-[#050D1B] font-bold shadow-sm'
              : 'text-[#C6CEDA] hover:bg-[#1A2E50]'
              }`}
          >
            Tactical Map
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('ORBIT')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${cameraMode === 'ORBIT'
              ? 'bg-[#60B8FF] text-[#050D1B] font-bold shadow-sm'
              : 'text-[#C6CEDA] hover:bg-[#1A2E50]'
              }`}
          >
            Free Orbit
          </button>

          <div className="h-4 w-px bg-[#1A2E50] mx-0.5" />

          {/* Headlights Toggle */}
          <button
            type="button"
            onClick={() => setHeadlightsOn((v) => !v)}
            title="Toggle Rover High-Power Headlights"
            className={`p-1.5 rounded transition-colors cursor-pointer ${headlightsOn
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              : 'text-gray-400 hover:bg-[#1A2E50]'
              }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {/* Wireframe DEM Toggle */}
          <button
            type="button"
            onClick={() => setShowWireframe((v) => !v)}
            title="Toggle LOLA DEM Mesh Wireframe"
            className={`p-1.5 rounded transition-colors cursor-pointer ${showWireframe
              ? 'bg-[#60B8FF]/20 text-[#60B8FF] border border-[#60B8FF]/40'
              : 'text-gray-400 hover:bg-[#1A2E50]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Hide HUD Toggle */}
          <button
            type="button"
            onClick={() => setHudVisible(false)}
            title="Hide HUD for Cinematic Full View"
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1A2E50] cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Restore HUD Button when hidden */}
      {!hudVisible && (
        <button
          type="button"
          onClick={() => setHudVisible(true)}
          title="Restore HUD Overlay"
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#09152B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1A2E50] text-xs text-[#60B8FF] hover:bg-[#1A2E50] cursor-pointer shadow-lg"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Show HUD</span>
        </button>
      )}

      {/* Top Right HUD - High-Precision Coordinates & Compass */}
      {hudVisible && (
        <div className="absolute top-3 right-3 z-10 bg-[#09152B]/85 backdrop-blur-md p-2.5 rounded-lg border border-[#1A2E50] text-xs font-telemetry flex items-center space-x-3 shadow-lg">
          <div className="flex items-center space-x-1.5 text-[#60B8FF]">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>HDG {Math.round(telemetry.heading).toString().padStart(3, '0')}°</span>
          </div>
          <div className="h-4 w-px bg-[#1A2E50]" />
          <div className="text-gray-300">
            <span className="text-gray-400">LAT:</span> {telemetry.lat.toFixed(4)}°S
          </div>
          <div className="text-gray-300">
            <span className="text-gray-400">LON:</span> {telemetry.lon.toFixed(4)}°E
          </div>
          <div className="text-gray-300">
            <span className="text-gray-400">ELEV:</span> {telemetry.elevation}m
          </div>
        </div>
      )}

      {/* Bottom Center Indicator - Vehicle Subsystem Status */}
      {hudVisible && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3 bg-[#09152B]/90 backdrop-blur-md px-4 py-2 rounded-full border border-[#1A2E50] shadow-2xl">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${telemetry.operation === 'NAVIGATING'
                ? 'bg-[#38BDF8] animate-ping'
                : telemetry.operation === 'DRILLING'
                  ? 'bg-[#F59E0B] animate-pulse'
                  : telemetry.operation === 'SCANNING'
                    ? 'bg-[#60B8FF] animate-pulse'
                    : telemetry.operation === 'FAULT' || telemetry.operation === 'SAFE_STOP'
                      ? 'bg-[#EF4444] animate-ping'
                      : 'bg-[#10B981]'
                }`}
            />
            <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
              STATUS: {telemetry.operation}
            </span>
          </div>

          {telemetry.operation === 'DRILLING' && (
            <div className="flex items-center space-x-2 pl-3 border-l border-[#1A2E50] text-xs font-telemetry text-amber-400">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>
                DEPTH: {telemetry.drillDepthM.toFixed(2)}m / {telemetry.targetDrillDepthM.toFixed(2)}m
              </span>
            </div>
          )}

          {obstacleDetected && (
            <div className="flex items-center space-x-1.5 pl-3 border-l border-[#1A2E50] text-xs font-bold text-red-400 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
              <span>HAZARD IN TRAVERSE CORRIDOR</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
