"""URL routing turnajového API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    LeaderboardView,
    MatchViewSet,
    PlayerViewSet,
    TeamViewSet,
    TournamentViewSet,
)

router = DefaultRouter()
router.register("tournaments", TournamentViewSet)
router.register("players", PlayerViewSet)
router.register("teams", TeamViewSet)
router.register("matches", MatchViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("leaderboards/", LeaderboardView.as_view(), name="leaderboards"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
