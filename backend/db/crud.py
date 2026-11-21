"""
Database — CRUD helpers
"""

import json
from datetime import datetime, timezone
from sqlalchemy import select, delete
from db.database import SessionLocal
from db.models import MissionRecord


async def save_mission(mission_id: str, report) -> None:
    report_dict = report.model_dump(mode="json")
    async with SessionLocal() as session:
        record = MissionRecord(
            mission_id=mission_id,
            scenario_name=report.scenario_name,
            site_id=report.site_id,
            rover_id=report.rover_id,
            pathway_id=report.processing_pathway_id,
            strategy=report.strategy,
            status=report.status,
            score=report.score,
            usable_output_kg=report.resources.usable_output_kg,
            output_unit=report.resources.output_unit,
            total_energy_kWh=report.energy.total_kWh,
            duration_hours=report.total_duration_hours,
            full_report=report_dict,
        )
        session.add(record)
        await session.commit()


async def get_mission(mission_id: str):
    from api.schemas.mission import MissionReport
    async with SessionLocal() as session:
        result = await session.execute(
            select(MissionRecord).where(MissionRecord.mission_id == mission_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            return None
        return MissionReport(**record.full_report)


async def list_scenarios() -> list[dict]:
    async with SessionLocal() as session:
        result = await session.execute(select(MissionRecord))
        records = result.scalars().all()
        return [r.full_report for r in records]


async def delete_scenario(mission_id: str) -> bool:
    async with SessionLocal() as session:
        result = await session.execute(
            delete(MissionRecord).where(MissionRecord.mission_id == mission_id)
        )
        await session.commit()
        return result.rowcount > 0
