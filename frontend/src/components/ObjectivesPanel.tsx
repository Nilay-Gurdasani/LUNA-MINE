import React from 'react';
import { MissionObjective } from '../types';
import { CheckCircle2, Clock, AlertCircle, Ban, Target } from 'lucide-react';

interface ObjectivesPanelProps {
  objectives: MissionObjective[];
}

export const ObjectivesPanel: React.FC<ObjectivesPanelProps> = ({ objectives }) => {
  const completedCount = objectives.filter((o) => o.status === 'COMPLETED').length;
  const totalCount = objectives.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#a7d9df] bg-[#191f22] border border-[#3c494d] px-2 py-0.5 rounded font-bold animate-pulse">
            <Clock className="w-3 h-3" /> IN PROGRESS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
            <AlertCircle className="w-3 h-3" /> BLOCKED
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-950/70 border border-red-500/40 px-2 py-0.5 rounded font-bold">
            <Ban className="w-3 h-3" /> FAILED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 bg-[#080b0e] border border-[#293235] px-2 py-0.5 rounded">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111619] border border-[#293235] rounded-lg p-3 text-xs select-none">
      {/* Header with Progress Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-[#a7d9df]" />
          <span className="font-montserrat font-bold text-white uppercase tracking-wider text-xs">
            Mission Task Objectives
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-telemetry text-gray-300 font-bold">
            {completedCount}/{totalCount}
          </span>
          <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#080b0e] h-1.5 rounded-full overflow-hidden mb-3 border border-[#293235]">
        <div
          className="h-full bg-gradient-to-r from-[#a7d9df] to-emerald-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Objective List */}
      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            className={`p-2 rounded border transition-all ${
              obj.status === 'COMPLETED'
                ? 'bg-[#191f22]/50 border-emerald-900/40 text-gray-300'
                : obj.status === 'IN_PROGRESS'
                ? 'bg-[#191f22] border-[#a7d9df]/50 text-white shadow-[0_0_8px_rgba(96,184,255,0.15)]'
                : 'bg-[#080b0e] border-[#293235] text-gray-400'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2">
                <span className="font-mono text-[10px] text-gray-500 mt-0.5">
                  0{idx + 1}.
                </span>
                <div>
                  <h5 className="font-semibold text-white text-[11px] leading-snug">
                    {obj.title}
                  </h5>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                    {obj.criteria}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(obj.status)}</div>
            </div>

            {obj.achievedValue && (
              <div className="mt-1.5 text-[9px] font-telemetry text-[#a7d9df] bg-[#080b0e] px-1.5 py-0.5 rounded border border-[#293235] flex justify-between">
                <span>Result: {obj.achievedValue}</span>
                {obj.completedAt && <span className="text-gray-400">{obj.completedAt}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
