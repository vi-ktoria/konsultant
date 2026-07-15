from fastapi import APIRouter
from ..models import RiskRequest, RiskResponse

router = APIRouter(prefix="/risks", tags=["risks"])

@router.post("/calculate", response_model=list[RiskResponse])
def calculate_risks(data: RiskRequest):
    risks = []
    
    if data.years_owned < 1:
        risks.append({
            "level": "critical",
            "text": "Продавец владеет объектом менее 1 года",
            "recommendation": "Высокий риск мошеннической сделки. Проверьте продавца через открытые реестры."
        })
    elif data.years_owned < 3:
        risks.append({
            "level": "high",
            "text": "Продавец владеет объектом менее 3 лет",
            "recommendation": "Запросите документы, подтверждающие основание приобретения права собственности."
        })
    
    if data.has_maternity_capital:
        risks.append({
            "level": "critical",
            "text": "В сделке используется материнский капитал",
            "recommendation": "Проверьте, выделены ли доли детям. Запросите нотариально заверенное обязательство."
        })
    
    if data.has_encumbrances:
        risks.append({
            "level": "critical",
            "text": "На объекте есть обременения",
            "recommendation": "Запросите выписку из ЕГРН. Убедитесь, что все обременения будут сняты до сделки."
        })
    
    if data.is_shared_ownership:
        risks.append({
            "level": "high",
            "text": "Объект находится в долевой собственности",
            "recommendation": "Проверьте, соблюдено ли право преимущественной покупки у других собственников."
        })
    
    return risks