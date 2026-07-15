"""Agregace statistik hráčů nad :class:`MatchStat` (zdroj pravdy pro K/D)."""

from collections import defaultdict

from django.db.models import Count, Q, Sum

from .models import Attendance, Event, Match, MatchStat, Player, Tournament


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


def _activity_totals():
    """Kolik bylo příležitostí být aktivní: akce + turnaje, které reálně proběhly.

    Turnaje ve stavu přípravy se nepočítají — ještě se nehrály.
    """
    total_events = Event.objects.count()
    total_tournaments = Tournament.objects.exclude(
        status=Tournament.Status.DRAFT
    ).count()
    return total_events, total_tournaments


def _activity_shape(attended, played, total_events, total_tournaments, ignored=0):
    opportunities = total_events + total_tournaments
    done = attended + played
    return {
        "events_attended": attended,
        "events_ignored": ignored,
        "events_total": total_events,
        "tournaments_played": played,
        "tournaments_total": total_tournaments,
        "activity_rate": round(done / opportunities, 3) if opportunities else 0.0,
    }


def player_activity(player):
    """Kombinovaná aktivita hráče: docházka na akcích + účast v turnajích."""
    total_events, total_tournaments = _activity_totals()
    # Aktivní = reálně dorazil. "Byl online, ale nepřidal se" se nepočítá.
    attended = Attendance.objects.filter(
        player=player, status=Attendance.Status.PRESENT
    ).count()
    ignored = Attendance.objects.filter(
        player=player, status=Attendance.Status.IGNORED
    ).count()
    played = (
        Tournament.objects.exclude(status=Tournament.Status.DRAFT)
        .filter(teams__members=player)
        .distinct()
        .count()
    )
    return _activity_shape(
        attended, played, total_events, total_tournaments, ignored
    )


def activity_board():
    """Žebříček aktivity všech hráčů (akce + turnaje), seřazený od nejaktivnějších."""
    total_events, total_tournaments = _activity_totals()
    players = Player.objects.annotate(
        attended=Count(
            "attendance",
            filter=Q(attendance__status=Attendance.Status.PRESENT),
            distinct=True,
        ),
        ignored=Count(
            "attendance",
            filter=Q(attendance__status=Attendance.Status.IGNORED),
            distinct=True,
        ),
        played=Count(
            "teams__tournament",
            filter=~Q(teams__tournament__status=Tournament.Status.DRAFT),
            distinct=True,
        ),
    )
    rows = []
    for player in players:
        rows.append(
            {
                "id": player.id,
                "nick": player.nick,
                "avatar_url": player.avatar_url,
                **_activity_shape(
                    player.attended,
                    player.played,
                    total_events,
                    total_tournaments,
                    player.ignored,
                ),
            }
        )
    rows.sort(key=lambda r: (r["activity_rate"], r["events_attended"]), reverse=True)
    return rows


def league_table(tournament):
    """Ligová tabulka turnaje (bodovací režim), řazená jako ve fotbale.

    Pro každý tým: odehráno, výhry, remízy, prohry, killy a body podle
    nastaveného bodování turnaje (výhra/remíza/prohra + bod za kill).
    Řazeno podle bodů, pak výher, pak killů.
    """
    teams = list(tournament.teams.prefetch_related("members").all())
    rows = {
        team.id: {
            "team_id": team.id,
            "name": team.name,
            "seed": team.seed,
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "kills": 0,
            "points": 0.0,
        }
        for team in teams
    }

    matches = Match.objects.filter(
        round__tournament=tournament,
        status=Match.Status.COMPLETED,
        team_a__isnull=False,
        team_b__isnull=False,
    )
    for match in matches:
        a = rows.get(match.team_a_id)
        b = rows.get(match.team_b_id)
        if not a or not b:
            continue
        a["played"] += 1
        b["played"] += 1
        if match.winner_id is None:
            a["draws"] += 1
            b["draws"] += 1
        elif match.winner_id == match.team_a_id:
            a["wins"] += 1
            b["losses"] += 1
        else:
            b["wins"] += 1
            a["losses"] += 1

    # Killy na tým = součet killů jeho hráčů v zápasech tohoto turnaje.
    member_team = {}
    for team in teams:
        for player in team.members.all():
            member_team[player.id] = team.id
    kill_rows = (
        MatchStat.objects.filter(match__round__tournament=tournament)
        .values("player_id")
        .annotate(k=Sum("kills"))
    )
    for row in kill_rows:
        team_id = member_team.get(row["player_id"])
        if team_id in rows:
            rows[team_id]["kills"] += row["k"] or 0

    ppw = float(tournament.points_per_win)
    ppd = float(tournament.points_per_draw)
    ppl = float(tournament.points_per_loss)
    ppk = float(tournament.points_per_kill)
    result = []
    for row in rows.values():
        row["points"] = round(
            row["wins"] * ppw
            + row["draws"] * ppd
            + row["losses"] * ppl
            + row["kills"] * ppk,
            2,
        )
        result.append(row)
    result.sort(key=lambda r: (r["points"], r["wins"], r["kills"]), reverse=True)
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

    # Šampiony mají jen vyřazovací turnaje (liga má tabulku, ne finále).
    tournaments = Tournament.objects.filter(
        status=Tournament.Status.COMPLETED,
        mode=Tournament.Mode.ELIMINATION,
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
