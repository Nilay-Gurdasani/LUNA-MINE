"""
LUNA-MINE — Global Configuration & Simulation Constants
All physical constants are sourced from published research (see inline refs).
Simulation assumptions are clearly labelled.
"""

import os
from pathlib import Path

# ── Paths
BASE_DIR   = Path(__file__).resolve().parent
DATA_DIR   = BASE_DIR / "data"
DB_PATH    = BASE_DIR / "db" / "luna_mine.db"

# ── API 
API_TITLE   = "LUNA-MINE API"
API_VERSION = "0.1.0"
API_PREFIX  = "/api/v1"

# ── Lunar Physical Constants (NASA/published values) 
LUNAR_GRAVITY_MS2       = 1.62    # m/s² (NASA)
LUNAR_DAY_HOURS         = 708.7   # hours (~29.5 Earth days)
AVG_REGOLITH_DENSITY    = 1500.0  # kg/m³ bulk density (Carrier et al. 1991)
REGOLITH_OXYGEN_MASS_PCT = 40.0   # % oxygen by mass in silicates (NASA ISRU)

# ── ISRU Energy Constants (Leger et al. PNAS; NASA STMD) 
# Water-ice thermal extraction
ENERGY_EXCAVATION_KWH_PER_KG   = 0.012   # kWh per kg regolith excavated
ENERGY_HEATING_KWH_PER_KG      = 0.18    # kWh per kg regolith heated
ENERGY_CONDENSATION_KWH_PER_KG = 0.95    # kWh per kg water condensed
WATER_EXTRACTION_EFFICIENCY     = 0.72   # 72% capture efficiency (simulated assumption)

# Regolith O₂ reduction (hydrogen reduction of ilmenite)
ENERGY_LOX_KWH_PER_KG          = 24.3   # kWh/kg LOX — Leger et al. PNAS
ENERGY_LOX_UNCERTAINTY          = 5.8   # ± kWh/kg
ILMENITE_O2_YIELD_KG_PER_KG    = 0.197  # kg O₂ per kg ilmenite reduced
O2_REDUCTION_EFFICIENCY         = 0.68  # 68% system efficiency (simulated)

# ── Rover Operation Defaults (VIPER-inspired; simulated) 
DEFAULT_TRAVERSE_POWER_KW  = 0.18   # kW average during movement
DEFAULT_COMMS_POWER_KW     = 0.05   # kW always-on comms/avionics
DEFAULT_THERMAL_POWER_KW   = 0.08   # kW thermal management (PSR cold)
MAX_SAFE_SLOPE_DEG         = 20.0   # degrees — operational safety limit

# ── Mission Optimisation Weights (tunable) 
SITE_SCORE_WEIGHTS = {
    "ice_potential":      0.40,
    "traversability":     0.25,
    "energy_requirement": 0.20,
    "travel_distance":    0.15,
}

# ── Simulation Labels 
SIMULATION_DISCLAIMER = (
    "SIMULATED DATA — outputs are based on published research constants "
    "and illustrative assumptions. Not measured lunar surface data."
)
