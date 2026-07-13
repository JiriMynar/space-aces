"""Smoke test celého toku turnaje. Spouštěj: manage.py shell < scripts/smoke_test.py"""

from django.utils import timezone

from tournaments.bracket import advance_winner, generate_single_elimination
from tournaments.models import (
    Match,
    MatchStat,
    Player,
    Team,
    TeamMembership,
    Tournament,
)
from tournaments.stats import leaderboard

# Čistý start
Tournament.objects.all().delete()
Player.objects.all().delete()

# 5 hráčů → 1v1 turnaj (test bye, protože 5 není mocnina 2)
players = [Player.objects.create(nick=f"Ace{i}") for i in range(1, 6)]
t = Tournament.objects.create(name="Smoke Cup", team_size=1)

teams = []
for i, p in enumerate(players, start=1):
    team = Team.objects.create(tournament=t, name=p.nick, seed=i)
    TeamMembership.objects.create(team=team, player=p)
    teams.append(team)

generate_single_elimination(t, teams)

print("Rounds:", t.rounds.count())
print("Matches:", Match.objects.filter(round__tournament=t).count())
byes = Match.objects.filter(round__tournament=t, status="completed").count()
print("Bye zápasů vyřešeno v 1. kole:", byes)


def play_match(match):
    """Nechá vyhrát team_a se skóre 10:5 a zapíše K/D."""
    match.score_a, match.score_b = 10, 5
    match.winner = match.team_a
    match.status = Match.Status.COMPLETED
    match.played_at = timezone.now()
    match.save()
    for p in match.team_a.members.all():
        MatchStat.objects.update_or_create(
            match=match, player=p, defaults={"kills": 10, "deaths": 5, "is_winner": True}
        )
    for p in match.team_b.members.all():
        MatchStat.objects.update_or_create(
            match=match, player=p, defaults={"kills": 5, "deaths": 10, "is_winner": False}
        )
    advance_winner(match)


# Dohraj všechny zápasy, které mají oba týmy a čekají
guard = 0
while True:
    pending = Match.objects.filter(
        round__tournament=t, status="pending", team_a__isnull=False, team_b__isnull=False
    ).first()
    if not pending or guard > 50:
        break
    play_match(pending)
    guard += 1

final = t.rounds.order_by("-index").first().matches.first()
print("Šampion:", final.winner.name if final.winner else "—")

print("Leaderboard (K/D):")
for row in sorted(leaderboard(), key=lambda r: r["kd"], reverse=True):
    print(f"  {row['nick']}: KD={row['kd']} WR={row['win_rate']} matches={row['matches']}")

print("SMOKE_OK")
