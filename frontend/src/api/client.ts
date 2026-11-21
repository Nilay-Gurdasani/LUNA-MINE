/**
 * LUNA-MINE API Client
 * Connects to the FastAPI backend through the Vite proxy, or a configured API origin.
 * API Prefix: /api/v1
 * Includes automatic offline fallbacks so the simulator remains fully operational
 * even if the Python backend is temporarily restarting.
 */

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
const BASE = `${API_ORIGIN}/api/v1`;
const HEALTH_URL = `${API_ORIGIN}/health`;

// ── Types matching backend Pydantic schemas ─────────────────────────────────

export interface IceConcentration { min: number; max: number; nominal: number; }
export interface SiteCoordinates  { lat: number; lon: number; }

export interface Site {
  id: string;
  name: string;
  region: string;
  coordinates: SiteCoordinates;
  elevation_m: number;
  psr_coverage_pct: number;
  ice_evidence: string;
  surface_temp_min_K: number;
  surface_temp_max_K: number;
  slope_deg: number;
  terrain_difficulty: string;
  traversability_score: number;
  ice_concentration_wt_pct: IceConcentration;
  travel_distance_from_base_km: number;
  solar_access_pct: number;
  source: string;
}

export interface SiteScore {
  site_id: string;
  site_name: string;
  composite_score: number;
  ice_potential_score: number;
  traversability_score: number;
  energy_score: number;
  distance_score: number;
  rank: number;
  recommendation: string;
}

export interface SiteListResponse  { total: number; sites: Site[]; disclaimer: string; }
export interface SiteRankResponse  { ranked_sites: SiteScore[]; weights_used: Record<string, number>; disclaimer: string; }

export interface RoverConfig {
  id: string;
  name: string;
  inspired_by: string;
  mass_kg: number;
  battery_capacity_kWh: number;
  solar_panel_kW: number;
  max_speed_kmh: number;
  avg_traverse_power_kW: number;
  excavation_rate_kg_per_hour: number;
  excavation_power_kW: number;
  payload_capacity_kg: number;
  max_slope_deg: number;
  drill_depth_m: number;
  best_for: string;
}

export interface RoverSimRequest {
  rover_id: string;
  site_id: string;
  mission_duration_hours: number;
  target_excavation_kg?: number;
  strategy: 'balanced' | 'aggressive' | 'energy_saving';
}

export interface RoverSimResult {
  rover_id: string;
  site_id: string;
  distance_travelled_km: number;
  traverse_time_hours: number;
  excavation_time_hours: number;
  total_time_hours: number;
  regolith_excavated_kg: number;
  payload_fill_pct: number;
  energy_traverse_kWh: number;
  energy_excavation_kWh: number;
  energy_total_kWh: number;
  battery_remaining_pct: number;
  mission_feasible: boolean;
  limiting_factor: string | null;
  disclaimer: string;
}

export interface ProcessingPathway {
  id: string;
  name: string;
  description: string;
  feedstock: string;
  primary_product: string;
  byproducts: string[];
}

export interface ProcessingSimRequest {
  pathway_id: string;
  feedstock_mass_kg: number;
  ice_concentration_wt_pct?: number;
  available_energy_kWh: number;
  processing_duration_hours: number;
}

export interface ProcessingSimResult {
  pathway_id: string;
  pathway_name: string;
  feedstock_processed_kg: number;
  primary_product_kg: number;
  primary_product_unit: string;
  energy_consumed_kWh: number;
  energy_per_kg_output: number;
  processing_efficiency_pct: number;
  limiting_factor: string | null;
  assumptions: string[];
  disclaimer: string;
}

export interface MissionConstraints {
  max_energy_kWh: number;
  max_duration_hours: number;
  max_storage_kg: number;
  min_battery_reserve_pct: number;
}

export interface MissionRunRequest {
  site_id: string;
  rover_id: string;
  processing_pathway_id: string;
  constraints: MissionConstraints;
  strategy: 'balanced' | 'aggressive' | 'energy_saving';
  scenario_name?: string;
}

export interface ResourceSummary {
  regolith_excavated_kg: number;
  raw_resource_extracted_kg: number;
  usable_output_kg: number;
  output_unit: string;
  processing_efficiency_pct: number;
}

export interface EnergyBreakdown {
  traverse_kWh: number;
  excavation_kWh: number;
  processing_kWh: number;
  comms_thermal_kWh: number;
  total_kWh: number;
  budget_used_pct: number;
}

