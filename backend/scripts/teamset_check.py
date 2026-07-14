from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from tournaments.models import Player, Tournament, Team, TeamMembership, TeamSet
U = get_user_model(); H = {"SERVER_NAME": "localhost"}
u, _ = U.objects.get_or_create(username="tstest", defaults={"is_staff": True})
u.is_staff = True; u.set_password("pass12345"); u.save()

# 4 hráči, turnaj 2v2, 2 týmy
ps = [Player.objects.create(nick=f"TS{i}") for i in range(4)]
src = Tournament.objects.create(name="Zdroj", team_size=2)
for a, b, nm in [(0, 1, "Tym Alfa"), (2, 3, "Tym Beta")]:
    t = Team.objects.create(tournament=src, name=nm)
    TeamMembership.objects.create(team=t, player=ps[a])
    TeamMembership.objects.create(team=t, player=ps[b])

c = APIClient()
r = c.post("/api/auth/login/", {"username": "tstest", "password": "pass12345"}, format="json", **H)
c.credentials(HTTP_AUTHORIZATION="Bearer " + r.json()["access"])

# 1) uložit celé složení
r = c.post(f"/api/tournaments/{src.id}/save_teamset/", {"name": "Liga jaro"}, format="json", **H)
print("save_teamset ->", r.status_code, "(201)")
ts = r.json()

# 2) list team-sets s filtrem podle velikosti
r = c.get("/api/team-sets/?team_size=2", **H)
print("list team-sets(2v2) ->", r.status_code)

# 3) načíst složení do nového turnaje
dst = Tournament.objects.create(name="Cil", team_size=2)
r = c.post(f"/api/tournaments/{dst.id}/apply_teamset/", {"team_set": ts["id"]}, format="json", **H)
print("apply_teamset ->", r.status_code, "-> týmů v cíli:", dst.teams.count())

# 4) zamíchat týmy v cíli
r = c.post(f"/api/tournaments/{dst.id}/shuffle_teams/", {}, format="json", **H)
print("shuffle_teams ->", r.status_code)

TeamSet.objects.filter(name="Liga jaro").delete()
Tournament.objects.filter(name__in=["Zdroj", "Cil"]).delete()
Player.objects.filter(nick__startswith="TS").delete()
print("TEAMSET_OK")
