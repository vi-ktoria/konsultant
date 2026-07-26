from fastapi import APIRouter, HTTPException, Query
from ..crud import get_all_content_cached, get_content_by_slug_cached
from ..models import ContentItem

router = APIRouter(prefix="/content", tags=["content"])

@router.get("/", response_model=list[ContentItem])
def get_content(
    limit: int = Query(100, ge=1, le=500),
    type: str = Query(None, description="Фильтр по типу: story, article, template")
):
    """Получить все опубликованные материалы (кэшируется)"""
    return get_all_content_cached(limit, type)

@router.get("/{slug}", response_model=ContentItem)
def get_content_by_slug_route(slug: str):
    """Получить материал по slug (кэшируется)"""
    item = get_content_by_slug_cached(slug)
    if not item:
        raise HTTPException(status_code=404, detail="Материал не найден")
    return item