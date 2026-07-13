"""Idempotentní vytvoření admin účtu z env proměnných (pro deploy na Render).

Spouští se v build.sh při každém deployi. Pokud proměnné nejsou nastavené nebo
uživatel už existuje, nic neprovede a build nespadne.
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Vytvoří superuživatele z DJANGO_SUPERUSER_* env proměnných, pokud neexistuje."

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")

        if not username or not password:
            self.stdout.write(
                "init_admin: DJANGO_SUPERUSER_USERNAME/PASSWORD nenastaveny, přeskakuji."
            )
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(f"init_admin: uživatel '{username}' už existuje, přeskakuji.")
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"init_admin: vytvořen superuživatel '{username}'."))
