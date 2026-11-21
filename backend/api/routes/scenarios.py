"""
Route — Saved Scenarios & What-If Comparisons
GET  /api/v1/scenarios              → list all saved scenarios
GET  /api/v1/scenarios/{id}         → get a scenario
POST /api/v1/scenarios/compare      → compare two or more mission IDs
DELETE /api/v1/scenarios/{id}       → delete a scenario
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.crud import list_scenarios, get_mission, delete_scenario
from config import SIMULATION_DISCLAIMER

router = APIRouter()


class CompareRequest(BaseModel):
    mission_ids: list[str]


@router.get("")
async def get_scenarios():
    """List all saved mission scenarios."""
    return await list_scenarios()


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    report = await get_mission(scenario_id)
    if not report:
        raise HTTPException(404, f"Scenario '{scenario_id}' not found.")
    return report


@router.post("/compare")
async def compare_scenarios(req: CompareRequest):
    """
    Compare two or more mission reports side-by-side.
    Returns a ranked comparison table sorted by mission score.
    """
    if len(req.mission_ids) < 2:
        raise HTTPException(400, "Provide at least 2 mission IDs to compare.")

    reports = []
    for mid in req.mission_ids:
        r = await get_mission(mid)
        if not r:
            raise HTTPException(404, f"Mission '{mid}' not found.")
        reports.append(r)

    comparison = sorted(
        [
            {
                "mission_id":          r.mission_id,
                "scenario_name":       r.scenario_name,
                "site_id":             r.site_id,
                "rover_id":            r.rover_id,
                "pathway_id":          r.processing_pathway_id,
                "strategy":            r.strategy,
                "status":              r.status,
                "score":               r.score,
                "usable_output_kg":    r.resources.usable_output_kg,
                "output_unit":         r.resources.output_unit,
                "total_energy_kWh":    r.energy.total_kWh,
                "duration_hours":      r.total_duration_hours,
            }
            for r in reports
        ],
        key=lambda x: x["score"],
        reverse=True,
    )

    return {
        "count": len(comparison),
        "ranked_comparison": comparison,
        "best_mission_id": comparison[0]["mission_id"],
        "disclaimer": SIMULATION_DISCLAIMER,
    }


@router.delete("/{scenario_id}")
async def remove_scenario(scenario_id: str):
    deleted = await delete_scenario(scenario_id)
    if not deleted:
        raise HTTPException(404, f"Scenario '{scenario_id}' not found.")
    return {"deleted": scenario_id}
