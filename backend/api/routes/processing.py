"""
Route — ISRU Resource Processing Simulation
GET  /api/v1/processing/pathways        → list processing pathways
POST /api/v1/processing/simulate        → simulate a processing run
"""

import json
from fastapi import APIRouter, HTTPException

from api.schemas.processing import ProcessingPathway, ProcessingSimRequest, ProcessingSimResult
from simulation.processing_model import ProcessingModel
from config import DATA_DIR, SIMULATION_DISCLAIMER

router = APIRouter()

def _load_pathways() -> list[dict]:
    with open(DATA_DIR / "processing_pathways.json") as f:
        return json.load(f)["pathways"]


@router.get("/pathways", response_model=list[ProcessingPathway])
async def list_pathways():
    """Return all available ISRU processing pathways."""
    return [ProcessingPathway(**p) for p in _load_pathways()]


@router.post("/simulate", response_model=ProcessingSimResult)
async def simulate_processing(req: ProcessingSimRequest):
    """
    Simulate an ISRU processing operation for a given feedstock mass,
    ice concentration, available energy and processing time.
    """
    pathways = {p["id"]: p for p in _load_pathways()}
    if req.pathway_id not in pathways:
        raise HTTPException(404, f"Pathway '{req.pathway_id}' not found.")

    model  = ProcessingModel(pathway=pathways[req.pathway_id])
    result = model.simulate(
        feedstock_mass_kg=req.feedstock_mass_kg,
        ice_concentration_wt_pct=req.ice_concentration_wt_pct,
        available_energy_kWh=req.available_energy_kWh,
        processing_duration_hours=req.processing_duration_hours,
    )
    result["disclaimer"] = SIMULATION_DISCLAIMER
    return ProcessingSimResult(**result)
