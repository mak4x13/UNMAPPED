from __future__ import annotations

from typing import Any

import httpx


WORLD_BANK_BASE = "https://api.worldbank.org/v2/country/{iso2}/indicator/{indicator}?format=json&mrv={mrv}"


def _coerce_numeric(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _format_indicator_value(indicator: str, value: float | None) -> str:
    if value is None:
        return "Unavailable"

    if indicator == "NY.GDP.PCAP.CD":
        return f"${value:,.0f}"
    return f"{value:.1f}%"


async def fetch_world_bank_indicator(
    iso2: str,
    indicator: str,
    mrv: int = 1,
    client: httpx.AsyncClient | None = None,
):
    url = WORLD_BANK_BASE.format(iso2=iso2.lower(), indicator=indicator, mrv=mrv)

    async def _request(active_client: httpx.AsyncClient):
        response = await active_client.get(url, timeout=20.0)
        response.raise_for_status()
        payload = response.json()
        records = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        records = [record for record in records if record.get("value") is not None]
        if not records:
            raise ValueError(f"No World Bank data for {indicator} / {iso2}")
        latest = records[0]
        numeric_value = _coerce_numeric(latest.get("value"))
        return {
            "indicator": indicator,
            "value": numeric_value,
            "value_formatted": _format_indicator_value(indicator, numeric_value),
            "year": int(latest.get("date")),
            "source": "World Bank WDI",
        }

    if client is not None:
        return await _request(client)

    async with httpx.AsyncClient() as active_client:
        return await _request(active_client)


async def fetch_world_bank_series(
    iso2: str,
    indicator: str,
    mrv: int = 2,
    client: httpx.AsyncClient | None = None,
):
    url = WORLD_BANK_BASE.format(iso2=iso2.lower(), indicator=indicator, mrv=mrv)

    async def _request(active_client: httpx.AsyncClient):
        response = await active_client.get(url, timeout=20.0)
        response.raise_for_status()
        payload = response.json()
        records = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        cleaned = []
        for record in records:
            numeric_value = _coerce_numeric(record.get("value"))
            if numeric_value is not None:
                cleaned.append(
                    {
                        "year": int(record.get("date")),
                        "value": numeric_value,
                    }
                )
        if not cleaned:
            raise ValueError(f"No World Bank series data for {indicator} / {iso2}")
        return cleaned

    if client is not None:
        return await _request(client)

    async with httpx.AsyncClient() as active_client:
        return await _request(active_client)
