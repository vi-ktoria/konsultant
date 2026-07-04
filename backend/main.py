from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"DB connection error: {e}")
        return None

@app.on_event("startup")
def create_table():
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
        print("Table 'pings' is ready")
    else:
        print("Could not connect to DB at startup")

class PingRequest(BaseModel):
    message: str
    name: str

@app.get("/")
def root():
    return {"service": "Risk Analyzer API", "status": "running"}

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "pong"}

@app.post("/ping")
def ping_post(data: PingRequest):
    conn = get_db_connection()
    saved = False
    db_status = "disconnected"

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
            db_status = "connected"
        except Exception as e:
            print(f"DB error: {e}")
            db_status = f"error: {str(e)}"
        finally:
            conn.close()

    return {
        "status": "ok",
        "message": f"Hello, {data.name}! Your message: '{data.message}'",
        "timestamp": datetime.now().isoformat(),
        "db_status": db_status + (" (saved)" if saved else " (not saved)")
    }