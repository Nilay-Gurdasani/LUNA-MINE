"""
Pydantic schemas — ISRU processing pathway simulation
"""

from pydantic import BaseModel, Field
from typing import Optional


class ProcessingPathway(BaseModel):
    id: str
    name: str
    description: str
    feedstock: str
    primary_product: str
    byproducts: list[str]


class ProcessingSimRequest(BaseModel):
    pathway_id: str
    feedstock_mass_kg: float = Field(..., gt=0)
    ice_concentration_wt_pct: Optional[float] = Field(None, ge=0, le=30)
    available_energy_kWh: float = Field(..., gt=0)
    processing_duration_hours: float = Field(..., gt=0)


class ProcessingSimResult(BaseModel):
    pathway_id: str
    pathway_name: str
    feedstock_processed_kg: float
    primary_product_kg: float
    primary_product_unit: str
    energy_consumed_kWh: float
    energy_per_kg_output: float
    processing_efficiency_pct: float
    limiting_factor: Optional[str]
    assumptions: list[str]
    disclaimer: str
