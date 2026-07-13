"""Agregace statistik hráčů nad :class:`MatchStat` (zdroj pravdy pro K/D)."""

from django.db.models import Count, Q, Sum

from .models import MatchStat


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
