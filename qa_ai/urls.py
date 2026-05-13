from django.urls import path
from .views import GenerateTestCaseView

urlpatterns = [
    path('generate/<int:defect_id>/', GenerateTestCaseView.as_view(), name='generate_test_case'),
]