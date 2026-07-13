#!/usr/bin/env bash
# Build skript pro Render — spustí se při každém deployi.
set -o errexit

# 1) Build React frontendu (Vite → frontend/dist)
npm install --prefix frontend
npm run build --prefix frontend

# 2) Backend: závislosti, statika (vč. React buildu), migrace DB
pip install -r backend/requirements.txt
python backend/manage.py collectstatic --no-input
python backend/manage.py migrate
