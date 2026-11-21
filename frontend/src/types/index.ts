export type AppTab = 'DASHBOARD' | 'SITES' | 'MISSION' | 'REPORT' | 'SCENARIOS' | 'SLIDES';

export type ScientificCategory = 
  | 'VERIFIED OBSERVATION'
  | 'PROCESSED DATA'
  | 'DERIVED INDICATOR'
  | 'MODEL ESTIMATE'
  | 'SIMULATED / SYNTHETIC'
  | 'NO COVERAGE';

export interface DataLayerInfo {
  id: string;
  name: string;
  mission: string;
  instrument: string;
  productId: string;
  measurementType: string;
  units: string;
  crs: string;
  nativeResolution: string;
  coverage: string;
  uncertainty: string;
  category: ScientificCategory;
  description: string;
  active: boolean;
  currentValue?: string | number;
}

export interface CandidateSite {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
  elevation: number; // meters
  resourceIndicator: number; // R (0-100)
  terrainSuitability: number; // T (0-100)
  accessibility: number; // A (0-100)
  powerFeasibility: number; // P (0-100)
  totalSuitability: number; // S = 0.35R + 0.25T + 0.20A + 0.20P
  slopeDeg: number;
  roughnessM: number;
  solarIlluminationPct: number;
  primaryTarget: string;
  rationale: string;
  geologicalUnit: string;
  psrProximityM: number;
  confidenceScore: number;
}

export interface LunarRegion {
  id: string;
  name: string;
  designation: string;
  description: string;
  centerLat: number;
  centerLon: number;
  crs: string;
  primaryMissionContext: string;
  sites: CandidateSite[];
  availableLayers: string[];
}

export type OperationState =
  | 'IDLE'
  | 'PLANNING'
  | 'NAVIGATING'
  | 'SCANNING'
  | 'SAMPLING'
  | 'DRILLING'
  | 'PROCESSING'
  | 'RETURNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAULT'
  | 'SAFE_STOP';

export interface SubsystemHealth {
  mobility: number; // %
  sensorMast: number; // %
  rotaryDrill: number; // %
  comms: number; // %
}

export interface RoverTelemetry {
  lat: number;
  lon: number;
  elevation: number;
  heading: number; // degrees
  gridX: number; // local simulation meters
  gridY: number;
  batterySoc: number; // % (0-100)
  remainingEnergyKwh: number;
  batteryCapacityKwh: number;
  powerDrawWatts: number;
  tempCelsius: number;
  thermalLoadPct: number; // % relative to operating limit (-60 to +85C)
  health: SubsystemHealth;
  storageUsedKg: number;
  storageCapacityKg: number;
  storageUsedL: number;
  storageCapacityL: number;
  coreSamplesCount: number;
  drillDepthM: number;
  targetDrillDepthM: number;
  operation: OperationState;
  distanceTravelledM: number;
  missionElapsedSeconds: number;
  isPaused: boolean;
  isEmergencyStop: boolean;
}

export type ObjectiveStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'FAILED';

export interface MissionObjective {
  id: string;
  title: string;
  taskType: 'SITE_SELECT' | 'NAVIGATE' | 'SCAN' | 'SAMPLE' | 'DRILL' | 'PROCESS' | 'RETURN';
  status: ObjectiveStatus;
  description: string;
  criteria: string;
  targetValue?: string;
  achievedValue?: string;
  completedAt?: string;
}

export interface DecisionRecommendation {
  id: string;
  title: string;
  proposedAction: string;
  triggerType: 'OBSTACLE' | 'LOW_BATTERY' | 'THERMAL_SPIKE' | 'DRILL_RESISTANCE' | 'RADAR_ANOMALY' | 'COMMS_DELAY';
  rationale: string;
  supportingFactors: string[];
  constraints: string[];
  expectedBenefit: string;
  tradeOff: string;
  priority: 'CRITICAL' | 'HIGH' | 'ADVISORY';
  requiresApproval: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALTERNATIVE_CHOSEN';
  alternativeAction?: string;
}

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  command: string;
  parameters: Record<string, any>;
  accepted: boolean;
  resultMessage: string;
  source: 'CLI' | 'UI_BUTTON' | 'KEYBOARD_SHORTCUT' | 'AUTONOMOUS_ORCHESTRATOR';
  executionState: 'SUCCESS' | 'REJECTED' | 'RUNNING' | 'FAILED';
}

export interface MissionEvent {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SCIENTIFIC_DISCOVERY';
  title: string;
  description: string;
  source: string;
  resolved: boolean;
}

export interface MissionReport {
  missionId: string;
  regionName: string;
  targetSiteName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalDistanceM: number;
  totalEnergyUsedKwh: number;
  remainingEnergyKwh: number;
  samplesGathered: number;
  excavatedMassKg: number;
  excavatedVolumeL: number;
  regolithBulkDensityGcm3: number;
  objectivesCompleted: number;
  totalObjectives: number;
  completionRatePct: number;
  scientificDetections: string[];
  anomaliesEncountered: number;
  finalRoverStatus: string;
}
