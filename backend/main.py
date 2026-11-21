"""
LUNA-MINE — FastAPI Application Entry Point
Run with: uvicorn main:app --reload --port 8000
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import API_TITLE, API_VERSION, API_PREFIX, SIMULATION_DISCLAIMER
from api.routes import sites, rover, mission, processing, scenarios
from db.database import init_db

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=f"Autonomous Lunar Resource Intelligence & Mining Simulator\n\n> {SIMULATION_DISCLAIMER}",
)

# ── CORS (origins can be configured with LUNA_CORS_ORIGINS) ───────────────────
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "LUNA_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await init_db()

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(sites.router,      prefix=API_PREFIX + "/sites",      tags=["Sites"])
app.include_router(rover.router,      prefix=API_PREFIX + "/rovers",     tags=["Rover"])
app.include_router(mission.router,    prefix=API_PREFIX + "/mission",    tags=["Mission"])
app.include_router(processing.router, prefix=API_PREFIX + "/processing", tags=["Processing"])
app.include_router(scenarios.router,  prefix=API_PREFIX + "/scenarios",  tags=["Scenarios"])

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "project": "LUNA-MINE",
        "version": API_VERSION,
        "status": "operational",
        "disclaimer": SIMULATION_DISCLAIMER,
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
