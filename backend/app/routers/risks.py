from fastapi import APIRouter, Query
from ..models import RiskRequest, RiskResponse, ContentItem
from ..crud import get_all_content_cached

router = APIRouter(prefix="/risks", tags=["risks"])

@router.get("/", response_model=list[ContentItem])
def get_risks(
    limit: int = Query(50, ge=1, le=100)
):
    """Получить все риски (кэшируется)"""
    return get_all_content_cached(limit, "risk")
