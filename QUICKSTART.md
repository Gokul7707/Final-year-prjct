# GenesisAI — Review demo (Phase 0 + Phase 1)

## What you are showing

| Phase | Surface | Success look |
|-------|---------|--------------|
| **0** | Hangar commercial UI (`/`) | Scroll chapters, pick a class |
| **1** | Forge CAD loop (`/forge`) | Brief → pipeline → **Design generated** → Inspect whoop STL |

## Fastest path (Docker)

Docker Desktop must be running.

```bash
cd DroneChassisBuilder-main
docker compose up -d --build
```

- Hangar: http://localhost:5173  
- Forge: http://localhost:5173/forge  
- API health: http://localhost:5000/health  

Backend image includes **OpenSCAD** (required for real STL).

## Live review script (~3 minutes)

1. Open http://localhost:5173 — login / greeting → **Hangar**.
2. Pick **Racing FPV** or **Freestyle** (whoop-scale CAD).
3. Land on **Design brief** → leave defaults → **Generate design**.
4. Pipeline shows CAD loop; wait for OpenSCAD (**~20–60s** for one STL).
5. Success copy: **Design generated**.
6. Open top alternative → **Inspect** → orbit the whoop STL.
7. Optional: **Export** STL + report.

Avoid Heavy-lift / Industrial for the live CAD demo (they still score parts; Phase 1 geometry is whoop-only).

## Local npm (no Docker)

Needs Node 18+ and **OpenSCAD** installed (`OPENSCAD_PATH` in `backend/.env` if not on PATH).

```bash
# Terminal A
cd backend
cp .env.example .env   # if needed
npm install
npm run dev

# Terminal B
cd frontend
npm install
npm run dev
```

## Phase 1 checklist (for reviewers)

- [x] Design brief screen  
- [x] Typed API client + job store (`/api/jobs`)  
- [x] Visible CAD / agent steps  
- [x] Backend OpenSCAD whoop STL from brief params  
- [x] Viewer loads STL  
- [x] “Design generated” success path  

## Not in Phase 1 (say this if asked)

- Blender part GLBs / mount assembly → Phase 2  
- Real multi-step LLM agents + Firebase memory → Phase 3  
- FEA / topology optimization → Phase 4  
