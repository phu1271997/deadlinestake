"""Offline tests for DeadlineStake's deterministic helper logic."""
import importlib.util
import os

import pytest

_PATH = os.path.join(os.path.dirname(__file__), "..", "contracts", "deadline_stake.py")
_spec = importlib.util.spec_from_file_location("deadline_stake", _PATH)
ds = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ds)


# ------------------------------------------------------------------- outcomes
def test_yes_outcome_passes_through():
    v = ds._normalize_outcome({"outcome": "yes", "confidence": 88, "reason": "supported"})
    assert v["outcome"] == "YES"
    assert v["confidence"] == 88


def test_no_outcome_passes_through():
    v = ds._normalize_outcome({"outcome": "NO", "confidence": 100, "reason": "refuted"})
    assert v["outcome"] == "NO"


def test_unknown_outcome_becomes_ambiguous():
    v = ds._normalize_outcome({"outcome": "maybe", "confidence": 10, "reason": ""})
    assert v["outcome"] == "AMBIGUOUS"


def test_bad_json_raises():
    with pytest.raises(ds.gl.vm.UserError):
        ds._normalize_outcome("not json")


def test_confidence_clamped():
    v = ds._normalize_outcome({"outcome": "YES", "confidence": -5, "reason": ""})
    assert v["confidence"] == 0
    v2 = ds._normalize_outcome({"outcome": "YES", "confidence": 9999, "reason": ""})
    assert v2["confidence"] == 100


# ------------------------------------------------------------------------- urls
def test_https_public_url_ok():
    assert ds._validate_url("https://example.com/p", "x") == "https://example.com/p"


@pytest.mark.parametrize(
    "bad",
    ["http://example.com", "https://localhost/x", "https://10.0.0.1/x", "ws://example.com"],
)
def test_bad_urls_rejected(bad):
    with pytest.raises(ds.gl.vm.UserError):
        ds._validate_url(bad, "x")


# ---------------------------------------------------------------------- consts
def test_sides_and_outcomes():
    assert ds.SIDES == ("YES", "NO")
    assert set(ds.ALLOWED_OUTCOMES) == {"YES", "NO", "AMBIGUOUS"}
