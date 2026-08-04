from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from ..database import supabase

router = APIRouter(prefix="/templates", tags=["templates"])

class TemplateResponse(BaseModel):
    id: int
    slug: str
    title: str
    short_description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    preview_image_url: Optional[str] = None
    sort_order: Optional[int] = None
    download_file_url: Optional[str] = None
    download_filename: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=list[TemplateResponse])
def get_templates(
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = Query(None)
):
    query = supabase.table("document_templates")\
        .select("id, slug, title, short_description, category, tags, preview_image_url, sort_order, download_file_url, download_filename")\
        .eq("is_published", True)\
        .order("sort_order", desc=False)
    
    if category:
        query = query.eq("category", category)
    
    result = query.limit(limit).execute()
    return result.data

@router.get("/{slug}", response_model=TemplateResponse)
def get_template_by_slug(slug: str):
    result = supabase.table("document_templates")\
        .select("id, slug, title, short_description, category, tags, preview_image_url, sort_order, download_file_url, download_filename")\
        .eq("slug", slug)\
        .eq("is_published", True)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    
    return result.data[0]