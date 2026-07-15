from fastapi import APIRouter, HTTPException, Query
from ..crud import get_all_content, get_content_by_slug
from ..models import ContentItem

router = APIRouter(prefix="/articles", tags=["articles"])

@router.get("/")
def get_articles(
    type: str = Query("article"),
    limit: int = Query(50, ge=1, le=100)
):
    return get_all_content(limit, type)

@router.get("/{slug}", response_model=ContentItem)
def get_article_by_slug(slug: str):
    """Получить статью по slug"""
    item = get_content_by_slug(slug)
    if not item:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    return item

@router.get("/search/", response_model=list[ContentItem])
def search_articles(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100)
):
    """Поиск по статьям"""
    from ..crud import search_content
    return search_content(q, limit, "article")