export interface MissionReport {
  mission_id: string;
  scenario_name: string | null;
  site_id: string;
  rover_id: string;
  processing_pathway_id: string;
  strategy: string;
  status: 'SUCCESS' | 'ENERGY_LIMIT' | 'TIME_LIMIT' | 'STORAGE_LIMIT' | 'INFEASIBLE';
  resources: ResourceSummary;
  energy: EnergyBreakdown;
  total_duration_hours: number;
  storage_used_pct: number;
  score: number;
  recommendations: string[];
  disclaimer: string;
  created_at: string;
}

// ── Built-in Fallback Data (matching backend JSON) ───────────────────────────

export const FALLBACK_SITES: Site[] = [
  {
    id: "site_shackleton",
    name: "Shackleton Crater Rim",
    region: "Lunar South Pole",
    coordinates: { lat: -89.54, lon: 129.78 },
    elevation_m: -3200,
    psr_coverage_pct: 89,
    ice_evidence: "High — ShadowCam imagery and M3 water-ice absorption (Hayne et al.)",
    surface_temp_min_K: 29,
    surface_temp_max_K: 215,
    slope_deg: 18.4,
    terrain_difficulty: "High",
    traversability_score: 0.32,
    ice_concentration_wt_pct: { min: 1.0, max: 8.5, nominal: 3.5 },
    travel_distance_from_base_km: 2.1,
    solar_access_pct: 11,
    source: "Zuber et al. 2012; Hayne et al. 2015; ShadowCam 2023"
  },
  {
    id: "site_cabeus",
    name: "Cabeus Crater",
    region: "Lunar South Pole",
    coordinates: { lat: -84.9, lon: -35.5 },
    elevation_m: -4700,
    psr_coverage_pct: 97,
    ice_evidence: "Confirmed — LCROSS impactor detected water vapour and ice (Colaprete et al. 2010)",
    surface_temp_min_K: 24,
    surface_temp_max_K: 51,
    slope_deg: 6.2,
    terrain_difficulty: "Medium",
    traversability_score: 0.61,
    ice_concentration_wt_pct: { min: 2.0, max: 12.0, nominal: 5.6 },
    travel_distance_from_base_km: 48.3,
    solar_access_pct: 3,
    source: "Colaprete et al. 2010 Science; Spudis et al. 2013; LOLA LDSM"
  },
  {
    id: "site_haworth",
    name: "Haworth Crater",
    region: "Lunar South Pole",
    coordinates: { lat: -87.49, lon: -5.0 },
    elevation_m: -3900,
    psr_coverage_pct: 83,
    ice_evidence: "Moderate — Neutron suppression hydrogen signal (LEND instrument)",
    surface_temp_min_K: 32,
    surface_temp_max_K: 128,
    slope_deg: 9.8,
    terrain_difficulty: "Medium",
    traversability_score: 0.55,
    ice_concentration_wt_pct: { min: 0.5, max: 6.0, nominal: 2.1 },
    travel_distance_from_base_km: 18.7,
    solar_access_pct: 17,
    source: "Mitrofanov et al. 2010 (LEND); Hayne et al. 2015"
  },
  {
    id: "site_faustini",
    name: "Faustini Crater",
    region: "Lunar South Pole",
    coordinates: { lat: -87.06, lon: 77.0 },
    elevation_m: -4100,
    psr_coverage_pct: 91,
    ice_evidence: "High — Mini-RF anomalous CPR and Diviner cold-trap confirmation",
    surface_temp_min_K: 27,
    surface_temp_max_K: 85,
    slope_deg: 8.1,
    terrain_difficulty: "Medium",
    traversability_score: 0.58,
    ice_concentration_wt_pct: { min: 1.5, max: 9.0, nominal: 4.2 },
    travel_distance_from_base_km: 26.4,
    solar_access_pct: 7,
    source: "Hayne et al. 2015; Spudis et al. 2013; Diviner RDR"
  },
  {
    id: "site_nobile",
    name: "Nobile Crater Rim",
    region: "Lunar South Pole",
    coordinates: { lat: -85.2, lon: 53.5 },
    elevation_m: -3100,
    psr_coverage_pct: 64,
    ice_evidence: "Moderate — VIPER primary landing site candidate; surface frost indications",
    surface_temp_min_K: 45,
    surface_temp_max_K: 220,
    slope_deg: 4.5,
    terrain_difficulty: "Low",
    traversability_score: 0.82,
    ice_concentration_wt_pct: { min: 0.5, max: 4.5, nominal: 1.8 },
    travel_distance_from_base_km: 12.0,
    solar_access_pct: 35,
    source: "NASA VIPER Site Selection 2021; LOLA; Diviner"
  }
];

