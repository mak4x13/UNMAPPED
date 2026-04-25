from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import httpx

from .data_store import get_country_config
from .ilo_service import fetch_ilostat_youth_unemployment
from .worldbank_service import fetch_world_bank_indicator


_CACHE_TTL = timedelta(hours=6)
_ECON_CACHE: dict[str, dict] = {}


def _utc_now():
    return datetime.now(timezone.utc)


def _fallback_payload(country_code: str, country_config: dict, note: str):
    fallback = country_config["fallback_econdata"]
    payload = {
        "country": country_config["name"],
        "country_code": country_code,
        "signals": [
            {
                "label": "Youth Unemployment Rate (15-24)",
                "value": fallback["youth_unemployment"],
                "year": None,
                "source": "Country fallback cache",
                "indicator_id": "SDG_0851",
            },
            {
                "label": "GDP per capita (current USD)",
                "value": fallback["gdp_per_capita"],
                "year": None,
                "source": "Country fallback cache",
                "indicator_id": "NY.GDP.PCAP.CD",
            },
            {
                "label": "Secondary Education Completion Rate",
                "value": fallback["secondary_completion"],
                "year": None,
                "source": "Country fallback cache",
                "indicator_id": "SE.SEC.CUAT.LO.ZS",
            },
        ],
        "data_freshness": "cached",
        "fetched_at": _utc_now().isoformat(),
        "transparency_note": note,
    }
    _ECON_CACHE[country_code] = {
        "expires_at": _utc_now() + _CACHE_TTL,
        "payload": payload,
    }
    return payload


async def get_country_econdata(country_code: str):
    country_code = country_code.upper()
    country_config = get_country_config(country_code)
    if not country_config:
        raise KeyError(f"Unsupported country code: {country_code}")

    cached = _ECON_CACHE.get(country_code)
    if cached and cached["expires_at"] > _utc_now():
        payload = deepcopy(cached["payload"])
        if payload["data_freshness"] == "live":
            return payload

    try:
        async with httpx.AsyncClient() as client:
            youth, youth_wdi, gdp, secondary = await asyncio.gather(
                fetch_ilostat_youth_unemployment(country_code, client=client),
                fetch_world_bank_indicator(country_config["iso2"], "SL.UEM.1524.ZS", client=client),
                fetch_world_bank_indicator(country_config["iso2"], "NY.GDP.PCAP.CD", client=client),
                fetch_world_bank_indicator(country_config["iso2"], "SE.SEC.CUAT.LO.ZS", client=client),
            )
        payload = {
            "country": country_config["name"],
            "country_code": country_code,
            "signals": [
                {
                    "label": "Youth Unemployment Rate (15-24)",
                    "value": youth["value_formatted"],
                    "year": youth["year"],
                    "source": youth["source"],
                    "indicator_id": youth["indicator"],
                },
                {
                    "label": "GDP per capita (current USD)",
                    "value": gdp["value_formatted"],
                    "year": gdp["year"],
                    "source": gdp["source"],
                    "indicator_id": "NY.GDP.PCAP.CD",
                },
                {
                    "label": "Secondary Education Completion Rate",
                    "value": secondary["value_formatted"],
                    "year": secondary["year"],
                    "source": secondary["source"],
                    "indicator_id": "SE.SEC.CUAT.LO.ZS",
                },
            ],
            "data_freshness": "live",
            "fetched_at": _utc_now().isoformat(),
            "transparency_note": (
                f"Live data fetched from ILO ILOSTAT and World Bank WDI. WDI youth unemployment check: "
                f"{youth_wdi['value_formatted']} ({youth_wdi['year']})."
            ),
        }
        _ECON_CACHE[country_code] = {
            "expires_at": _utc_now() + _CACHE_TTL,
            "payload": payload,
        }
        return deepcopy(payload)
    except Exception:
        if cached:
            payload = deepcopy(cached["payload"])
            payload["data_freshness"] = "cached"
            payload["transparency_note"] = "Cached data shown because one or more live labor market APIs were unavailable."
            return payload
        return _fallback_payload(
            country_code,
            country_config,
            "Cached data shown because live ILO or World Bank APIs were unavailable.",
        )
