from fastapi import APIRouter, HTTPException, Query
from ..crud import get_all_content, get_content_by_slug
from ..models import ContentItem, RiskRequest, RiskResponse

router = APIRouter(prefix="/risks", tags=["risks"])

@router.get("/", response_model=list[ContentItem])
def get_risks(
    limit: int = Query(50, ge=1, le=100)
):
    """Получить все риски"""
    return get_all_content(limit, "risk")

@router.get("/{slug}", response_model=ContentItem)
def get_risk_by_slug(slug: str):
    """Получить риск по slug"""
    item = get_content_by_slug(slug)
    if not item:
        raise HTTPException(status_code=404, detail="Риск не найден")
    return item

@router.post("/calculate", response_model=list[RiskResponse])
def calculate_risks(data: RiskRequest):
    """Расчёт рисков при покупке недвижимости"""
    risks = []
    
    if data.years_owned < 1:
        risks.append({
            "level": "critical",
            "text": "Продавец владеет объектом менее 1 года",
            "recommendation": "Высокий риск мошеннической сделки."
        })
    elif data.years_owned < 3:
        risks.append({
            "level": "high",
            "text": "Продавец владеет объектом менее 3 лет",
            "recommendation": "Запросите документы, подтверждающие право собственности."
        })
    
    if data.has_maternity_capital:
        risks.append({
            "level": "critical",
            "text": "В сделке используется материнский капитал",
            "recommendation": "Проверьте, выделены ли доли детям."
        })
    
    if data.has_encumbrances:
        risks.append({
            "level": "critical",
            "text": "На объекте есть обременения",
            "recommendation": "Запросите выписку из ЕГРН."
        })
    
    return risks