"""
Simulation — ISRU Resource Processing Model
Estimates usable output from two processing pathways using published energy constants.

Sources:
  - Water-ice extraction: NASA STMD thermal extraction models
  - O₂ from regolith: Leger et al. PNAS (~24.3 kWh/kg LOX)

All yield equations and assumptions are printed in the result for transparency.

Owner: Nilay
"""

from config import (
    ENERGY_EXCAVATION_KWH_PER_KG,
    ENERGY_HEATING_KWH_PER_KG,
    ENERGY_CONDENSATION_KWH_PER_KG,
    WATER_EXTRACTION_EFFICIENCY,
    ENERGY_LOX_KWH_PER_KG,
    ILMENITE_O2_YIELD_KG_PER_KG,
    O2_REDUCTION_EFFICIENCY,
    SIMULATION_DISCLAIMER,
)


class ProcessingModel:
    def __init__(self, pathway: dict):
        self.pathway = pathway
        self.pid     = pathway["id"]

    # ── Water-ice thermal extraction ──────────────────────────────────────────
    def _simulate_water_ice(self, feedstock_kg: float, ice_wt_pct: float,
                            energy_kwh: float, duration_h: float) -> dict:
        conc        = (ice_wt_pct or 3.5) / 100.0
        raw_water   = feedstock_kg * conc                     # kg water in feedstock

        # Energy needed per kg of feedstock processed
        energy_per_kg_feed = ENERGY_HEATING_KWH_PER_KG + ENERGY_EXCAVATION_KWH_PER_KG
        # Energy needed to condense the extracted water
        energy_cond = raw_water * ENERGY_CONDENSATION_KWH_PER_KG
        total_needed = feedstock_kg * energy_per_kg_feed + energy_cond

        # Limit by available energy
        if total_needed > energy_kwh and total_needed > 0:
            scale       = energy_kwh / total_needed
            feedstock_kg= feedstock_kg * scale
            raw_water   = feedstock_kg * conc

        usable_water = raw_water * WATER_EXTRACTION_EFFICIENCY
        total_energy = min(total_needed, energy_kwh)
        energy_per_kg_out = total_energy / usable_water if usable_water > 0 else 0

        limiting = None
        if total_needed > energy_kwh:
            limiting = "energy_budget"

        assumptions = [
            f"Ice concentration: {ice_wt_pct or 3.5:.1f} wt% (from site dataset)",
            f"Heating energy: {ENERGY_HEATING_KWH_PER_KG} kWh/kg regolith (NASA STMD)",
            f"Condensation energy: {ENERGY_CONDENSATION_KWH_PER_KG} kWh/kg water",
            f"Capture efficiency: {WATER_EXTRACTION_EFFICIENCY*100:.0f}% (simulated assumption)",
        ]

        return {
            "pathway_id":              self.pid,
            "pathway_name":            self.pathway["name"],
            "feedstock_processed_kg":  round(feedstock_kg, 2),
            "primary_product_kg":      round(usable_water, 3),
            "primary_product_unit":    "kg water (H₂O)",
            "energy_consumed_kWh":     round(total_energy, 3),
            "energy_per_kg_output":    round(energy_per_kg_out, 2),
            "processing_efficiency_pct": round(WATER_EXTRACTION_EFFICIENCY * 100, 1),
            "limiting_factor":         limiting,
            "assumptions":             assumptions,
        }

    # ── Regolith O₂ hydrogen reduction ───────────────────────────────────────
    def _simulate_o2_reduction(self, feedstock_kg: float, ice_wt_pct,
                               energy_kwh: float, duration_h: float) -> dict:
        ilmenite_wt_pct = self.pathway.get("yield_model", {}).get("ilmenite_wt_pct_mare", 10.0)
        ilmenite_kg     = feedstock_kg * (ilmenite_wt_pct / 100.0)
        raw_o2          = ilmenite_kg * ILMENITE_O2_YIELD_KG_PER_KG
        usable_o2       = raw_o2 * O2_REDUCTION_EFFICIENCY

        total_energy_needed = usable_o2 * ENERGY_LOX_KWH_PER_KG

        if total_energy_needed > energy_kwh and total_energy_needed > 0:
            scale     = energy_kwh / total_energy_needed
            usable_o2 = usable_o2 * scale

        total_energy   = min(total_energy_needed, energy_kwh)
        energy_per_kg  = total_energy / usable_o2 if usable_o2 > 0 else 0

        limiting = "energy_budget" if total_energy_needed > energy_kwh else None

        assumptions = [
            f"Ilmenite content: {ilmenite_wt_pct:.0f} wt% (Taylor et al. 2019 XRD — mare regolith)",
            f"O₂ yield per kg ilmenite: {ILMENITE_O2_YIELD_KG_PER_KG} kg (stoichiometric, FeTiO₃ reduction)",
            f"System efficiency: {O2_REDUCTION_EFFICIENCY*100:.0f}% (simulated)",
            f"Energy: {ENERGY_LOX_KWH_PER_KG} ± {5.8} kWh/kg LOX (Leger et al. PNAS)",
        ]

        return {
            "pathway_id":              self.pid,
            "pathway_name":            self.pathway["name"],
            "feedstock_processed_kg":  round(feedstock_kg, 2),
            "primary_product_kg":      round(usable_o2, 3),
            "primary_product_unit":    "kg LOX (liquid oxygen)",
            "energy_consumed_kWh":     round(total_energy, 3),
            "energy_per_kg_output":    round(energy_per_kg, 2),
            "processing_efficiency_pct": round(O2_REDUCTION_EFFICIENCY * 100, 1),
            "limiting_factor":         limiting,
            "assumptions":             assumptions,
        }

    # ── Dispatch ──────────────────────────────────────────────────────────────
    def simulate(self, feedstock_mass_kg: float, ice_concentration_wt_pct=None,
                 available_energy_kWh: float = 10.0,
                 processing_duration_hours: float = 24.0) -> dict:
        if self.pid == "water_ice_extraction":
            return self._simulate_water_ice(feedstock_mass_kg, ice_concentration_wt_pct,
                                            available_energy_kWh, processing_duration_hours)
        elif self.pid == "regolith_oxygen_reduction":
            return self._simulate_o2_reduction(feedstock_mass_kg, ice_concentration_wt_pct,
                                               available_energy_kWh, processing_duration_hours)
        else:
            raise ValueError(f"Unknown processing pathway: {self.pid}")
