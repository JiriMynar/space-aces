# Space Aces — klanový web s turnajovým systémem

Webová aplikace pro herní klan **Space Aces**: správa a sledování klanových turnajů (1v1–5v5), registrace hráčů, turnajové pavouky s drag & drop editací a žebříčky statistik.

- **Návštěvník** (nepřihlášený): prohlíží turnaje, pavouky, žebříčky a profily hráčů.
- **Admin** (přihlášený): zakládá turnaje, registruje hráče, generuje a edituje pavouk, zapisuje výsledky, archivuje turnaje.

Web je trojjazyčný: **čeština / angličtina / němčina**.

## Stack

| Vrstva | Technologie |
|--------|-------------|
| Backend | Django 5 + Django REST Framework, JWT auth (SimpleJWT) |
| Frontend | React + Vite, react-router, react-i18next, dnd-kit |
| Databáze | SQLite (vývoj) → PostgreSQL (produkce) |

## Datový model

Sjednocující princip: **účastníkem zápasu je vždy `Team`** — 1v1 = tým o jednom hráči, takže pavouk má jednotnou logiku napříč formáty.

`Player` · `Tournament` · `Team` (ad-hoc, přes `TeamMembership`) · `Round` · `Match` · `MatchStat`

Statistiky (K/D, win rate) se dopočítávají agregací z `MatchStat` — archiv zůstává navždy dopočitatelný.

## Spuštění — backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate        # Windows; jinak: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # admin účet
python manage.py runserver
```

API běží na `http://localhost:8000/api/`, Django admin na `http://localhost:8000/admin/`.

## Spuštění — frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend běží na `http://localhost:5173/`.

## Přehled API

| Metoda | Endpoint | Přístup | Popis |
|--------|----------|---------|-------|
| GET | `/api/tournaments/` | veřejné | seznam turnajů (filtry: status, team_size, season) |
| GET | `/api/tournaments/{id}/` | veřejné | detail + pavouk |
| POST | `/api/tournaments/{id}/generate_bracket/` | admin | vygeneruje pavouk (random / rating) |
| POST | `/api/tournaments/{id}/set_status/` | admin | přechod stavu (start / archiv) |
| POST | `/api/tournaments/{id}/reorder/` | admin | drag & drop tým do slotu |
| GET/POST | `/api/players/` | GET veřejné, POST admin | hráči |
| POST | `/api/matches/{id}/result/` | admin | zápis výsledku + K/D, auto-postup |
| GET | `/api/leaderboards/` | veřejné | žebříček (filtry: team_size, season, sort_by) |
| POST | `/api/auth/login/` | — | JWT access + refresh token |

## Nasazení (Render)

Aplikace je připravená na nasazení na [Render](https://render.com) jako jedna služba (Django servíruje React build + PostgreSQL). Konfigurace je v [`render.yaml`](render.yaml) a [`build.sh`](build.sh).

1. Nahraj repo na GitHub (`git push`).
2. Na Renderu: **New → Blueprint**, propoj GitHub repo. Render načte `render.yaml` a vytvoří web službu + Postgres databázi.
3. Po prvním deployi vytvoř admin účet přes Render Shell:
   ```bash
   cd backend && python manage.py createsuperuser
   ```
4. Web poběží na `https://<název>.onrender.com`.

**Produkční proměnné** (Render je nastaví z `render.yaml`): `DJANGO_SECRET_KEY` (generovaný), `DJANGO_DEBUG=False`, `DATABASE_URL` (z Postgres). `ALLOWED_HOSTS` a `CSRF_TRUSTED_ORIGINS` se doplní automaticky z `RENDER_EXTERNAL_HOSTNAME`.
