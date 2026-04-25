from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.data_store import (
    education_level_to_credential,
    get_country_config,
    load_esco_skills,
)
from services.groq_service import generate_profile_mapping


router = APIRouter(tags=["profile"])


class ProfileRequest(BaseModel):
    country_code: str = Field(..., min_length=3, max_length=3)
    education_level: str
    years_experience: int = Field(..., ge=0, le=60)
    informal_description: str = Field(..., min_length=10, max_length=2000)
    languages: list[str] = Field(default_factory=list)
    age: int = Field(..., ge=15, le=99)
    ui_locale: str = Field(default="en", min_length=2, max_length=24)
    ui_language_label: str = Field(default="English", min_length=2, max_length=64)
    follow_up_answers: list[dict] = Field(default_factory=list)


@router.post("/profile")
async def create_profile(payload: ProfileRequest):
    country_config = get_country_config(payload.country_code)
    if not country_config:
        raise HTTPException(status_code=400, detail="Unsupported country code")

    result = await generate_profile_mapping(
        payload.model_dump(),
        country_config,
        load_esco_skills(),
    )
    result["education_credential"] = education_level_to_credential(payload.education_level)
    return result
