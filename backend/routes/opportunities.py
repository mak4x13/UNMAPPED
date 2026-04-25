from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services.data_store import get_country_config
from services.econdata_service import get_country_econdata


router = APIRouter(tags=["opportunities"])


OPPORTUNITY_LIBRARY = {
    "GHA": [
        {
            "title": "Neighborhood device support micro-business",
            "type": "self-employment",
            "fit_summary": "Combines repair, customer communication, and accessories sales.",
            "why_now": "Urban device ownership is high and repair remains cheaper than replacement.",
            "resource": "Google Digital Garage",
            "illustrative": True,
        },
        {
            "title": "Solar home system field technician",
            "type": "training_pathways",
            "fit_summary": "Builds directly on troubleshooting and installation work.",
            "why_now": "Backup power and off-grid systems continue to expand in Ghana.",
            "resource": "GOGLA training modules",
            "illustrative": True,
        },
        {
            "title": "Fintech merchant support agent",
            "type": "gig",
            "fit_summary": "Uses sales confidence and device setup skills to support merchants.",
            "why_now": "Mobile-first commerce is expanding quickly.",
            "resource": "CFI financial literacy resources",
            "illustrative": True,
        },
    ],
    "PAK": [
        {
            "title": "Remote IT support freelancer",
            "type": "freelance_remote",
            "fit_summary": "Turns practical troubleshooting into billable remote support work.",
            "why_now": "Pakistan's freelance platform participation is already strong.",
            "resource": "Cisco Networking Academy - IT Essentials",
            "illustrative": True,
        },
        {
            "title": "E-commerce catalog and device setup assistant",
            "type": "self-employment",
            "fit_summary": "Works well for youth already helping small shops digitize.",
            "why_now": "SMEs continue adopting messaging and marketplace sales workflows.",
            "resource": "Google Digital Garage",
            "illustrative": True,
        },
        {
            "title": "SME field service technician",
            "type": "formal_employment",
            "fit_summary": "A bridge from informal repair into small-firm technical service roles.",
            "why_now": "Mixed urban-rural demand keeps field support relevant.",
            "resource": "Alison technical courses",
            "illustrative": True,
        },
    ],
    "KEN": [
        {
            "title": "M-Pesa and merchant device support",
            "type": "gig",
            "fit_summary": "Applies setup, customer guidance, and small-business support skills.",
            "why_now": "Digital payments infrastructure creates constant support demand.",
            "resource": "Safaricom business resources",
            "illustrative": True,
        },
        {
            "title": "Solar home systems service assistant",
            "type": "training_pathways",
            "fit_summary": "Strong adjacent path for technicians who already troubleshoot hardware.",
            "why_now": "Distributed energy products are common in peri-urban and rural markets.",
            "resource": "GOGLA training modules",
            "illustrative": True,
        },
        {
            "title": "Digital device repair collective",
            "type": "formal_employment",
            "fit_summary": "Fits youth moving from solo work into team-based technical service.",
            "why_now": "Kenya's tech ecosystem rewards visible service quality and fast turnaround.",
            "resource": "Ajira Digital resources",
            "illustrative": True,
        },
    ],
    "BGD": [
        {
            "title": "Factory maintenance trainee",
            "type": "formal_employment",
            "fit_summary": "Good bridge into semi-automated production environments.",
            "why_now": "Industrial upgrading increases demand for technicians who can handle machine downtime.",
            "resource": "Alison - Diploma in Electrical Studies",
            "illustrative": True,
        },
        {
            "title": "Marketplace device and logistics support",
            "type": "self-employment",
            "fit_summary": "Extends repair and customer support into digital commerce operations.",
            "why_now": "E-commerce and last-mile device dependence continue growing.",
            "resource": "Google Digital Garage",
            "illustrative": True,
        },
        {
            "title": "Solar backup service assistant",
            "type": "training_pathways",
            "fit_summary": "Useful adjacent path where backup power systems are becoming essential.",
            "why_now": "Power resilience remains a real market need for households and shops.",
            "resource": "GOGLA training modules",
            "illustrative": True,
        },
    ],
}


@router.get("/opportunities")
async def get_opportunities(
    country_code: str = Query(..., min_length=3, max_length=3),
    isco_unit_code: Optional[str] = Query(default=None),
):
    country_code = country_code.upper()
    country_config = get_country_config(country_code)
    if not country_config:
        raise HTTPException(status_code=400, detail="Unsupported country code")

    econdata = await get_country_econdata(country_code)
    return {
        "country": country_config["name"],
        "country_code": country_code,
        "isco_unit_code": isco_unit_code,
        "note": "Opportunity data is illustrative. Labor market context signals below are live when available.",
        "opportunities": OPPORTUNITY_LIBRARY[country_code],
        "market_signals": econdata["signals"],
        "data_freshness": econdata["data_freshness"],
        "fetched_at": econdata["fetched_at"],
    }