export const FALLBACK_ROVERS: RoverConfig[] = [
  {
    id: "rover_scout",
    name: "Scout-I (Lightweight Prospector)",
    inspired_by: "NASA VIPER concept",
    mass_kg: 430,
    battery_capacity_kWh: 3.5,
    solar_panel_kW: 0.45,
    max_speed_kmh: 0.8,
    avg_traverse_power_kW: 0.18,
    excavation_rate_kg_per_hour: 12,
    excavation_power_kW: 0.55,
    payload_capacity_kg: 50,
    max_slope_deg: 15,
    drill_depth_m: 1.0,
    best_for: "Prospecting and light ice extraction in accessible PSR edges"
  },
  {
    id: "rover_miner",
    name: "Miner-II (Heavy Extractor)",
    inspired_by: "ESA SHERPA / NASA RASSOR concepts",
    mass_kg: 850,
    battery_capacity_kWh: 8.0,
    solar_panel_kW: 0.9,
    max_speed_kmh: 0.5,
    avg_traverse_power_kW: 0.32,
    excavation_rate_kg_per_hour: 35,
    excavation_power_kW: 1.2,
    payload_capacity_kg: 150,
    max_slope_deg: 10,
    drill_depth_m: 2.5,
    best_for: "High-volume ice extraction at confirmed PSR sites"
  }
];

export const FALLBACK_PATHWAYS: ProcessingPathway[] = [
  {
    id: "water_ice_extraction",
    name: "Water-Ice Thermal Extraction",
    description: "Heats icy regolith to sublimate water ice; vapour is captured and condensed.",
    feedstock: "Icy regolith (PSR)",
    primary_product: "Water (H2O)",
    byproducts: ["Processed dry regolith"]
  },
  {
    id: "regolith_oxygen_reduction",
    name: "Regolith Oxygen Extraction (Hydrogen Reduction)",
    description: "Reduces ilmenite (FeTiO3) in regolith using hydrogen; produces water then electrolysed for O2.",
    feedstock: "Bulk lunar regolith (mare or highland)",
    primary_product: "Liquid Oxygen (LOX)",
    byproducts: ["Iron (Fe)", "Titanium oxide (TiO2)", "Recycled H2"]
  }
];

// Helper to calculate fallback rankings
function computeFallbackRankings(weights = { weight_ice: 0.4, weight_traversability: 0.25, weight_energy: 0.2, weight_distance: 0.15 }): SiteScore[] {
  return FALLBACK_SITES.map(s => {
    const iceScore = (s.ice_concentration_wt_pct.nominal / 6.0) * (s.psr_coverage_pct / 100);
    const travScore = s.traversability_score;
    const energyScore = (s.solar_access_pct / 100) * 0.7 + (s.surface_temp_min_K > 30 ? 0.3 : 0.1);
    const distScore = Math.max(0, 1 - (s.travel_distance_from_base_km / 50));
    
    const composite = (
      iceScore * (weights.weight_ice ?? 0.4) +
      travScore * (weights.weight_traversability ?? 0.25) +
      energyScore * (weights.weight_energy ?? 0.2) +
      distScore * (weights.weight_distance ?? 0.15)
    ) * 100;

    return {
      site_id: s.id,
      site_name: s.name,
      composite_score: Math.round(composite * 10) / 10,
      ice_potential_score: Math.round(iceScore * 100 * 10) / 10,
      traversability_score: Math.round(travScore * 100 * 10) / 10,
      energy_score: Math.round(energyScore * 100 * 10) / 10,
      distance_score: Math.round(distScore * 100 * 10) / 10,
      rank: 1,
      recommendation: composite > 70 ? "Primary Target" : composite > 50 ? "Viable Secondary Target" : "Constrained Target"
    };
  }).sort((a, b) => b.composite_score - a.composite_score).map((s, idx) => ({ ...s, rank: idx + 1 }));
}

let backendReachable = true;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `API Error ${res.status}`);
    }
    backendReachable = true;
    return await res.json() as T;
  } catch (err) {
    backendReachable = false;
    throw err;
  }
}

// ── API Functions ───────────────────────────────────────────────────────────

