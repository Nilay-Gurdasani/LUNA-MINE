import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  Play,
  Pause,
  RotateCcw,
  Satellite,
  MapPin,
  FileText,
  Presentation,
  Rocket,
  BookOpen,
  Wifi,
  WifiOff
} from 'lucide-react';
import { OperationState, AppTab } from '../types';
import { api } from '../api/client';

interface HeaderProps {
  missionId: string;
  regionName: string;
  operationState?: OperationState;
  elapsedSeconds: number;
  simSpeed: number;
  isPaused: boolean;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onSpeedChange: (speed: number) => void;
  onTogglePause: () => void;
  onResetMission: () => void;
  onEmergencyStop: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  missionId,
  regionName,
  elapsedSeconds,
  simSpeed,
  isPaused,
  activeTab,
  onTabChange,
  onSpeedChange,
  onTogglePause,
  onResetMission,
  onEmergencyStop,
}) => {
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  // Poll backend health every 6 seconds
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await api.health();
        if (mounted) setBackendOnline(res?.status !== 'offline');
      } catch {
        if (mounted) setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Format elapsed seconds as MET (Mission Elapsed Time) HH:MM:SS
  const formatMET = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `MET ${h}:${m}:${s}`;
  };

  const navItems: { tab: AppTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { tab: 'DASHBOARD', label: 'Digital Twin', icon: <Activity className="w-3.5 h-3.5 text-[#75d8cc]" /> },
    { tab: 'SITES',     label: 'Site Assessment', icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" /> },
    { tab: 'MISSION',   label: 'Mission Builder', icon: <Rocket className="w-3.5 h-3.5 text-[#a7d9df]" /> },
    { tab: 'REPORT',    label: 'Mission Report', icon: <FileText className="w-3.5 h-3.5 text-purple-400" /> },
    { tab: 'SCENARIOS', label: 'Scenarios', icon: <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> },
    { tab: 'SLIDES',    label: 'Pitch Deck', icon: <Presentation className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <header className="w-full bg-[#111619] border-b border-[#293235] px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 select-none z-30">
      {/* Brand Identity & Mission ID */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-8 h-8 rounded bg-[#191f22] border border-[#a7d9df]/40 flex items-center justify-center text-[#a7d9df] font-bold shadow-[0_0_12px_rgba(96,184,255,0.3)]">
          <Satellite className="w-4 h-4 animate-pulse text-[#75d8cc]" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-montserrat font-black text-base md:text-lg tracking-wider text-white">
              LUNA<span className="text-[#a7d9df]">-MINE</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#293235] text-[#a7d9df] border border-[#3c494d]">
              ASTRA 2026
            </span>
          </div>
          <p className="text-[9px] md:text-[10px] text-gray-400 font-medium tracking-tight">
            Autonomous Mining Orchestrator & Digital Twin
          </p>
        </div>

        {/* Backend Connectivity Status Pill */}
        <div
          title={backendOnline ? "Connected to FastAPI backend on port 8000" : "Backend offline — using embedded simulation logic"}
          className={`hidden xl:flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
            backendOnline
              ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-amber-950/70 text-amber-400 border-amber-500/40'
          }`}
        >
          {backendOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>BACKEND :8000 LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>DEMO MODE</span>
            </>
          )}
        </div>
      </div>

      {/* Single navigation menu for every workspace */}
      <nav className="flex items-center gap-2 bg-[#080b0e] px-3 py-2 rounded-xl border border-[#293235] text-xs max-w-full">
        <label htmlFor="main-navigation" className="font-mono text-[10px] tracking-widest text-gray-400 whitespace-nowrap">
          WORKSPACE
        </label>
        <select
          id="main-navigation"
          aria-label="Choose workspace"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as AppTab)}
          className="min-w-44 px-3 py-2 font-semibold text-sm cursor-pointer"
        >
          {navItems.map(({ tab, label }) => (
            <option key={tab} value={tab}>{label}</option>
          ))}
        </select>
      </nav>

      {/* Simulator Execution Clock & Global Controls */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* MET Clock */}
        <div className="bg-[#080b0e] border border-[#293235] px-2.5 py-1 rounded text-xs font-telemetry flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-bold tracking-wide">{formatMET(elapsedSeconds)}</span>
        </div>

        {/* Speed multiplier toggle */}
        <div className="flex items-center bg-[#080b0e] border border-[#293235] rounded text-[11px] font-mono overflow-hidden">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSpeedChange(speed)}
              className={`px-2 py-1 transition-colors cursor-pointer ${
                simSpeed === speed
                  ? 'bg-[#a7d9df] text-[#080b0e] font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Pause / Resume */}
        <button
          type="button"
          onClick={onTogglePause}
          title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            isPaused
              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
              : 'bg-[#191f22] border-[#293235] text-gray-300 hover:text-white'
          }`}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Reset Mission */}
        <button
          type="button"
          onClick={onResetMission}
          title="Reset Simulation Scenario"
          className="p-1.5 rounded border border-[#293235] bg-[#191f22] text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Emergency Stop Button */}
        <button
          type="button"
          onClick={onEmergencyStop}
          className="flex items-center space-x-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500 text-red-400 px-2.5 py-1 rounded text-xs font-bold transition-all shadow-[0_0_8px_rgba(239,68,68,0.2)] active:scale-95 cursor-pointer"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="tracking-wide">E-STOP</span>
        </button>
      </div>
    </header>
  );
};
