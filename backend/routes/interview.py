from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.data_store import get_country_config
from services.groq_service import generate_interview_questions


router = APIRouter(tags=["interview"])


class InterviewRequest(BaseModel):
    country_code: str = Field(..., min_length=3, max_length=3)
    education_level: str
    years_experience: int = Field(..., ge=0, le=60)
    informal_description: str = Field(..., min_length=10, max_length=2000)
    languages: list[str] = Field(default_factory=list)
    age: int = Field(..., ge=15, le=99)
    ui_locale: str = Field(default="en", min_length=2, max_length=24)
    ui_language_label: str = Field(default="English", min_length=2, max_length=64)


@router.post("/interview")
async def create_interview(payload: InterviewRequest):
    country_config = get_country_config(payload.country_code)
    if not country_config:
        raise HTTPException(status_code=400, detail="Unsupported country code")

    return await generate_interview_questions(payload.model_dump(), country_config)
