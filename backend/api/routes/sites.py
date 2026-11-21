"""
Route — Candidate Lunar Sites
GET  /api/v1/sites           → list all candidate sites
GET  /api/v1/sites/{site_id} → single site detail
GET  /api/v1/sites/rank      → ranked list by composite mission score
"""

import json
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path

from api.schemas.site import SiteListResponse, SiteRankingResponse, Site
from simulation.site_scorer import SiteScorer
from config import DATA_DIR, SIMULATION_DISCLAIMER

router = APIRouter()

def _load_sites() -> list[dict]:
    path = DATA_DIR / "sites.json"
    with open(path) as f:
        data = json.load(f)
    return data["sites"]


@router.get("", response_model=SiteListResponse)
async def list_sites():
    """Return all candidate lunar mining sites with their attributes."""
    sites = _load_sites()
    return SiteListResponse(
        total=len(sites),
        sites=[Site(**s) for s in sites],
        disclaimer=SIMULATION_DISCLAIMER,
    )


@router.get("/rank", response_model=SiteRankingResponse)
async def rank_sites(
    weight_ice: float = Query(0.40, ge=0, le=1),
    weight_traversability: float = Query(0.25, ge=0, le=1),
    weight_energy: float = Query(0.20, ge=0, le=1),
    weight_distance: float = Query(0.15, ge=0, le=1),
):
    """Rank all candidate sites using weighted multi-criteria scoring."""
    weights = {
        "ice_potential": weight_ice,
        "traversability": weight_traversability,
        "energy_requirement": weight_energy,
        "travel_distance": weight_distance,
    }
    sites = _load_sites()
    scorer = SiteScorer(weights=weights)
    ranked = scorer.rank(sites)
    return SiteRankingResponse(
        ranked_sites=ranked,
        weights_used=weights,
        disclaimer=SIMULATION_DISCLAIMER,
    )


@router.get("/{site_id}", response_model=Site)
async def get_site(site_id: str):
    """Return detail for a single candidate site."""
    sites = _load_sites()
    for s in sites:
        if s["id"] == site_id:
            return Site(**s)
    raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found.")
