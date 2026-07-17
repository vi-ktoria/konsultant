from fastapi import APIRouter, HTTPException, Query
from ..crud import get_all_content, get_content_by_slug
from ..models import ContentItem

router = APIRouter(prefix="/faq", tags=["faq"])

@router.get("/", response_model=list[ContentItem])
def get_faq(
    limit: int = Query(50, ge=1, le=100)
):
    """Получить все FAQ"""
    return get_all_content(limit, "faq")