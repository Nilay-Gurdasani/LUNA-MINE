import React from 'react';
import { RoverTelemetry, OperationState } from '../types';
import { Battery, BatteryCharging, Cpu, Database, Gauge, Radio, Shield, Thermometer, Wrench, Zap } from 'lucide-react';

interface TelemetryPanelProps {
  telemetry: RoverTelemetry;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  // Determine battery color
  const getBatteryColor = (soc: number) => {
    if (soc > 50) return 'text-emerald-400';
    if (soc > 20) return 'text-amber-400';
    return 'text-red-400';
  };

  // Determine temperature status color
  const getTempColor = (temp: number) => {
    if (temp > 65 || temp < -50) return 'text-red-400';
    if (temp > 45 || temp < -35) return 'text-amber-400';
    return 'text-cyan-400';
  };

  return (
    <div className="w-full h-full bg-[#111619] flex flex-col border-l border-[#293235] overflow-y-auto text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#293235] bg-[#0C1A32] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-[#a7d9df]" />
          <span className="font-montserrat font-bold text-white uppercase tracking-wider text-xs">
            Rover Telemetry
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#75d8cc]/20 text-[#75d8cc] border border-[#75d8cc]/40 font-bold">
          TWIN ACTIVE
        </span>
      </div>

      <div className="p-3 space-y-3.5 flex-1">
        {/* Operation State Card */}
        <div className="bg-[#080b0e] p-2.5 rounded border border-[#293235] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">
              Active Subsystem State
            </span>
            <span className="text-sm font-mono font-black text-white tracking-wider">
              {telemetry.operation}
            </span>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              telemetry.operation === 'DRILLING'
                ? 'bg-amber-400 animate-ping'
                : telemetry.operation === 'NAVIGATING'
                ? 'bg-[#75d8cc] animate-ping'
                : telemetry.operation === 'SCANNING'
                ? 'bg-[#a7d9df] animate-pulse'
                : telemetry.operation === 'FAULT' || telemetry.operation === 'SAFE_STOP'
                ? 'bg-red-500 animate-ping'
                : 'bg-emerald-400'
            }`}
          />
        </div>

        {/* Battery & Power Subsystem */}
        <div className="bg-[#191f22] p-3 rounded border border-[#3c494d]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Power & Energy Reserve
            </span>
            <span className={`font-mono font-bold text-sm ${getBatteryColor(telemetry.batterySoc)}`}>
              {telemetry.batterySoc.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#080b0e] h-2.5 rounded-full overflow-hidden border border-[#293235]">
            <div
              className={`h-full transition-all duration-300 ${
                telemetry.batterySoc > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-[#a7d9df]'
                  : telemetry.batterySoc > 20
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, telemetry.batterySoc))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 font-telemetry text-[11px]">
            <div className="bg-[#080b0e] p-1.5 rounded">
              <span className="text-gray-400 text-[9px] block">ENERGY REMAINING</span>
              <span className="text-white font-semibold">
                {telemetry.remainingEnergyKwh.toFixed(2)} / {telemetry.batteryCapacityKwh.toFixed(1)} kWh
              </span>
            </div>
            <div className="bg-[#080b0e] p-1.5 rounded">
              <span className="text-gray-400 text-[9px] block">LOAD POWER DRAW</span>
              <span className="text-amber-400 font-semibold">{telemetry.powerDrawWatts} W</span>
            </div>
            <div className="bg-[#080b0e] p-1.5 rounded col-span-2">
              <span className="text-gray-400 text-[9px] block">MINERAL ENERGY RECOVERED</span>
              <span className="text-emerald-400 font-semibold">{(telemetry.mineralEnergyRecoveredKwh ?? 0).toFixed(2)} kWh</span>
            </div>
          </div>
        </div>

        {/* Thermal Management Subsystem */}
        <div className="bg-[#191f22] p-3 rounded border border-[#3c494d]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              Thermal Control System
            </span>
            <span className={`font-mono font-bold text-sm ${getTempColor(telemetry.tempCelsius)}`}>
              {telemetry.tempCelsius > 0 ? `+${telemetry.tempCelsius.toFixed(1)}` : telemetry.tempCelsius.toFixed(1)}°C
            </span>
          </div>

          {/* Thermal Load Indicator */}
          <div className="w-full bg-[#080b0e] h-2 rounded-full overflow-hidden border border-[#293235]">
            <div
              className={`h-full transition-all duration-300 ${
                telemetry.thermalLoadPct > 80
                  ? 'bg-red-500'
                  : telemetry.thermalLoadPct > 60
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, telemetry.thermalLoadPct))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5 font-mono">
            <span>Thermal Load: <strong className="text-white">{telemetry.thermalLoadPct.toFixed(1)}%</strong></span>
            <span>Envelope: -60°C to +85°C</span>
          </div>
        </div>

        {/* Storage Bay & Drilling Yield */}
        <div className="bg-[#191f22] p-3 rounded border border-[#3c494d]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#a7d9df]" />
              Sample Bay & Extraction
            </span>
            <span className="font-mono font-bold text-white text-[11px]">
              {telemetry.coreSamplesCount} / 10 Cores
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-telemetry text-[11px]">
            <div className="bg-[#080b0e] p-1.5 rounded">
              <span className="text-gray-400 text-[9px] block">PAYLOAD MASS</span>
              <span className="text-white font-semibold">
                {telemetry.storageUsedKg.toFixed(2)} / {telemetry.storageCapacityKg.toFixed(1)} kg
              </span>
            </div>
            <div className="bg-[#080b0e] p-1.5 rounded">
              <span className="text-gray-400 text-[9px] block">DRILL DEPTH ACHIEVED</span>
              <span className="text-amber-400 font-semibold">{telemetry.drillDepthM.toFixed(2)} m</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-gray-400 bg-[#080b0e] p-1.5 rounded">
            <span>Model bulk density: <strong className="text-gray-200">1.52 g/cm³</strong> (LPI 2026 Simulant Ref)</span>
          </div>
        </div>

        {/* Subsystem Health Metrics */}
        <div className="bg-[#080b0e] p-3 rounded border border-[#293235] space-y-2">
          <span className="font-bold text-white text-[11px] uppercase tracking-wider block mb-1">
            Component Subsystem Health
          </span>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" /> Mobility Suspension:
              </span>
              <span className="text-white font-bold">{telemetry.health.mobility}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-[#a7d9df]" /> Sensor Mast & Cam:
              </span>
              <span className="text-white font-bold">{telemetry.health.sensorMast}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-400" /> Rotary Drill Bit:
              </span>
              <span className="text-white font-bold">{telemetry.health.rotaryDrill}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" /> S-Band RF Comms:
              </span>
              <span className="text-white font-bold">{telemetry.health.comms}%</span>
            </div>
          </div>
        </div>

        {/* Mission Traverse Odometry */}
        <div className="bg-[#080b0e] p-2.5 rounded border border-[#293235] flex justify-between items-center font-telemetry">
          <span className="text-gray-400 text-[10px]">TOTAL TRAVERSE DISTANCE:</span>
          <span className="text-[#a7d9df] font-bold text-sm">
            {telemetry.distanceTravelledM.toFixed(1)} m
          </span>
        </div>
      </div>
    </div>
  );
};
