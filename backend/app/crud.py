from functools import lru_cache
from .database import supabase
from .models import ContentItemBase

def get_all_content(limit: int = 100, content_type: str = None):
    query = supabase.table("content_items")\
        .select("id, type, slug, title, short_description, content, category, contents, tags, created_at")\
        .eq("is_published", True)\
        .order("id", desc=True)
    
    if content_type:
        query = query.eq("type", content_type)
    
    result = query.limit(limit).execute()
    return result.data

@lru_cache(maxsize=100)
def get_all_content_cached(limit: int = 100, content_type: str = None):
    return get_all_content(limit, content_type)

def get_content_by_slug(slug: str):
    result = supabase.table("content_items")\
        .select("id, type, slug, title, short_description, content, category, contents, tags, created_at")\
        .eq("slug", slug)\
        .eq("is_published", True)\
        .execute()
    return result.data[0] if result.data else None

@lru_cache(maxsize=100)
def get_content_by_slug_cached(slug: str):
    return get_content_by_slug(slug)

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

@lru_cache(maxsize=100)
def search_content_cached(query: str, limit: int = 20, content_type: str = None):
    return search_content(query, limit, content_type)

# ===== Поиск с ранжированием =====
def search_content_with_rank(query: str, limit: int = 20, content_type: str = None):
    """
    Поиск с использованием RPC-функции search_with_rank в Supabase.
    Возвращает результаты с полем relevance.
    """
    clean_query = query.strip()
    
    if len(clean_query) < 2:
        return []
    
    try:
        result = supabase.rpc('search_with_rank', {
            'search_query': clean_query,
            'limit_count': limit
        }).execute()
        
        data = result.data or []
        
        if content_type:
            data = [item for item in data if item.get('type') == content_type]
        
        return data
    except Exception as e:
        print(f"Ошибка поиска с ранжированием: {e}")
        return search_content(query, limit, content_type)

@lru_cache(maxsize=100)
def search_content_with_rank_cached(query: str, limit: int = 20, content_type: str = None):
    return search_content_with_rank(query, limit, content_type)