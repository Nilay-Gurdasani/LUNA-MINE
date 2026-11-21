"""
Utils — Input Validators
Validates mission parameters against physical and operational constraints.
"""

from fastapi import HTTPException


def validate_weights(weights: dict) -> dict:
    """Ensure scoring weights sum to ~1.0, normalise if not."""
    total = sum(weights.values())
    if total <= 0:
        raise HTTPException(400, "Weights must be positive.")
    return {k: v / total for k, v in weights.items()}


def validate_mission_constraints(energy: float, duration: float,
                                  storage: float, reserve: float):
    if energy <= 0:
        raise HTTPException(400, "Energy budget must be > 0 kWh.")
    if not (0 < duration <= 720):
        raise HTTPException(400, "Duration must be between 0 and 720 hours (1 lunar day).")
    if storage <= 0:
        raise HTTPException(400, "Storage capacity must be > 0 kg.")
    if not (0 <= reserve <= 50):
        raise HTTPException(400, "Battery reserve must be between 0 and 50%.")


def validate_ice_concentration(wt_pct: float | None) -> float:
    """Return validated ice concentration or fallback to dataset nominal."""
    if wt_pct is None:
        return None  # will use site nominal
    if not (0 <= wt_pct <= 30):
        raise HTTPException(400, "Ice concentration must be 0–30 wt%.")
    return wt_pct
