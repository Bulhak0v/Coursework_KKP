# qa_ai/services.py
import json
import google.generativeai as genai
from django.conf import settings
from defects.models import Defect
from .models import AITestCase


def generate_and_save_test_case(defect_id: int, user) -> AITestCase:
    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        print("CRITICAL ERROR: GEMINI_API_KEY is not set in settings.py or .env file!")
        raise ValueError("API Key for AI is missing.")

    genai.configure(api_key=api_key)

    try:
        defect = Defect.objects.select_related('module').get(id=defect_id)
    except Defect.DoesNotExist:
        raise ValueError("Defect not found.")

    if hasattr(defect, 'ai_test_case'):
        return defect.ai_test_case

    prompt = f"""
    You are a Senior QA Engineer. Generate a basic regression test case 
    based on this bug report.

    Defect Title: {defect.title}
    Module: {defect.module.name}
    Steps to Reproduce: {defect.steps_to_reproduce}

    Return the result STRICTLY as a valid JSON object without any Markdown formatting (no ```json). 
    Use exactly this structure:
    {{
        "test_case_title": "string",
        "preconditions": "string",
        "steps_to_test": ["step 1", "step 2"],
        "expected_result": "string",
        "regression_recommendations": "string"
    }}
    """

    try:
        print("--- Sending prompt to Gemini... ---")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)

        print("--- Gemini Raw Response ---")
        print(response.text)
        print("---------------------------")

        raw_text = response.text.strip()

        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]

        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        raw_text = raw_text.strip()

        json_data = json.loads(raw_text)

    except Exception as e:
        print(f"--- ERROR IN GEMINI PROCESSING: {str(e)} ---")
        json_data = {
            "test_case_title": "AI Generation Failed",
            "preconditions": "N/A",
            "steps_to_test": [f"Error details: {str(e)}"],
            "expected_result": "N/A",
            "regression_recommendations": "Check backend server logs."
        }

    test_case = AITestCase.objects.create(
        defect=defect,
        generated_by=user,
        generated_content=json_data
    )

    return test_case