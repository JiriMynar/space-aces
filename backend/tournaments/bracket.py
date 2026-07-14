"""Logika generování a průchodu turnajovým pavoukem.

Zatím single elimination (default). Double elimination je připravené v datovém
modelu (``Round.bracket_side``, ``Match.loser_next_match``) a doplní se později.
"""

import math

from django.db import transaction

from .models import Match, Round


def seed_positions(size):
    """Standardní seedovací rozložení pro pavouk o velikosti ``size`` (mocnina 2).

    Vrací seznam čísel seedů (1..size) v pořadí slotů tak, aby se nejsilnější
    a druhý nejsilnější potkali nejdřív ve finále. Např. pro 8:
    ``[1, 8, 4, 5, 2, 7, 3, 6]``.
    """
    seeds = [1]
    while len(seeds) < size:
        length = len(seeds) * 2
        expanded = []
        for s in seeds:
            expanded.append(s)
            expanded.append(length + 1 - s)
        seeds = expanded
    return seeds


@transaction.atomic
def generate_single_elimination(tournament, teams):
    """Vygeneruje kompletní single-elimination pavouk pro daný seznam týmů.

    ``teams`` musí být seřazené podle síly (index 0 = nejsilnější seed). Chybějící
    místa do nejbližší mocniny dvou se doplní jako bye — tým s bye automaticky
    postupuje.
    """
    n = len(teams)
    if n < 2:
        raise ValueError("Turnaj potřebuje aspoň 2 týmy.")

    # Smaž případný starý pavouk (regenerace).
    tournament.rounds.all().delete()

    size = 1
    while size < n:
        size *= 2
    rounds_count = int(math.log2(size))

    # Namapuj seedy na sloty; seed > n znamená bye (None).
    positions = seed_positions(size)
    slots = [teams[s - 1] if s <= n else None for s in positions]

    # Vytvoř prázdná kola (název nechává frontend lokalizovat podle indexu).
    rounds = [
        Round.objects.create(
            tournament=tournament,
            index=r,
            bracket_side=Round.Side.WINNERS,
        )
        for r in range(1, rounds_count + 1)
    ]

    # Vytvoř zápasy po kolech; každé kolo má poloviční počet zápasů než předchozí.
    matches_per_round = []
    for r_index, round_obj in enumerate(rounds):
        count = size // (2 ** (r_index + 1))
        round_matches = [
            Match.objects.create(round=round_obj, position=i) for i in range(count)
        ]
        matches_per_round.append(round_matches)

    # Naplň první kolo týmy podle slotů.
    first_round = matches_per_round[0]
    for i, match in enumerate(first_round):
        match.team_a = slots[2 * i]
        match.team_b = slots[2 * i + 1]
        match.save()

    # Zřetěz postup: vítěz zápasu i v kole r jde do zápasu i//2 v kole r+1.
    for r_index in range(len(matches_per_round) - 1):
        for i, match in enumerate(matches_per_round[r_index]):
            match.next_match = matches_per_round[r_index + 1][i // 2]
            match.next_slot = Match.NextSlot.A if i % 2 == 0 else Match.NextSlot.B
            match.save()

    # Vyřeš bye v prvním kole — tým bez soupeře rovnou postupuje.
    for match in first_round:
        _resolve_bye(match)

    return rounds


def _resolve_bye(match):
    """Pokud má zápas jen jeden tým, prohlásí ho za vítěze a postoupí ho dál."""
    has_a = match.team_a is not None
    has_b = match.team_b is not None
    if has_a != has_b:  # právě jeden tým
        match.winner = match.team_a if has_a else match.team_b
        match.status = Match.Status.COMPLETED
        match.save()
        advance_winner(match)


def advance_winner(match):
    """Propíše vítěze do navazujícího slotu (a u double elim i poraženého).

    Volá se po zapsaní výsledku i při řešení bye. Idempotentní — přepíše sloty
    aktuálním vítězem/poraženým (umožňuje opravu výsledku).

    Záměrně NEvolá ``_resolve_bye`` na navazující zápas: prázdný slot v druhém
    a dalších kolech znamená "čeká na vítěze jiného zápasu", ne bye. Bye existuje
    jen v prvním kole (tam ho vyřeší :func:`generate_single_elimination`).
    """
    if not match.winner:
        return
    loser = match.team_a if match.winner_id == match.team_b_id else match.team_b
    _assign_slot(match.next_match, match.next_slot, match.winner)
    if loser is not None:
        _assign_slot(match.loser_next_match, match.loser_next_slot, loser)


def _assign_slot(target, slot, team):
    """Vloží tým do slotu (a/b) cílového zápasu, pokud cíl a slot existují."""
    if not target or not slot:
        return
    if slot == Match.NextSlot.A:
        target.team_a = team
    else:
        target.team_b = team
    target.save()
