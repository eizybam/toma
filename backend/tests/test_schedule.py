from datetime import datetime, timedelta

import pytest

import api
from common import MX_TZ, closest_slot, slot_datetime


def at(hh, mm, day=4):
    return datetime(2026, 11, day, hh, mm, tzinfo=MX_TZ)


def test_closest_slot_picks_nearest_and_signs_offset():
    assert closest_slot(["08:00", "20:00"], at(8, 25)) == ("08:00", 25)
    assert closest_slot(["08:00", "20:00"], at(19, 50)) == ("20:00", -10)


def test_closest_slot_empty_schedule():
    assert closest_slot([], at(8, 0)) == (None, None)


def test_slot_datetime_keeps_date_and_timezone():
    assert slot_datetime(at(13, 7), "08:30") == at(8, 30)


@pytest.mark.parametrize("times", [[], ["8:00"], ["24:00"], "08:00", [800]])
def test_validate_times_rejects_bad_input(times):
    with pytest.raises(api.ApiError):
        api._validate_times(times)


def test_validate_times_sorts_and_dedupes():
    assert api._validate_times(["20:00", "08:00", "20:00"]) == ["08:00", "20:00"]


def test_next_dose_rolls_over_to_tomorrow():
    assert api._next_dose(["08:00", "20:00"], at(12, 0)) == "20:00"
    assert api._next_dose(["08:00", "20:00"], at(21, 0)) == "08:00 (mañana)"


def test_normalize_med_derives_times_from_interval():
    med = api._normalize_med({"nombre": "Paracetamol", "dosis": "500 mg", "cadaHoras": 8, "horarios": None})
    assert med["times"] == ["00:00", "08:00", "16:00"]


def test_normalize_med_drops_invalid_times():
    med = api._normalize_med({"nombre": "X", "horarios": ["08:00", "8 am"]})
    assert med["times"] == ["08:00"]


def test_extract_json_ignores_wrapping_text():
    assert api._extract_json('```json\n{"medicamentos": []}\n```') == {"medicamentos": []}


def test_adherence_counts_only_closed_slots():
    now = at(21, 0)
    meds = [{"medId": "m1", "times": ["08:00", "20:00"], "windowMin": 30,
             "createdAt": (now - timedelta(days=2)).isoformat()}]
    doses = [{"date": "2026-11-04", "medId": "m1", "slot": "08:00"}]
    today = api._adherence(meds, doses, now, 1)[0]
    assert today == {"date": "2026-11-04", "expected": 2, "taken": 1, "pct": 50}


def test_unknown_route_returns_404():
    assert api.handler({"routeKey": "GET /nope"}, None)["statusCode"] == 404


@pytest.mark.parametrize("code,expected", [("1F4", 500), ("0000a3", 163), ("", None), ("xyz", None), ("123456789", None)])
def test_hex_counter(code, expected):
    from tap_codes import decode_hex_counter

    assert decode_hex_counter(code) == expected
