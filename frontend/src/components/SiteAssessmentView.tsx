import React, { useState, useEffect } from 'react';
import { api, Site, SiteScore, SiteListResponse, SiteRankResponse } from '../api/client';
import { Layers, MapPin, Sliders, ArrowRight, CheckCircle, AlertTriangle, ChevronDown, Loader2, ExternalLink, ThermometerSnowflake, Mountain, Zap, Ruler } from 'lucide-react';

interface SiteAssessmentViewProps {
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onProceedToMission: () => void;
}

export const SiteAssessmentView: React.FC<SiteAssessmentViewProps> = ({
  selectedSiteId,
  onSelectSite,
  onProceedToMission,
}) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [rankedSites, setRankedSites] = useState<SiteScore[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weight sliders — matching backend API params
  const [wIce, setWIce]   = useState(0.40);
  const [wTrav, setWTrav] = useState(0.25);
  const [wEnergy, setWEnergy] = useState(0.20);
  const [wDist, setWDist] = useState(0.15);

  const [reranking, setReranking] = useState(false);

  // Load sites list
  useEffect(() => {
    setLoading(true);
    Promise.all([api.listSites(), api.rankSites()])
      .then(([siteResp, rankResp]) => {
        setSites(siteResp.sites);
        setRankedSites(rankResp.ranked_sites);
        setDisclaimer(siteResp.disclaimer);
        if (!selectedSiteId && siteResp.sites.length > 0) {
          onSelectSite(siteResp.sites[0].id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRerank = async () => {
    setReranking(true);
    try {
      const resp = await api.rankSites({
        weight_ice: wIce,
        weight_traversability: wTrav,
        weight_energy: wEnergy,
        weight_distance: wDist,
      });
      setRankedSites(resp.ranked_sites);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReranking(false);
    }
  };

  const getSiteById = (id: string) => sites.find(s => s.id === id);
  const getRankedScore = (id: string) => rankedSites.find(r => r.site_id === id);

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center bg-[#080b0e]">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#a7d9df] animate-spin mx-auto" />
        <p className="text-gray-400 text-sm font-mono">Fetching lunar site catalogue from backend...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-[#080b0e] p-8">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-white font-bold text-lg">Backend Connection Error</h3>
        <p className="text-red-300 text-sm font-mono bg-red-950/50 px-4 py-2 rounded border border-red-800">{error}</p>
        <p className="text-gray-400 text-xs">Make sure the FastAPI backend is running: <code className="text-[#a7d9df]">uvicorn main:app --reload --port 8000</code></p>
        <button onClick={() => window.location.reload()} className="bg-[#a7d9df] text-[#080b0e] font-bold px-4 py-2 rounded text-sm">Retry</button>
      </div>
    </div>
  );

  const totalWeight = wIce + wTrav + wEnergy + wDist;
  const weightOk = Math.abs(totalWeight - 1.0) < 0.02;

  return (
    <div className="w-full h-full bg-[#080b0e] p-4 md:p-6 overflow-y-auto text-xs select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#293235]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#a7d9df]/20 text-[#a7d9df] border border-[#a7d9df]/40 font-bold">PRE-MISSION SITE INTELLIGENCE</span>
              <span className="text-[10px] font-mono text-gray-500">• {disclaimer.split('—')[0]}</span>
            </div>
            <h1 className="font-montserrat text-xl md:text-2xl font-black text-white mt-1">
              Lunar South Pole — Candidate Site Assessment
            </h1>
            <p className="text-gray-400 text-xs mt-1 max-w-3xl leading-relaxed">
              Data sourced from backend API (<code className="text-[#a7d9df] font-telemetry">GET /api/v1/sites</code> and <code className="text-[#a7d9df] font-telemetry">GET /api/v1/sites/rank</code>).
              Adjust scoring weights and click <strong className="text-white">Re-rank</strong> to call the backend scorer.
            </p>
          </div>
          <button
            onClick={onProceedToMission}
            disabled={!selectedSiteId}
            className="flex items-center space-x-2 bg-[#a7d9df] hover:bg-[#75d8cc] disabled:opacity-40 text-[#080b0e] font-bold px-4 py-2 rounded shadow-[0_0_15px_rgba(96,184,255,0.3)] transition-all shrink-0"
          >
            <span>Proceed to Mission Builder</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weight Controls — mirrors backend SiteScorer weights */}
        <div className="bg-[#111619] p-4 rounded-lg border border-[#293235]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#a7d9df]" /> Multi-Criteria Scoring Weights
              <span className="text-[9px] font-mono text-gray-500">→ POST /api/v1/sites/rank?weight_*=…</span>
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-bold ${weightOk ? 'text-emerald-400' : 'text-red-400'}`}>
                Σ = {totalWeight.toFixed(2)} {weightOk ? '✓' : '(must ≈ 1.0)'}
              </span>
              <button
                onClick={handleRerank}
                disabled={reranking || !weightOk}
                className="flex items-center gap-1.5 bg-[#a7d9df] disabled:opacity-40 text-[#080b0e] font-bold px-3 py-1.5 rounded text-xs"
              >
                {reranking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                {reranking ? 'Ranking...' : 'Re-rank'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            {[
              { label: 'Ice Potential (w_ice)', val: wIce, set: setWIce, color: 'accent-cyan-400', textColor: 'text-cyan-400', desc: 'ice_concentration × PSR coverage' },
              { label: 'Traversability (w_trav)', val: wTrav, set: setWTrav, color: 'accent-emerald-400', textColor: 'text-emerald-400', desc: 'site.traversability_score (0–1)' },
              { label: 'Energy Efficiency (w_energy)', val: wEnergy, set: setWEnergy, color: 'accent-amber-400', textColor: 'text-amber-400', desc: '1 − slope/25°' },
              { label: 'Travel Distance (w_dist)', val: wDist, set: setWDist, color: 'accent-purple-400', textColor: 'text-purple-400', desc: '1 − km/50km' },
            ].map(w => (
              <div key={w.label} className="bg-[#080b0e] p-3 rounded border border-[#293235]">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300 text-[10px]">{w.label}</span>
                  <span className={`font-bold ${w.textColor}`}>{w.val.toFixed(2)}</span>
                </div>
                <input type="range" min="0.05" max="0.70" step="0.05" value={w.val}
                  onChange={e => w.set(parseFloat(e.target.value))}
                  className={`w-full cursor-pointer ${w.color}`} />
                <span className="text-[9px] text-gray-500 mt-1 block">{w.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Site Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rankedSites.map(ranked => {
            const site = getSiteById(ranked.site_id);
            if (!site) return null;
            const isSelected = selectedSiteId === site.id;

            return (
              <div key={site.id} onClick={() => onSelectSite(site.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col ${
                  isSelected
                    ? 'bg-[#191f22] border-[#a7d9df] ring-2 ring-[#a7d9df]/50 shadow-[0_0_20px_rgba(96,184,255,0.2)]'
                    : 'bg-[#111619] border-[#293235] hover:border-gray-500'
                }`}
              >
                {/* Rank & ID Badge */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#293235] text-[#a7d9df] font-bold">
                      RANK #{ranked.rank}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{site.id}</span>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" /> SELECTED
                    </span>
                  )}
                </div>

                {/* Site Name & Region */}
                <h3 className="font-montserrat font-bold text-sm text-white">{site.name}</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {site.region} • {site.coordinates.lat.toFixed(2)}°S, {site.coordinates.lon.toFixed(2)}°E
                </p>

                {/* Composite Score (backend computed) */}
                <div className="my-3 bg-[#080b0e] p-2.5 rounded border border-[#293235] flex items-center justify-between font-telemetry">
                  <span className="text-gray-400 text-[10px]">Composite Score (backend):</span>
                  <span className="text-xl font-bold text-amber-400">
                    {(ranked.composite_score * 100).toFixed(1)}
                    <span className="text-xs text-gray-500"> / 100</span>
                  </span>
                </div>

                {/* Score Bars */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: 'Ice Potential', val: ranked.ice_potential_score, color: 'bg-cyan-400' },
                    { label: 'Traversability', val: ranked.traversability_score, color: 'bg-emerald-400' },
                    { label: 'Energy Efficiency', val: ranked.energy_score, color: 'bg-amber-400' },
                    { label: 'Distance Score', val: ranked.distance_score, color: 'bg-purple-400' },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-0.5">
                        <span>{bar.label}</span>
                        <span className="text-white font-bold">{(bar.val * 100).toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-[#080b0e] h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} transition-all`} style={{ width: `${bar.val * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key Physical Data from Site JSON */}
                <div className="bg-[#080b0e] p-2 rounded border border-[#293235] text-[10px] font-mono space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1"><ThermometerSnowflake className="w-3 h-3" /> Temp (K):</span>
                    <span className="text-cyan-400 font-bold">{site.surface_temp_min_K}–{site.surface_temp_max_K} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1"><Mountain className="w-3 h-3" /> Slope:</span>
                    <span className={`font-bold ${site.slope_deg > 15 ? 'text-red-400' : site.slope_deg > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>{site.slope_deg}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1"><Layers className="w-3 h-3" /> Ice conc.:</span>
                    <span className="text-[#a7d9df] font-bold">{site.ice_concentration_wt_pct.nominal} wt% (nom.)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1"><Ruler className="w-3 h-3" /> Distance:</span>
                    <span className="text-white font-bold">{site.travel_distance_from_base_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Solar access:</span>
                    <span className="text-amber-400 font-bold">{site.solar_access_pct}%</span>
                  </div>
                </div>

                <p className="text-[10px] text-gray-300 italic mb-2 leading-relaxed">
                  Ice Evidence: <strong className="text-white not-italic">{site.ice_evidence}</strong>
                </p>

                {/* Recommendation from backend scorer */}
                <div className={`text-[10px] font-mono px-2 py-1 rounded border mt-auto ${
                  ranked.rank === 1
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                    : ranked.composite_score >= 0.5
                    ? 'bg-[#293235] text-[#a7d9df] border-[#3c494d]'
                    : 'bg-[#080b0e] text-gray-400 border-[#293235]'
                }`}>
                  {ranked.recommendation}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onSelectSite(site.id); }}
                  className={`mt-3 w-full py-2 rounded font-mono font-bold text-xs transition-colors ${
                    isSelected ? 'bg-[#a7d9df] text-[#080b0e]' : 'bg-[#293235] hover:bg-[#3c494d] text-white'
                  }`}
                >
                  {isSelected ? '✓ SELECTED FOR MISSION' : 'SELECT SITE'}
                </button>

                {/* Source citation */}
                <span className="text-[9px] text-gray-500 font-mono mt-2 block leading-tight">{site.source}</span>
              </div>
            );
          })}
        </div>

        {/* Backend Disclaimer */}
        <div className="p-3 bg-amber-950/40 border border-amber-700/40 rounded text-[10px] font-mono text-amber-300">
          {disclaimer}
        </div>
      </div>
    </div>
  );
};
