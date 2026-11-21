"""
Simulation — Rover Movement & Excavation Engine
Models rover traverse, excavation rate, energy consumption and payload fill.

Physics assumptions (clearly labelled):
  - Constant average traverse speed (no obstacle modelling in MVP)
  - Linear excavation rate (kg/hr) from rover spec
  - Energy = power × time for all phases
  - Solar recharge applied during traverse if solar_access_pct > 0

Owner: Nilay (Yug to add energy_model integration)
"""

import numpy as np
from config import (
    DEFAULT_COMMS_POWER_KW,
    DEFAULT_THERMAL_POWER_KW,
    MAX_SAFE_SLOPE_DEG,
    SIMULATION_DISCLAIMER,
)


class RoverEngine:
    def __init__(self, rover: dict, site: dict):
        self.rover = rover
        self.site  = site

    # ── Strategy multipliers ──────────────────────────────────────────────────
    STRATEGY_PARAMS = {
        "balanced":      {"speed_factor": 1.0, "excavation_factor": 1.0},
        "aggressive":    {"speed_factor": 0.9, "excavation_factor": 1.3},  # faster dig, slightly slower nav
        "energy_saving": {"speed_factor": 1.2, "excavation_factor": 0.7},  # slower dig, more efficient
    }

    def _strategy(self, name: str) -> dict:
        return self.STRATEGY_PARAMS.get(name, self.STRATEGY_PARAMS["balanced"])

    # ── Feasibility check ─────────────────────────────────────────────────────
    def _check_slope(self) -> bool:
        return self.site["slope_deg"] <= min(self.rover["max_slope_deg"], MAX_SAFE_SLOPE_DEG)

    # ── Traverse ─────────────────────────────────────────────────────────────
    def _traverse(self, strategy_params: dict) -> dict:
        dist_km      = float(self.site["travel_distance_from_base_km"])
        speed_kmh    = self.rover["max_speed_kmh"] * strategy_params["speed_factor"]
        time_h       = dist_km / speed_kmh                        # hours one-way × 2
        total_time_h = time_h * 2                                 # return trip included
        power_kw     = self.rover["avg_traverse_power_kW"]
        energy_kwh   = power_kw * total_time_h

        # Solar recharge during traverse
        solar_fraction = self.site["solar_access_pct"] / 100.0
        recharge_kwh   = self.rover["solar_panel_kW"] * total_time_h * solar_fraction

        return {
            "distance_km":    round(dist_km * 2, 2),
            "time_hours":     round(total_time_h, 2),
            "energy_kwh":     round(max(0, energy_kwh - recharge_kwh), 3),
        }

    # ── Excavation ───────────────────────────────────────────────────────────
    def _excavate(self, available_time_h: float, available_energy_kwh: float,
                  target_kg: float | None, strategy_params: dict) -> dict:
        rate_kgh    = self.rover["excavation_rate_kg_per_hour"] * strategy_params["excavation_factor"]
        power_kw    = self.rover["excavation_power_kW"]
        capacity_kg = self.rover["payload_capacity_kg"]

        # Time-limited excavation
        max_by_time   = rate_kgh * available_time_h
        # Energy-limited excavation
        max_by_energy = (available_energy_kwh / power_kw) * rate_kgh if power_kw > 0 else max_by_time
        # Payload-limited
        max_by_payload= capacity_kg

        # Target override
        target = min(target_kg, capacity_kg) if target_kg else capacity_kg
        excavated = min(max_by_time, max_by_energy, max_by_payload, target)
        excavated = max(0.0, excavated)

        excav_time_h  = excavated / rate_kgh if rate_kgh > 0 else 0
        energy_kwh    = power_kw * excav_time_h

        limiting = None
        if excavated == max_by_time:    limiting = "mission_time"
        elif excavated == max_by_energy:limiting = "energy_budget"
        elif excavated == max_by_payload:limiting = "payload_capacity"

        return {
            "excavated_kg":  round(excavated, 2),
            "time_hours":    round(excav_time_h, 2),
            "energy_kwh":    round(energy_kwh, 3),
            "limiting":      limiting,
            "fill_pct":      round((excavated / capacity_kg) * 100, 1),
        }

    # ── Main simulate ─────────────────────────────────────────────────────────
    def simulate(self, mission_duration_hours: float,
                 target_excavation_kg: float | None = None,
                 strategy: str = "balanced") -> dict:

        sp = self._strategy(strategy)

        # Slope check
        if not self._check_slope():
            return {
                "rover_id":               self.rover["id"],
                "site_id":                self.site["id"],
                "mission_feasible":       False,
                "limiting_factor":        "slope_exceeds_rover_limit",
                "distance_travelled_km":  0,
                "traverse_time_hours":    0,
                "excavation_time_hours":  0,
                "total_time_hours":       0,
                "regolith_excavated_kg":  0,
                "payload_fill_pct":       0,
                "energy_traverse_kWh":    0,
                "energy_excavation_kWh":  0,
                "energy_total_kWh":       0,
                "battery_remaining_pct":  0,
            }

        battery = self.rover["battery_capacity_kWh"]

        # Phase 1 — Traverse
        trav = self._traverse(sp)
        remaining_energy = battery - trav["energy_kwh"]
        remaining_time   = mission_duration_hours - trav["time_hours"]

        # Always-on power (comms + thermal) over full mission
        fixed_energy_kwh = (DEFAULT_COMMS_POWER_KW + DEFAULT_THERMAL_POWER_KW) * mission_duration_hours
        remaining_energy -= fixed_energy_kwh

        # Phase 2 — Excavation
        excav = self._excavate(
            available_time_h=max(0, remaining_time),
            available_energy_kwh=max(0, remaining_energy),
            target_kg=target_excavation_kg,
            strategy_params=sp,
        )

        total_energy = trav["energy_kwh"] + excav["energy_kwh"] + fixed_energy_kwh
        battery_rem_pct = max(0, (battery - total_energy) / battery * 100)

        overall_limiting = excav["limiting"]
        if remaining_time <= 0:
            overall_limiting = "mission_time"

        return {
            "rover_id":              self.rover["id"],
            "site_id":               self.site["id"],
            "distance_travelled_km": trav["distance_km"],
            "traverse_time_hours":   trav["time_hours"],
            "excavation_time_hours": excav["time_hours"],
            "total_time_hours":      round(trav["time_hours"] + excav["time_hours"], 2),
            "regolith_excavated_kg": excav["excavated_kg"],
            "payload_fill_pct":      excav["fill_pct"],
            "energy_traverse_kWh":   trav["energy_kwh"],
            "energy_excavation_kWh": excav["energy_kwh"],
            "energy_total_kWh":      round(total_energy, 3),
            "battery_remaining_pct": round(battery_rem_pct, 1),
            "mission_feasible":      battery_rem_pct >= 0 and excav["excavated_kg"] > 0,
            "limiting_factor":       overall_limiting,
        }
