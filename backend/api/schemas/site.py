"""
Pydantic schemas — Lunar candidate site data
"""

from pydantic import BaseModel, Field
from typing import Optional


class IceConcentration(BaseModel):
    min: float
    max: float
    nominal: float


class SiteCoordinates(BaseModel):
    lat: float
    lon: float


class Site(BaseModel):
    id: str
    name: str
    region: str
    coordinates: SiteCoordinates
    elevation_m: float
    psr_coverage_pct: float
    ice_evidence: str
    surface_temp_min_K: float
    surface_temp_max_K: float
    slope_deg: float
    terrain_difficulty: str
    traversability_score: float
    ice_concentration_wt_pct: IceConcentration
    travel_distance_from_base_km: float
    solar_access_pct: float
    source: str


class SiteScore(BaseModel):
    site_id: str
    site_name: str
    composite_score: float = Field(..., description="0–1 overall mission suitability score")
    ice_potential_score: float
    traversability_score: float
    energy_score: float
    distance_score: float
    rank: int
    recommendation: str


class SiteListResponse(BaseModel):
    total: int
    sites: list[Site]
    disclaimer: str


class SiteRankingResponse(BaseModel):
    ranked_sites: list[SiteScore]
    weights_used: dict
    disclaimer: str
