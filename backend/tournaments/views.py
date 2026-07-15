"""API pohledy. Čtení pro všechny (návštěvníci), zápis jen pro adminy."""

import random

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .bracket import advance_winner, generate_single_elimination
from .models import (
    Match,
    MatchStat,
    News,
    Player,
    Team,
    TeamMembership,
    TeamSet,
    TeamSetTeam,
    Tournament,
)
from .serializers import (
    GenerateBracketSerializer,
    MatchResultSerializer,
    MatchSerializer,
    NewsSerializer,
    PlayerSerializer,
    ReorderSerializer,
    TeamSerializer,
    TeamSetSerializer,
    TournamentDetailSerializer,
    TournamentListSerializer,
)
from .stats import hall_of_fame, leaderboard, player_stats


class IsAdminOrReadOnly(permissions.BasePermission):
    """Bezpečné metody komukoliv; zápis jen přihlášenému adminovi (is_staff)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["nick", "game_id"]
    ordering_fields = ["nick", "joined_at"]


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["tournament"]


class NewsViewSet(viewsets.ModelViewSet):
    """Novinky/oznámení klanu. Čtení pro všechny, správa jen admin."""

    queryset = News.objects.all()
    serializer_class = NewsSerializer
    permission_classes = [IsAdminOrReadOnly]


class TeamSetViewSet(viewsets.ModelViewSet):
    """Uložená složení celých turnajů (sady týmů) — čtení/mazání pro adminy."""

    queryset = TeamSet.objects.prefetch_related("teams__members").all()
    serializer_class = TeamSetSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["team_size"]


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["status", "team_size", "bracket_type", "season"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentListSerializer
        return TournamentDetailSerializer

    @action(detail=True, methods=["post"])
    def generate_bracket(self, request, pk=None):
        tournament = self.get_object()
        if not tournament.is_editable:
            return Response(
                {"detail": "Pavouk lze generovat jen ve stavu přípravy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GenerateBracketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seeding = serializer.validated_data.get("seeding", tournament.seeding_method)

        teams = list(tournament.teams.all())
        if len(teams) < 2:
            return Response(
                {"detail": "Turnaj potřebuje aspoň 2 týmy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if seeding == Tournament.Seeding.RATING:
            teams.sort(key=self._team_rating, reverse=True)
        elif seeding == Tournament.Seeding.MANUAL:
            # Zachovej pořadí nastavené adminem (drag & drop) přes team.seed.
            teams.sort(key=lambda team: (team.seed is None, team.seed or 0))
        else:
            random.shuffle(teams)

        for i, team in enumerate(teams, start=1):
            team.seed = i
            team.save(update_fields=["seed"])

        generate_single_elimination(tournament, teams)
        return Response(TournamentDetailSerializer(tournament).data)

    @staticmethod
    def _team_rating(team):
        """Rating týmu = průměrné K/D jeho členů (pro seedování)."""
        members = list(team.members.all())
        if not members:
            return 0.0
        return sum(player_stats(p)["kd"] for p in members) / len(members)

    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        tournament = self.get_object()
        target = request.data.get("status")
        # Povolené přechody — dopředu i zpět (bezpečnostní síť pro překlepy).
        allowed = {
            Tournament.Status.DRAFT: {Tournament.Status.IN_PROGRESS},
            Tournament.Status.IN_PROGRESS: {
                Tournament.Status.DRAFT,
                Tournament.Status.COMPLETED,
            },
            Tournament.Status.COMPLETED: {Tournament.Status.IN_PROGRESS},
        }
        if target not in allowed.get(tournament.status, set()):
            return Response(
                {"detail": f"Neplatný přechod z '{tournament.status}' na '{target}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tournament.status = target
        if target == Tournament.Status.IN_PROGRESS and not tournament.started_at:
            tournament.started_at = timezone.now()
        if target == Tournament.Status.COMPLETED:
            tournament.completed_at = timezone.now()
        elif target == Tournament.Status.DRAFT:
            tournament.started_at = None
            tournament.completed_at = None
        elif target == Tournament.Status.IN_PROGRESS:
            tournament.completed_at = None
        tournament.save()
        return Response(TournamentDetailSerializer(tournament).data)

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        """Drag & drop: přiřadí tým do slotu (jen ve stavu přípravy)."""
        tournament = self.get_object()
        if not tournament.is_editable:
            return Response(
                {"detail": "Pavouk lze upravovat jen ve stavu přípravy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            match = Match.objects.get(
                pk=data["match_id"], round__tournament=tournament
            )
        except Match.DoesNotExist:
            return Response(
                {"detail": "Zápas nepatří k tomuto turnaji."},
                status=status.HTTP_404_NOT_FOUND,
            )

        team = None
        if data["team_id"] is not None:
            try:
                team = Team.objects.get(pk=data["team_id"], tournament=tournament)
            except Team.DoesNotExist:
                return Response(
                    {"detail": "Tým nepatří k tomuto turnaji."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if data["slot"] == "a":
            match.team_a = team
        else:
            match.team_b = team
        match.save()
        return Response(TournamentDetailSerializer(tournament).data)

    @action(detail=True, methods=["post"])
    def shuffle_seeds(self, request, pk=None):
        """Náhodně zamíchá pořadí (nasazení) týmů — kdo proti komu v pavouku."""
        tournament = self.get_object()
        if not tournament.is_editable:
            return Response(
                {"detail": "Pořadí lze měnit jen ve stavu přípravy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        teams = list(tournament.teams.all())
        if len(teams) < 2:
            return Response(
                {"detail": "Aspoň 2 týmy jsou potřeba."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order = list(range(1, len(teams) + 1))
        random.shuffle(order)
        for team, seed in zip(teams, order):
            team.seed = seed
            team.save(update_fields=["seed"])
        # Zamíchané pořadí je ruční nasazení — respektuj ho při generování.
        tournament.seeding_method = Tournament.Seeding.MANUAL
        tournament.save(update_fields=["seeding_method"])
        return Response(TournamentDetailSerializer(tournament).data)

    @action(detail=True, methods=["post"])
    def shuffle_players(self, request, pk=None):
        """Náhodně přemíchá hráče mezi týmy (zachová počet týmů i velikost)."""
        tournament = self.get_object()
        if not tournament.is_editable:
            return Response(
                {"detail": "Hráče lze míchat jen ve stavu přípravy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        teams = list(tournament.teams.all())
        pool = [member for team in teams for member in team.members.all()]
        if not pool:
            return Response(
                {"detail": "Není koho míchat — týmy nemají hráče."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        random.shuffle(pool)
        size = tournament.team_size
        idx = 0
        for team in teams:
            chunk = pool[idx : idx + size]
            idx += size
            team.memberships.all().delete()
            for player in chunk:
                TeamMembership.objects.create(team=team, player=player)
        return Response(TournamentDetailSerializer(tournament).data)

    @action(detail=True, methods=["post"])
    def save_teamset(self, request, pk=None):
        """Uloží aktuální složení (všechny týmy) jako pojmenovanou šablonu."""
        tournament = self.get_object()
        name = (request.data.get("name") or "").strip()
        if not name:
            return Response(
                {"detail": "Zadej název složení."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        teams = list(tournament.teams.all())
        if not teams:
            return Response(
                {"detail": "Turnaj nemá žádné týmy k uložení."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        team_set = TeamSet.objects.create(
            name=name, team_size=tournament.team_size
        )
        for team in teams:
            set_team = TeamSetTeam.objects.create(team_set=team_set, name=team.name)
            set_team.members.set(team.members.all())
        return Response(
            TeamSetSerializer(team_set).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def apply_teamset(self, request, pk=None):
        """Načte uložené složení — vytvoří v tomto turnaji všechny jeho týmy."""
        tournament = self.get_object()
        if not tournament.is_editable:
            return Response(
                {"detail": "Složení lze načíst jen ve stavu přípravy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            team_set = TeamSet.objects.get(pk=request.data.get("team_set"))
        except (TeamSet.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Uložené složení nenalezeno."},
                status=status.HTTP_404_NOT_FOUND,
            )
        for set_team in team_set.teams.all():
            team = Team.objects.create(tournament=tournament, name=set_team.name)
            for player in set_team.members.all():
                TeamMembership.objects.create(team=team, player=player)
        return Response(TournamentDetailSerializer(tournament).data)


class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def result(self, request, pk=None):
        """Zápis výsledku: skóre, vítěz, per-hráč staty, auto-postup."""
        match = self.get_object()
        serializer = MatchResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["score_a"] == data["score_b"]:
            return Response(
                {"detail": "Remíza není v pavouku možná — musí být vítěz."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (match.team_a and match.team_b):
            return Response(
                {"detail": "Zápas nemá oba týmy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match.score_a = data["score_a"]
        match.score_b = data["score_b"]
        match.winner = (
            match.team_a if data["score_a"] > data["score_b"] else match.team_b
        )
        match.status = Match.Status.COMPLETED
        match.played_at = timezone.now()
        match.save()

        winner_ids = set(match.winner.members.values_list("id", flat=True))
        for row in data.get("stats", []):
            MatchStat.objects.update_or_create(
                match=match,
                player=row["player"],
                defaults={
                    "kills": row["kills"],
                    "deaths": row["deaths"],
                    "is_winner": row["player"].id in winner_ids,
                },
            )

        advance_winner(match)
        return Response(MatchSerializer(match).data)


class LeaderboardView(APIView):
    """Žebříček s filtry ?team_size= &season= &sort_by=kd|win_rate|wins|kills."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        team_size = request.query_params.get("team_size")
        season = request.query_params.get("season") or None
        sort_by = request.query_params.get("sort_by", "kd")
        if sort_by not in {"kd", "win_rate", "wins", "kills", "matches"}:
            sort_by = "kd"

        rows = leaderboard(
            team_size=int(team_size) if team_size else None, season=season
        )
        rows.sort(key=lambda r: r[sort_by], reverse=True)
        return Response(rows)


class HallOfFameView(APIView):
    """Síň slávy — hráči podle počtu vyhraných turnajů + poháry (top 3)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(hall_of_fame())


class ChangePasswordView(APIView):
    """Změna hesla přihlášeného uživatele. Vyžaduje současné + nové heslo."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password") or ""
        new_password = request.data.get("new_password") or ""
        user = request.user

        if not user.check_password(old_password):
            return Response(
                {"detail": "Současné heslo není správné."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {"detail": "Nové heslo musí mít aspoň 8 znaků."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Heslo bylo změněno."})
