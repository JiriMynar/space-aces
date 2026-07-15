"""Datový model turnajového systému Space Aces.

Sjednocující princip: účastníkem zápasu je vždy ``Team``. U formátu 1v1 je to
tým o jednom hráči. Bracket (pavouk) tak má jednotnou logiku ``team_a`` vs
``team_b`` napříč všemi formáty 1v1–5v5.
"""

from django.db import models


class Player(models.Model):
    """Registrovaný hráč klanu. Statistiky se dopočítávají z :class:`MatchStat`."""

    nick = models.CharField(max_length=64, unique=True)
    game_id = models.CharField(max_length=128, blank=True)
    avatar_url = models.URLField(blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nick"]

    def __str__(self):
        return self.nick


class Tournament(models.Model):
    """Turnaj v jednom z formátů 1v1–5v5, single/double elimination."""

    class BracketType(models.TextChoices):
        SINGLE = "single", "Single elimination"
        DOUBLE = "double", "Double elimination"

    class Mode(models.TextChoices):
        ELIMINATION = "elimination", "Vyřazovací (pavouk)"
        LEAGUE = "league", "Bodovací (tabulka)"

    class Status(models.TextChoices):
        DRAFT = "draft", "Příprava"
        IN_PROGRESS = "in_progress", "Probíhá"
        COMPLETED = "completed", "Dokončeno / archiv"

    class Seeding(models.TextChoices):
        RANDOM = "random", "Náhodně"
        RATING = "rating", "Podle ratingu (K/D)"
        MANUAL = "manual", "Ruční pořadí (drag & drop)"

    name = models.CharField(max_length=200)
    # Počet hráčů v týmu: 1 = 1v1, 2 = 2v2, ... 5 = 5v5.
    team_size = models.PositiveSmallIntegerField(default=1)
    # Režim turnaje: vyřazovací pavouk, nebo bodovací liga (tabulka, každý s každým).
    mode = models.CharField(
        max_length=12, choices=Mode.choices, default=Mode.ELIMINATION
    )
    bracket_type = models.CharField(
        max_length=10, choices=BracketType.choices, default=BracketType.SINGLE
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT
    )
    seeding_method = models.CharField(
        max_length=10, choices=Seeding.choices, default=Seeding.RANDOM
    )
    # Bodování pro ligový režim — nastavitelné adminem turnaje.
    points_per_win = models.DecimalField(max_digits=4, decimal_places=2, default=1)
    points_per_draw = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    points_per_loss = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    points_per_kill = models.DecimalField(
        max_digits=4, decimal_places=2, default="0.5"
    )
    # Volný textový štítek sezóny pro filtrování žebříčků, např. "2026-S1".
    season = models.CharField(max_length=32, blank=True)
    description = models.TextField(blank=True)
    # Datum konání turnaje (kdy se hraje / hrálo).
    event_date = models.DateField(null=True, blank=True)
    # Prize pool v celých EUR (volitelné — o kolik se hraje).
    prize_pool = models.PositiveIntegerField(null=True, blank=True)
    # Odkaz na živý přenos (YouTube). Zobrazí se na home u aktivního turnaje.
    stream_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.team_size}v{self.team_size})"

    @property
    def format_label(self):
        return f"{self.team_size}v{self.team_size}"

    @property
    def is_editable(self):
        """Ruční editace pavouka (drag & drop) je povolená jen v přípravě."""
        return self.status == self.Status.DRAFT


class Team(models.Model):
    """Ad-hoc tým existující jen v rámci jednoho turnaje.

    Pro 1v1 je to tým o jednom hráči (jméno odvozené od nicku).
    """

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="teams"
    )
    name = models.CharField(max_length=120)
    seed = models.PositiveIntegerField(null=True, blank=True)
    members = models.ManyToManyField(
        Player, through="TeamMembership", related_name="teams"
    )

    class Meta:
        ordering = ["seed", "name"]

    def __str__(self):
        return f"{self.name} @ {self.tournament.name}"


class TeamMembership(models.Model):
    """Spojka Team ↔ Player."""

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="memberships"
    )

    class Meta:
        unique_together = ("team", "player")

    def __str__(self):
        return f"{self.player.nick} in {self.team.name}"


