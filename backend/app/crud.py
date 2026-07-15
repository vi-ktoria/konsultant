from .database import supabase
from .models import ContentItemBase

def get_all_content(limit: int = 100, content_type: str = None):
    query = supabase.table("content_items")\
        .select("*")\
        .eq("is_published", True)\
        .order("id", desc=True)
    
    if content_type:
        query = query.eq("type", content_type)
    
    result = query.limit(limit).execute()
    return result.data

def get_content_by_slug(slug: str):
    result = supabase.table("content_items")\
        .select("*")\
        .eq("slug", slug)\
        .eq("is_published", True)\
        .execute()
    return result.data[0] if result.data else None

def search_content(query: str, limit: int = 20, content_type: str = None):
    clean_query = query.strip().replace(",", " ").replace("%", " ")
    
    if len(clean_query) < 2:
        return []
    
    q = supabase.table("content_items")\
        .select("id, type, slug, title, short_description, category, tags")\
        .eq("is_published", True)\
        .or_(
            f"title.ilike.%{clean_query}%,"
            f"short_description.ilike.%{clean_query}%,"
            f"tags.ilike.%{clean_query}%,"
            f"search_text.ilike.%{clean_query}%"
        )
    
    if content_type:
        q = q.eq("type", content_type)
    
    result = q.limit(limit).execute()
    return result.data