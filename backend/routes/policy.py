from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter

from services.data_store import get_country_config, get_isco_unit, lookup_automation_probability
from services.econdata_service import get_country_econdata
from services.worldbank_service import fetch_world_bank_indicator


router = APIRouter(tags=["policy"])


COUNTRIES = ["GHA", "PAK", "KEN", "BGD"]

NEET_FALLBACK = {
    "GHA": 28.4,
    "PAK": 20.9,
    "KEN": 21.3,
    "BGD": 27.8,
}

ILLUSTRATIVE_ANCHOR_CODES = {
    "GHA": "7421",
    "PAK": "5223",
    "KEN": "6111",
    "BGD": "8153",
}

ILLUSTRATIVE_TOP_CODES = {
    "GHA": ["4311", "8153", "5131", "5223", "8322"],
    "PAK": ["5244", "8153", "4311", "5223", "9211"],
    "KEN": ["4110", "9412", "5223", "8322", "6111"],
    "BGD": ["8153", "9412", "4311", "8160", "7531"],
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_signal(signals: list[dict], indicator_id: str) -> dict | None:
    for signal in signals:
        if signal.get("indicator_id") == indicator_id:
            return signal
    return None


def _parse_percent(value: str | None) -> float:
    try:
        return round(float(str(value or "0").replace("%", "").replace("+", "").replace(" YoY", "")), 1)
    except ValueError:
        return 0.0


def _calibrated_risk(country_code: str, isco_unit_code: str) -> float:
    country_config = get_country_config(country_code)
    raw = lookup_automation_probability(isco_unit_code)["raw_probability"]
    return round(raw * country_config["lmic_calibration_factor"], 2)


async def _country_row(country_code: str):
    country_config = get_country_config(country_code)
    econdata = await get_country_econdata(country_code)
    neet_source = "cached"
    neet_year = None
    neet_value = NEET_FALLBACK[country_code]
    neet_display = f"{neet_value:.1f}%"

    try:
        neet = await fetch_world_bank_indicator(country_config["iso2"], "SL.UEM.NEET.ZS")
        neet_source = "live"
        neet_year = neet["year"]
        neet_value = round(float(neet["value"]), 1)
        neet_display = neet["value_formatted"]
    except Exception:
        pass

    youth_signal = _find_signal(econdata["signals"], "SDG_0851")
    gdp_signal = _find_signal(econdata["signals"], "NY.GDP.PCAP.CD")
    secondary_signal = _find_signal(econdata["signals"], "SE.SEC.CUAT.LO.ZS")
    anchor_code = ILLUSTRATIVE_ANCHOR_CODES[country_code]
    anchor_unit = get_isco_unit(anchor_code)

    return {
        "code": country_code,
        "name": country_config["name"],
        "region": country_config["region"],
        "economy_type": country_config["economy_type"],
        "context_note": country_config["context_note"],
        "calibration_factor": country_config["lmic_calibration_factor"],
        "opportunity_types": country_config["opportunity_types"],
        "youth_unemployment": _parse_percent(youth_signal["value"]) if youth_signal else 0.0,
        "youth_unemployment_display": youth_signal["value"] if youth_signal else country_config["fallback_econdata"]["youth_unemployment"],
        "youth_unemployment_year": youth_signal.get("year") if youth_signal else None,
        "neet_rate": neet_value,
        "neet_rate_display": neet_display,
        "neet_year": neet_year,
        "gdp_per_capita_display": gdp_signal["value"] if gdp_signal else country_config["fallback_econdata"]["gdp_per_capita"],
        "secondary_completion_display": (
            secondary_signal["value"] if secondary_signal else country_config["fallback_econdata"]["secondary_completion"]
        ),
        "data_freshness": "live" if econdata["data_freshness"] == "live" and neet_source == "live" else "cached",
        "fetched_at": econdata["fetched_at"],
        "anchor_occupation_code": anchor_code,
        "anchor_occupation_label": anchor_unit["label"],
        "calibrated_risk": _calibrated_risk(country_code, anchor_code),
    }


def _top_risk_rows(country_code: str):
    country_config = get_country_config(country_code)
    rows = []
    for code in ILLUSTRATIVE_TOP_CODES[country_code]:
        unit = get_isco_unit(code)
        rows.append(
            {
                "country_code": country_code,
                "country": country_config["name"],
                "occupation_code": code,
                "occupation": unit["label"],
                "calibrated_risk": _calibrated_risk(country_code, code),
                "label": "illustrative",
            }
        )
    rows.sort(key=lambda row: (-row["calibrated_risk"], row["occupation"]))
    return rows


@router.get("/policy-dashboard")
async def get_policy_dashboard():
    countries = await asyncio.gather(*[_country_row(country_code) for country_code in COUNTRIES])
    top_risk_rows = []
    for country_code in COUNTRIES:
        top_risk_rows.extend(_top_risk_rows(country_code))

    return {
        "fetched_at": _utc_now(),
        "note": (
            "This view is designed for program officers and government analysts. "
            "ILO ILOSTAT and World Bank WDI are fetched live where available. "
            "Occupation rows remain illustrative benchmarks."
        ),
        "countries": countries,
        "top_risk_rows": top_risk_rows,
    }
