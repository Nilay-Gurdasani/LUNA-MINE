import React, { useState, useEffect } from 'react';
import { api, MissionReport } from '../api/client';
import { History, Trash2, ArrowRightLeft, Loader2, AlertTriangle, Award, Trophy } from 'lucide-react';

export const ScenariosView: React.FC = () => {
  const [scenarios, setScenarios] = useState<MissionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<any | null>(null);

  const loadScenarios = () => {
    setLoading(true);
    api.listScenarios()
      .then(data => setScenarios(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadScenarios, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteScenario(id);
      setScenarios(prev => prev.filter(s => s.mission_id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);
    try {
      const result = await api.compareScenarios(selectedIds);
      setComparison(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setComparing(false);
    }
  };

  const statusColors: Record<string, string> = {
    SUCCESS:       'text-emerald-400',
    ENERGY_LIMIT:  'text-amber-400',
    TIME_LIMIT:    'text-orange-400',
    STORAGE_LIMIT: 'text-blue-400',
    INFEASIBLE:    'text-red-400',
  };

  if (loading) return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-[#080b0e] space-y-3">
      <Loader2 className="w-8 h-8 text-[#a7d9df] animate-spin" />
      <span className="text-gray-400 font-mono text-xs">Loading mission scenarios catalogue...</span>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#080b0e] p-4 md:p-6 overflow-y-auto text-xs">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#293235]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-400 border border-purple-700/50 font-bold">
                SCENARIO LIBRARY
              </span>
              <span className="text-gray-500 font-mono text-[9px]">GET /api/v1/scenarios</span>
            </div>
            <h2 className="font-montserrat font-black text-lg text-white">Mission History & What-If Comparisons</h2>
            <p className="text-gray-400 text-[11px]">Select 2+ missions to compare via <code className="text-[#a7d9df]">POST /api/v1/scenarios/compare</code></p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length >= 2 && (
              <button onClick={handleCompare} disabled={comparing}
                className="flex items-center gap-2 bg-[#a7d9df] hover:bg-[#75d8cc] text-[#080b0e] font-bold px-3 py-2 rounded text-xs">
                {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Compare ({selectedIds.length})
              </button>
            )}
            <button onClick={loadScenarios}
              className="bg-[#293235] hover:bg-[#3c494d] text-white px-3 py-2 rounded font-mono text-xs">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/70 border border-red-700 rounded text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Comparison Result */}
        {comparison && (
          <div className="bg-[#191f22] p-4 rounded-lg border border-[#3c494d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Ranked Comparison
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Best: <strong className="text-emerald-400">{comparison.best_mission_id.slice(0, 8)}…</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-gray-400 border-b border-[#293235]">
                    <th className="text-left pb-1.5">Rank</th>
                    <th className="text-left pb-1.5">Scenario</th>
                    <th className="text-left pb-1.5">Status</th>
                    <th className="text-right pb-1.5">Score</th>
                    <th className="text-right pb-1.5">Output</th>
                    <th className="text-right pb-1.5">Energy (kWh)</th>
                    <th className="text-right pb-1.5">Duration (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.ranked_comparison.map((row: any, i: number) => (
                    <tr key={row.mission_id} className={`border-b border-[#293235]/50 ${i === 0 ? 'bg-emerald-950/20' : ''}`}>
                      <td className="py-1.5 font-bold">{i === 0 ? '🏆' : `#${i + 1}`}</td>
                      <td className="py-1.5">
                        <div className="text-white font-semibold">{row.scenario_name || '(unnamed)'}</div>
                        <div className="text-gray-500 text-[9px]">{row.site_id} • {row.rover_id} • {row.strategy}</div>
                      </td>
                      <td className="py-1.5"><span className={`font-bold ${statusColors[row.status] || 'text-gray-400'}`}>{row.status}</span></td>
                      <td className="text-right py-1.5 text-amber-400 font-bold">{row.score}</td>
                      <td className="text-right py-1.5 text-emerald-400 font-bold">{row.usable_output_kg?.toFixed(3)} {row.output_unit?.split(' ')[0]}</td>
                      <td className="text-right py-1.5 text-[#a7d9df]">{row.total_energy_kWh}</td>
                      <td className="text-right py-1.5 text-gray-300">{row.duration_hours?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-gray-500">{comparison.disclaimer}</p>
          </div>
        )}

        {/* Scenario List */}
        {scenarios.length === 0 ? (
          <div className="text-center p-12 text-gray-400 space-y-3">
            <History className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-mono">No missions saved yet. Run a mission from the Mission Builder tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map(s => {
              const isSelected = selectedIds.includes(s.mission_id);
              return (
                <div key={s.mission_id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#191f22] border-[#a7d9df] ring-1 ring-[#a7d9df]/40'
                      : 'bg-[#111619] border-[#293235] hover:border-gray-500'
                  }`}
                  onClick={() => toggleSelect(s.mission_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#a7d9df] border-[#a7d9df]' : 'border-[#293235]'}`}>
                        {isSelected && <span className="text-[#080b0e] text-[8px] font-black">✓</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-xs">{s.scenario_name || `Mission ${s.mission_id.slice(0, 8)}…`}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${statusColors[s.status] || 'text-gray-400'} bg-[#080b0e]`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {s.site_id} • {s.rover_id} • {s.processing_pathway_id} • {s.strategy}
                        </div>
                        <div className="text-[9px] text-gray-500">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-telemetry text-[10px] shrink-0">
                      <div className="text-center">
                        <span className="text-gray-400 block text-[9px]">Score</span>
                        <span className="text-amber-400 font-bold text-sm">{s.score}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-400 block text-[9px]">Output</span>
                        <span className="text-emerald-400 font-bold">{s.resources.usable_output_kg.toFixed(2)}</span>
                        <span className="text-[8px] text-gray-500 block">{s.resources.output_unit.split(' ')[0]}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-400 block text-[9px]">Energy</span>
                        <span className="text-[#a7d9df] font-bold">{s.energy.total_kWh}</span>
                        <span className="text-[8px] text-gray-500 block">kWh</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(s.mission_id); }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/60 rounded transition-colors"
                        title="Delete scenario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
