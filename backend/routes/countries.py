from fastapi import APIRouter

from services.data_store import list_country_summaries


router = APIRouter(tags=["countries"])


@router.get("/countries")
async def get_countries():
    return list_country_summaries()
