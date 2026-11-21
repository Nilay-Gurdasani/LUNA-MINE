import React, { useState } from 'react';
import { MissionReport } from '../api/client';
import {
  FileText, Download, Copy, Check, X, Award, Zap, Database,
  Clock, TrendingUp, AlertTriangle, CheckCircle, AlertOctagon, Info
} from 'lucide-react';

interface MissionReportViewProps {
  report: MissionReport;
  onClose: () => void;
  onSaveToScenarios?: () => void;
}

export const MissionReportView: React.FC<MissionReportViewProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);

  const statusColors = {
    SUCCESS:       'bg-emerald-950 text-emerald-400 border-emerald-600',
    ENERGY_LIMIT:  'bg-amber-950 text-amber-400 border-amber-600',
    TIME_LIMIT:    'bg-orange-950 text-orange-400 border-orange-600',
    STORAGE_LIMIT: 'bg-blue-950 text-blue-400 border-blue-600',
    INFEASIBLE:    'bg-red-950 text-red-400 border-red-600',
  };

  const statusIcons = {
    SUCCESS:       <CheckCircle className="w-5 h-5" />,
    ENERGY_LIMIT:  <Zap className="w-5 h-5" />,
    TIME_LIMIT:    <Clock className="w-5 h-5" />,
    STORAGE_LIMIT: <Database className="w-5 h-5" />,
    INFEASIBLE:    <AlertOctagon className="w-5 h-5" />,
  };

  const generateMarkdown = () => `# LUNA-MINE Mission Report
**Mission ID:** ${report.mission_id}
**Scenario:** ${report.scenario_name || '(unnamed)'}
**Status:** ${report.status} | **Score:** ${report.score}/100
**Site:** ${report.site_id} | **Rover:** ${report.rover_id} | **Strategy:** ${report.strategy}
**Processing Pathway:** ${report.processing_pathway_id}
**Created:** ${new Date(report.created_at).toISOString()}

---

## Resource Extraction Summary
- **Regolith Excavated:** ${report.resources.regolith_excavated_kg} kg
- **Raw Resource Extracted:** ${report.resources.raw_resource_extracted_kg} kg
- **Usable Output:** ${report.resources.usable_output_kg} ${report.resources.output_unit}
- **Processing Efficiency:** ${report.resources.processing_efficiency_pct}%

## Energy Breakdown
- **Traverse:** ${report.energy.traverse_kWh} kWh
- **Excavation:** ${report.energy.excavation_kWh} kWh
- **Processing:** ${report.energy.processing_kWh} kWh
- **Comms + Thermal:** ${report.energy.comms_thermal_kWh} kWh
- **Total:** ${report.energy.total_kWh} kWh (${report.energy.budget_used_pct}% of budget)

## Mission Telemetry
- **Total Duration:** ${report.total_duration_hours} hours
- **Storage Utilisation:** ${report.storage_used_pct}%

## Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

---
> ${report.disclaimer}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luna-mine-report-${report.mission_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111619] border border-[#3c494d] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">

        {/* Header */}
        <div className="p-4 bg-[#0C1A32] border-b border-[#293235] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#293235] text-[#a7d9df] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-montserrat font-bold text-white">Mission Execution Report</h2>
              <span className="text-[10px] font-mono text-gray-400">
                ID: {report.mission_id} • {report.scenario_name || 'Unnamed Scenario'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className="px-3 py-1.5 bg-[#293235] hover:bg-[#3c494d] text-white rounded font-mono font-semibold flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy MD'}
            </button>
            <button onClick={handleDownload}
              className="px-3 py-1.5 bg-[#a7d9df] hover:bg-[#75d8cc] text-[#080b0e] rounded font-mono font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#293235] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status + Score Banner */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono font-bold ${statusColors[report.status] || statusColors.INFEASIBLE}`}>
              {statusIcons[report.status as keyof typeof statusIcons]}
              <span>{report.status}</span>
            </div>
            <div className="flex-1 bg-[#080b0e] p-3 rounded-lg border border-[#293235] flex items-center justify-between font-telemetry">
              <span className="text-gray-400">Mission Performance Score</span>
              <span className="text-3xl font-black text-amber-400">{report.score}<span className="text-sm text-gray-500"> / 100</span></span>
            </div>
          </div>

          {/* Config row */}
          <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
            <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
              <span className="text-gray-400 block">Site</span>
              <span className="text-white font-bold">{report.site_id}</span>
            </div>
            <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
              <span className="text-gray-400 block">Rover</span>
              <span className="text-white font-bold">{report.rover_id}</span>
            </div>
            <div className="bg-[#080b0e] p-2 rounded border border-[#293235]">
              <span className="text-gray-400 block">Strategy</span>
              <span className="text-[#a7d9df] font-bold">{report.strategy}</span>
            </div>
          </div>

          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-telemetry">
            <div className="bg-[#080b0e] p-3 rounded-lg border border-[#293235]">
              <span className="text-gray-400 text-[9px] uppercase block mb-1">Regolith Excavated</span>
              <span className="text-lg font-bold text-[#a7d9df]">{report.resources.regolith_excavated_kg}</span>
              <span className="text-[9px] text-gray-500 block">kg</span>
            </div>
            <div className="bg-[#080b0e] p-3 rounded-lg border border-[#293235]">
              <span className="text-gray-400 text-[9px] uppercase block mb-1">Usable Output</span>
              <span className="text-lg font-bold text-emerald-400">{report.resources.usable_output_kg.toFixed(3)}</span>
              <span className="text-[9px] text-gray-500 block">{report.resources.output_unit}</span>
            </div>
            <div className="bg-[#080b0e] p-3 rounded-lg border border-[#293235]">
              <span className="text-gray-400 text-[9px] uppercase block mb-1">Total Energy</span>
              <span className="text-lg font-bold text-amber-400">{report.energy.total_kWh}</span>
              <span className="text-[9px] text-gray-500 block">kWh ({report.energy.budget_used_pct}% budget)</span>
            </div>
            <div className="bg-[#080b0e] p-3 rounded-lg border border-[#293235]">
              <span className="text-gray-400 text-[9px] uppercase block mb-1">Duration</span>
              <span className="text-lg font-bold text-cyan-400">{report.total_duration_hours.toFixed(1)}</span>
              <span className="text-[9px] text-gray-500 block">hours</span>
            </div>
          </div>

          {/* Energy Breakdown Stacked Bar */}
          <div className="bg-[#191f22] p-4 rounded-lg border border-[#3c494d] space-y-3">
            <span className="font-bold text-white text-xs uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Energy Budget Breakdown
            </span>
            {[
              { label: 'Traverse',    val: report.energy.traverse_kWh,    color: 'bg-[#a7d9df]',   pct: report.energy.total_kWh > 0 ? report.energy.traverse_kWh / report.energy.total_kWh * 100 : 0 },
              { label: 'Excavation',  val: report.energy.excavation_kWh,  color: 'bg-emerald-500', pct: report.energy.total_kWh > 0 ? report.energy.excavation_kWh / report.energy.total_kWh * 100 : 0 },
              { label: 'Processing',  val: report.energy.processing_kWh,  color: 'bg-purple-500',  pct: report.energy.total_kWh > 0 ? report.energy.processing_kWh / report.energy.total_kWh * 100 : 0 },
              { label: 'Comms+Thermal',val: report.energy.comms_thermal_kWh, color: 'bg-gray-500', pct: report.energy.total_kWh > 0 ? report.energy.comms_thermal_kWh / report.energy.total_kWh * 100 : 0 },
            ].map(e => (
              <div key={e.label}>
                <div className="flex justify-between text-[10px] font-mono text-gray-300 mb-1">
                  <span>{e.label}</span>
                  <span className="text-white font-bold">{e.val} kWh ({e.pct.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-[#080b0e] h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${e.color}`} style={{ width: `${e.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations from backend optimizer */}
          <div className="bg-[#080b0e] p-4 rounded-lg border border-[#293235]">
            <span className="font-bold text-white text-xs uppercase flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#a7d9df]" /> Optimizer Recommendations
            </span>
            <div className="space-y-1.5">
              {report.recommendations.map((rec, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded text-[11px] font-mono ${
                  rec.includes('exceeded') || rec.includes('below')
                    ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                    : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                }`}>
                  {rec.includes('exceeded') || rec.includes('below')
                    ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  }
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-[9px] font-mono text-gray-500 p-2 bg-[#080b0e] rounded border border-[#293235]">
            {report.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};
