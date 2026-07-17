from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime

class ContentItemBase(BaseModel):
    type: str
    slug: str
    title: str
    short_description: Optional[str] = None
    content: Optional[str] = None
    contents: Optional[List[dict]] = None
    category: Optional[str] = None
    tags: Optional[Union[str, List[str]]] = None
    image_url: Optional[str] = None
    is_published: bool = True

class ContentItem(ContentItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    id: int
    type: str
    slug: str
    title: str
    short_description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    relevance: float  # ← добавили поле релевантности

class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    content_type: Optional[str] = None

class RiskRequest(BaseModel):
    years_owned: int
    has_maternity_capital: bool = False
    has_encumbrances: bool = False
    is_shared_ownership: bool = False

class RiskResponse(BaseModel):
    level: str
    text: str
    recommendation: str