import React, { useState } from 'react';
import { DataLayerInfo, LunarRegion, CandidateSite } from '../types';
import { Layers, MapPin, Eye, CheckCircle2, AlertTriangle, ShieldCheck, Info, ChevronDown, Sparkles } from 'lucide-react';

interface SciencePanelProps {
  regions: LunarRegion[];
  currentRegion: LunarRegion;
  selectedSite: CandidateSite | null;
  dataLayers: DataLayerInfo[];
  roverCoords: { lat: number; lon: number; elevation: number };
  onRegionChange: (regionId: string) => void;
  onSiteSelect: (site: CandidateSite) => void;
  onLayerToggle: (layerId: string) => void;
}

export const SciencePanel: React.FC<SciencePanelProps> = ({
  regions,
  currentRegion,
  selectedSite,
  dataLayers,
  roverCoords,
  onRegionChange,
  onSiteSelect,
  onLayerToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'LAYERS' | 'RESOURCES' | 'SITES'>('LAYERS');

  const getBadgeClass = (category: string) => {
    switch (category) {
      case 'VERIFIED OBSERVATION':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
      case 'PROCESSED DATA':
        return 'bg-blue-950/80 text-blue-400 border-blue-500/40';
      case 'DERIVED INDICATOR':
        return 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40';
      case 'MODEL ESTIMATE':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'SIMULATED / SYNTHETIC':
        return 'bg-purple-950/80 text-purple-400 border-purple-500/40';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="w-full h-full bg-[#111619] flex flex-col border-r border-[#293235] overflow-hidden text-xs select-none">
      {/* Region Selector Header */}
      <div className="p-3 border-b border-[#293235] bg-[#0C1A32]">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-1">
          Target Lunar Region
        </label>
        <div className="relative">
          <select
            value={currentRegion.id}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full bg-[#080b0e] text-white border border-[#293235] rounded px-2.5 py-1.5 appearance-none focus:outline-none focus:border-[#a7d9df] font-semibold text-xs pr-8"
          >
            {regions.map((reg) => (
              <option key={reg.id} value={reg.id}>
                {reg.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
          CRS: {currentRegion.crs}
        </p>
      </div>

      {/* Live Coordinate & Surface Context HUD */}
      <div className="p-3 border-b border-[#293235] bg-[#071122]">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#a7d9df] mb-1.5">
          <span>Live Coordinate Query</span>
          <span className="px-1.5 py-0.2 bg-[#293235] rounded text-[9px] text-emerald-400">SYNCED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 font-telemetry">
          <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
            <span className="text-[10px] text-gray-400 block">LAT / LON</span>
            <span className="text-white font-semibold">
              {roverCoords.lat.toFixed(4)}°S / {roverCoords.lon.toFixed(4)}°E
            </span>
          </div>
          <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
            <span className="text-[10px] text-gray-400 block">ELEVATION (DEM)</span>
            <span className="text-amber-400 font-semibold">{roverCoords.elevation} m</span>
          </div>
        </div>

        {/* Traversability Status */}
        <div className="mt-2 flex items-center justify-between text-[11px] bg-[#191f22] px-2.5 py-1.5 rounded border border-[#3c494d]">
          <span className="text-gray-300">Surface Traversability:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> TRAVERSABLE (Slope 6.4°)
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-[#293235] bg-[#080b0e]">
        <button
          onClick={() => setActiveTab('LAYERS')}
          className={`flex-1 py-2 text-center font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'LAYERS'
              ? 'text-[#a7d9df] border-b-2 border-[#a7d9df] bg-[#111619]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Data Layers ({dataLayers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`flex-1 py-2 text-center font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'RESOURCES'
              ? 'text-[#a7d9df] border-b-2 border-[#a7d9df] bg-[#111619]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mineral Assays</span>
        </button>
        <button
          onClick={() => setActiveTab('SITES')}
          className={`flex-1 py-2 text-center font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'SITES'
              ? 'text-[#a7d9df] border-b-2 border-[#a7d9df] bg-[#111619]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Sites ({currentRegion.sites.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTab === 'LAYERS' && (
          <>
            <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
              <span>Scientific Data Products Registered:</span>
              <span className="text-[#a7d9df]">ISRO / NASA / USGS</span>
            </div>

            {dataLayers.map((layer) => (
              <div
                key={layer.id}
                className={`p-2.5 rounded border transition-all ${
                  layer.active
                    ? 'bg-[#191f22] border-[#3c494d]'
                    : 'bg-[#080b0e] border-[#293235] opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-1.5">
                      {layer.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 block font-telemetry">
                      {layer.mission} • {layer.instrument}
                    </span>
                  </div>
                  <button
                    onClick={() => onLayerToggle(layer.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                      layer.active
                        ? 'bg-[#a7d9df] text-[#080b0e]'
                        : 'bg-[#293235] text-gray-400 hover:text-white'
                    }`}
                  >
                    {layer.active ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Provenance Badge */}
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${getBadgeClass(
                      layer.category
                    )}`}
                  >
                    {layer.category}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Res: {layer.nativeResolution}
                  </span>
                </div>

                {layer.active && layer.currentValue && (
                  <div className="mt-2 bg-[#080b0e] p-1.5 rounded border border-[#293235] text-[11px] font-telemetry text-emerald-400 flex items-center justify-between">
                    <span className="text-gray-400">At Rover Pose:</span>
                    <span className="font-bold">{layer.currentValue}</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === 'RESOURCES' && (
          <div className="space-y-3">
            <div className="bg-[#191f22] p-2.5 rounded border border-[#3c494d]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a7d9df] block mb-1">
                Polar Volatile Signatures (DFSAR & M³)
              </span>
              <div className="space-y-1.5 font-telemetry">
                <div className="flex justify-between items-center bg-[#080b0e] p-1.5 rounded">
                  <span className="text-gray-300">Radar CPR (Volumetric):</span>
                  <span className="text-amber-400 font-bold">1.18 [ANOMALY]</span>
                </div>
                <div className="flex justify-between items-center bg-[#080b0e] p-1.5 rounded">
                  <span className="text-gray-300">M³ 2.82 µm Band Depth:</span>
                  <span className="text-cyan-400 font-bold">0.068 (OH/H₂O proxy)</span>
                </div>
                <div className="flex justify-between items-center bg-[#080b0e] p-1.5 rounded">
                  <span className="text-gray-300">PSR Proximity:</span>
                  <span className="text-white font-bold">140 m to shadow wall</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                *Scientific Note: CPR &gt; 1.0 inside cold-traps is consistent with low-loss dielectric ice scattering (Sinha et al. 2026), not a proven industrial reserve.
              </p>
            </div>

            <div className="bg-[#191f22] p-2.5 rounded border border-[#3c494d]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a7d9df] block mb-1">
                Elemental & Oxide Abundance (CLASS / APXS)
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-telemetry">
                <div className="bg-[#080b0e] p-1.5 rounded">
                  <span className="text-[10px] text-gray-400 block">FeO (Iron Oxide)</span>
                  <span className="text-white font-bold">8.4 wt %</span>
                </div>
                <div className="bg-[#080b0e] p-1.5 rounded">
                  <span className="text-[10px] text-gray-400 block">TiO₂ (Ilmenite Proxy)</span>
                  <span className="text-white font-bold">3.1 wt %</span>
                </div>
                <div className="bg-[#080b0e] p-1.5 rounded">
                  <span className="text-[10px] text-gray-400 block">Al₂O₃ (Plagioclase)</span>
                  <span className="text-white font-bold">24.2 wt %</span>
                </div>
                <div className="bg-[#080b0e] p-1.5 rounded">
                  <span className="text-[10px] text-gray-400 block">SiO₂ (Silicates)</span>
                  <span className="text-white font-bold">45.1 wt %</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                *Elemental wt % does not equal free mineral percentage. Bound oxygen represents ~45% of bulk lunar regolith.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'SITES' && (
          <div className="space-y-2.5">
            {currentRegion.sites.map((site) => {
              const isSelected = selectedSite?.id === site.id;
              return (
                <div
                  key={site.id}
                  onClick={() => onSiteSelect(site)}
                  className={`p-2.5 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#191f22] border-[#a7d9df] ring-1 ring-[#a7d9df]'
                      : 'bg-[#080b0e] border-[#293235] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{site.name}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">{site.code}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-400 font-telemetry block">
                        {site.totalSuitability.toFixed(1)}/100
                      </span>
                      <span className="text-[9px] text-gray-400">Total Score S</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-300 mt-1.5 line-clamp-2">
                    {site.rationale}
                  </p>

                  <div className="grid grid-cols-4 gap-1 mt-2 text-[9px] font-mono text-center">
                    <div className="bg-[#111619] p-1 rounded">
                      <span className="text-gray-400 block">R</span>
                      <span className="text-[#a7d9df] font-bold">{site.resourceIndicator}</span>
                    </div>
                    <div className="bg-[#111619] p-1 rounded">
                      <span className="text-gray-400 block">T</span>
                      <span className="text-emerald-400 font-bold">{site.terrainSuitability}</span>
                    </div>
                    <div className="bg-[#111619] p-1 rounded">
                      <span className="text-gray-400 block">A</span>
                      <span className="text-cyan-400 font-bold">{site.accessibility}</span>
                    </div>
                    <div className="bg-[#111619] p-1 rounded">
                      <span className="text-gray-400 block">P</span>
                      <span className="text-amber-400 font-bold">{site.powerFeasibility}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
