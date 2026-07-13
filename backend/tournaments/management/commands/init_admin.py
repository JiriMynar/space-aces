"""Idempotentní vytvoření admin účtu při deployi na Render.

Spouští se v build.sh při každém deployi:
- Pokud admin (dané uživatelské jméno) už existuje, nic nedělá (nepřepisuje heslo).
- Pokud je nastavená env proměnná DJANGO_SUPERUSER_PASSWORD, použije ji.
- Jinak vygeneruje náhodné bezpečné heslo a VYPÍŠE ho do deploy logu, aby se
  s ním šlo poprvé přihlásit. Heslo si pak uživatel hned změní na webu.
"""

import os
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Vytvoří superuživatele při deployi, pokud ještě neexistuje."

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or None

        if User.objects.filter(username=username).exists():
            self.stdout.write(f"init_admin: uživatel '{username}' už existuje, přeskakuji.")
            return

        generated = False
        if not password:
            password = secrets.token_urlsafe(12)
            generated = True

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"init_admin: vytvořen superuživatel '{username}'."))

        if generated:
            line = "=" * 56
            self.stdout.write(self.style.WARNING(line))
            self.stdout.write(self.style.WARNING(f"  PRIHLASOVACI UDAJE (zmen si heslo po prihlaseni!)"))
            self.stdout.write(self.style.WARNING(f"  Jmeno:  {username}"))
            self.stdout.write(self.style.WARNING(f"  Heslo:  {password}"))
            self.stdout.write(self.style.WARNING(line))
