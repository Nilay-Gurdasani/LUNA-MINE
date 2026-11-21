import React from 'react';
import { DecisionRecommendation } from '../types';
import { Bot, Check, X, Shuffle, AlertTriangle, ShieldAlert, Zap, BatteryLow, Flame, Radio } from 'lucide-react';

interface AdaptiveIntelligenceCardProps {
  recommendation: DecisionRecommendation | null;
  onApprove: (recId: string) => void;
  onReject: (recId: string) => void;
  onAlternative: (recId: string) => void;
  onInjectEvent: (type: 'OBSTACLE' | 'LOW_BATTERY' | 'THERMAL_SPIKE' | 'COMMS_DELAY') => void;
}

export const AdaptiveIntelligenceCard: React.FC<AdaptiveIntelligenceCardProps> = ({
  recommendation,
  onApprove,
  onReject,
  onAlternative,
  onInjectEvent,
}) => {
  return (
    <div className="bg-[#111619] border border-[#293235] rounded-lg p-3 text-xs select-none flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-[#191f22] border border-[#a7d9df]/40 flex items-center justify-center text-[#a7d9df]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="font-montserrat font-bold text-white uppercase tracking-wider text-xs">
              Adaptive Replanning Engine
            </span>
          </div>

          {recommendation && (
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                recommendation.priority === 'CRITICAL'
                  ? 'bg-red-950 text-red-400 border border-red-500/50 animate-pulse'
                  : 'bg-amber-950 text-amber-400 border border-amber-500/50'
              }`}
            >
              {recommendation.priority} INTERVENTION
            </span>
          )}
        </div>

        {/* Active Recommendation Body */}
        {recommendation ? (
          <div className="bg-[#191f22] p-2.5 rounded border border-[#3c494d] space-y-2">
            <div className="flex items-start justify-between">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {recommendation.title}
              </h5>
              <span className="text-[10px] font-mono text-[#a7d9df] font-semibold">
                Action: {recommendation.proposedAction}
              </span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              <strong className="text-[#a7d9df]">Rationale:</strong> {recommendation.rationale}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-telemetry pt-1 border-t border-[#293235]">
              <div className="bg-[#080b0e] p-1.5 rounded">
                <span className="text-emerald-400 font-bold block">EXPECTED BENEFIT:</span>
                <span className="text-gray-300">{recommendation.expectedBenefit}</span>
              </div>
              <div className="bg-[#080b0e] p-1.5 rounded">
                <span className="text-amber-400 font-bold block">TRADE-OFF / COST:</span>
                <span className="text-gray-300">{recommendation.tradeOff}</span>
              </div>
            </div>

            {/* Operator Approval Decision Controls */}
            {recommendation.status === 'PENDING' && (
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => onApprove(recommendation.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors text-[11px] shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" /> Approve Replan
                </button>
                <button
                  onClick={() => onAlternative(recommendation.id)}
                  className="px-2.5 py-1.5 bg-[#293235] hover:bg-[#3c494d] text-white rounded font-medium flex items-center gap-1 transition-colors text-[11px]"
                  title="Inspect alternative route or task"
                >
                  <Shuffle className="w-3 h-3 text-cyan-400" /> Alternative
                </button>
                <button
                  onClick={() => onReject(recommendation.id)}
                  className="px-2.5 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 rounded font-medium flex items-center gap-1 transition-colors text-[11px]"
                  title="Reject and hold current route"
                >
                  <X className="w-3 h-3" /> Reject
                </button>
              </div>
            )}

            {recommendation.status === 'APPROVED' && (
              <div className="p-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded text-center text-emerald-400 font-bold font-mono text-[10px]">
                REPLANNING APPROVED & IN EXECUTION
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#080b0e] p-2.5 rounded border border-[#293235] text-center text-gray-400 py-3">
            <span className="block text-[11px] text-gray-300">Path & Telemetry Nominal</span>
            <span className="text-[10px] text-gray-500">
              No anomalies detected. Decision engine standing by for obstacle or telemetry alerts.
            </span>
          </div>
        )}
      </div>

      {/* Simulator Event Injection Bar (for Hackathon Live Evaluation & Testing) */}
      <div className="mt-2.5 pt-2 border-t border-[#293235]">
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1.5">
          Simulate Adaptive Trigger Events:
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => onInjectEvent('OBSTACLE')}
            className="p-1 bg-[#080b0e] hover:bg-red-950/60 border border-[#293235] hover:border-red-500/50 text-gray-300 hover:text-red-400 rounded flex flex-col items-center gap-0.5 transition-colors font-mono cursor-pointer active:scale-95 shadow-sm"
            title="Inject 1.4m Boulder Hazard on route"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Boulder</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectEvent('LOW_BATTERY')}
            className="p-1 bg-[#080b0e] hover:bg-amber-950/60 border border-[#293235] hover:border-amber-500/50 text-gray-300 hover:text-amber-400 rounded flex flex-col items-center gap-0.5 transition-colors font-mono cursor-pointer active:scale-95 shadow-sm"
            title="Simulate Battery Drop below 20%"
          >
            <BatteryLow className="w-3.5 h-3.5 text-amber-400" />
            <span>Low SOC</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectEvent('THERMAL_SPIKE')}
            className="p-1 bg-[#080b0e] hover:bg-orange-950/60 border border-[#293235] hover:border-orange-500/50 text-gray-300 hover:text-orange-400 rounded flex flex-col items-center gap-0.5 transition-colors font-mono cursor-pointer active:scale-95 shadow-sm"
            title="Simulate Motor / Drill Thermal Overheat (+78°C)"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Thermal</span>
          </button>
          <button
            type="button"
            onClick={() => onInjectEvent('COMMS_DELAY')}
            className="p-1 bg-[#080b0e] hover:bg-blue-950/60 border border-[#293235] hover:border-blue-500/50 text-gray-300 hover:text-blue-400 rounded flex flex-col items-center gap-0.5 transition-colors font-mono cursor-pointer active:scale-95 shadow-sm"
            title="Simulate 2.4s Earth-Moon telemetry latency"
          >
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span>Comms</span>
          </button>
        </div>
      </div>
    </div>
  );
};
