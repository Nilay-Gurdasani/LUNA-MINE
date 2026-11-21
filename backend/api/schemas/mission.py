"""
Pydantic schemas — Mission parameters and report
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MissionConstraints(BaseModel):
    max_energy_kWh: float = Field(..., gt=0, description="Total energy budget for mission")
    max_duration_hours: float = Field(..., gt=0, le=720)
    max_storage_kg: float = Field(..., gt=0)
    min_battery_reserve_pct: float = Field(10.0, ge=0, le=50)


class MissionRunRequest(BaseModel):
    site_id: str
    rover_id: str
    processing_pathway_id: str
    constraints: MissionConstraints
    strategy: str = Field("balanced", description="balanced | aggressive | energy_saving")
    scenario_name: Optional[str] = None


class ResourceSummary(BaseModel):
    regolith_excavated_kg: float
    raw_resource_extracted_kg: float
    usable_output_kg: float
    output_unit: str
    processing_efficiency_pct: float


class EnergyBreakdown(BaseModel):
    traverse_kWh: float
    excavation_kWh: float
    processing_kWh: float
    comms_thermal_kWh: float
    total_kWh: float
    budget_used_pct: float


class MissionReport(BaseModel):
    mission_id: str
    scenario_name: Optional[str]
    site_id: str
    rover_id: str
    processing_pathway_id: str
    strategy: str
    status: str  # SUCCESS | ENERGY_LIMIT | TIME_LIMIT | STORAGE_LIMIT | INFEASIBLE
    resources: ResourceSummary
    energy: EnergyBreakdown
    total_duration_hours: float
    storage_used_pct: float
    score: float = Field(..., description="0–100 mission performance score")
    recommendations: list[str]
    disclaimer: str
    created_at: datetime
