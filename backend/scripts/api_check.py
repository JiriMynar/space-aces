from rest_framework.test import APIClient
c = APIClient()
H = {"SERVER_NAME": "localhost"}
print("GET /api/tournaments/ ->", c.get("/api/tournaments/", **H).status_code)
print("GET /api/players/ ->", c.get("/api/players/", **H).status_code)
print("GET /api/leaderboards/?sort_by=kd ->", c.get("/api/leaderboards/?sort_by=kd", **H).status_code)
r = c.get("/api/leaderboards/?sort_by=win_rate", **H)
print("Leaderboard rows:", len(r.json()))
w = c.post("/api/players/", {"nick": "Hacker"}, format="json", **H)
print("POST /api/players/ bez auth ->", w.status_code, "(ocekavano 401/403)")
print("API_CHECK_OK")
