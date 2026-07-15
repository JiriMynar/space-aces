from django.contrib import admin

from .models import (
    Match,
    MatchStat,
    News,
    Player,
    Round,
    Team,
    TeamMembership,
    TeamSet,
    TeamSetTeam,
    Tournament,
)


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 1


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("nick", "game_id", "joined_at")
    search_fields = ("nick", "game_id")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("name", "format_label", "bracket_type", "status", "season")
    list_filter = ("status", "team_size", "bracket_type", "season")
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament", "seed")
    list_filter = ("tournament",)
    inlines = [TeamMembershipInline]


@admin.register(Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = ("__str__", "tournament", "bracket_side", "index")
    list_filter = ("tournament", "bracket_side")


class MatchStatInline(admin.TabularInline):
    model = MatchStat
    extra = 0


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("__str__", "round", "status", "winner")
    list_filter = ("status", "round__tournament")
    inlines = [MatchStatInline]


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "created_at")
    search_fields = ("title", "body")


class TeamSetTeamInline(admin.TabularInline):
    model = TeamSetTeam
    extra = 0
    filter_horizontal = ("members",)


@admin.register(TeamSet)
class TeamSetAdmin(admin.ModelAdmin):
    list_display = ("name", "team_size", "created_at")
    inlines = [TeamSetTeamInline]
