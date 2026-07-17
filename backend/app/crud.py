from .database import supabase

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
    """Поиск с ранжированием через RPC функцию Supabase"""
    clean_query = query.strip()
    
    if len(clean_query) < 2:
        return []
    
    # Вызываем RPC функцию search_with_rank
    result = supabase.rpc('search_with_rank', {
        'search_query': clean_query,
        'limit_count': limit
    }).execute()
    
    data = result.data or []
    
    # Если указан тип контента — фильтруем
    if content_type:
        data = [item for item in data if item.get('type') == content_type]
    
    return data