"""
Pydantic schemas — Rover configuration and simulation
"""

from pydantic import BaseModel, Field
from typing import Optional


class RoverConfig(BaseModel):
    id: str
    name: str
    inspired_by: str
    mass_kg: float
    battery_capacity_kWh: float
    solar_panel_kW: float
    max_speed_kmh: float
    avg_traverse_power_kW: float
    excavation_rate_kg_per_hour: float
    excavation_power_kW: float
    payload_capacity_kg: float
    max_slope_deg: float
    drill_depth_m: float
    best_for: str


class RoverSimRequest(BaseModel):
    rover_id: str
    site_id: str
    mission_duration_hours: float = Field(..., gt=0, le=720, description="Mission duration in hours (max 720 = 1 lunar day)")
    target_excavation_kg: Optional[float] = Field(None, gt=0)
    strategy: str = Field("balanced", description="balanced | aggressive | energy_saving")


class RoverSimResult(BaseModel):
    rover_id: str
    site_id: str
    distance_travelled_km: float
    traverse_time_hours: float
    excavation_time_hours: float
    total_time_hours: float
    regolith_excavated_kg: float
    payload_fill_pct: float
    energy_traverse_kWh: float
    energy_excavation_kWh: float
    energy_total_kWh: float
    battery_remaining_pct: float
    mission_feasible: bool
    limiting_factor: Optional[str]
    disclaimer: str
