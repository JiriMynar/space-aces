"""DRF serializery pro veřejné API i admin operace."""

from rest_framework import serializers

from .models import (
    Match,
    MatchStat,
    News,
    Player,
    Round,
    SavedTeam,
    Team,
    TeamMembership,
    Tournament,
)
from .stats import player_stats


class PlayerSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = ["id", "nick", "game_id", "avatar_url", "joined_at", "stats"]
        read_only_fields = ["joined_at"]

    def get_stats(self, obj):
        return player_stats(obj)


class TeamMemberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="player.id", read_only=True)
    nick = serializers.CharField(source="player.nick", read_only=True)
    avatar_url = serializers.CharField(source="player.avatar_url", read_only=True)

    class Meta:
        model = TeamMembership
        fields = ["id", "nick", "avatar_url"]


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(source="memberships", many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(), many=True, write_only=True, required=False
    )

    class Meta:
        model = Team
        fields = ["id", "tournament", "name", "seed", "members", "member_ids"]

    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", [])
        team = Team.objects.create(**validated_data)
        for player in member_ids:
            TeamMembership.objects.create(team=team, player=player)
        return team

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if member_ids is not None:
            instance.memberships.all().delete()
            for player in member_ids:
                TeamMembership.objects.create(team=instance, player=player)
        return instance


class MatchStatSerializer(serializers.ModelSerializer):
    nick = serializers.CharField(source="player.nick", read_only=True)

    class Meta:
        model = MatchStat
        fields = ["id", "player", "nick", "kills", "deaths", "is_winner"]


class MatchSerializer(serializers.ModelSerializer):
    team_a_detail = TeamSerializer(source="team_a", read_only=True)
    team_b_detail = TeamSerializer(source="team_b", read_only=True)
    stats = MatchStatSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "round",
            "position",
            "team_a",
            "team_b",
            "team_a_detail",
            "team_b_detail",
            "winner",
            "score_a",
            "score_b",
            "status",
            "next_match",
            "next_slot",
            "played_at",
            "stats",
        ]
        read_only_fields = ["round", "position", "next_match", "next_slot"]


class RoundSerializer(serializers.ModelSerializer):
    matches = MatchSerializer(many=True, read_only=True)

    class Meta:
        model = Round
        fields = ["id", "index", "bracket_side", "name", "matches"]


class TournamentListSerializer(serializers.ModelSerializer):
    format_label = serializers.CharField(read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "team_size",
            "format_label",
            "bracket_type",
            "status",
            "seeding_method",
            "season",
            "created_at",
            "started_at",
            "completed_at",
        ]


class TournamentDetailSerializer(TournamentListSerializer):
    rounds = RoundSerializer(many=True, read_only=True)
    teams = TeamSerializer(many=True, read_only=True)
    is_editable = serializers.BooleanField(read_only=True)

    class Meta(TournamentListSerializer.Meta):
        fields = TournamentListSerializer.Meta.fields + [
            "description",
            "is_editable",
            "teams",
            "rounds",
        ]


# ---- Admin akční serializery (vstupní validace, žádné DB modely) ----


class GenerateBracketSerializer(serializers.Serializer):
    seeding = serializers.ChoiceField(
        choices=Tournament.Seeding.choices, required=False
    )


class ReorderSerializer(serializers.Serializer):
    """Drag & drop: přiřazení týmu do slotu prvního kola."""

    match_id = serializers.IntegerField()
    slot = serializers.ChoiceField(choices=["a", "b"])
    team_id = serializers.IntegerField(allow_null=True)


class MatchResultSerializer(serializers.Serializer):
    """Zápis výsledku zápasu: skóre + volitelně per-hráč staty."""

    score_a = serializers.IntegerField(min_value=0)
    score_b = serializers.IntegerField(min_value=0)
    stats = MatchStatSerializer(many=True, required=False)


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = ["id", "title", "body", "created_at"]
        read_only_fields = ["created_at"]


class PlayerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "nick", "avatar_url"]


class SavedTeamSerializer(serializers.ModelSerializer):
    members = PlayerMiniSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(), many=True, write_only=True, source="members"
    )
    size = serializers.SerializerMethodField()

    class Meta:
        model = SavedTeam
        fields = ["id", "name", "members", "member_ids", "size", "created_at"]
        read_only_fields = ["created_at"]

    def get_size(self, obj):
        return obj.members.count()
