import pytest

from matching.wording import count_of, min_years, years
from tests import fixtures as f


@pytest.mark.parametrize("value, text", [(0, "less than a year"), (0.4, "less than a year"), (1.2, "1 year"),
                                         (9.1, "9 years"), (2.6, "3 years")])
def test_years_are_whole_numbers_with_a_unit(value, text):
    assert years(value) == text


def test_counts_agree_with_their_noun():
    assert count_of(1, 1, "required language") == "1 of 1 required language"
    assert count_of(0, 3, "required skill") == "0 of 3 required skills"
    assert min_years(1) == "1+ year" and min_years(3) == "3+ years"


def test_match_summaries_read_naturally(match):
    result = match(f.CV_JAVA_SENIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA)
    experience = result["categories"]["experience"]["summary"]
    assert "years" in experience or "year" in experience
    assert not any(ch == "." for ch in experience.split("about ")[-1].split(" ")[0])  # no "9.1"
