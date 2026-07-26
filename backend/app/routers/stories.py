from fastapi import APIRouter, HTTPException, Query
from ..crud import get_all_content_cached, get_content_by_slug_cached
from ..models import ContentItem

router = APIRouter(prefix="/stories", tags=["stories"])

@router.get("/", response_model=list[ContentItem])
def get_stories(
    limit: int = Query(50, ge=1, le=100)
):
    """Получить все истории (кэшируется)"""
    return get_all_content_cached(limit, "story")

@router.get("/{slug}", response_model=ContentItem)
def get_story_by_slug(slug: str):
    """Получить историю по slug (кэшируется)"""
    item = get_content_by_slug_cached(slug)
    if not item:
        raise HTTPException(status_code=404, detail="История не найдена")
    return item