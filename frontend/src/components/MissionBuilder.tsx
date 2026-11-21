import React, { useState, useEffect } from 'react';
import {
  api, RoverConfig, ProcessingPathway, MissionRunRequest, MissionReport,
  RoverSimResult, ProcessingSimResult, Site
} from '../api/client';
import {
  Play, Loader2, AlertTriangle, CheckCircle, ChevronDown, Zap, Clock,
  Database, Gauge, Award, AlertOctagon, Info, Settings
} from 'lucide-react';

interface MissionBuilderProps {
  selectedSiteId: string | null;
  onMissionComplete: (report: MissionReport) => void;
}

export const MissionBuilder: React.FC<MissionBuilderProps> = ({
  selectedSiteId: initialSiteId,
  onMissionComplete,
}) => {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string>(initialSiteId || 'site_shackleton');
  const [site, setSite] = useState<Site | null>(null);
  const [rovers, setRovers] = useState<RoverConfig[]>([]);
  const [pathways, setPathways] = useState<ProcessingPathway[]>([]);

  const [selectedRoverId, setSelectedRoverId] = useState<string>('');
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>('');
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive' | 'energy_saving'>('balanced');
  const [scenarioName, setScenarioName] = useState('');

  // Constraints
  const [maxEnergyKwh, setMaxEnergyKwh] = useState(10.0);
  const [maxDurationHours, setMaxDurationHours] = useState(72.0);
  const [maxStorageKg, setMaxStorageKg] = useState(100.0);
  const [minBatteryPct, setMinBatteryPct] = useState(10.0);

  // Simulation state
  const [roverPreview, setRoverPreview]       = useState<RoverSimResult | null>(null);
  const [processPreview, setProcessPreview]   = useState<ProcessingSimResult | null>(null);
  const [previewLoading, setPreviewLoading]   = useState(false);
  const [runLoading, setRunLoading]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [runError, setRunError]               = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialSiteId) setCurrentSiteId(initialSiteId);
  }, [initialSiteId]);

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([api.listRovers(), api.listPathways(), api.listSites()])
      .then(([roversData, pathwaysData, sitesResp]) => {
        setRovers(roversData);
        setPathways(pathwaysData);
        setAllSites(sitesResp.sites);
        const targetId = currentSiteId || (sitesResp.sites[0]?.id ?? 'site_shackleton');
        setCurrentSiteId(targetId);
        const found = sitesResp.sites.find(s => s.id === targetId);
        if (found) setSite(found);
        if (roversData.length)   setSelectedRoverId(roversData[0].id);
        if (pathwaysData.length) setSelectedPathwayId(pathwaysData[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Update site when currentSiteId changes
  useEffect(() => {
    if (allSites.length > 0) {
      const found = allSites.find(s => s.id === currentSiteId);
      if (found) setSite(found);
    } else if (currentSiteId) {
      api.getSite(currentSiteId).then(setSite).catch(() => {});
    }
  }, [currentSiteId, allSites]);

  const selectedRover   = rovers.find(r => r.id === selectedRoverId);
  const selectedPathway = pathways.find(p => p.id === selectedPathwayId);

  // Run rover-only simulation preview
  const handlePreview = async () => {
    if (!currentSiteId || !selectedRoverId) return;
    setPreviewLoading(true);
    setRoverPreview(null);
    setProcessPreview(null);
    try {
      const roverResult = await api.simulateRover({
        rover_id: selectedRoverId,
        site_id: currentSiteId,
        mission_duration_hours: maxDurationHours,
        target_excavation_kg: maxStorageKg,
        strategy,
      });
      setRoverPreview(roverResult);

      if (roverResult.regolith_excavated_kg > 0 && selectedPathwayId) {
        const procResult = await api.simulateProcessing({
          pathway_id: selectedPathwayId,
          feedstock_mass_kg: roverResult.regolith_excavated_kg,
          ice_concentration_wt_pct: site?.ice_concentration_wt_pct.nominal,
          available_energy_kWh: Math.max(0, maxEnergyKwh - roverResult.energy_total_kWh),
          processing_duration_hours: Math.max(0.1, maxDurationHours - roverResult.total_time_hours),
        });
        setProcessPreview(procResult);
      }
    } catch (e: any) {
      setRunError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Run full mission
  const handleRunMission = async () => {
    if (!currentSiteId || !selectedRoverId || !selectedPathwayId) return;
    setRunLoading(true);
    setRunError(null);
    try {
      const req: MissionRunRequest = {
        site_id: currentSiteId,
        rover_id: selectedRoverId,
        processing_pathway_id: selectedPathwayId,
        constraints: {
          max_energy_kWh: maxEnergyKwh,
          max_duration_hours: maxDurationHours,
          max_storage_kg: maxStorageKg,
          min_battery_reserve_pct: minBatteryPct,
        },
        strategy,
        scenario_name: scenarioName || undefined,
      };
      const report = await api.runMission(req);
      onMissionComplete(report);
    } catch (e: any) {
      setRunError(e.message);
    } finally {
      setRunLoading(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#a7d9df] animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-red-300 text-sm font-mono">{error}</p>
        <p className="text-gray-400 text-xs">Start the API service, then reload this view.</p>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#080b0e] overflow-y-auto p-4 md:p-6 text-xs">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#293235]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-700/50 font-bold">MISSION BUILDER</span>
              {site && <span className="text-gray-400 font-mono text-[10px]">Target: <strong className="text-white">{site.name}</strong></span>}
            </div>
            <h2 className="font-montserrat font-black text-lg text-white">Configure & Launch Mission Simulation</h2>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Calls <code className="text-[#a7d9df]">POST /api/v1/mission/run</code> — Full end-to-end simulation: traverse → excavate → process → score
            </p>
          </div>
        </div>

        {/* Target Site Selector Pill */}
        <div className="p-3 bg-[#111619] border border-[#293235] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#191f22] border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gauge className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-gray-400 block font-semibold">Target Mining Site</span>
              <span className="text-white font-bold text-xs">{site ? site.name : "Select Target"}</span>
              {site && (
                <span className="text-gray-400 text-[10px] ml-2 font-mono">
                  (Nominal Ice: <strong className="text-cyan-400">{site.ice_concentration_wt_pct.nominal} wt%</strong> • Distance: <strong className="text-amber-400">{site.travel_distance_from_base_km} km</strong>)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-gray-400">Switch Site:</span>
            <select
              value={currentSiteId}
              onChange={e => setCurrentSiteId(e.target.value)}
              className="bg-[#080b0e] text-white border border-[#293235] rounded px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-[#a7d9df] cursor-pointer"
            >
              {allSites.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.ice_concentration_wt_pct.nominal} wt% ice)</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* LEFT — Configuration */}
          <div className="space-y-4">

            {/* Rover Selection */}
            <div className="bg-[#111619] p-4 rounded-lg border border-[#293235]">
              <label className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                <Settings className="w-3.5 h-3.5 text-[#a7d9df]" /> Rover Selection
                <span className="text-gray-500 font-mono text-[9px] font-normal">GET /api/v1/rovers</span>
              </label>
              <div className="relative mb-3">
                <select value={selectedRoverId} onChange={e => setSelectedRoverId(e.target.value)}
                  className="w-full bg-[#080b0e] text-white border border-[#293235] rounded px-3 py-2 appearance-none focus:outline-none focus:border-[#a7d9df] font-mono text-xs pr-8">
                  {rovers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {selectedRover && (
                <div className="grid grid-cols-2 gap-1.5 font-telemetry text-[10px]">
                  <div className="bg-[#080b0e] p-1.5 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Mass</span>
                    <span className="text-white font-semibold">{selectedRover.mass_kg} kg</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Battery</span>
                    <span className="text-amber-400 font-semibold">{selectedRover.battery_capacity_kWh} kWh</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Excavation Rate</span>
                    <span className="text-emerald-400 font-semibold">{selectedRover.excavation_rate_kg_per_hour} kg/hr</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Max Slope</span>
                    <span className={`font-semibold ${site && site.slope_deg > selectedRover.max_slope_deg ? 'text-red-400' : 'text-cyan-400'}`}>
                      {selectedRover.max_slope_deg}°
                    </span>
                  </div>
                  <div className="col-span-2 bg-[#080b0e] p-1.5 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Best For</span>
                    <span className="text-gray-200">{selectedRover.best_for}</span>
                  </div>
                  {site && site.slope_deg > selectedRover.max_slope_deg && (
                    <div className="col-span-2 bg-red-950/70 border border-red-700/50 rounded p-1.5 text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Site slope ({site.slope_deg}°) exceeds rover limit ({selectedRover.max_slope_deg}°) — mission will be INFEASIBLE
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Processing Pathway */}
            <div className="bg-[#111619] p-4 rounded-lg border border-[#293235]">
              <label className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                <Database className="w-3.5 h-3.5 text-purple-400" /> ISRU Processing Pathway
                <span className="text-gray-500 font-mono text-[9px] font-normal">GET /api/v1/processing/pathways</span>
              </label>
              <div className="relative mb-3">
                <select value={selectedPathwayId} onChange={e => setSelectedPathwayId(e.target.value)}
                  className="w-full bg-[#080b0e] text-white border border-[#293235] rounded px-3 py-2 appearance-none focus:outline-none focus:border-[#a7d9df] font-mono text-xs pr-8">
                  {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {selectedPathway && (
                <div className="space-y-1.5 text-[10px] font-telemetry">
                  <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
                    <span className="text-gray-400 block">Feedstock → Product</span>
                    <span className="text-white font-semibold">{selectedPathway.feedstock} → {selectedPathway.primary_product}</span>
                  </div>
                  <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
                    <span className="text-gray-400 block text-[9px]">Description</span>
                    <span className="text-gray-300 text-[10px]">{selectedPathway.description}</span>
                  </div>
                  {selectedPathway.byproducts.length > 0 && (
                    <div className="text-gray-400 text-[9px]">Byproducts: {selectedPathway.byproducts.join(', ')}</div>
                  )}
                </div>
              )}
            </div>

            {/* Strategy */}
            <div className="bg-[#111619] p-4 rounded-lg border border-[#293235]">
              <label className="font-bold text-white text-xs uppercase tracking-wider block mb-2">Mission Strategy</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {(['balanced', 'aggressive', 'energy_saving'] as const).map(s => (
                  <button key={s} onClick={() => setStrategy(s)}
                    className={`py-2 px-2 rounded border transition-colors font-semibold text-center ${
                      strategy === s
                        ? 'bg-[#a7d9df] text-[#080b0e] border-[#a7d9df]'
                        : 'bg-[#080b0e] text-gray-300 border-[#293235] hover:border-gray-500'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-gray-500 mt-1.5 font-mono">
                balanced=1.0×speed+dig; aggressive=0.9×speed+1.3×dig; energy_saving=1.2×speed+0.7×dig
              </p>
            </div>
          </div>

          {/* RIGHT — Constraints + Preview */}
          <div className="space-y-4">

            {/* Constraints */}
            <div className="bg-[#111619] p-4 rounded-lg border border-[#293235]">
              <label className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                <Gauge className="w-3.5 h-3.5 text-amber-400" /> Mission Constraints
              </label>
              <div className="space-y-3 font-mono text-xs">
                {[
                  { label: 'Max Energy Budget (kWh)', val: maxEnergyKwh, set: setMaxEnergyKwh, min: 1, max: 100, step: 0.5, color: 'text-amber-400' },
                  { label: 'Max Duration (hours)', val: maxDurationHours, set: setMaxDurationHours, min: 1, max: 720, step: 1, color: 'text-cyan-400' },
                  { label: 'Max Payload Storage (kg)', val: maxStorageKg, set: setMaxStorageKg, min: 10, max: 500, step: 10, color: 'text-emerald-400' },
                  { label: 'Min Battery Reserve (%)', val: minBatteryPct, set: setMinBatteryPct, min: 0, max: 50, step: 1, color: 'text-purple-400' },
                ].map(c => (
                  <div key={c.label} className="bg-[#080b0e] p-2 rounded border border-[#293235]">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">{c.label}</span>
                      <span className={`font-bold ${c.color}`}>{c.val}</span>
                    </div>
                    <input type="range" min={c.min} max={c.max} step={c.step} value={c.val}
                      onChange={e => c.set(parseFloat(e.target.value))}
                      className="w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Name */}
            <div className="bg-[#111619] p-3 rounded-lg border border-[#293235]">
              <label className="text-gray-300 text-xs font-bold block mb-1.5">Scenario Name (optional)</label>
              <input type="text" value={scenarioName} onChange={e => setScenarioName(e.target.value)}
                placeholder="e.g. Cabeus-Miner-Aggressive"
                className="w-full bg-[#080b0e] text-white border border-[#293235] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#a7d9df] font-mono text-xs" />
            </div>

            {/* Preview Rover Result */}
            {roverPreview && (
              <div className="bg-[#191f22] p-3 rounded-lg border border-[#3c494d] space-y-2 text-[10px] font-telemetry">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-[#a7d9df]" /> Rover Preview
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    roverPreview.mission_feasible ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-red-950 text-red-400 border border-red-700'
                  }`}>
                    {roverPreview.mission_feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Distance (RT)</span>
                    <span className="text-white font-bold">{roverPreview.distance_travelled_km} km</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Excavated</span>
                    <span className="text-emerald-400 font-bold">{roverPreview.regolith_excavated_kg} kg</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Energy Used</span>
                    <span className="text-amber-400 font-bold">{roverPreview.energy_total_kWh} kWh</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Battery Left</span>
                    <span className={`font-bold ${roverPreview.battery_remaining_pct < 10 ? 'text-red-400' : 'text-cyan-400'}`}>
                      {roverPreview.battery_remaining_pct}%
                    </span>
                  </div>
                </div>
                {roverPreview.limiting_factor && (
                  <div className="text-amber-400 text-[9px] flex items-center gap-1 bg-amber-950/50 px-2 py-1 rounded">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Limiting factor: {roverPreview.limiting_factor}
                  </div>
                )}
              </div>
            )}

            {/* Processing Preview */}
            {processPreview && (
              <div className="bg-[#191f22] p-3 rounded-lg border border-purple-900/50 space-y-2 text-[10px] font-telemetry">
                <span className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-400" /> Processing Preview
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Output</span>
                    <span className="text-purple-400 font-bold">{processPreview.primary_product_kg.toFixed(3)} kg</span>
                    <span className="text-[9px] text-gray-500 block">{processPreview.primary_product_unit}</span>
                  </div>
                  <div className="bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Energy Used</span>
                    <span className="text-amber-400 font-bold">{processPreview.energy_consumed_kWh.toFixed(3)} kWh</span>
                  </div>
                  <div className="col-span-2 bg-[#080b0e] p-1.5 rounded">
                    <span className="text-gray-400 block">Efficiency</span>
                    <span className="text-emerald-400 font-bold">{processPreview.processing_efficiency_pct}% capture</span>
                  </div>
                </div>
                <div className="space-y-0.5 text-[9px] text-gray-400">
                  {processPreview.assumptions.map((a, i) => <p key={i}>• {a}</p>)}
                </div>
              </div>
            )}

            {runError && (
              <div className="p-2.5 bg-red-950/70 border border-red-700 rounded text-red-400 text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{runError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button onClick={handlePreview} disabled={!currentSiteId || previewLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#293235] hover:bg-[#3c494d] disabled:opacity-40 text-white font-mono font-bold rounded transition-colors text-xs cursor-pointer">
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4 text-cyan-400" />}
                {previewLoading ? 'Simulating...' : 'Preview Simulation'}
              </button>

              <button onClick={handleRunMission} disabled={!currentSiteId || runLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#a7d9df] hover:bg-[#75d8cc] disabled:opacity-40 text-[#080b0e] font-mono font-black rounded transition-colors text-xs shadow-[0_0_15px_rgba(96,184,255,0.3)] cursor-pointer">
                {runLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {runLoading ? 'Running Mission...' : 'RUN FULL MISSION'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
