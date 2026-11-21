"""
Route — Full Mission Run & Report
POST /api/v1/mission/run         → run end-to-end mission simulation
GET  /api/v1/mission/{id}/report → retrieve stored mission report
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import json

from api.schemas.mission import MissionRunRequest, MissionReport
from simulation.rover_engine import RoverEngine
from simulation.processing_model import ProcessingModel
from simulation.mission_optimizer import MissionOptimizer
from simulation.energy_model import EnergyModel
from utils.report_builder import build_report
from db.crud import save_mission, get_mission
from config import DATA_DIR, SIMULATION_DISCLAIMER

router = APIRouter()


def _load_json(filename: str) -> dict:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


@router.post("/run", response_model=MissionReport)
async def run_mission(req: MissionRunRequest):
    """
    Execute a full end-to-end lunar mining mission simulation:
    site → rover traverse → excavation → processing → report.
    """
    sites     = {s["id"]: s for s in _load_json("sites.json")["sites"]}
    rovers    = {r["id"]: r for r in _load_json("rover_configs.json")["rovers"]}
    pathways  = {p["id"]: p for p in _load_json("processing_pathways.json")["pathways"]}

    if req.site_id not in sites:
        raise HTTPException(404, f"Site '{req.site_id}' not found.")
    if req.rover_id not in rovers:
        raise HTTPException(404, f"Rover '{req.rover_id}' not found.")
    if req.processing_pathway_id not in pathways:
        raise HTTPException(404, f"Pathway '{req.processing_pathway_id}' not found.")

    site    = sites[req.site_id]
    rover   = rovers[req.rover_id]
    pathway = pathways[req.processing_pathway_id]

    # 1. Rover simulation
    engine       = RoverEngine(rover=rover, site=site)
    rover_result = engine.simulate(
        mission_duration_hours=req.constraints.max_duration_hours,
        target_excavation_kg=req.constraints.max_storage_kg,
        strategy=req.strategy,
    )

    # 2. Processing simulation
    proc_model   = ProcessingModel(pathway=pathway)
    proc_result  = proc_model.simulate(
        feedstock_mass_kg=rover_result["regolith_excavated_kg"],
        ice_concentration_wt_pct=site["ice_concentration_wt_pct"]["nominal"],
        available_energy_kWh=req.constraints.max_energy_kWh - rover_result["energy_total_kWh"],
        processing_duration_hours=max(
            0, req.constraints.max_duration_hours - rover_result["total_time_hours"]
        ),
    )

    # 3. Energy accounting
    energy_model = EnergyModel(rover=rover)
    energy_total = energy_model.total(rover_result, proc_result, req.constraints.max_duration_hours)

    # 4. Optimiser — status & score
    optimizer    = MissionOptimizer(constraints=req.constraints.model_dump())
    status, score, recs = optimizer.evaluate(rover_result, proc_result, energy_total)

    # 5. Build & persist report
    mission_id  = str(uuid.uuid4())
    report      = build_report(
        mission_id=mission_id,
        req=req,
        rover_result=rover_result,
        proc_result=proc_result,
        energy_total=energy_total,
        status=status,
        score=score,
        recommendations=recs,
    )
    await save_mission(mission_id, report)
    return report


@router.get("/{mission_id}/report", response_model=MissionReport)
async def get_mission_report(mission_id: str):
    """Retrieve a previously run mission report by ID."""
    report = await get_mission(mission_id)
    if not report:
        raise HTTPException(404, f"Mission '{mission_id}' not found.")
    return report