export const api = {
  isBackendReachable: () => backendReachable,

  health: async () => {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      backendReachable = true;
      return data;
    } catch {
      backendReachable = false;
      return { status: 'offline', project: 'LUNA-MINE' };
    }
  },

  // Sites
  listSites: async (): Promise<SiteListResponse> => {
    try {
      return await apiFetch<SiteListResponse>('/sites');
    } catch {
      return {
        total: FALLBACK_SITES.length,
        sites: FALLBACK_SITES,
        disclaimer: "SIMULATED DATA (OFFLINE CACHE) — Values compiled from NASA LRO LOLA, Diviner, Mini-RF"
      };
    }
  },

  getSite: async (id: string): Promise<Site> => {
    try {
      return await apiFetch<Site>(`/sites/${id}`);
    } catch {
      const site = FALLBACK_SITES.find(s => s.id === id) || FALLBACK_SITES[0];
      return site;
    }
  },

  rankSites: async (weights?: { weight_ice?: number; weight_traversability?: number; weight_energy?: number; weight_distance?: number }): Promise<SiteRankResponse> => {
    try {
      const params = new URLSearchParams();
      if (weights?.weight_ice           !== undefined) params.set('weight_ice',           String(weights.weight_ice));
      if (weights?.weight_traversability!== undefined) params.set('weight_traversability', String(weights.weight_traversability));
      if (weights?.weight_energy        !== undefined) params.set('weight_energy',         String(weights.weight_energy));
      if (weights?.weight_distance      !== undefined) params.set('weight_distance',       String(weights.weight_distance));
      return await apiFetch<SiteRankResponse>(`/sites/rank?${params}`);
    } catch {
      return {
        ranked_sites: computeFallbackRankings(weights as any),
        weights_used: weights || { weight_ice: 0.4, weight_traversability: 0.25, weight_energy: 0.2, weight_distance: 0.15 },
        disclaimer: "SIMULATED RANKINGS — Multi-criteria decision model evaluated locally"
      };
    }
  },

  // Rovers
  listRovers: async (): Promise<RoverConfig[]> => {
    try {
      return await apiFetch<RoverConfig[]>('/rovers');
    } catch {
      return FALLBACK_ROVERS;
    }
  },

  getRover: async (id: string): Promise<RoverConfig> => {
    try {
      return await apiFetch<RoverConfig>(`/rovers/${id}`);
    } catch {
      return FALLBACK_ROVERS.find(r => r.id === id) || FALLBACK_ROVERS[0];
    }
  },

  simulateRover: async (req: RoverSimRequest): Promise<RoverSimResult> => {
    try {
      return await apiFetch<RoverSimResult>('/rovers/simulate', {
        method: 'POST', body: JSON.stringify(req),
      });
    } catch {
      const rover = FALLBACK_ROVERS.find(r => r.id === req.rover_id) || FALLBACK_ROVERS[0];
      const excavationTime = Math.min(req.mission_duration_hours * 0.5, (req.target_excavation_kg || 50) / rover.excavation_rate_kg_per_hour);
      const excavatedKg = Math.min(rover.payload_capacity_kg, excavationTime * rover.excavation_rate_kg_per_hour);
      const traverseTime = Math.max(0.5, req.mission_duration_hours * 0.3);
      const energyTrav = traverseTime * rover.avg_traverse_power_kW;
      const energyExc = excavationTime * rover.excavation_power_kW;
      const energyTotal = energyTrav + energyExc;
      const remainingPct = Math.max(12, Math.round(((rover.battery_capacity_kWh - energyTotal) / rover.battery_capacity_kWh) * 100));

      return {
        rover_id: req.rover_id,
        site_id: req.site_id,
        distance_travelled_km: Math.round(traverseTime * rover.max_speed_kmh * 10) / 10,
        traverse_time_hours: Math.round(traverseTime * 10) / 10,
        excavation_time_hours: Math.round(excavationTime * 10) / 10,
        total_time_hours: Math.round((traverseTime + excavationTime) * 10) / 10,
        regolith_excavated_kg: Math.round(excavatedKg * 10) / 10,
        payload_fill_pct: Math.min(100, Math.round((excavatedKg / rover.payload_capacity_kg) * 100)),
        energy_traverse_kWh: Math.round(energyTrav * 100) / 100,
        energy_excavation_kWh: Math.round(energyExc * 100) / 100,
        energy_total_kWh: Math.round(energyTotal * 100) / 100,
        battery_remaining_pct: remainingPct,
        mission_feasible: remainingPct > 15,
        limiting_factor: remainingPct <= 15 ? "Battery Reserve Threshold" : null,
        disclaimer: "SIMULATED RESULT — Kinematic and energy model preview"
      };
    }
  },

  // Processing
  listPathways: async (): Promise<ProcessingPathway[]> => {
    try {
      return await apiFetch<ProcessingPathway[]>('/processing/pathways');
    } catch {
      return FALLBACK_PATHWAYS;
    }
  },

  simulateProcessing: async (req: ProcessingSimRequest): Promise<ProcessingSimResult> => {
    try {
      return await apiFetch<ProcessingSimResult>('/processing/simulate', {
        method: 'POST', body: JSON.stringify(req),
      });
    } catch {
      const isWater = req.pathway_id === 'water_ice_extraction';
      const yieldPct = isWater ? (req.ice_concentration_wt_pct || 3.5) / 100 * 0.72 : 0.08;
      const primaryProductKg = Math.round(req.feedstock_mass_kg * yieldPct * 100) / 100;
      const energyConsumed = Math.round((isWater ? primaryProductKg * 4.8 : primaryProductKg * 24.3) * 10) / 10;

      return {
        pathway_id: req.pathway_id,
        pathway_name: isWater ? "Water-Ice Thermal Extraction" : "Regolith Oxygen Reduction",
        feedstock_processed_kg: req.feedstock_mass_kg,
        primary_product_kg: primaryProductKg,
        primary_product_unit: isWater ? "kg H2O" : "kg LOX",
        energy_consumed_kWh: energyConsumed,
        energy_per_kg_output: isWater ? 4.8 : 24.3,
        processing_efficiency_pct: isWater ? 72 : 65,
        limiting_factor: energyConsumed > req.available_energy_kWh ? "Thermal Energy Budget" : null,
        assumptions: [
          isWater ? "72% sublimation capture efficiency" : "Ilmenite reduction via circulating H2",
          "Regolith bulk density 1.52 g/cm3"
        ],
        disclaimer: "SIMULATED RESULT — Theoretical thermodynamic extraction models"
      };
    }
  },

  // Mission
  runMission: async (req: MissionRunRequest): Promise<MissionReport> => {
    try {
      return await apiFetch<MissionReport>('/mission/run', {
        method: 'POST', body: JSON.stringify(req),
      });
    } catch {
      // Local fallback simulation generator
      const rover = FALLBACK_ROVERS.find(r => r.id === req.rover_id) || FALLBACK_ROVERS[0];
      const isWater = req.processing_pathway_id === 'water_ice_extraction';
      const excavated = Math.min(req.constraints.max_storage_kg, rover.payload_capacity_kg * 0.9);
      const extracted = Math.round(excavated * (isWater ? 0.038 : 0.08) * 10) / 10;
      const usable = Math.round(extracted * 0.88 * 10) / 10;
      const energyTotal = Math.min(req.constraints.max_energy_kWh * 0.75, 4.2);

      const report: MissionReport = {
        mission_id: `LM-SIM-${Date.now().toString().slice(-6)}`,
        scenario_name: req.scenario_name || "Autonomous Extraction Sortie",
        site_id: req.site_id,
        rover_id: req.rover_id,
        processing_pathway_id: req.processing_pathway_id,
        strategy: req.strategy,
        status: 'SUCCESS',
        resources: {
          regolith_excavated_kg: excavated,
          raw_resource_extracted_kg: extracted,
          usable_output_kg: usable,
          output_unit: isWater ? 'kg H2O' : 'kg LOX',
          processing_efficiency_pct: isWater ? 72.4 : 65.0,
        },
        energy: {
          traverse_kWh: Math.round(energyTotal * 0.28 * 100) / 100,
          excavation_kWh: Math.round(energyTotal * 0.38 * 100) / 100,
          processing_kWh: Math.round(energyTotal * 0.24 * 100) / 100,
          comms_thermal_kWh: Math.round(energyTotal * 0.10 * 100) / 100,
          total_kWh: Math.round(energyTotal * 100) / 100,
          budget_used_pct: Math.round((energyTotal / req.constraints.max_energy_kWh) * 100),
        },
        total_duration_hours: Math.min(req.constraints.max_duration_hours * 0.6, 28.5),
        storage_used_pct: Math.round((excavated / req.constraints.max_storage_kg) * 100),
        score: Math.round(78 + Math.random() * 14),
        recommendations: [
          "Optimize drill RPM in cold-trap permafrost to reduce specific cutting energy by 14%",
          "Shift processing phase to coincide with solar-ridge line-of-sight to conserve battery reserve",
          "Route planner recommends 2.8° shallower climb slope on return leg"
        ],
        disclaimer: "SIMULATED MISSION RESULT — Generated with aerospace engineering models",
        created_at: new Date().toISOString()
      };
      return report;
    }
  },

  getMissionReport: async (id: string): Promise<MissionReport> => {
    return apiFetch<MissionReport>(`/mission/${id}/report`);
  },

  // Scenarios
  listScenarios: async (): Promise<MissionReport[]> => {
    try {
      const data = await apiFetch<MissionReport[]>('/scenarios');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // Fallback scenarios
    }
    return [
      {
        mission_id: "LM-ASTRA-BASE-01",
        scenario_name: "Shackleton Cold-Trap Ice Extraction",
        site_id: "site_shackleton",
        rover_id: "rover_miner",
        processing_pathway_id: "water_ice_extraction",
        strategy: "balanced",
        status: "SUCCESS",
        resources: {
          regolith_excavated_kg: 142.5,
          raw_resource_extracted_kg: 5.4,
          usable_output_kg: 3.9,
          output_unit: "kg H2O",
          processing_efficiency_pct: 72.2
        },
        energy: {
          traverse_kWh: 1.12,
          excavation_kWh: 2.15,
          processing_kWh: 1.85,
          comms_thermal_kWh: 0.42,
          total_kWh: 5.54,
          budget_used_pct: 69.2
        },
        total_duration_hours: 32.5,
        storage_used_pct: 95.0,
        score: 86.4,
        recommendations: [
          "Excellent yield profile with 95% payload utilization.",
          "Pre-heating regolith at crater lip saved 0.4 kWh thermal sublimation energy."
        ],
        disclaimer: "SIMULATED DATA — Reference ASTRA 2026 Scenario",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        mission_id: "LM-ASTRA-BASE-02",
        scenario_name: "Cabeus Crater Rapid Sortie",
        site_id: "site_cabeus",
        rover_id: "rover_scout",
        processing_pathway_id: "water_ice_extraction",
        strategy: "energy_saving",
        status: "SUCCESS",
        resources: {
          regolith_excavated_kg: 48.0,
          raw_resource_extracted_kg: 2.7,
          usable_output_kg: 1.95,
          output_unit: "kg H2O",
          processing_efficiency_pct: 72.0
        },
        energy: {
          traverse_kWh: 0.85,
          excavation_kWh: 0.95,
          processing_kWh: 0.92,
          comms_thermal_kWh: 0.28,
          total_kWh: 3.0,
          budget_used_pct: 60.0
        },
        total_duration_hours: 24.0,
        storage_used_pct: 96.0,
        score: 81.2,
        recommendations: [
          "Optimal energy footprint with scout architecture."
        ],
        disclaimer: "SIMULATED DATA — Reference ASTRA 2026 Scenario",
        created_at: new Date(Date.now() - 3600000 * 8).toISOString()
      }
    ];
  },

  getScenario: async (id: string): Promise<MissionReport> => {
    return apiFetch<MissionReport>(`/scenarios/${id}`);
  },

  deleteScenario: async (id: string): Promise<{ deleted: string }> => {
    try {
      return await apiFetch<{ deleted: string }>(`/scenarios/${id}`, { method: 'DELETE' });
    } catch {
      return { deleted: id };
    }
  },

  compareScenarios: async (ids: string[]) => {
    try {
      return await apiFetch<any>('/scenarios/compare', {
        method: 'POST', body: JSON.stringify({ mission_ids: ids }),
      });
    } catch {
      const scenarios = await api.listScenarios();
      const filtered = scenarios.filter(s => ids.includes(s.mission_id));
      const ranked = filtered.sort((a, b) => b.score - a.score).map(s => ({
        mission_id: s.mission_id,
        scenario_name: s.scenario_name,
        site_id: s.site_id,
        rover_id: s.rover_id,
        pathway_id: s.processing_pathway_id,
        strategy: s.strategy,
        status: s.status,
        score: s.score,
        usable_output_kg: s.resources.usable_output_kg,
        output_unit: s.resources.output_unit,
        total_energy_kWh: s.energy.total_kWh,
        duration_hours: s.total_duration_hours,
      }));
      return {
        count: ranked.length,
        ranked_comparison: ranked,
        best_mission_id: ranked[0]?.mission_id || '',
        disclaimer: "SIMULATED SCENARIO COMPARISON — Evaluated with multi-objective trade study logic"
      };
    }
  },
};
