import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { MissionReport, api } from './api/client';
import {
  RoverTelemetry,
  OperationState,
  CommandLogEntry,
  DecisionRecommendation,
  AppTab,
  CandidateSite,
  ActiveTaskSession,
  TaskActionKind,
  TaskActionRecord,
  TaskReport,
} from './types';
import { LUNAR_REGIONS, INITIAL_DATA_LAYERS } from './data/lunarData';

// Components
import { Header } from './components/Header';
import { LunarDigitalTwin } from './components/LunarDigitalTwin';
import { SciencePanel } from './components/SciencePanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { AdaptiveIntelligenceCard } from './components/AdaptiveIntelligenceCard';
import { SiteAssessmentView } from './components/SiteAssessmentView';
import { MissionBuilder } from './components/MissionBuilder';
import { MissionReportView } from './components/MissionReportView';
import { ScenariosView } from './components/ScenariosView';
import { PitchDeckModal } from './components/PitchDeckModal';
import { TaskControlBar } from './components/TaskControlBar';
import { TaskReportsView } from './components/TaskReportsView';

// ── Initial rover telemetry for the 3D Digital Twin ──────────────────────────
const INITIAL_TELEMETRY: RoverTelemetry = {
  lat: LUNAR_REGIONS[0].sites[0].lat, lon: LUNAR_REGIONS[0].sites[0].lon, elevation: LUNAR_REGIONS[0].sites[0].elevation, heading: 45,
  gridX: 0, gridY: 0,
  batterySoc: 94.5, remainingEnergyKwh: 22.68, mineralEnergyRecoveredKwh: 0, batteryCapacityKwh: 24.0,
  powerDrawWatts: 340, tempCelsius: -42.5, thermalLoadPct: 22.0,
  health: { mobility: 100, sensorMast: 100, rotaryDrill: 97, comms: 100 },
  storageUsedKg: 142, storageCapacityKg: 500,
  storageUsedL: 89, storageCapacityL: 350,
  coreSamplesCount: 3,
  drillDepthM: 0, targetDrillDepthM: 2.5,
  operation: 'IDLE',
  distanceTravelledM: 420,
  missionElapsedSeconds: 0,
  isPaused: false,
  isEmergencyStop: false,
};

