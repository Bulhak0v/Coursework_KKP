import json
import google.generativeai as genai
from django.conf import settings
from defects.models import Defect
from .models import AITestCase

genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_and_save_test_case(defect_id: int, user) -> AITestCase:
    try:
        defect = Defect.objects.select_related('module').get(id=defect_id)
    except Defect.DoesNotExist:
        raise ValueError("Дефект не знайдено.")

    if hasattr(defect, 'ai_test_case'):
        return defect.ai_test_case

    prompt = f"""
    Ти є Senior QA Інженером. Згенеруйте базовий регресійний тест-кейс 
    на основі наступного баг-репорту.

    Деталь інформації про дефект:
    - Назва: {defect.title}
    - Модуль системи: {defect.module.name}
    - Кроки відтворення: {defect.steps_to_reproduce}

    Поверніть результат ВИКЛЮЧНО у форматі валідного JSON без жодного додаткового тексту чи маркдауну. 
    Структура JSON має бути такою:
    {{
        "test_case_title": "string",
        "preconditions": "string",
        "steps_to_test": ["step 1", "step 2"],
        "expected_result": "string",
        "regression_recommendations": "string (які ще модулі варто перевірити)"
    }}
    """

    model = genai.GenerativeModel('gemini-1.5-flash')

    response = model.generate_content(prompt)
    raw_text = response.text.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    try:
        json_data = json.loads(raw_text)
    except json.JSONDecodeError:
        json_data = {"raw_response": raw_text, "error": "Не вдалося розпарсити JSON"}

    test_case = AITestCase.objects.create(
        defect=defect,
        generated_by=user,
        generated_content=json_data
    )

    return test_case