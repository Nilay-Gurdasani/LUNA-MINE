"""
Simulation — Mission Constraint Optimiser
Evaluates mission outcome against hard constraints and scores performance.

Scoring rubric (0–100):
  - 40 pts: usable resource output (normalised against target)
  - 25 pts: energy efficiency (output per kWh)
  - 20 pts: mission completion (no hard constraint breaches)
  - 15 pts: time efficiency (output per hour)

Owner: Nilay
"""

from config import SIMULATION_DISCLAIMER


class MissionOptimizer:
    def __init__(self, constraints: dict):
        self.max_energy_kWh     = constraints.get("max_energy_kWh", 10.0)
        self.max_duration_hours = constraints.get("max_duration_hours", 72.0)
        self.max_storage_kg     = constraints.get("max_storage_kg", 100.0)
        self.min_battery_pct    = constraints.get("min_battery_reserve_pct", 10.0)

    def evaluate(self, rover_result: dict, proc_result: dict,
                 energy_total: dict) -> tuple[str, float, list[str]]:
        """
        Returns (status, score 0–100, recommendations list).
        """
        status        = "SUCCESS"
        score         = 0.0
        recs          = []
        total_kwh     = energy_total["total_kWh"]
        output_kg     = proc_result.get("primary_product_kg", 0)
        duration_h    = rover_result.get("total_time_hours", 0)
        battery_rem   = rover_result.get("battery_remaining_pct", 0)

        # ── Hard constraint checks ─────────────────────────────────────────────
        if total_kwh > self.max_energy_kWh:
            status = "ENERGY_LIMIT"
            recs.append("Energy budget exceeded — consider energy_saving strategy or a closer site.")

        if duration_h > self.max_duration_hours:
            status = "TIME_LIMIT"
            recs.append("Mission duration exceeded — reduce target excavation or choose a closer site.")

        if rover_result.get("regolith_excavated_kg", 0) > self.max_storage_kg:
            status = "STORAGE_LIMIT"
            recs.append("Storage capacity exceeded — reduce excavation target.")

        if battery_rem < self.min_battery_pct:
            if status == "SUCCESS":
                status = "ENERGY_LIMIT"
            recs.append(f"Battery reserve below {self.min_battery_pct:.0f}% safety threshold.")

        if not rover_result.get("mission_feasible", False):
            status = "INFEASIBLE"
            recs.append("Mission infeasible — site slope may exceed rover limits.")

        # ── Scoring ───────────────────────────────────────────────────────────
        # 1. Output score (40 pts)
        output_score = min(output_kg / max(self.max_storage_kg * 0.1, 1.0), 1.0) * 40

        # 2. Energy efficiency (25 pts)
        if output_kg > 0 and total_kwh > 0:
            eff = output_kg / total_kwh      # kg per kWh
            energy_score = min(eff / 0.5, 1.0) * 25  # 0.5 kg/kWh = perfect
        else:
            energy_score = 0

        # 3. Completion bonus (20 pts)
        completion_score = 20 if status == "SUCCESS" else 5 if status != "INFEASIBLE" else 0

        # 4. Time efficiency (15 pts)
        if output_kg > 0 and duration_h > 0:
            time_eff = output_kg / duration_h
            time_score = min(time_eff / 2.0, 1.0) * 15
        else:
            time_score = 0

        score = round(output_score + energy_score + completion_score + time_score, 1)

        # ── Positive recommendations ──────────────────────────────────────────
        if not recs:
            recs.append("Mission within all constraints — plan is viable.")
        if battery_rem >= 20:
            recs.append(f"Battery reserve healthy at {battery_rem:.1f}% — consider extending excavation.")
        if energy_total["processing_kWh"] > energy_total["traverse_kWh"] * 3:
            recs.append("Processing dominates energy budget — consider a site with higher ice concentration.")

        return status, score, recs