class Round(models.Model):
    """Kolo turnaje. ``bracket_side`` rozlišuje větve u double elimination."""

    class Side(models.TextChoices):
        WINNERS = "winners", "Winners bracket"
        LOSERS = "losers", "Losers bracket"
        FINAL = "final", "Grand final"

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="rounds"
    )
    index = models.PositiveSmallIntegerField()
    bracket_side = models.CharField(
        max_length=8, choices=Side.choices, default=Side.WINNERS
    )
    name = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["bracket_side", "index"]
        unique_together = ("tournament", "index", "bracket_side")

    def __str__(self):
        return self.name or f"{self.get_bracket_side_display()} — kolo {self.index}"


class Match(models.Model):
    """Zápas mezi dvěma týmy. Vítěz automaticky postupuje do ``next_match``."""

    class Status(models.TextChoices):
        PENDING = "pending", "Čeká"
        COMPLETED = "completed", "Dohráno"

    class NextSlot(models.TextChoices):
        A = "a", "Slot A"
        B = "b", "Slot B"

    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="matches")
    # Pozice zápasu v rámci kola (0-indexováno), pro řazení pavouka.
    position = models.PositiveSmallIntegerField(default=0)

    team_a = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    team_b = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    winner = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    score_a = models.PositiveIntegerField(default=0)
    score_b = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )

    # Kam postupuje vítěz (řetězení pavouka).
    next_match = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    next_slot = models.CharField(
        max_length=1, choices=NextSlot.choices, null=True, blank=True
    )

    # Kam padá poražený (jen double elimination — do losers bracketu).
    loser_next_match = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    loser_next_slot = models.CharField(
        max_length=1, choices=NextSlot.choices, null=True, blank=True
    )

    played_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["round", "position"]

    def __str__(self):
        a = self.team_a.name if self.team_a else "TBD"
        b = self.team_b.name if self.team_b else "TBD"
        return f"{a} vs {b}"

    @property
    def tournament(self):
        return self.round.tournament


class MatchStat(models.Model):
    """Granulární staty jednoho hráče v jednom zápase. Zdroj pravdy pro K/D."""

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="stats")
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="match_stats"
    )
    kills = models.PositiveIntegerField(default=0)
    deaths = models.PositiveIntegerField(default=0)
    is_winner = models.BooleanField(default=False)

    class Meta:
        unique_together = ("match", "player")

    def __str__(self):
        return f"{self.player.nick}: {self.kills}/{self.deaths}"


class News(models.Model):
    """Novinka / oznámení klanu zobrazené na domovské stránce."""

    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "news"

    def __str__(self):
        return self.title


class Event(models.Model):
    """Klanová akce (trénink, sraz, operace) — eviduje se u ní docházka členů."""

    name = models.CharField(max_length=200)
    event_date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_date", "-created_at"]

    def __str__(self):
        return f"{self.name} ({self.event_date})"


class Attendance(models.Model):
    """Docházka jednoho hráče na jedné akci.

    ``IGNORED`` = byl online, ale na akci se nepřidal — schválně oddělené od
    ``ABSENT`` (vůbec nebyl), protože to o aktivitě vypovídá jinak.
    """

    class Status(models.TextChoices):
        PRESENT = "present", "Byl"
        IGNORED = "ignored", "Byl online, ale nepřidal se"
        ABSENT = "absent", "Nebyl"

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="attendance"
    )
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="attendance"
    )
    status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.ABSENT
    )

    class Meta:
        unique_together = ("event", "player")
        ordering = ["player__nick"]

    def __str__(self):
        return f"{self.player.nick} — {self.event.name}: {self.get_status_display()}"


class TeamSet(models.Model):
    """Uložené složení celého turnaje — sada týmů k opakovanému použití.

    Snapshot všech týmů turnaje. Při načtení se z něj vytvoří ad-hoc týmy
    v cílovém turnaji. Nezávislé na původním turnaji.
    """

    name = models.CharField(max_length=120)
    team_size = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.team_size}v{self.team_size})"


class TeamSetTeam(models.Model):
    """Jeden tým v rámci uloženého složení (:class:`TeamSet`)."""

    team_set = models.ForeignKey(
        TeamSet, on_delete=models.CASCADE, related_name="teams"
    )
    name = models.CharField(max_length=120)
    members = models.ManyToManyField(Player, related_name="team_set_teams")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