const App: React.FC = () => {
  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');

  // ── Cross-view backend state ──────────────────────────────────────────────
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site_shackleton');
  const [latestReport, setLatestReport] = useState<MissionReport | null>(null);
  const [taskReports, setTaskReports] = useState<TaskReport[]>(() => {
    try { return JSON.parse(localStorage.getItem('luna-mine-task-reports') || '[]') as TaskReport[]; }
    catch { return []; }
  });
  const [activeTask, setActiveTask] = useState<ActiveTaskSession | null>(() => {
    try {
      const saved = localStorage.getItem('luna-mine-active-task');
      return saved ? JSON.parse(saved) as ActiveTaskSession : null;
    } catch { return null; }
  });

  // ── Dashboard 3D Twin state ───────────────────────────────────────────────
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentRegion, setCurrentRegion] = useState(LUNAR_REGIONS[0]);
  const [selectedSite, setSelectedSite] = useState<CandidateSite | null>(LUNAR_REGIONS[0].sites[0]);
  const [dataLayers, setDataLayers] = useState(INITIAL_DATA_LAYERS);
  const [recommendation, setRecommendation] = useState<DecisionRecommendation | null>(null);
  const [, setCommandLogs] = useState<CommandLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<RoverTelemetry>({ ...INITIAL_TELEMETRY });
  const [hydrationDetectedSiteId, setHydrationDetectedSiteId] = useState<string | null>(null);
  const [operation, setOperation] = useState<OperationState>('IDLE');
  const [obstacleDetected, setObstacleDetected] = useState<boolean>(false);
  const [showAdaptiveHUD, setShowAdaptiveHUD] = useState<boolean>(false);
  const manualDriveUntilRef = useRef(0);
  const lastManualActionAtRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('luna-mine-task-reports', JSON.stringify(taskReports));
  }, [taskReports]);

  useEffect(() => {
    if (activeTask) localStorage.setItem('luna-mine-active-task', JSON.stringify(activeTask));
    else localStorage.removeItem('luna-mine-active-task');
  }, [activeTask]);

  useEffect(() => {
    if (activeTask) {
      setElapsedSeconds(Math.max(0, (Date.now() - Date.parse(activeTask.startedAt)) / 1000));
    }
  }, []);

  // Task timer, rover motion, and telemetry only run inside an active task.
  const taskIsActive = activeTask !== null;
  const metRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeTab !== 'DASHBOARD' || !taskIsActive || isPaused) {
      if (metRef.current) clearInterval(metRef.current);
      return;
    }
    metRef.current = window.setInterval(() => {
      const dt = 0.25 * simSpeed;
      setElapsedSeconds(s => s + dt);
      setTelemetry(prev => {
        let gridX = prev.gridX;
        let gridY = prev.gridY;
        let distanceTravelledM = prev.distanceTravelledM;
        const isMoving = prev.operation === 'NAVIGATING' || prev.operation === 'RETURNING';
        if (isMoving && Date.now() > manualDriveUntilRef.current) {
          const speed = Math.max(0, prev.speedMs ?? 1);
          const stepM = speed * dt;
          const heading = prev.heading * Math.PI / 180;
          gridX += Math.sin(heading) * stepM / 0.15;
          gridY += Math.cos(heading) * stepM / 0.15;
          distanceTravelledM += stepM;
        }

        const energyUsedKwh = Math.max(0, prev.powerDrawWatts) * dt / 3_600_000;
        const remainingEnergyKwh = Math.max(0, prev.remainingEnergyKwh - energyUsedKwh);
        const batterySoc = prev.batteryCapacityKwh > 0
          ? (remainingEnergyKwh / prev.batteryCapacityKwh) * 100
          : prev.batterySoc;

        return {
          ...prev,
          gridX,
          gridY,
          missionElapsedSeconds: prev.missionElapsedSeconds + dt,
          distanceTravelledM: Math.round(distanceTravelledM * 100) / 100,
          batterySoc: Math.round(batterySoc * 100) / 100,
          remainingEnergyKwh: Math.round(remainingEnergyKwh * 1000) / 1000,
        };
      });
    }, 250);
    return () => { if (metRef.current) clearInterval(metRef.current); };
  }, [isPaused, simSpeed, activeTab, taskIsActive]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectSite = useCallback((siteId: string) => {
    setSelectedSiteId(siteId);
  }, []);

  const handleProceedToMission = useCallback(() => {
    setActiveTab('MISSION');
  }, []);

  const handleMissionComplete = useCallback((report: MissionReport) => {
    setLatestReport(report);
    setActiveTab('REPORT');
  }, []);

  function addCommand(
    command: string,
    parameters: Record<string, any>,
    source: 'CLI' | 'UI_BUTTON' | 'KEYBOARD_SHORTCUT' | 'AUTONOMOUS_ORCHESTRATOR',
    executionState: 'SUCCESS' | 'REJECTED' | 'RUNNING' | 'FAILED',
    resultMessage: string,
  ) {
    const h = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(elapsedSeconds % 60).padStart(2, '0');
    setCommandLogs(prev => [{
      id: `cmd-${Date.now()}`,
      timestamp: `T+${h}:${m}:${s}`,
      command, parameters, accepted: executionState === 'SUCCESS' || executionState === 'RUNNING',
      resultMessage, source, executionState,
    }, ...prev.slice(0, 49)]);
  }

  const nextTaskNumber = Math.max(0, ...taskReports.map((report) => report.taskNumber)) + 1;

  const recordTaskAction = (kind: TaskActionKind, summary: string, snapshot: RoverTelemetry = telemetry) => {
    const action: TaskActionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      recordedAt: new Date().toISOString(),
      summary,
      latitude: snapshot.lat,
      longitude: snapshot.lon,
      elevationM: snapshot.elevation,
      headingDeg: Math.round(snapshot.heading),
      speedMs: snapshot.speedMs ?? 0,
      drillDepthM: snapshot.drillDepthM,
      batteryPct: snapshot.batterySoc,
    };
    setActiveTask((task) => task ? { ...task, actions: [...task.actions, action] } : task);
  };

  const handleStartTask = () => {
    const startedAt = new Date().toISOString();
    const taskNumber = nextTaskNumber;
    const initial: ActiveTaskSession = {
      id: `TASK-${String(taskNumber).padStart(3, '0')}`,
      taskNumber,
      startedAt,
      startTelemetry: { ...telemetry },
      actions: [],
    };
    manualDriveUntilRef.current = 0;
    lastManualActionAtRef.current = 0;
    setElapsedSeconds(0);
    setActiveTask(initial);
    setIsPaused(false);
    setOperation('NAVIGATING');
    setTelemetry((prev) => ({ ...prev, operation: 'NAVIGATING', speedMs: 1, isPaused: false, isEmergencyStop: false, powerDrawWatts: 340 }));
    addCommand('START_TASK', { taskNumber }, 'UI_BUTTON', 'SUCCESS', 'Task started. Rover traverse and telemetry capture are active.');
  };

  const handleTaskMove = () => {
    const movingTelemetry = { ...telemetry, operation: 'NAVIGATING' as const, speedMs: Math.max(1, telemetry.speedMs ?? 0), powerDrawWatts: 340 };
    setOperation('NAVIGATING');
    setIsPaused(false);
    setTelemetry(movingTelemetry);
    manualDriveUntilRef.current = 0;
    recordTaskAction('MOVE', 'Traverse started. Manual steering is available.', movingTelemetry);
  };

  const handleTaskRotate = () => {
    const heading = (telemetry.heading + 90) % 360;
    const rotatedTelemetry = { ...telemetry, heading, speedMs: 0, operation: 'IDLE' as const, powerDrawWatts: 90 };
    setOperation('IDLE');
    setTelemetry(rotatedTelemetry);
    recordTaskAction('ROTATE', `Rover rotated 90° to heading ${Math.round(heading)}°.`, rotatedTelemetry);
  };

  const handleTaskScan = () => {
    const hasHydrogenBearingMinerals = !!selectedSite
      && selectedSite.resourceIndicator >= 80
      && selectedSite.psrProximityM <= 200;
    setHydrationDetectedSiteId(hasHydrogenBearingMinerals ? selectedSite.id : null);
    const scanTelemetry = { ...telemetry, speedMs: 0, operation: 'SCANNING' as const, powerDrawWatts: 420 };
    setOperation('SCANNING');
    setTelemetry(scanTelemetry);
    recordTaskAction('SCAN', hasHydrogenBearingMinerals
      ? `Surface scan at heading ${Math.round(telemetry.heading)}° detected a hydrogen-bearing hydroxyl/water-ice signature. Sample the regolith to recover energy.`
      : `Simulated surface scan recorded at heading ${Math.round(telemetry.heading)}°; no recoverable hydration signature detected.`, scanTelemetry);
  };

  const handleTaskDrill = () => {
    const depth = Math.min(telemetry.targetDrillDepthM, telemetry.drillDepthM + 0.5);
    const drillEnergyCostKwh = 0.12;
    const remainingEnergyKwh = Math.max(0, telemetry.remainingEnergyKwh - drillEnergyCostKwh);
    const drillTelemetry = {
      ...telemetry,
      speedMs: 0,
      operation: 'DRILLING' as const,
      drillDepthM: depth,
      storageUsedKg: Math.min(telemetry.storageCapacityKg, telemetry.storageUsedKg + 35),
      remainingEnergyKwh: Math.round(remainingEnergyKwh * 1000) / 1000,
      batterySoc: telemetry.batteryCapacityKwh > 0 ? Math.round((remainingEnergyKwh / telemetry.batteryCapacityKwh) * 10000) / 100 : 0,
      powerDrawWatts: 12000,
    };
    setOperation('DRILLING');
    setTelemetry(drillTelemetry);
    recordTaskAction('DRILL', `Drill reached ${depth.toFixed(2)} m depth; heavy rotary drilling consumed ${drillEnergyCostKwh.toFixed(2)} kWh.`, drillTelemetry);
  };

  const handleTaskSample = () => {
    const recoveredKwh = hydrationDetectedSiteId && hydrationDetectedSiteId === selectedSite?.id ? 0.08 : 0;
    const sampleEnergyCostKwh = 0.02;
    const remainingEnergyKwh = Math.min(
      telemetry.batteryCapacityKwh,
      Math.max(0, telemetry.remainingEnergyKwh - sampleEnergyCostKwh + recoveredKwh),
    );
    const sampleTelemetry = {
      ...telemetry,
      speedMs: 0,
      operation: 'SAMPLING' as const,
      coreSamplesCount: telemetry.coreSamplesCount + 1,
      storageUsedKg: Math.min(telemetry.storageCapacityKg, telemetry.storageUsedKg + 18),
      remainingEnergyKwh: Math.round(remainingEnergyKwh * 1000) / 1000,
      batterySoc: telemetry.batteryCapacityKwh > 0 ? Math.round((remainingEnergyKwh / telemetry.batteryCapacityKwh) * 10000) / 100 : 0,
      mineralEnergyRecoveredKwh: (telemetry.mineralEnergyRecoveredKwh ?? 0) + recoveredKwh,
      powerDrawWatts: 290,
    };
    setOperation('SAMPLING');
    setTelemetry(sampleTelemetry);
    recordTaskAction('SAMPLE', recoveredKwh > 0
      ? `Surface sample ${sampleTelemetry.coreSamplesCount} collected; simulated hydroxyl/water-ice processing recovered ${recoveredKwh.toFixed(2)} kWh (after ${sampleEnergyCostKwh.toFixed(2)} kWh collection cost).`
      : `Surface sample ${sampleTelemetry.coreSamplesCount} collected; no scanned hydrogen-bearing minerals were available for energy recovery.`, sampleTelemetry);
    setHydrationDetectedSiteId(null);
  };

  const handleEndTask = () => {
    if (!activeTask) return;
    const endedAt = new Date().toISOString();
    const finalTelemetry = { ...telemetry, speedMs: 0, operation: 'IDLE' as const, isPaused: false };
    const report: TaskReport = {
      id: activeTask.id,
      taskNumber: activeTask.taskNumber,
      regionName: currentRegion.name,
      siteName: selectedSite?.name ?? currentRegion.name,
      startedAt: activeTask.startedAt,
      endedAt,
      durationSeconds: Math.max(elapsedSeconds, (Date.parse(endedAt) - Date.parse(activeTask.startedAt)) / 1000),
      startTelemetry: activeTask.startTelemetry,
      endTelemetry: finalTelemetry,
      actions: activeTask.actions,
      status: 'COMPLETED',
    };
    setTaskReports((reports) => [report, ...reports]);
    setActiveTask(null);
    setOperation('IDLE');
    setTelemetry(finalTelemetry);
    setIsPaused(false);
    addCommand('END_TASK', { taskNumber: activeTask.taskNumber }, 'UI_BUTTON', 'SUCCESS', 'Task ended. Report saved to Mission Report.');
    setActiveTab('REPORT');
  };

  const handleManualTelemetryUpdate = (updater: (prev: RoverTelemetry) => RoverTelemetry) => {
    manualDriveUntilRef.current = Date.now() + 2200;
    if (activeTask && Date.now() - lastManualActionAtRef.current > 4000) {
      lastManualActionAtRef.current = Date.now();
      recordTaskAction('MOVE', 'Manual rover driving recorded.', telemetry);
    }
    setTelemetry(updater);
  };

  const handleEmergencyStop = useCallback(() => {
    setIsPaused(true);
    setOperation('SAFE_STOP');
    setTelemetry(prev => ({
      ...prev,
      isEmergencyStop: true,
      isPaused: true,
      operation: 'SAFE_STOP',
      powerDrawWatts: 45,
    }));
    addCommand('EMERGENCY_STOP', {}, 'UI_BUTTON', 'SUCCESS', 'All actuators halted immediately — Safe Mode');
  }, [elapsedSeconds]);

  const handleResetMission = useCallback(() => {
    setElapsedSeconds(0);
    setIsPaused(false);
    setOperation('NAVIGATING');
    setObstacleDetected(false);
    setTelemetry({ ...INITIAL_TELEMETRY });
    setCommandLogs([]);
    setRecommendation(null);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(p => {
      const next = !p;
      setTelemetry(prev => ({ ...prev, isPaused: next }));
      return next;
    });
  }, []);

  // ── Adaptive Event Simulation ─────────────────────────────────────────────
  const handleInjectEvent = useCallback((type: 'OBSTACLE' | 'LOW_BATTERY' | 'THERMAL_SPIKE' | 'COMMS_DELAY') => {
    setShowAdaptiveHUD(true);
    if (type === 'OBSTACLE') {
      setObstacleDetected(true);
      const rec: DecisionRecommendation = {
        id: `rec-${Date.now()}`,
        title: 'Large Boulder in Traverse Corridor',
        proposedAction: 'REROUTE_A_STAR',
        triggerType: 'OBSTACLE',
        rationale: 'HazCam detected 1.4m diameter impact fragment at (12m, +8m). Direct path slope exceeds 15° chassis stability threshold.',
        supportingFactors: ['HazCam 3D point cloud anomaly', 'LOLA DEM slope gradient: 16.2°', 'Slip probability: 42%'],
        constraints: ['Max deviation: 25m', 'Min solar ridge visibility: >10%'],
        expectedBenefit: 'Avoids chassis high-centering hazard. Preserves 100% mobility suspension.',
        tradeOff: 'Traverse distance increases +14m (+4 min, -0.06 kWh battery).',
        priority: 'CRITICAL',
        requiresApproval: true,
        status: 'PENDING',
      };
      setRecommendation(rec);
      addCommand('HAZARD_DETECTED', { type: 'OBSTACLE' }, 'AUTONOMOUS_ORCHESTRATOR', 'SUCCESS', 'Path blocked by boulder. Replanning proposed.');
    }
    else if (type === 'LOW_BATTERY') {
      setTelemetry(prev => ({
        ...prev,
        batterySoc: 14.2,
        remainingEnergyKwh: 3.4,
        powerDrawWatts: 180,
      }));
      const rec: DecisionRecommendation = {
        id: `rec-${Date.now()}`,
        title: 'Battery Reserve Below Threshold (14.2%)',
        proposedAction: 'RETURN_TO_SOLAR_RIDGE',
        triggerType: 'LOW_BATTERY',
        rationale: 'Energy reserve has reached critical 15% threshold while in permanently shadowed region.',
        supportingFactors: ['PSR cold trap solar flux: 0 W/m2', 'Return transit energy required: 2.1 kWh'],
        constraints: ['Battery must remain > 10% reserve for thermal survival loop'],
        expectedBenefit: 'Immediate solar recharge line-of-sight on Shackleton rim.',
        tradeOff: 'Terminates active excavation sortie early.',
        priority: 'CRITICAL',
        requiresApproval: true,
        status: 'PENDING',
      };
      setRecommendation(rec);
      addCommand('ENERGY_ALERT', { soc: 14.2 }, 'AUTONOMOUS_ORCHESTRATOR', 'SUCCESS', 'Low energy warning. Replanning suggested.');
    }
    else if (type === 'THERMAL_SPIKE') {
      setTelemetry(prev => ({
        ...prev,
        tempCelsius: 78.5,
        thermalLoadPct: 88.0,
      }));
      const rec: DecisionRecommendation = {
        id: `rec-${Date.now()}`,
        title: 'Avionics Thermal Excursion (+78.5°C)',
        proposedAction: 'COLD_TRAP_DESCENT',
        triggerType: 'THERMAL_SPIKE',
        rationale: 'Direct solar exposure on sensor mast exceeding continuous thermal envelope.',
        supportingFactors: ['Radiator sun-shield occlusion', 'Internal avionics bay temp rising +1.2C/min'],
        constraints: ['Avionics maximum allowable temperature: +85°C'],
        expectedBenefit: 'Rapid radiative cooling in cold crater floor (-180°C sink).',
        tradeOff: 'Temporary loss of direct-to-Earth communications.',
        priority: 'HIGH',
        requiresApproval: true,
        status: 'PENDING',
      };
      setRecommendation(rec);
      addCommand('THERMAL_ALERT', { temp: 78.5 }, 'AUTONOMOUS_ORCHESTRATOR', 'SUCCESS', 'Thermal overload warning. Replanning suggested.');
    }
    else if (type === 'COMMS_DELAY') {
      const rec: DecisionRecommendation = {
        id: `rec-${Date.now()}`,
        title: 'Earth-Moon Relay High Latency (4,200ms)',
        proposedAction: 'ENGAGE_AUTONOMOUS_ORCHESTRATION',
        triggerType: 'RADAR_ANOMALY',
        rationale: 'Deep Space Network packet jitter exceeds tele-operation safety margins.',
        supportingFactors: ['High signal round-trip time: 4.2s', 'Packet drop rate: 4.8%'],
        constraints: ['Human-in-the-loop oversight required for rotary drill engage'],
        expectedBenefit: 'Permits continuous science gathering without telemetry stall.',
        tradeOff: 'Higher autonomous decision authority assigned to vehicle AI.',
        priority: 'ADVISORY',
        requiresApproval: false,
        status: 'PENDING',
      };
      setRecommendation(rec);
      addCommand('COMMS_ANOMALY', { latencyMs: 4200 }, 'AUTONOMOUS_ORCHESTRATOR', 'SUCCESS', 'High latency detected. Switching to local AI.');
    }
  }, [elapsedSeconds]);

  const handleApproveRec = useCallback((recId: string) => {
    setRecommendation(prev => prev?.id === recId ? { ...prev, status: 'APPROVED' } : prev);
    // If obstacle, reroute and clear obstacle
    if (obstacleDetected) {
      setTimeout(() => {
        setObstacleDetected(false);
        setOperation('NAVIGATING');
        setTelemetry(prev => ({ ...prev, operation: 'NAVIGATING' }));
      }, 2500);
    }
    // If battery, restore nominal
    setTelemetry(prev => ({
      ...prev,
      batterySoc: Math.max(prev.batterySoc, 65),
      remainingEnergyKwh: Math.max(prev.remainingEnergyKwh, 15.6),
      tempCelsius: Math.min(prev.tempCelsius, -35),
      thermalLoadPct: Math.min(prev.thermalLoadPct, 25),
    }));
    addCommand('APPROVE_REPLAN', { recId }, 'UI_BUTTON', 'SUCCESS', 'Autonomous replan approved & executed.');
    setTimeout(() => setRecommendation(null), 3000);
  }, [obstacleDetected, elapsedSeconds]);

  const handleRejectRec = useCallback((recId: string) => {
    setRecommendation(null);
    setObstacleDetected(false);
    addCommand('REJECT_REPLAN', { recId }, 'UI_BUTTON', 'SUCCESS', 'Operator rejected proposed replan. Holding trajectory.');
  }, [elapsedSeconds]);

  const handleAlternativeRec = useCallback((recId: string) => {
    setRecommendation(prev => prev ? {
      ...prev,
      title: 'Alternative Strategy: Hold Position & Recharge',
      proposedAction: 'HOLD_AND_ORIENT_SOLAR',
      rationale: 'Stationary orientation of solar wings towards low sun elevation.',
      status: 'ALTERNATIVE_CHOSEN',
    } : null);
    addCommand('ALTERNATIVE_REPLAN', { recId }, 'UI_BUTTON', 'SUCCESS', 'Alternative station-keeping profile selected.');
  }, [elapsedSeconds]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050D1B] text-white flex flex-col overflow-hidden">
      {/* ── Header / Nav ── */}
      <Header
        missionId="LM-ASTRA-2026"
        regionName={selectedSite ? selectedSite.name : currentRegion.name}
        operationState={operation}
        elapsedSeconds={elapsedSeconds}
        simSpeed={simSpeed}
        isPaused={isPaused}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSpeedChange={setSimSpeed}
        onTogglePause={handleTogglePause}
        onResetMission={handleResetMission}
        onEmergencyStop={handleEmergencyStop}
      />

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">

        {/* ── DASHBOARD: 3D Digital Twin ── */}
        {activeTab === 'DASHBOARD' && (
          <div className="dashboard-shell h-[calc(100vh-53px)] flex flex-col">
            {/* Three-panel row */}
            <div className="dashboard-panels flex flex-1 overflow-hidden min-h-0">
              {/* Left sidebar: Science assays and data layers */}
              <div className="dashboard-science w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-y-auto border-r border-[#1A2E50]">
                <SciencePanel
                  regions={LUNAR_REGIONS}
                  currentRegion={currentRegion}
                  selectedSite={selectedSite}
                  dataLayers={dataLayers}
                  roverCoords={{ lat: telemetry.lat, lon: telemetry.lon, elevation: telemetry.elevation }}
                  onRegionChange={(regionId: string) => {
                    const r = LUNAR_REGIONS.find(x => x.id === regionId);
                    if (r) {
                      const destination = r.sites[0];
                      setCurrentRegion(r);
                      if (destination) {
                        setHydrationDetectedSiteId(null);
                        setSelectedSite(destination);
                        setSelectedSiteId(destination.id);
                        manualDriveUntilRef.current = 0;
                        setOperation('IDLE');
                        setTelemetry((prev) => ({
                          ...prev,
                          lat: destination.lat,
                          lon: destination.lon,
                          elevation: destination.elevation,
                          gridX: 0,
                          gridY: 0,
                          speedMs: 0,
                          operation: 'IDLE',
                          powerDrawWatts: 90,
                        }));
                      }
                    }
                  }}
                  onSiteSelect={(site: CandidateSite) => {
                    setHydrationDetectedSiteId(null);
                    setSelectedSite(site);
                    setSelectedSiteId(site.id);
                    manualDriveUntilRef.current = 0;
                    setOperation('IDLE');
                    setTelemetry(prev => ({
                      ...prev,
                      lat: site.lat,
                      lon: site.lon,
                      elevation: site.elevation,
                      gridX: 0,
                      gridY: 0,
                      speedMs: 0,
                      operation: 'IDLE',
                      powerDrawWatts: 90,
                    }));
                    addCommand('TARGET_SITE_SELECTED', { site: site.name }, 'UI_BUTTON', 'SUCCESS', `Targeting ${site.name}`);
                  }}
                  onLayerToggle={(layerId: string) =>
                    setDataLayers(prev => prev.map(l => l.id === layerId ? { ...l, active: !l.active } : l))
                  }
                />
              </div>

              {/* Centre: 3D Twin Viewport */}
              <div className="dashboard-twin flex-1 relative overflow-hidden bg-[#030812]">
                <LunarDigitalTwin
                  key={`${currentRegion.id}:${selectedSite?.id ?? 'unselected'}`}
                  telemetry={telemetry}
                  selectedSite={selectedSite}
                  obstacleDetected={obstacleDetected}
                  onTelemetryUpdate={handleManualTelemetryUpdate}
                />

                {!activeTask && (
                  <section className="task-start-overlay">
                    <span className="task-eyebrow">TASK {String(nextTaskNumber).padStart(2, '0')} · READY</span>
                    <h1>Start a surface task</h1>
                    <p>Begin rover traverse and record movement, scans, samples, and drill activity.</p>
                    <button className="start-task-button" onClick={handleStartTask}>Start task</button>
                  </section>
                )}

                {/* Adaptive Intelligence Card overlay (collapsible, auto-opens on active intervention) */}
                <div className="absolute bottom-16 left-3 z-10 w-80 pointer-events-auto">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => setShowAdaptiveHUD(v => !v)}
                      className={`flex items-center gap-1.5 bg-[#09152B]/90 hover:bg-[#1A2E50] border text-xs px-2.5 py-1 rounded font-semibold cursor-pointer shadow-md transition-all ${recommendation
                        ? 'border-amber-500/60 text-amber-300 animate-pulse'
                        : 'border-[#1A2E50] text-[#60B8FF]'
                        }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Adaptive Engine {recommendation ? '(!)' : '(Nominal)'}</span>
                      <span className="text-gray-400 text-[10px]">{showAdaptiveHUD ? '▼' : '▲'}</span>
                    </button>
                  </div>
                  {showAdaptiveHUD && (
                    <div className="mt-1 shadow-2xl">
                      <AdaptiveIntelligenceCard
                        recommendation={recommendation}
                        onApprove={handleApproveRec}
                        onReject={handleRejectRec}
                        onAlternative={handleAlternativeRec}
                        onInjectEvent={handleInjectEvent}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar: Live rover telemetry and subsystem health */}
              <div className="dashboard-telemetry w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-y-auto border-l border-[#1A2E50]">
                <TelemetryPanel telemetry={telemetry} />
              </div>
            </div>

            {activeTask && (
              <TaskControlBar
                taskNumber={activeTask.taskNumber}
                elapsedSeconds={elapsedSeconds}
                actions={activeTask.actions}
                speedMs={telemetry.speedMs ?? 0}
                heading={telemetry.heading}
                onEnd={handleEndTask}
                onMove={handleTaskMove}
                onRotate={handleTaskRotate}
                onScan={handleTaskScan}
                onDrill={handleTaskDrill}
                onSample={handleTaskSample}
              />
            )}
          </div>
        )}

        {/* ── SITES: Backend site assessment ── */}
        {activeTab === 'SITES' && (
          <div className="min-h-[calc(100vh-53px)]">
            <SiteAssessmentView
              selectedSiteId={selectedSiteId}
              onSelectSite={handleSelectSite}
              onProceedToMission={handleProceedToMission}
            />
          </div>
        )}

        {/* ── MISSION: Backend mission builder ── */}
        {activeTab === 'MISSION' && (
          <div className="min-h-[calc(100vh-53px)]">
            <MissionBuilder
              selectedSiteId={selectedSiteId}
              onMissionComplete={handleMissionComplete}
            />
          </div>
        )}

        {/* ── REPORT: Latest mission report ── */}
        {activeTab === 'REPORT' && (
          <div className="min-h-[calc(100vh-53px)]">
            {taskReports.length > 0 ? (
              <TaskReportsView reports={taskReports} onBack={() => setActiveTab('DASHBOARD')} />
            ) : latestReport ? (
              <MissionReportView
                report={latestReport}
                onClose={() => setActiveTab('MISSION')}
              />
            ) : (
              <EmptyReportState onGoToMission={() => setActiveTab('MISSION')} />
            )}
          </div>
        )}

        {/* ── SCENARIOS: Saved scenarios library ── */}
        {activeTab === 'SCENARIOS' && (
          <div className="min-h-[calc(100vh-53px)]">
            <ScenariosView />
          </div>
        )}

        {/* ── SLIDES: Pitch Deck ── */}
        {activeTab === 'SLIDES' && (
          <div className="min-h-[calc(100vh-53px)] flex items-stretch">
            <div className="flex-1">
              <PitchDeckModal onClose={() => setActiveTab('DASHBOARD')} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;

// ── Empty state shown before any mission is run ──────────────────────────────
const EmptyReportState: React.FC<{ onGoToMission: () => void }> = ({ onGoToMission }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6 py-20">
    <div className="w-20 h-20 rounded-full bg-[#0E1E3D] border border-[#1A2E50] flex items-center justify-center mb-6">
      <svg className="w-10 h-10 text-[#60B8FF]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h2 className="text-2xl font-montserrat font-bold text-white mb-2">No Mission Report Yet</h2>
    <p className="text-gray-400 max-w-sm mb-8 text-sm leading-relaxed">
      Configure and run a mission in the Mission Builder to generate a detailed performance
      report with energy breakdown, resource yield, and AI recommendations.
    </p>
    <button
      onClick={onGoToMission}
      className="flex items-center space-x-2 bg-[#60B8FF] hover:bg-[#4a9fe0] text-[#050D1B] font-bold px-6 py-3 rounded-lg transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Go to Mission Builder</span>
    </button>
    <p className="text-[10px] text-gray-500 font-mono mt-8">
      Connected to FastAPI: <code className="text-[#60B8FF]">POST /api/v1/mission/run</code>
    </p>
  </div>
);
