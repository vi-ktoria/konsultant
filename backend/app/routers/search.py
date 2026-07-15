from fastapi import APIRouter, Query
from ..crud import search_content
from ..models import SearchResult

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/", response_model=list[SearchResult])
def search(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    type: str = Query(None)
):
    return search_content(q, limit, type)