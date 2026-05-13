from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import render
from .services import generate_and_save_test_case
from .models import AITestCase
from .serializers import AITestCaseSerializer


class GenerateTestCaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, defect_id):
        try:
            test_case = generate_and_save_test_case(defect_id, request.user)
            serializer = AITestCaseSerializer(test_case)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Помилка генерації AI: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, defect_id):
        try:
            test_case = AITestCase.objects.get(defect_id=defect_id)
            serializer = AITestCaseSerializer(test_case)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except AITestCase.DoesNotExist:
            return Response({"detail": "Тест-кейс для цього дефекту ще не згенеровано."}, status=status.HTTP_404_NOT_FOUND)
