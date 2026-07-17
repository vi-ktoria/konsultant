from fastapi import APIRouter, Query
from ..crud import search_content
from ..models import SearchResult

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/", response_model=list[SearchResult])
def search(
    q: str = Query(..., min_length=2, description="Поисковый запрос"),
    limit: int = Query(20, ge=1, le=100, description="Количество результатов"),
    type: str = Query(None, description="Фильтр по типу: article, risk, story, faq, template")
):
    """
    Полнотекстовый поиск с ранжированием по релевантности.
    
    - Заголовок имеет наибольший вес (A)
    - Краткое описание имеет меньший вес (B)
    - Результаты сортируются по релевантности (от высокого к низкому)
    """
    results = search_content(q, limit, type)
    return results