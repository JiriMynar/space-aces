"""URL konfigurace projektu.

API běží pod /api/, Django admin pod /admin/. V produkci Django navíc servíruje
buildnutý React (index.html) na všech ostatních cestách kvůli client-side
routingu React Routeru.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tournaments.urls')),
]

# Catch-all pro React SPA — jen když existuje frontend build (produkce).
# V lokálním vývoji běží frontend na Vite dev serveru (localhost:5173).
if settings.FRONTEND_DIST.exists():
    urlpatterns += [
        re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
    ]
