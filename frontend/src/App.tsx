import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Bot } from 'lucide-react';
import { MissionReport, api } from './api/client';
import {
  RoverTelemetry,
  OperationState,
  CommandLogEntry,
  DecisionRecommendation,
  MissionObjective,
  AppTab,
  CandidateSite,
} from './types';
import { LUNAR_REGIONS, INITIAL_DATA_LAYERS, INITIAL_OBJECTIVES } from './data/lunarData';

// Components
import { Header } from './components/Header';
import { LunarDigitalTwin } from './components/LunarDigitalTwin';
import { SciencePanel } from './components/SciencePanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ObjectivesPanel } from './components/ObjectivesPanel';
import { AdaptiveIntelligenceCard } from './components/AdaptiveIntelligenceCard';
import { CommandConsole } from './components/CommandConsole';
import { SiteAssessmentView } from './components/SiteAssessmentView';
import { MissionBuilder } from './components/MissionBuilder';
import { MissionReportView } from './components/MissionReportView';
import { ScenariosView } from './components/ScenariosView';
import { PitchDeckModal } from './components/PitchDeckModal';

// ── Initial rover telemetry for the 3D Digital Twin ──────────────────────────
const INITIAL_TELEMETRY: RoverTelemetry = {
  lat: -89.5400, lon: 129.7800, elevation: -3200, heading: 45,
  gridX: 0, gridY: 0,
  batterySoc: 94.5, remainingEnergyKwh: 22.68, batteryCapacityKwh: 24.0,
  powerDrawWatts: 340, tempCelsius: -42.5, thermalLoadPct: 22.0,
  health: { mobility: 100, sensorMast: 100, rotaryDrill: 97, comms: 100 },
  storageUsedKg: 142, storageCapacityKg: 500,
  storageUsedL: 89, storageCapacityL: 350,
  coreSamplesCount: 3,
  drillDepthM: 0, targetDrillDepthM: 2.5,
  operation: 'NAVIGATING',
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

  // ── Dashboard 3D Twin state ───────────────────────────────────────────────
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentRegion, setCurrentRegion] = useState(LUNAR_REGIONS[0]);
  const [selectedSite, setSelectedSite] = useState<CandidateSite | null>(LUNAR_REGIONS[0].sites[0]);
  const [dataLayers, setDataLayers] = useState(INITIAL_DATA_LAYERS);
  const [objectives, setObjectives] = useState<MissionObjective[]>(INITIAL_OBJECTIVES);
  const [recommendation, setRecommendation] = useState<DecisionRecommendation | null>(null);
  const [commandLogs, setCommandLogs] = useState<CommandLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<RoverTelemetry>({ ...INITIAL_TELEMETRY });
  const [operation, setOperation] = useState<OperationState>('NAVIGATING');
  const [obstacleDetected, setObstacleDetected] = useState<boolean>(false);
  const [showObjectivesHUD, setShowObjectivesHUD] = useState<boolean>(false);
  const [showAdaptiveHUD, setShowAdaptiveHUD] = useState<boolean>(false);

  // MET clock ticks for the 3D digital twin
  const metRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeTab !== 'DASHBOARD') return;
    if (isPaused) { if (metRef.current) clearInterval(metRef.current); return; }
    metRef.current = window.setInterval(() => {
      setElapsedSeconds(s => s + simSpeed);
      setTelemetry(prev => {
        // Dynamic simulation increments while navigating
        let newDist = prev.distanceTravelledM;
        let newSoc = prev.batterySoc;
        let newEnergy = prev.remainingEnergyKwh;

        if (prev.operation === 'NAVIGATING' || prev.operation === 'RETURNING') {
          newDist += (0.8 / 3.6) * simSpeed;
          newSoc = Math.max(5, newSoc - (0.002 * simSpeed));
          newEnergy = Math.max(0.5, (newSoc / 100) * prev.batteryCapacityKwh);
        } else if (prev.operation === 'DRILLING') {
          newSoc = Math.max(5, newSoc - (0.008 * simSpeed));
          newEnergy = Math.max(0.5, (newSoc / 100) * prev.batteryCapacityKwh);
        }

        return {
          ...prev,
          missionElapsedSeconds: prev.missionElapsedSeconds + simSpeed,
          distanceTravelledM: Math.round(newDist * 10) / 10,
          batterySoc: Math.round(newSoc * 10) / 10,
          remainingEnergyKwh: Math.round(newEnergy * 100) / 100,
        };
      });
    }, 1000);
    return () => { if (metRef.current) clearInterval(metRef.current); };
  }, [isPaused, simSpeed, activeTab]);

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
    setObjectives(INITIAL_OBJECTIVES);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(p => {
      const next = !p;
      setTelemetry(prev => ({ ...prev, isPaused: next }));
      return next;
    });
  }, []);

  // ── Unified Command Execution (CLI + Console Buttons + Keyboard) ─────────
  const handleExecuteCommand = useCallback((
    command: string,
    params?: Record<string, any>,
    source?: 'CLI' | 'UI_BUTTON' | 'KEYBOARD_SHORTCUT',
  ) => {
    const cmdUpper = command.toUpperCase();

    if (cmdUpper.includes('MOVE') || cmdUpper.includes('NAVIGATE')) {
      setOperation('NAVIGATING');
      setIsPaused(false);
      setTelemetry(prev => ({ ...prev, operation: 'NAVIGATING', isPaused: false, powerDrawWatts: 340 }));
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Traverse locomotion engaged. Waypoint tracking active.');
      // Update first objective
      setObjectives(prev => prev.map(o => o.id === 'obj-2' ? { ...o, status: 'IN_PROGRESS' } : o));
    }
    else if (cmdUpper.includes('SCAN')) {
      setOperation('SCANNING');
      setTelemetry(prev => ({ ...prev, operation: 'SCANNING', powerDrawWatts: 420 }));
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Surface LiDAR & CPR radar array emitting active sweep.');
    }
    else if (cmdUpper.includes('SAMPLE')) {
      setOperation('SAMPLING');
      setTelemetry(prev => ({
        ...prev,
        operation: 'SAMPLING',
        coreSamplesCount: prev.coreSamplesCount + 1,
        storageUsedKg: Math.min(prev.storageCapacityKg, prev.storageUsedKg + 18),
        powerDrawWatts: 290,
      }));
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Regolith surface sample scooped. Payload bay updated.');
    }
    else if (cmdUpper.includes('DRILL')) {
      setOperation('DRILLING');
      const depthIncrement = params?.targetDepth ? params.targetDepth : 0.5;
      setTelemetry(prev => {
        const nextDepth = Math.min(prev.targetDrillDepthM, prev.drillDepthM + depthIncrement);
        return {
          ...prev,
          operation: 'DRILLING',
          drillDepthM: nextDepth,
          storageUsedKg: Math.min(prev.storageCapacityKg, prev.storageUsedKg + 35),
          powerDrawWatts: 880,
        };
      });
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', `Rotary percussive drill penetrating lunar crust.`);
      // Update drill objective
      setObjectives(prev => prev.map(o => o.id === 'obj-3' ? { ...o, status: 'IN_PROGRESS' } : o));
    }
    else if (cmdUpper.includes('PROCESS')) {
      setOperation('PROCESSING');
      setTelemetry(prev => ({ ...prev, operation: 'PROCESSING', powerDrawWatts: 620 }));
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Thermal sublimation reactors engaged. Volatiles condensing.');
    }
    else if (cmdUpper.includes('RETURN')) {
      setOperation('RETURNING');
      setTelemetry(prev => ({ ...prev, operation: 'RETURNING', powerDrawWatts: 310 }));
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Heading inverted towards Artemis base camp.');
    }
    else if (cmdUpper.includes('STOP') || cmdUpper.includes('HALT')) {
      handleEmergencyStop();
    }
    else {
      addCommand(command, params ?? {}, source ?? 'CLI', 'SUCCESS', 'Command acknowledged by vehicle flight software.');
    }
  }, [elapsedSeconds, handleEmergencyStop]);

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
          <div className="h-[calc(100vh-53px)] flex flex-col">
            {/* Three-panel row */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left sidebar: Science assays and data layers */}
              <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-y-auto border-r border-[#1A2E50]">
                <SciencePanel
                  regions={LUNAR_REGIONS}
                  currentRegion={currentRegion}
                  selectedSite={selectedSite}
                  dataLayers={dataLayers}
                  roverCoords={{ lat: telemetry.lat, lon: telemetry.lon, elevation: telemetry.elevation }}
                  onRegionChange={(regionId: string) => {
                    const r = LUNAR_REGIONS.find(x => x.id === regionId);
                    if (r) {
                      setCurrentRegion(r);
                      if (r.sites.length > 0) setSelectedSite(r.sites[0]);
                    }
                  }}
                  onSiteSelect={(site: CandidateSite) => {
                    setSelectedSite(site);
                    setSelectedSiteId(site.id);
                    setTelemetry(prev => ({
                      ...prev,
                      lat: site.lat,
                      lon: site.lon,
                      elevation: site.elevation,
                    }));
                    addCommand('TARGET_SITE_SELECTED', { site: site.name }, 'UI_BUTTON', 'SUCCESS', `Targeting ${site.name}`);
                  }}
                  onLayerToggle={(layerId: string) =>
                    setDataLayers(prev => prev.map(l => l.id === layerId ? { ...l, active: !l.active } : l))
                  }
                />
              </div>

              {/* Centre: 3D Twin Viewport */}
              <div className="flex-1 relative overflow-hidden bg-[#030812]">
                <LunarDigitalTwin
                  telemetry={telemetry}
                  selectedSite={selectedSite}
                  obstacleDetected={obstacleDetected}
                  onTelemetryUpdate={setTelemetry}
                />

                {/* Mission Objectives HUD overlay (collapsible to keep 4K 3D view unobstructed) */}
                <div className="absolute top-14 left-3 z-10 w-72 pointer-events-auto">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => setShowObjectivesHUD(v => !v)}
                      className="flex items-center gap-1.5 bg-[#09152B]/90 hover:bg-[#1A2E50] border border-[#1A2E50] text-xs px-2.5 py-1 rounded text-[#60B8FF] font-semibold cursor-pointer shadow-md transition-all"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Objectives ({objectives.filter(o => o.status === 'COMPLETED').length}/{objectives.length})</span>
                      <span className="text-gray-400 text-[10px]">{showObjectivesHUD ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  {showObjectivesHUD && (
                    <div className="mt-1 shadow-2xl">
                      <ObjectivesPanel objectives={objectives} />
                    </div>
                  )}
                </div>

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
              <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col overflow-y-auto border-l border-[#1A2E50]">
                <TelemetryPanel telemetry={telemetry} />
              </div>
            </div>

            {/* Bottom command bar */}
            <div className="flex-shrink-0">
              <CommandConsole
                operation={operation}
                commandLogs={commandLogs}
                onExecuteCommand={handleExecuteCommand}
              />
            </div>
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
            {latestReport ? (
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
