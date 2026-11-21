"""
Database — ORM Table Definitions (SQLite via SQLAlchemy)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class MissionRecord(Base):
    __tablename__ = "missions"

    mission_id:          Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_name:       Mapped[str|None] = mapped_column(String, nullable=True)
    site_id:             Mapped[str]      = mapped_column(String, nullable=False)
    rover_id:            Mapped[str]      = mapped_column(String, nullable=False)
    pathway_id:          Mapped[str]      = mapped_column(String, nullable=False)
    strategy:            Mapped[str]      = mapped_column(String, default="balanced")
    status:              Mapped[str]      = mapped_column(String, nullable=False)
    score:               Mapped[float]    = mapped_column(Float, nullable=False)
    usable_output_kg:    Mapped[float]    = mapped_column(Float, nullable=False)
    output_unit:         Mapped[str]      = mapped_column(String, nullable=False)
    total_energy_kWh:    Mapped[float]    = mapped_column(Float, nullable=False)
    duration_hours:      Mapped[float]    = mapped_column(Float, nullable=False)
    full_report:         Mapped[dict]     = mapped_column(JSON, nullable=False)
    created_at:          Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class ScenarioRecord(Base):
    __tablename__ = "scenarios"

    id:          Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name:        Mapped[str] = mapped_column(String, nullable=False)
    mission_ids: Mapped[str] = mapped_column(Text, nullable=False)   # comma-separated
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
