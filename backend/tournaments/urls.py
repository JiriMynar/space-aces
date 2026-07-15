"""URL routing turnajového API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ActivityView,
    ChangePasswordView,
    EventViewSet,
    HallOfFameView,
    LastResultView,
    LeaderboardView,
    MatchViewSet,
    NewsViewSet,
    PlayerViewSet,
    TeamSetViewSet,
    TeamViewSet,
    TournamentViewSet,
)

router = DefaultRouter()
router.register("tournaments", TournamentViewSet)
router.register("players", PlayerViewSet)
router.register("teams", TeamViewSet)
router.register("matches", MatchViewSet)
router.register("news", NewsViewSet)
router.register("team-sets", TeamSetViewSet)
router.register("events", EventViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("leaderboards/", LeaderboardView.as_view(), name="leaderboards"),
    path("hall-of-fame/", HallOfFameView.as_view(), name="hall_of_fame"),
    path("last-result/", LastResultView.as_view(), name="last_result"),
    path("activity/", ActivityView.as_view(), name="activity"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
]
