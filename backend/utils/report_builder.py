"""
Utils — Mission Report Builder
Assembles the final MissionReport object from simulation sub-results.
"""

from datetime import datetime, timezone
from api.schemas.mission import MissionReport, ResourceSummary, EnergyBreakdown
from config import SIMULATION_DISCLAIMER


def build_report(
    mission_id: str,
    req,
    rover_result: dict,
    proc_result: dict,
    energy_total: dict,
    status: str,
    score: float,
    recommendations: list[str],
) -> MissionReport:

    budget_used = (
        energy_total["total_kWh"] / req.constraints.max_energy_kWh * 100
        if req.constraints.max_energy_kWh > 0 else 100.0
    )
    storage_used = (
        rover_result.get("regolith_excavated_kg", 0) / req.constraints.max_storage_kg * 100
        if req.constraints.max_storage_kg > 0 else 0.0
    )

    return MissionReport(
        mission_id=mission_id,
        scenario_name=req.scenario_name,
        site_id=req.site_id,
        rover_id=req.rover_id,
        processing_pathway_id=req.processing_pathway_id,
        strategy=req.strategy,
        status=status,
        resources=ResourceSummary(
            regolith_excavated_kg=rover_result.get("regolith_excavated_kg", 0),
            raw_resource_extracted_kg=proc_result.get("feedstock_processed_kg", 0),
            usable_output_kg=proc_result.get("primary_product_kg", 0),
            output_unit=proc_result.get("primary_product_unit", "kg"),
            processing_efficiency_pct=proc_result.get("processing_efficiency_pct", 0),
        ),
        energy=EnergyBreakdown(
            traverse_kWh=energy_total["traverse_kWh"],
            excavation_kWh=energy_total["excavation_kWh"],
            processing_kWh=energy_total["processing_kWh"],
            comms_thermal_kWh=energy_total["comms_thermal_kWh"],
            total_kWh=energy_total["total_kWh"],
            budget_used_pct=round(min(budget_used, 100.0), 1),
        ),
        total_duration_hours=rover_result.get("total_time_hours", 0),
        storage_used_pct=round(min(storage_used, 100.0), 1),
        score=score,
        recommendations=recommendations,
        disclaimer=SIMULATION_DISCLAIMER,
        created_at=datetime.now(timezone.utc),
    )
