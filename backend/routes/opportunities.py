from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services.data_store import get_country_config, get_isco_unit
from services.econdata_service import get_country_econdata


router = APIRouter(tags=["opportunities"])


FAMILY_META = {
    "electronics_repair": "device and electronics repair",
    "vehicle_repair": "vehicle and motor repair",
    "plumbing": "plumbing and pipe fitting",
    "retail_ops": "sales and small-shop operations",
    "tailoring": "tailoring and garment alteration",
    "teaching": "teaching and learner support",
    "software": "software and digital support",
    "beauty": "beauty and personal care services",
    "general_trades": "hands-on technical trade work",
    "general_services": "service and support work",
}


ISCO_FAMILY_MAP = {
    "7421": "electronics_repair",
    "7231": "vehicle_repair",
    "7126": "plumbing",
    "5223": "retail_ops",
    "7531": "tailoring",
    "2330": "teaching",
    "2513": "software",
    "5141": "beauty",
}


MAJOR_GROUP_FAMILY_MAP = {
    "2": "teaching",
    "5": "general_services",
    "7": "general_trades",
}


OPPORTUNITY_TEMPLATES = [
    {
        "title": "SME field service technician",
        "type": "formal_employment",
        "families": {"electronics_repair", "general_trades"},
        "keywords": {"repair", "diagnose", "troubleshoot", "device", "equipment", "field"},
        "fit_summary": "Builds on troubleshooting, on-site diagnosis, and practical repair work.",
        "why_now": "Small firms still prefer repair and field support long before replacing equipment entirely.",
        "resource": "Cisco Networking Academy - IT Essentials",
    },
    {
        "title": "Remote device support freelancer",
        "type": "freelance_remote",
        "families": {"electronics_repair", "software"},
        "keywords": {"support", "phone", "laptop", "troubleshoot", "customer", "setup"},
        "fit_summary": "Turns practical troubleshooting into paid remote setup, diagnosis, and user guidance.",
        "why_now": "Remote support can be sold more easily than full physical repair when clients are distributed.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Solar backup systems assistant",
        "type": "training_pathways",
        "families": {"electronics_repair", "general_trades"},
        "keywords": {"install", "wiring", "diagnose", "maintenance", "equipment"},
        "fit_summary": "Fits hands-on workers already comfortable with tools, installations, and diagnosis.",
        "why_now": "Power resilience products continue to create service demand across homes and SMEs.",
        "resource": "GOGLA training modules",
    },
    {
        "title": "Fleet maintenance assistant",
        "type": "formal_employment",
        "families": {"vehicle_repair"},
        "keywords": {"vehicle", "engine", "garage", "maintenance", "parts"},
        "fit_summary": "Uses repair routines, parts handling, and preventive maintenance habits.",
        "why_now": "Delivery, transport, and service fleets still need practical maintenance support.",
        "resource": "Alison technical courses",
    },
    {
        "title": "Motorbike and generator service micro-business",
        "type": "self-employment",
        "families": {"vehicle_repair", "general_trades"},
        "keywords": {"repair", "engine", "generator", "parts", "diagnose"},
        "fit_summary": "Extends existing diagnostics and repair into high-frequency local service work.",
        "why_now": "Small engines and backup power equipment create recurring neighborhood demand.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Workshop operations and parts coordinator",
        "type": "formal_employment",
        "families": {"vehicle_repair", "retail_ops"},
        "keywords": {"inventory", "sales", "parts", "customers", "workshop"},
        "fit_summary": "Good fit for workers who already combine technical jobs with customers and spare parts handling.",
        "why_now": "Even small workshops need faster turnaround and better parts flow.",
        "resource": "CFI financial literacy resources",
    },
    {
        "title": "Water pump installation assistant",
        "type": "formal_employment",
        "families": {"plumbing", "general_trades"},
        "keywords": {"water", "pump", "pipe", "leak", "install", "drain"},
        "fit_summary": "Builds on pipe fitting, leak diagnosis, and household installation work.",
        "why_now": "Homes, shops, and small buildings still rely on pump systems and urgent water fixes.",
        "resource": "Alison technical courses",
    },
    {
        "title": "Building maintenance plumbing technician",
        "type": "formal_employment",
        "families": {"plumbing", "general_trades"},
        "keywords": {"maintenance", "bathroom", "fitting", "pipe", "repair", "site"},
        "fit_summary": "Turns one-off repair calls into repeat maintenance work across facilities.",
        "why_now": "Schools, clinics, and commercial spaces need fast response for drainage and fitting problems.",
        "resource": "Alison technical courses",
    },
    {
        "title": "Independent sanitation and fixtures service",
        "type": "self-employment",
        "families": {"plumbing"},
        "keywords": {"tap", "toilet", "sink", "bathroom", "fixture", "water"},
        "fit_summary": "Fits workers already doing tap replacement, bathroom fitting, and emergency water call-outs.",
        "why_now": "People usually repair water and sanitation systems before replacing them completely.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Digital catalog and order assistant",
        "type": "self-employment",
        "families": {"retail_ops", "general_services"},
        "keywords": {"sales", "customer", "stock", "shop", "orders", "products"},
        "fit_summary": "Builds on product knowledge, customer advice, and stock awareness.",
        "why_now": "Small merchants increasingly need help moving from in-person sales to messaging and marketplace orders.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Merchant support agent",
        "type": "formal_employment",
        "families": {"retail_ops", "general_services"},
        "keywords": {"customers", "sales", "transactions", "support", "service"},
        "fit_summary": "Fits workers who already explain products, solve customer problems, and handle transactions.",
        "why_now": "Commerce systems keep adding user-support work around the core sale.",
        "resource": "CFI financial literacy resources",
    },
    {
        "title": "Inventory and sales records assistant",
        "type": "formal_employment",
        "families": {"retail_ops", "general_services"},
        "keywords": {"inventory", "stock", "records", "sales", "cash"},
        "fit_summary": "A practical step for workers already balancing stock checks, customer flow, and cash handling.",
        "why_now": "Even informal businesses increasingly need cleaner records to keep margins visible.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Alterations and finishing specialist",
        "type": "self-employment",
        "families": {"tailoring"},
        "keywords": {"tailor", "sew", "garment", "alteration", "fit"},
        "fit_summary": "Builds directly on client fitting, precision work, and garment repair.",
        "why_now": "Alteration work remains resilient because it depends on fit, trust, and quick turnaround.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Garment quality-check assistant",
        "type": "formal_employment",
        "families": {"tailoring"},
        "keywords": {"garment", "quality", "finishing", "measure", "pattern"},
        "fit_summary": "Good fit for workers who already notice detail and maintain consistent finishing standards.",
        "why_now": "Small and medium garment operations still need hands-on quality control.",
        "resource": "Alison technical courses",
    },
    {
        "title": "Online custom orders seller",
        "type": "self-employment",
        "families": {"tailoring", "retail_ops"},
        "keywords": {"customers", "orders", "fabric", "tailor", "style"},
        "fit_summary": "Combines tailoring with direct client communication and simple digital sales.",
        "why_now": "Custom and made-to-fit work is easier to market through messaging and social channels.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "After-school learning facilitator",
        "type": "formal_employment",
        "families": {"teaching"},
        "keywords": {"teach", "lesson", "students", "class", "learning"},
        "fit_summary": "Builds on instruction, learner support, and communication with families or communities.",
        "why_now": "Supplementary learning remains common where classroom time and outcomes are uneven.",
        "resource": "Coursera - Digital Skills: User Experience (audit mode)",
    },
    {
        "title": "Digital literacy tutor",
        "type": "self-employment",
        "families": {"teaching", "software"},
        "keywords": {"teach", "digital", "phone", "support", "learners"},
        "fit_summary": "Uses teaching skills to support first-time users of phones, forms, and online tools.",
        "why_now": "Basic digital confidence is increasingly useful even outside formal education.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Learning-content support assistant",
        "type": "formal_employment",
        "families": {"teaching", "general_services"},
        "keywords": {"prepare", "lesson", "content", "students", "support"},
        "fit_summary": "Fits people who already prepare lessons, guide learners, and adapt materials.",
        "why_now": "Education programs need practical support beyond classroom teaching alone.",
        "resource": "Cisco Networking Academy - IT Essentials",
    },
    {
        "title": "Quality assurance support",
        "type": "freelance_remote",
        "families": {"software"},
        "keywords": {"software", "test", "bug", "debug", "quality"},
        "fit_summary": "Builds on structured testing, debugging logic, and software documentation habits.",
        "why_now": "Testing and implementation support can be easier entry points than full product development.",
        "resource": "Google Career Certificates - digital support resources",
    },
    {
        "title": "Website support and maintenance assistant",
        "type": "freelance_remote",
        "families": {"software"},
        "keywords": {"website", "frontend", "backend", "software", "maintenance"},
        "fit_summary": "Fits developers already handling small fixes, content changes, and bug resolution.",
        "why_now": "SMEs often need maintenance help more often than full custom builds.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Junior IT support specialist",
        "type": "formal_employment",
        "families": {"software", "electronics_repair"},
        "keywords": {"support", "setup", "users", "systems", "device"},
        "fit_summary": "A bridge role for people whose digital skills overlap with troubleshooting and user support.",
        "why_now": "Operational digital support still grows faster than advanced product engineering in many contexts.",
        "resource": "Cisco Networking Academy - IT Essentials",
    },
    {
        "title": "Home-service beauty provider",
        "type": "self-employment",
        "families": {"beauty"},
        "keywords": {"hair", "beauty", "salon", "clients", "style"},
        "fit_summary": "Builds on trust, repeat clients, and practical service delivery.",
        "why_now": "Home-based and event-based service remains a realistic path where salon access is uneven.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Salon operations assistant",
        "type": "formal_employment",
        "families": {"beauty", "general_services"},
        "keywords": {"appointments", "clients", "beauty", "service", "salon"},
        "fit_summary": "Fits workers who already juggle appointments, hygiene, and customer care.",
        "why_now": "Small salons often need reliable people who can combine service work with day-to-day operations.",
        "resource": "CFI financial literacy resources",
    },
    {
        "title": "Beauty product advisor and reseller",
        "type": "self-employment",
        "families": {"beauty", "retail_ops"},
        "keywords": {"beauty", "sales", "products", "customers", "style"},
        "fit_summary": "Uses customer trust and styling judgement in a more product-focused path.",
        "why_now": "Product recommendation often travels naturally alongside existing service relationships.",
        "resource": "Google Digital Garage",
    },
    {
        "title": "Building maintenance assistant",
        "type": "formal_employment",
        "families": {"general_trades"},
        "keywords": {"repair", "install", "tools", "site", "maintenance"},
        "fit_summary": "A practical bridge for hands-on workers who already repair, install, or inspect physical systems.",
        "why_now": "Facilities still need multi-skilled workers for recurring maintenance problems.",
        "resource": "Alison technical courses",
    },
    {
        "title": "Customer support and records assistant",
        "type": "formal_employment",
        "families": {"general_services"},
        "keywords": {"customers", "support", "records", "service", "coordination"},
        "fit_summary": "Fits workers whose experience already mixes people-facing service with practical coordination.",
        "why_now": "Small businesses increasingly need help keeping service interactions and records consistent.",
        "resource": "Google Digital Garage",
    },
]


