"""
LUNA-MINE Dataset Fetcher
Fetches real public datasets from NASA, USGS and research sources.
All downloaded files are labelled with their origin.
"""

import urllib.request
import urllib.error
import json
import os
import csv
import io

RAW = "D:/LUNA-MINE/backend/data/raw"
os.makedirs(RAW, exist_ok=True)

def download(url, filename, label):
    path = f"{RAW}/{filename}"
    try:
        print(f"  Fetching {label}...")
        req = urllib.request.Request(url, headers={"User-Agent": "LUNA-MINE/1.0 (hackathon research project)"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        with open(path, "wb") as f:
            f.write(data)
        print(f"  ✓ Saved {filename} ({len(data)} bytes)")
        return True
    except Exception as e:
        print(f"  ✗ Failed {label}: {e}")
        return False

print("\n=== LUNA-MINE Dataset Fetcher ===\n")

# ─── 1. NASA Trek Moon API — Layer catalogue (PSR, water ice, slope layers) ───
print("[1/6] NASA Trek Moon — Layer Catalogue")
download(
    "https://trek.nasa.gov/moon/TrekWS/rest/cat/search?start=0&rows=50&keyword=water+ice",
    "trek_ice_layers.json",
    "NASA Trek water-ice layers"
)

# ─── 2. NASA Trek — South Pole Terrain Layers ────────────────────────────────
print("[2/6] NASA Trek Moon — South Pole Layers")
download(
    "https://trek.nasa.gov/moon/TrekWS/rest/cat/search?start=0&rows=50&keyword=south+pole+slope",
    "trek_southpole_slope.json",
    "NASA Trek south pole slope layers"
)

# ─── 3. USGS Astrogeology — Lunar GIS Product Catalogue ──────────────────────
print("[3/6] USGS Astrogeology — Lunar product list")
download(
    "https://astrogeology.usgs.gov/search/results?q=moon+south+pole&output=json",
    "usgs_lunar_products.json",
    "USGS lunar south pole products"
)

# ─── 4. NASA PDS LOLA — Polar region data index ──────────────────────────────
print("[4/6] NASA PDS — LOLA Polar Topography Index")
download(
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/index/index.csv",
    "lola_index.csv",
    "LOLA PDS data index"
)

# ─── 5. Artemis Candidate Landing Regions ────────────────────────────────────
print("[5/6] NASA Artemis — Candidate Landing Regions JSON")
download(
    "https://trek.nasa.gov/moon/TrekWS/rest/cat/search?start=0&rows=20&keyword=artemis+landing",
    "artemis_landing_regions.json",
    "Artemis candidate landing regions"
)

# ─── 6. NASA NTRS — ISRU Technology Reference ────────────────────────────────
print("[6/6] NASA NTRS — ISRU reference search")
download(
    "https://ntrs.nasa.gov/api/citations/search?q=lunar+ISRU+oxygen+extraction&rows=10",
    "ntrs_isru_references.json",
    "NASA NTRS ISRU references"
)

# ─── Build curated sites.json from real published data ────────────────────────
print("\n[Curating] Building sites.json from published south pole research data...")

sites = {
    "_metadata": {
        "source": "Values compiled from NASA LRO LOLA, Diviner, Mini-RF and published PSR research. See references.",
        "references": [
            "Hayne et al. (2015) Nat. Geosci. — Lunar cold traps",
            "Zuber et al. (2012) Science — LOLA south pole topography",
            "Spudis et al. (2013) JGR — Mini-RF ice evidence",
            "NASA Artemis III Science Definition Team Report (2020)",
            "Colaprete et al. (2010) Science — LCROSS water confirmation"
        ],
        "label": "SIMULATED — values derived from published research; not direct sensor readings"
    },
    "sites": [
        {
            "id": "site_shackleton",
            "name": "Shackleton Crater Rim",
            "region": "Lunar South Pole",
            "coordinates": {"lat": -89.54, "lon": 129.78},
            "elevation_m": -3200,
            "psr_coverage_pct": 89,
            "ice_evidence": "High — ShadowCam imagery and M3 water-ice absorption (Hayne et al.)",
            "surface_temp_min_K": 29,
            "surface_temp_max_K": 215,
            "slope_deg": 18.4,
            "terrain_difficulty": "High",
            "traversability_score": 0.32,
            "ice_concentration_wt_pct": {"min": 1.0, "max": 8.5, "nominal": 3.5},
            "travel_distance_from_base_km": 2.1,
            "solar_access_pct": 11,
            "source": "Zuber et al. 2012; Hayne et al. 2015; ShadowCam 2023"
        },
        {
            "id": "site_cabeus",
            "name": "Cabeus Crater",
            "region": "Lunar South Pole",
            "coordinates": {"lat": -84.90, "lon": -35.50},
            "elevation_m": -4700,
            "psr_coverage_pct": 97,
            "ice_evidence": "Confirmed — LCROSS impactor detected water vapour and ice (Colaprete et al. 2010)",
            "surface_temp_min_K": 24,
            "surface_temp_max_K": 51,
            "slope_deg": 6.2,
            "terrain_difficulty": "Medium",
            "traversability_score": 0.61,
            "ice_concentration_wt_pct": {"min": 2.0, "max": 12.0, "nominal": 5.6},
            "travel_distance_from_base_km": 48.3,
            "solar_access_pct": 3,
            "source": "Colaprete et al. 2010 Science; Spudis et al. 2013; LOLA LDSM"
        },
        {
            "id": "site_haworth",
            "name": "Haworth Crater",
            "region": "Lunar South Pole",
            "coordinates": {"lat": -87.49, "lon": -5.00},
            "elevation_m": -3900,
            "psr_coverage_pct": 83,
            "ice_evidence": "Moderate — Neutron suppression hydrogen signal (LEND instrument)",
            "surface_temp_min_K": 32,
            "surface_temp_max_K": 128,
            "slope_deg": 9.8,
            "terrain_difficulty": "Medium",
            "traversability_score": 0.55,
            "ice_concentration_wt_pct": {"min": 0.5, "max": 6.0, "nominal": 2.1},
            "travel_distance_from_base_km": 18.7,
            "solar_access_pct": 17,
            "source": "Mitrofanov et al. 2010 (LEND); Hayne et al. 2015"
        },
        {
            "id": "site_faustini",
            "name": "Faustini Crater",
            "region": "Lunar South Pole",
            "coordinates": {"lat": -87.06, "lon": 77.00},
            "elevation_m": -4100,
            "psr_coverage_pct": 91,
            "ice_evidence": "High — Mini-RF anomalous CPR and Diviner cold-trap confirmation",
            "surface_temp_min_K": 27,
            "surface_temp_max_K": 68,
            "slope_deg": 12.1,
            "terrain_difficulty": "High",
            "traversability_score": 0.41,
            "ice_concentration_wt_pct": {"min": 1.5, "max": 9.0, "nominal": 4.2},
            "travel_distance_from_base_km": 31.5,
            "solar_access_pct": 9,
            "source": "Spudis et al. 2013; Hayne et al. 2015; Diviner Radiometer"
        },
        {
            "id": "site_nobile",
            "name": "Nobile Crater",
            "region": "Lunar South Pole",
            "coordinates": {"lat": -85.43, "lon": 53.56},
            "elevation_m": -3600,
            "psr_coverage_pct": 76,
            "ice_evidence": "Moderate — Selected as Artemis III candidate region; orbital hydrogen signal",
            "surface_temp_min_K": 35,
            "surface_temp_max_K": 182,
            "slope_deg": 7.4,
            "terrain_difficulty": "Low",
            "traversability_score": 0.74,
            "ice_concentration_wt_pct": {"min": 0.3, "max": 5.5, "nominal": 1.8},
            "travel_distance_from_base_km": 9.4,
            "solar_access_pct": 24,
            "source": "NASA Artemis III Science Definition Team 2020; Hayne et al. 2015"
        }
    ]
}

with open("D:/LUNA-MINE/backend/data/sites.json", "w") as f:
    json.dump(sites, f, indent=2)
print("  ✓ Saved sites.json (5 real south pole candidate sites)")

# ─── Build processing_pathways.json from ISRU energy research ─────────────────
print("[Curating] Building processing_pathways.json from ISRU energy research...")

pathways = {
    "_metadata": {
        "source": "Energy constants from Leger et al. PNAS; NASA STMD ISRU reports; Zubrin et al.",
        "references": [
            "Leger et al. (PNAS) — End-to-end energy for lunar LOX: ~24.3 kWh/kg",
            "NASA STMD ISRU Technology Development — Water ice thermal extraction",
            "Sanders & Larson (2013) — ISRU roadmap energy budgets",
            "Taylor et al. (2019) — Regolith XRD mineralogy (ilmenite wt%)"
        ],
        "label": "SIMULATED — constants derived from published research"
    },
    "pathways": [
        {
            "id": "water_ice_extraction",
            "name": "Water-Ice Thermal Extraction",
            "description": "Heats icy regolith to sublimate water ice; vapour is captured and condensed.",
            "feedstock": "Icy regolith (PSR)",
            "primary_product": "Water (H2O)",
            "byproducts": ["Processed dry regolith"],
            "energy_constants": {
                "excavation_kWh_per_kg_regolith": 0.012,
                "heating_kWh_per_kg_regolith": 0.18,
                "condensation_kWh_per_kg_water": 0.95,
                "total_kWh_per_kg_water_nominal": 4.8,
                "source": "NASA STMD thermal extraction models"
            },
            "yield_model": {
                "water_per_kg_regolith_kg": "ice_concentration_wt_pct / 100",
                "efficiency_factor": 0.72,
                "note": "72% capture efficiency — losses to sublimation leakage and cold-trap re-deposition"
            },
            "constraints": {
                "min_ice_concentration_wt_pct": 0.5,
                "max_operating_temp_K": 400,
                "storage_pressure_kPa": 101
            }
        },
        {
            "id": "regolith_oxygen_reduction",
            "name": "Regolith Oxygen Extraction (Hydrogen Reduction)",
            "description": "Reduces ilmenite (FeTiO3) in regolith using hydrogen; produces water then electrolysed for O2.",
            "feedstock": "Bulk lunar regolith (mare or highland)",
            "primary_product": "Liquid Oxygen (LOX)",
            "byproducts": ["Iron (Fe)", "Titanium oxide (TiO2)", "Recycled H2"],
            "energy_constants": {
                "total_kWh_per_kg_LOX": 24.3,
                "uncertainty_kWh": 5.8,
                "reactor_share_pct": 55,
                "electrolysis_share_pct": 38,
                "liquefaction_share_pct": 4.8,
                "excavation_transport_share_pct": 2.2,
                "source": "Leger et al. PNAS — end-to-end LOX from ilmenite-bearing regolith"
            },
            "yield_model": {
                "ilmenite_wt_pct_mare": 10.0,
                "oxygen_per_kg_ilmenite_kg": 0.197,
                "efficiency_factor": 0.68,
                "note": "Assumes 10 wt% ilmenite in mare regolith (Taylor et al. 2019 XRD data)"
            },
            "constraints": {
                "min_ilmenite_wt_pct": 3.0,
                "reactor_temp_K": 900,
                "hydrogen_feedstock_required": True,
                "best_for": "Mare regions — not PSR"
            }
        }
    ]
}

with open("D:/LUNA-MINE/backend/data/processing_pathways.json", "w") as f:
    json.dump(pathways, f, indent=2)
print("  ✓ Saved processing_pathways.json")

# ─── Build rover_configs.json ─────────────────────────────────────────────────
print("[Curating] Building rover_configs.json (based on real rover specs)...")

rovers = {
    "_metadata": {
        "source": "Inspired by NASA VIPER rover specs and published lunar rover research",
        "references": [
            "NASA VIPER Mission Overview (2023)",
            "Zacny et al. — Lunar excavation energy requirements",
            "ESA SHERPA rover concept studies"
        ],
        "label": "SIMULATED — specs inspired by real rovers but adjusted for simulation"
    },
    "rovers": [
        {
            "id": "rover_scout",
            "name": "Scout-I (Lightweight Prospector)",
            "inspired_by": "NASA VIPER concept",
            "mass_kg": 430,
            "battery_capacity_kWh": 3.5,
            "solar_panel_kW": 0.45,
            "max_speed_kmh": 0.8,
            "avg_traverse_power_kW": 0.18,
            "excavation_rate_kg_per_hour": 12,
            "excavation_power_kW": 0.55,
            "payload_capacity_kg": 50,
            "max_slope_deg": 15,
            "drill_depth_m": 1.0,
            "best_for": "Prospecting and light ice extraction in accessible PSR edges"
        },
        {
            "id": "rover_miner",
            "name": "Miner-II (Heavy Extractor)",
            "inspired_by": "ESA SHERPA / NASA RASSOR concepts",
            "mass_kg": 850,
            "battery_capacity_kWh": 8.0,
            "solar_panel_kW": 0.90,
            "max_speed_kmh": 0.5,
            "avg_traverse_power_kW": 0.32,
            "excavation_rate_kg_per_hour": 35,
            "excavation_power_kW": 1.2,
            "payload_capacity_kg": 150,
            "max_slope_deg": 10,
            "drill_depth_m": 2.5,
            "best_for": "High-volume ice extraction at confirmed PSR sites"
        }
    ]
}

with open("D:/LUNA-MINE/backend/data/rover_configs.json", "w") as f:
    json.dump(rovers, f, indent=2)
print("  ✓ Saved rover_configs.json")

print("\n=== Dataset fetch complete ===")
print(f"Files in D:/LUNA-MINE/backend/data/:")
for f in os.listdir("D:/LUNA-MINE/backend/data"):
    print(f"  {f}")
print(f"\nFiles in D:/LUNA-MINE/backend/data/raw/:")
for f in os.listdir(RAW):
    print(f"  {f}")
