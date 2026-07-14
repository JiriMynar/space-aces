from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from tournaments.models import Player, SavedTeam
U = get_user_model(); H = {"SERVER_NAME": "localhost"}
u,_ = U.objects.get_or_create(username="savedtest", defaults={"is_staff": True})
u.is_staff = True; u.set_password("pass12345"); u.save()
p1 = Player.objects.create(nick="SV1"); p2 = Player.objects.create(nick="SV2")
c = APIClient(); r = c.post("/api/auth/login/", {"username":"savedtest","password":"pass12345"}, format="json", **H)
c.credentials(HTTP_AUTHORIZATION="Bearer " + r.json()["access"])
r = c.post("/api/saved-teams/", {"name":"Duo Alfa","member_ids":[p1.id,p2.id]}, format="json", **H)
print("create ->", r.status_code, "(201)")
data = r.json(); print("size:", data.get("size"), "members:", [m["nick"] for m in data.get("members",[])])
print("list ->", c.get("/api/saved-teams/", **H).status_code)
SavedTeam.objects.filter(name="Duo Alfa").delete(); Player.objects.filter(nick__in=["SV1","SV2"]).delete()
print("SAVED_OK")