def resolve_opportunity_family(isco_unit_code: Optional[str]) -> tuple[str, Optional[str]]:
    code = str(isco_unit_code or "").strip()
    if not code:
        return "general_services", None

    unit = get_isco_unit(code)
    family = ISCO_FAMILY_MAP.get(code)
    if family:
        return family, unit["label"] if unit else None

    family = MAJOR_GROUP_FAMILY_MAP.get(code[:1], "general_services")
    return family, unit["label"] if unit else None


def score_template(template: dict, family: str, profile_text: str, country_config: dict, country_code: str) -> int:
    score = 0
    if family in template["families"]:
        score += 5
    if template["type"] in country_config["opportunity_types"]:
        score += 3
    if country_code == "PAK" and template["type"] == "freelance_remote":
        score += 2
    if country_code == "KEN" and template["type"] in {"gig", "digital_freelance"}:
        score += 1
    if country_code == "BGD" and template["type"] in {"formal_employment", "training_pathways"}:
        score += 1
    keyword_hits = sum(keyword in profile_text for keyword in template["keywords"])
    score += keyword_hits * 2
    return score


def pick_opportunities(country_code: str, country_config: dict, family: str, occupation_label: Optional[str], profile_text: str):
    ranked = []
    for template in OPPORTUNITY_TEMPLATES:
        score = score_template(template, family, profile_text, country_config, country_code)
        if score <= 0:
            continue
        ranked.append((score, template["title"], template))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    selected = []
    used_titles = set()
    for score, _, template in ranked:
        if template["title"] in used_titles:
            continue
        used_titles.add(template["title"])
        selected.append(
            {
                "title": template["title"],
                "type": template["type"],
                "fit_summary": template["fit_summary"],
                "why_now": template["why_now"],
                "resource": template["resource"],
                "illustrative": True,
                "match_score": score,
            }
        )
        if len(selected) == 3:
            break

    if not selected:
        fallback_family = "general_trades" if family in {"electronics_repair", "vehicle_repair", "plumbing"} else "general_services"
        return pick_opportunities(country_code, country_config, fallback_family, occupation_label, occupation_label.lower() if occupation_label else "")

    return selected


@router.get("/opportunities")
async def get_opportunities(
    country_code: str = Query(..., min_length=3, max_length=3),
    isco_unit_code: Optional[str] = Query(default=None),
    profile_label: Optional[str] = Query(default=None),
    profile_text: Optional[str] = Query(default=None),
):
    country_code = country_code.upper()
    country_config = get_country_config(country_code)
    if not country_config:
        raise HTTPException(status_code=400, detail="Unsupported country code")

    family, occupation_label = resolve_opportunity_family(isco_unit_code)
    econdata = await get_country_econdata(country_code)
    combined_profile_text = " ".join(
        part for part in [profile_label or "", occupation_label or "", profile_text or ""] if part
    ).strip().lower()
    opportunities = pick_opportunities(country_code, country_config, family, occupation_label, combined_profile_text)

    return {
        "country": country_config["name"],
        "country_code": country_code,
        "isco_unit_code": isco_unit_code,
        "matched_profile_family": FAMILY_META[family],
        "matched_occupation_label": occupation_label,
        "match_basis": "Mapped occupation + extracted profile skills + configured country opportunity types",
        "note": (
            "These adjacent paths are illustrative and ranked from the mapped occupation, extracted skills, "
            "and country opportunity types. They are not live vacancies."
        ),
        "opportunities": opportunities,
        "market_signals": econdata["signals"],
        "data_freshness": econdata["data_freshness"],
        "fetched_at": econdata["fetched_at"],
    }
