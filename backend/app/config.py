# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://znnrxmmbfgsabaacxggb.supabase.co")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_3GJlFjIDSmF3QzZwrWeYrw_DB4rQn6y")
    # Разрешаем все источники для разработки
    ALLOWED_ORIGINS = ["*"]  # или os.getenv("ALLOWED_ORIGINS", "*").split(",")
    API_PREFIX = "/api"
    VERSION = "1.0.0"

config = Config()