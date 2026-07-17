import os
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .routers import (
    content_router,
    articles_router,
    stories_router,
    risks_router,
    faq_router,
    search_router
)
from .config import config

app = FastAPI(
    title="Risk Analyzer API",
    version=config.VERSION,
    description="API для анализа рисков при покупке недвижимости"
)

# вот тут разрешить только с нашего
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(content_router, prefix=config.API_PREFIX)
app.include_router(articles_router, prefix=config.API_PREFIX)
app.include_router(stories_router, prefix=config.API_PREFIX)
app.include_router(risks_router, prefix=config.API_PREFIX)
app.include_router(faq_router, prefix=config.API_PREFIX)
app.include_router(search_router, prefix=config.API_PREFIX)

@app.get("/")
def root():
    return {"service": "Risk Analyzer API", "version": config.VERSION, "status": "running"}

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "pong"}

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )