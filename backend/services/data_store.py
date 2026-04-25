import json
from functools import lru_cache
from pathlib import Path
from statistics import mean


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(filename: str):
    with (DATA_DIR / filename).open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_country_configs():
    return _load_json("country_configs.json")


@lru_cache(maxsize=1)
def load_taxonomy():
    return _load_json("isco08_taxonomy.json")


@lru_cache(maxsize=1)
def load_esco_skills():
    return _load_json("esco_skills.json")


@lru_cache(maxsize=1)
def load_frey_osborne():
    return _load_json("frey_osborne.json")


def get_country_config(country_code: str):
    configs = load_country_configs()
    return configs.get(country_code.upper())


def education_level_to_credential(level: str) -> str:
    mapping = {
        "primary": "Primary School Certificate",
        "secondary": "Secondary School Certificate",
        "technical": "Technical or Vocational Certificate",
        "vocational": "Technical or Vocational Certificate",
        "diploma": "Diploma",
        "tertiary": "Bachelor's Degree",
        "bachelor": "Bachelor's Degree",
        "master": "Master's Degree",
        "postgraduate": "Postgraduate Degree",
        "none": "No formal credential reported",
    }
    return mapping.get(level.lower().strip(), "Credential not specified")


@lru_cache(maxsize=1)
def unit_group_lookup():
    taxonomy = load_taxonomy()
    return {entry["code"]: entry for entry in taxonomy["unit_groups"]}


def get_isco_unit(unit_code: str):
    return unit_group_lookup().get(str(unit_code))


def get_major_group_label(code: str) -> str:
    taxonomy = load_taxonomy()
    major_groups = taxonomy["major_groups"]
    return major_groups.get(str(code), "Unknown")


@lru_cache(maxsize=1)
def frey_by_isco():
    return {entry["isco_unit_code"]: entry for entry in load_frey_osborne()["mappings"]}


@lru_cache(maxsize=1)
def frey_major_group_means():
    grouped = {}
    for entry in load_frey_osborne()["mappings"]:
        grouped.setdefault(entry["isco_unit_code"][0], []).append(entry["automation_probability"])
    return {group: round(mean(values), 2) for group, values in grouped.items()}


def lookup_automation_probability(isco_unit_code: str):
    mapping = frey_by_isco().get(str(isco_unit_code))
    if mapping:
        return {
            "raw_probability": round(float(mapping["automation_probability"]), 2),
            "mapping": mapping,
            "fallback_used": False,
        }

    fallback = frey_major_group_means().get(str(isco_unit_code)[0], 0.5)
    return {
        "raw_probability": round(float(fallback), 2),
        "mapping": None,
        "fallback_used": True,
    }
