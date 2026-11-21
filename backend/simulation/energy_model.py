"""
Simulation — Energy Model
Aggregates all energy costs across mission phases.
Yug's starter module — extend with per-action cost tracking.

Owner: Yug (guided) with Nilay review
"""

from config import DEFAULT_COMMS_POWER_KW, DEFAULT_THERMAL_POWER_KW


class EnergyModel:
    def __init__(self, rover: dict):
        self.rover = rover

    def fixed_overhead(self, duration_hours: float) -> float:
        """Always-on comms + thermal management energy."""
        return (DEFAULT_COMMS_POWER_KW + DEFAULT_THERMAL_POWER_KW) * duration_hours

    def total(self, rover_result: dict, proc_result: dict, duration_hours: float) -> dict:
        traverse_kwh   = rover_result.get("energy_traverse_kWh", 0)
        excavation_kwh = rover_result.get("energy_excavation_kWh", 0)
        processing_kwh = proc_result.get("energy_consumed_kWh", 0)
        fixed_kwh      = self.fixed_overhead(duration_hours)
        total_kwh      = traverse_kwh + excavation_kwh + processing_kwh + fixed_kwh

        return {
            "traverse_kWh":      round(traverse_kwh, 3),
            "excavation_kWh":    round(excavation_kwh, 3),
            "processing_kWh":    round(processing_kwh, 3),
            "comms_thermal_kWh": round(fixed_kwh, 3),
            "total_kWh":         round(total_kwh, 3),
        }

    def budget_used_pct(self, total_kwh: float, budget_kwh: float) -> float:
        if budget_kwh <= 0:
            return 100.0
        return round(min((total_kwh / budget_kwh) * 100, 100.0), 1)
