import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.data_store import (
    get_country_config,
    get_isco_unit,
    lookup_automation_probability,
)
from services.groq_service import generate_readiness_assessment
from services.worldbank_service import fetch_world_bank_indicator, fetch_world_bank_series
from services.econdata_service import get_country_econdata


router = APIRouter(tags=["readiness"])

NEET_FALLBACK = {
    "GHA": "28.4%",
    "PAK": "20.9%",
    "KEN": "21.3%",
    "BGD": "27.8%",
}

ICT_GROWTH_FALLBACK = {
    "GHA": "+6.2% YoY",
    "PAK": "+8.4% YoY",
    "KEN": "+7.1% YoY",
    "BGD": "+9.0% YoY",
}


class ReadinessRequest(BaseModel):
    isco_unit_code: str = Field(..., min_length=4, max_length=4)
    country_code: str = Field(..., min_length=3, max_length=3)
    esco_skills: list[str] = Field(default_factory=list)
    informal_skills_extracted: list[str] = Field(default_factory=list)
    ui_locale: str = Field(default="en", min_length=2, max_length=24)
    ui_language_label: str = Field(default="English", min_length=2, max_length=64)


def _compute_risk_level(probability: float) -> str:
    if probability < 0.35:
        return "low"
    if probability <= 0.65:
        return "moderate"
    return "high"


async def _fetch_extended_signals(country_code: str, country_config: dict):
    econdata, neet, ict_series = await asyncio.gather(
        get_country_econdata(country_code),
        fetch_world_bank_indicator(country_config["iso2"], "SL.UEM.NEET.ZS"),
        fetch_world_bank_series(country_config["iso2"], "BX.GSR.CCIS.ZS"),
    )
    ict_growth = None
    if len(ict_series) >= 2 and ict_series[1]["value"] != 0:
        newest, previous = ict_series[0], ict_series[1]
        ict_growth = ((newest["value"] - previous["value"]) / abs(previous["value"])) * 100
    return econdata, neet, ict_growth, ict_series[0] if ict_series else None


@router.post("/readiness")
async def create_readiness(payload: ReadinessRequest):
    country_config = get_country_config(payload.country_code)
    if not country_config:
        raise HTTPException(status_code=400, detail="Unsupported country code")

    unit = get_isco_unit(payload.isco_unit_code)
    if not unit:
        raise HTTPException(status_code=404, detail="Unknown ISCO unit code")

    automation = lookup_automation_probability(payload.isco_unit_code)
    raw_probability = automation["raw_probability"]
    calibrated_probability = round(raw_probability * country_config["lmic_calibration_factor"], 2)

    readiness = await generate_readiness_assessment(
        payload.model_dump(),
        country_config,
        unit["label"],
        raw_probability,
        calibrated_probability,
    )

    econ_signals = {}
    try:
        econdata, neet, ict_growth, latest_ict = await _fetch_extended_signals(payload.country_code, country_config)
        youth_signal = econdata["signals"][0]
        econ_signals = {
            "youth_unemployment_rate": {
                "value": youth_signal["value"],
                "source": f"{youth_signal['source']} {youth_signal['year']}" if youth_signal["year"] else youth_signal["source"],
                "indicator": "SL.UEM.1524.ZS",
            },
            "neet_rate": {
                "value": neet["value_formatted"],
                "source": f"{neet['source']} {neet['year']}",
                "indicator": "SL.UEM.NEET.ZS",
            },
            "ict_sector_employment_growth": {
                "value": f"{ict_growth:+.1f}% YoY" if ict_growth is not None else "Unavailable",
                "source": (
                    f"World Bank WDI proxy ({latest_ict['year']} ICT service exports share)"
                    if latest_ict
                    else "World Bank WDI proxy"
                ),
                "indicator": "BX.GSR.CCIS.ZS",
            },
        }
    except Exception:
        econ_signals = {
            "youth_unemployment_rate": {
                "value": country_config["fallback_econdata"]["youth_unemployment"],
                "source": "Country fallback cache",
                "indicator": "SL.UEM.1524.ZS",
            },
            "neet_rate": {
                "value": NEET_FALLBACK.get(payload.country_code, "Unavailable"),
                "source": "Country fallback cache",
                "indicator": "SL.UEM.NEET.ZS",
            },
            "ict_sector_employment_growth": {
                "value": ICT_GROWTH_FALLBACK.get(payload.country_code, "Unavailable"),
                "source": "Country fallback cache",
                "indicator": "BX.GSR.CCIS.ZS",
            },
        }

    response = {
        "automation_probability_raw": raw_probability,
        "automation_probability_lmic_calibrated": calibrated_probability,
        "calibration_note": (
            f"Adjusted for {country_config['name']} context: {country_config['calibration_note']}"
        ),
        "risk_level": readiness.get("risk_level") or _compute_risk_level(calibrated_probability),
        "risk_horizon_years": readiness.get("risk_horizon_years", "5-10 years"),
        "skills_at_risk": readiness.get("skills_at_risk", []),
        "durable_skills": readiness.get("durable_skills", []),
        "adjacent_skills_recommended": readiness.get("adjacent_skills_recommended", []),
        "wittgenstein_projection": {
            "region": country_config["region"],
            "secondary_completion_2025": country_config["wittgenstein_secondary_2025"],
            "secondary_completion_2035_projected": country_config["wittgenstein_secondary_2035"],
            "implication": "Credential competition will increase. Informal skills documentation becomes more critical.",
        },
        "econometric_signals": econ_signals,
        "narrative": readiness.get("narrative", ""),
    }
    if automation["fallback_used"]:
        response["occupation_mapping_note"] = (
            "ISCO unit code not directly mapped in the Frey-Osborne crosswalk. Major-group mean automation probability used as fallback."
        )
    return response
