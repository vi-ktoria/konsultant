from supabase import create_client, Client
from .config import config

supabase: Client = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
)

def get_supabase() -> Client:
    return supabase