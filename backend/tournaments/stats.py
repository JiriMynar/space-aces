"""Agregace statistik hráčů nad :class:`MatchStat` (zdroj pravdy pro K/D)."""

from collections import defaultdict

from django.db.models import Count, Q, Sum

from .models import MatchStat, Tournament


def _shape(kills, deaths, matches, wins):
    kills = kills or 0
    deaths = deaths or 0
    matches = matches or 0
    wins = wins or 0
    return {
        "kills": kills,
        "deaths": deaths,
        "matches": matches,
        "wins": wins,
        "kd": round(kills / deaths, 2) if deaths else float(kills),
        "win_rate": round(wins / matches, 3) if matches else 0.0,
    }


def player_stats(player, team_size=None, season=None):
    """Souhrnné staty jednoho hráče, volitelně filtrované formátem a sezónou."""
    qs = MatchStat.objects.filter(player=player)
    qs = _apply_filters(qs, team_size, season)
    agg = qs.aggregate(
        kills=Sum("kills"),
        deaths=Sum("deaths"),
        matches=Count("id"),
        wins=Count("id", filter=Q(is_winner=True)),
    )
    return _shape(agg["kills"], agg["deaths"], agg["matches"], agg["wins"])


def leaderboard(team_size=None, season=None):
    """Žebříček všech hráčů se záznamem, seřazený se voláním v view.

    Vrací seznam dictů: id, nick, avatar_url + statistiky.
    """
    qs = _apply_filters(MatchStat.objects.all(), team_size, season)
    rows = qs.values("player__id", "player__nick", "player__avatar_url").annotate(
        kills=Sum("kills"),
        deaths=Sum("deaths"),
        matches=Count("id"),
        wins=Count("id", filter=Q(is_winner=True)),
    )
    result = []
    for row in rows:
        stats = _shape(row["kills"], row["deaths"], row["matches"], row["wins"])
        result.append(
            {
                "id": row["player__id"],
                "nick": row["player__nick"],
                "avatar_url": row["player__avatar_url"],
                **stats,
            }
        )
    return result


def _apply_filters(qs, team_size, season):
    if team_size:
        qs = qs.filter(match__round__tournament__team_size=team_size)
    if season:
        qs = qs.filter(match__round__tournament__season=season)
    return qs


def hall_of_fame():
    """Síň slávy — hráči seřazení podle počtu vyhraných turnajů.

    Pro každého hráče spočítá:
    - ``titles``  = kolikrát byl šampionem (vítěz finále dokončeného turnaje)
    - ``podiums`` = kolikrát skončil v top 3 (finalista nebo poražený semifinalista);
      poháry vedle jména = tento počet (zahrnuje i tituly)

    Řazeno podle titulů, pak podle pohárů. Vrací list dictů.
    """
    titles = defaultdict(int)
    podiums = defaultdict(int)
    info = {}  # player_id -> (nick, avatar_url)

    tournaments = Tournament.objects.filter(
        status=Tournament.Status.COMPLETED
    ).prefetch_related("rounds__matches", "teams__members")

    for tournament in tournaments:
        winners_rounds = sorted(
            (r for r in tournament.rounds.all() if r.bracket_side == "winners"),
            key=lambda r: r.index,
        )
        if not winners_rounds:
            continue

        final_matches = list(winners_rounds[-1].matches.all())
        final = final_matches[0] if final_matches else None
        if not final or not final.winner_id or final.status != "completed":
            continue

        champion_id = final.winner_id
        runner_up_id = (
            final.team_a_id if final.winner_id == final.team_b_id else final.team_b_id
        )

        top3_team_ids = {champion_id}
        if runner_up_id:
            top3_team_ids.add(runner_up_id)
        # Poražení semifinalisté = 3. místo (dělené).
        if len(winners_rounds) >= 2:
            for match in winners_rounds[-2].matches.all():
                if match.status == "completed" and match.winner_id:
                    loser_id = (
                        match.team_a_id
                        if match.winner_id == match.team_b_id
                        else match.team_b_id
                    )
                    if loser_id:
                        top3_team_ids.add(loser_id)

        members_by_team = {team.id: list(team.members.all()) for team in tournament.teams.all()}

        for player in members_by_team.get(champion_id, []):
            titles[player.id] += 1
            info[player.id] = (player.nick, player.avatar_url)
        for team_id in top3_team_ids:
            for player in members_by_team.get(team_id, []):
                podiums[player.id] += 1
                info[player.id] = (player.nick, player.avatar_url)

    rows = []
    for player_id, (nick, avatar_url) in info.items():
        rows.append(
            {
                "id": player_id,
                "nick": nick,
                "avatar_url": avatar_url,
                "titles": titles.get(player_id, 0),
                "podiums": podiums.get(player_id, 0),
            }
        )
    rows.sort(key=lambda r: (r["titles"], r["podiums"]), reverse=True)
    return rows
