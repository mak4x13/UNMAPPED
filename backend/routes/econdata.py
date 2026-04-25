from fastapi import APIRouter, HTTPException

from services.econdata_service import get_country_econdata


router = APIRouter(tags=["econdata"])


@router.get("/econdata/{country_code}")
async def fetch_econdata(country_code: str):
    try:
        return await get_country_econdata(country_code)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
