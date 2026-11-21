"""
Simulation — Multi-Criteria Site Scorer
Ranks candidate lunar mining sites using a transparent weighted scoring model.

Criteria:
  1. Ice potential      — based on ice concentration and PSR coverage
  2. Traversability     — based on slope and rover traversability score
  3. Energy requirement — estimated power needed to reach and operate at site
  4. Travel distance    — distance from base to site

Owner: Nilay (+ Nandini for weight tuning)
"""

import numpy as np
from config import SITE_SCORE_WEIGHTS, SIMULATION_DISCLAIMER


class SiteScorer:
    def __init__(self, weights: dict | None = None):
        self.weights = weights or SITE_SCORE_WEIGHTS
        self._validate_weights()

    def _validate_weights(self):
        total = sum(self.weights.values())
        if not (0.99 <= total <= 1.01):
            # Normalise gracefully
            for k in self.weights:
                self.weights[k] /= total

    # ── Individual criteria scores (all normalised 0–1, higher = better) ──────

    def _ice_score(self, site: dict) -> float:
        """Higher ice concentration + PSR coverage = higher score."""
        ice_nominal = site["ice_concentration_wt_pct"]["nominal"]
        psr         = site["psr_coverage_pct"] / 100.0
        # Normalise ice: assume 0–12 wt% range from dataset
        ice_norm    = min(ice_nominal / 12.0, 1.0)
        return 0.6 * ice_norm + 0.4 * psr

    def _traversability_score(self, site: dict) -> float:
        """Use dataset traversability score (already 0–1)."""
        return float(site["traversability_score"])

    def _energy_score(self, site: dict) -> float:
        """
        Lower slope → less traverse energy → higher score.
        Invert: score = 1 - (slope / MAX_SLOPE)
        """
        max_slope = 25.0  # degrees — operational ceiling
        slope     = min(float(site["slope_deg"]), max_slope)
        return 1.0 - (slope / max_slope)

    def _distance_score(self, site: dict) -> float:
        """
        Shorter travel distance = higher score.
        Normalise against max observed distance (~50 km in dataset).
        """
        max_dist = 50.0  # km
        dist     = min(float(site["travel_distance_from_base_km"]), max_dist)
        return 1.0 - (dist / max_dist)

    # ── Composite scorer ──────────────────────────────────────────────────────

    def score_site(self, site: dict) -> dict:
        ice   = self._ice_score(site)
        trav  = self._traversability_score(site)
        energy= self._energy_score(site)
        dist  = self._distance_score(site)

        composite = (
            self.weights["ice_potential"]      * ice   +
            self.weights["traversability"]     * trav  +
            self.weights["energy_requirement"] * energy+
            self.weights["travel_distance"]    * dist
        )

        return {
            "site_id":              site["id"],
            "site_name":            site["name"],
            "composite_score":      round(composite, 4),
            "ice_potential_score":  round(ice,    4),
            "traversability_score": round(trav,   4),
            "energy_score":         round(energy, 4),
            "distance_score":       round(dist,   4),
        }

    def rank(self, sites: list[dict]) -> list[dict]:
        scored = [self.score_site(s) for s in sites]
        scored.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, s in enumerate(scored):
            s["rank"] = i + 1
            if i == 0:
                s["recommendation"] = "Recommended — highest overall mission suitability"
            elif s["composite_score"] >= 0.5:
                s["recommendation"] = "Viable — good candidate for secondary mission"
            else:
                s["recommendation"] = "Marginal — consider only if primary sites are unavailable"
        return scored
