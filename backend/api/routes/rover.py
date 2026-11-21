"""
Route — Rover Configuration & Movement Simulation
GET  /api/v1/rovers              → list available rover configs
POST /api/v1/rovers/simulate     → simulate rover route and excavation
"""

import json
from fastapi import APIRouter, HTTPException
from pathlib import Path

from api.schemas.rover import RoverConfig, RoverSimRequest, RoverSimResult
from simulation.rover_engine import RoverEngine
from config import DATA_DIR, SIMULATION_DISCLAIMER

router = APIRouter()

def _load_rovers() -> list[dict]:
    with open(DATA_DIR / "rover_configs.json") as f:
        return json.load(f)["rovers"]

def _load_sites() -> list[dict]:
    with open(DATA_DIR / "sites.json") as f:
        return json.load(f)["sites"]


@router.get("", response_model=list[RoverConfig])
async def list_rovers():
    """Return all available rover configurations."""
    return [RoverConfig(**r) for r in _load_rovers()]


@router.get("/{rover_id}", response_model=RoverConfig)
async def get_rover(rover_id: str):
    for r in _load_rovers():
        if r["id"] == rover_id:
            return RoverConfig(**r)
    raise HTTPException(status_code=404, detail=f"Rover '{rover_id}' not found.")


@router.post("/simulate", response_model=RoverSimResult)
async def simulate_rover(req: RoverSimRequest):
    """
    Simulate rover movement to a candidate site and excavation operation.
    Returns energy consumption, excavated mass, and mission feasibility.
    """
    rovers = {r["id"]: r for r in _load_rovers()}
    sites  = {s["id"]: s for s in _load_sites()}

    if req.rover_id not in rovers:
        raise HTTPException(status_code=404, detail=f"Rover '{req.rover_id}' not found.")
    if req.site_id not in sites:
        raise HTTPException(status_code=404, detail=f"Site '{req.site_id}' not found.")

    engine = RoverEngine(rover=rovers[req.rover_id], site=sites[req.site_id])
    result = engine.simulate(
        mission_duration_hours=req.mission_duration_hours,
        target_excavation_kg=req.target_excavation_kg,
        strategy=req.strategy,
    )
    result["disclaimer"] = SIMULATION_DISCLAIMER
    return RoverSimResult(**result)
