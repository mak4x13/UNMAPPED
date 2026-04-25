from __future__ import annotations

from typing import Any

import httpx


ILO_BASE = "https://rplumber.ilo.org/data/indicator/"


def _coerce_numeric(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_percent(value: float) -> float:
    return value * 100 if value <= 1 else value


def _extract_records(payload: Any):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "results", "items", "value"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


async def fetch_ilostat_youth_unemployment(
    iso3: str,
    client: httpx.AsyncClient | None = None,
):
    params = {
        "id": "SDG_0851_SEX_AGE_RT",
        "ref_area": iso3.upper(),
        "sex": "SEX_T",
        "classif1": "AGE_YTHADULT_YTH",
        "timefrom": 2020,
        "type": "label",
        "lang": "en",
    }

    async def _request(active_client: httpx.AsyncClient):
        response = await active_client.get(ILO_BASE, params=params, timeout=20.0)
        response.raise_for_status()
        payload = response.json()
        records = _extract_records(payload)
        cleaned = []
        for record in records:
            value = _coerce_numeric(record.get("obs_value") or record.get("value") or record.get("obsValue"))
            time = record.get("time") or record.get("year")
            if value is None or time is None:
                continue
            cleaned.append(
                {
                    "year": int(float(time)),
                    "value": _normalize_percent(value),
                }
            )
        if not cleaned:
            raise ValueError(f"No ILOSTAT youth unemployment data for {iso3}")
        latest = sorted(cleaned, key=lambda item: item["year"], reverse=True)[0]
        latest["indicator"] = "SDG_0851"
        latest["source"] = "ILO ILOSTAT"
        latest["value_formatted"] = f"{latest['value']:.1f}%"
        return latest

    if client is not None:
        return await _request(client)

    async with httpx.AsyncClient() as active_client:
        return await _request(active_client)
