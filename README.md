# LUNA-MINE 🌙
### Autonomous Lunar Resource Intelligence & Mining Simulator
**ASTRA 2026 | Team: Nilay, Harsh, Nandini, Yug**

---

LUNA-MINE is an interactive lunar mining mission-planning simulator. It models how a future lunar mission could select a promising mining site, deploy a virtual rover, excavate lunar material, process hypothetical resources, and manage mission constraints such as energy, time, storage, terrain difficulty and equipment limits.

> **Disclaimer:** This is a software simulation prototype. All outputs are based on published research constants and illustrative assumptions. Not measured lunar surface data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python + FastAPI |
| Simulation Engine | NumPy + SciPy |
| Database | SQLite (async via SQLAlchemy + aiosqlite) |
| Frontend | React.js + Three.js |
| Styling | Tailwind CSS |
| Charts | Recharts |

---

## Project Structure

```
LUNA-MINE/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Constants & simulation parameters
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes/              # sites, rover, mission, processing, scenarios
│   │   └── schemas/             # Pydantic request/response models
│   ├── simulation/
│   │   ├── site_scorer.py       # Multi-criteria site ranking
│   │   ├── rover_engine.py      # Traverse & excavation physics
│   │   ├── processing_model.py  # ISRU yield calculations
│   │   ├── mission_optimizer.py # Constraint evaluation & scoring
│   │   └── energy_model.py      # Energy cost aggregator
│   ├── data/
│   │   ├── sites.json           # 5 real south pole candidate sites
│   │   ├── rover_configs.json   # Scout-I & Miner-II specs
│   │   └── processing_pathways.json
│   ├── db/                      # SQLite ORM models & CRUD
│   └── utils/                   # Validators & report builder
└── frontend/                    # React.js (coming soon)
```

---

## Running the Backend

### Prerequisites
- Python 3.10+ (Anaconda recommended)
- Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### Start the server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc
- **Health check:** http://127.0.0.1:8000/health

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/sites | List all candidate lunar sites |
| GET | /api/v1/sites/rank | Rank sites by weighted score |
| GET | /api/v1/rovers | List rover configurations |
| POST | /api/v1/rovers/simulate | Simulate rover traverse + excavation |
| POST | /api/v1/mission/run | Run full end-to-end mission |
| GET | /api/v1/processing/pathways | List ISRU pathways |
| POST | /api/v1/processing/simulate | Simulate ISRU processing |
| POST | /api/v1/scenarios/compare | Compare multiple mission scenarios |

---

## Data Sources

Candidate site data sourced from:
- **LOLA** (Lunar Orbiter Laser Altimeter) — terrain elevation & slope
- **LRO Diviner** — surface temperatures & cold trap locations
- **LCROSS** — confirmed water ice at Cabeus (Colaprete et al. 2010)
- **ShadowCam / M³** — PSR ice evidence at Shackleton
- **Mini-RF** — radar CPR anomalies at Faustini
- **NASA Artemis III SDT Report** — Nobile as candidate region

ISRU energy constants from:
- Leger et al. PNAS — 24.3 kWh/kg LOX from ilmenite-bearing regolith
- NASA STMD ISRU reports — thermal extraction model
- Taylor et al. (2019) NASA AHED — regolith XRD mineralogy

---

## Team

| Member | Role |
|---|---|
| **Nilay** | Technical Lead & Integration |
| **Harsh** | Frontend & Product |
| **Nandini** | Research, Testing & Documentation |
| **Yug** | Guided Development & Testing |

---

*ASTRA 2026 Hackathon Entry*
