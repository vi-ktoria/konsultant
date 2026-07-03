from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from datetime import datetime

app = FastAPI()

# Разрешаем запросы с любых доменов (для теста)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Схема для запроса
class PingRequest(BaseModel):
    message: str
    name: str

# Схема для ответа
class PingResponse(BaseModel):
    status: str
    message: str
    timestamp: str
    db_status: str

# Получаем URL базы данных из переменных окружения
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Подключение к PostgreSQL"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"DB connection error: {e}")
        return None

@app.on_event("startup")
def create_table():
    """При старте создаем таблицу, если её нет"""
    conn = get_db_connection()
    if conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pings (
                id SERIAL PRIMARY KEY,
                name TEXT,
                message TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Table 'pings' is ready")
    else:
        print("⚠️ Could not connect to DB at startup")

@app.get("/")
def root():
    return {"service": "Risk Analyzer API", "status": "running"}

@app.get("/ping")
def ping():
    """Простой ping без БД"""
    return {"status": "ok", "message": "pong"}

@app.post("/ping", response_model=PingResponse)
def ping_post(data: PingRequest):
    """
    Принимает {name, message}, сохраняет в БД, возвращает ответ
    """
    conn = get_db_connection()
    db_status = "connected"
    saved = False
    
    if conn:
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO pings (name, message) VALUES (%s, %s)",
                (data.name, data.message)
            )
            conn.commit()
            cur.close()
            saved = True
        except Exception as e:
            print(f"DB error: {e}")
            db_status = f"error: {str(e)}"
        finally:
            conn.close()
    else:
        db_status = "disconnected"
    
    return PingResponse(
        status="ok",
        message=f"Hello, {data.name}! Your message: '{data.message}'",
        timestamp=datetime.now().isoformat(),
        db_status=db_status + (" (saved)" if saved else " (not saved)")
    )

@app.get("/history")
def get_history():
    """Возвращает все сохраненные записи (для проверки БД)"""
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "DB not available"}
    
    cur = conn.cursor()
    cur.execute("SELECT id, name, message, timestamp FROM pings ORDER BY id DESC LIMIT 20")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        "status": "ok",
        "data": [
            {"id": r[0], "name": r[1], "message": r[2], "timestamp": r[3].isoformat()}
            for r in rows
        ]
    }