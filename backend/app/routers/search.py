from fastapi import APIRouter, Query
from ..crud import search_content_with_rank_cached
from ..models import SearchResult

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/", response_model=list[SearchResult])
def search(
    q: str = Query(..., min_length=2, description="Поисковый запрос"),
    limit: int = Query(20, ge=1, le=100),
    type: str = Query(None, description="Фильтр по типу")
):
    """Поиск по материалам (кэшируется)"""
    return search_content_with_rank_cached(q, limit, type)