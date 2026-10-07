"""Small helpers so user-facing sentences read naturally (units, singular/plural)."""


def count_of(hits, total, singular, plural_form=None):
    """'1 of 1 required language', '2 of 5 required skills'."""
    word = singular if total == 1 else (plural_form or singular + "s")
    return f"{hits} of {total} {word}"


def years(value):
    """A duration in whole years: 'less than a year', '1 year', '9 years'."""
    rounded = round(float(value))
    if rounded < 1:
        return "less than a year"
    return f"{rounded} year" if rounded == 1 else f"{rounded} years"


def min_years(value):
    """A requirement: '1+ year', '3+ years'."""
    rounded = round(float(value), 1)
    number = f"{rounded:g}"
    return f"{number}+ year" if rounded <= 1 else f"{number}+ years"
