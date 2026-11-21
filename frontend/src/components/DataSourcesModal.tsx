import React from 'react';
import { INITIAL_DATA_LAYERS } from '../data/lunarData';
import { Database, ExternalLink, X, ShieldCheck, AlertCircle, BookOpen, Layers } from 'lucide-react';

interface DataSourcesModalProps {
  onClose: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#111619] border border-[#3c494d] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-[#0C1A32] border-b border-[#293235] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#293235] text-[#a7d9df] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-montserrat font-bold text-white text-base">
                Canonical Lunar Science Datasets & Provenance
              </h2>
              <span className="text-[11px] font-mono text-gray-400">
                Data Integrity, Instrument Matrices & Official Archive References
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#293235]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Scientific Integrity Principle Box */}
          <div className="bg-[#191f22] p-4 rounded-lg border border-[#3c494d] space-y-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Scientific Integrity & Transparency Standard
            </h3>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              LUNA-MINE does not fabricate live lunar measurements. The digital twin queries pre-processed planetary science products at the simulated rover coordinate. All data elements are explicitly tagged with one of five categories:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[10px]">
              <div className="bg-[#080b0e] p-2 rounded border border-emerald-500/30">
                <span className="text-emerald-400 font-bold block">[VERIFIED OBSERVATION]</span>
                <span className="text-gray-400">Directly measured archived release (e.g. LOLA laser shots, APXS point spectra).</span>
              </div>
              <div className="bg-[#080b0e] p-2 rounded border border-blue-500/30">
                <span className="text-blue-400 font-bold block">[PROCESSED DATA]</span>
                <span className="text-gray-400">Calibrated archived products (e.g. TMC-2 GeoTIFF orthos, DFSAR radar CPR).</span>
              </div>
              <div className="bg-[#080b0e] p-2 rounded border border-cyan-500/30">
                <span className="text-cyan-400 font-bold block">[DERIVED INDICATOR]</span>
                <span className="text-gray-400">Calculated proxy (e.g. M³ 2.82 µm absorption band depth for OH/H₂O proxy).</span>
              </div>
              <div className="bg-[#080b0e] p-2 rounded border border-purple-500/30">
                <span className="text-purple-400 font-bold block">[SIMULATED / SYNTHETIC]</span>
                <span className="text-gray-400">Demonstration parameters (e.g. rover battery voltage, drill RPM).</span>
              </div>
            </div>
          </div>

          {/* Registered Dataset Inventory Matrix */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#a7d9df]" />
              Archived Mission Instrument Matrix
            </h3>

            <div className="space-y-2.5">
              {INITIAL_DATA_LAYERS.map((layer) => (
                <div
                  key={layer.id}
                  className="bg-[#080b0e] p-3 rounded-lg border border-[#293235] space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-semibold text-white text-xs">{layer.name}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {layer.mission} • {layer.instrument} ({layer.productId})
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#191f22] text-[#a7d9df] border border-[#3c494d] w-fit">
                      {layer.category}
                    </span>
                  </div>

                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    {layer.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#293235] text-[10px] font-mono text-gray-400">
                    <div>
                      <span className="text-gray-500 block">Units:</span> {layer.units}
                    </div>
                    <div>
                      <span className="text-gray-500 block">Native Res:</span> {layer.nativeResolution}
                    </div>
                    <div>
                      <span className="text-gray-500 block">CRS:</span> {layer.crs}
                    </div>
                    <div>
                      <span className="text-gray-500 block">Uncertainty:</span> {layer.uncertainty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Public Archives Reference */}
          <div className="bg-[#080b0e] p-4 rounded-lg border border-[#293235] space-y-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Verified Public Archives & Research Citations
            </h3>

            <ul className="space-y-2 text-[11px] text-gray-300 font-mono">
              <li className="flex items-start justify-between">
                <span>[R1] ISRO PRADAN / ISSDC Planetary Science Data Portal</span>
                <a
                  href="https://pradan.issdc.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#a7d9df] hover:underline flex items-center gap-1 shrink-0"
                >
                  pradan.issdc.gov.in <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex items-start justify-between">
                <span>[R2] NASA Planetary Data System (PDS) Geosciences Node (LRO)</span>
                <a
                  href="https://pds-geosciences.wustl.edu/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#a7d9df] hover:underline flex items-center gap-1 shrink-0"
                >
                  pds-geosciences <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex items-start justify-between">
                <span>[R17] Sinha et al. (2026), Subsurface ice in doubly shadowed craters via Chandrayaan-2 DFSAR</span>
                <span className="text-amber-400 shrink-0">Faustini/Haworth DSC Study</span>
              </li>
              <li className="flex items-start justify-between">
                <span>[R16] Vadawale et al. (2024), Chandrayaan-3 APXS elemental measurements, Nature</span>
                <span className="text-emerald-400 shrink-0">In-situ Ground Truth</span>
              </li>
              <li className="flex items-start justify-between">
                <span>[R19] Open Database of Lunar Regolith and Simulants Properties (2026)</span>
                <span className="text-cyan-400 shrink-0">Density 1.52 g/cm³</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
