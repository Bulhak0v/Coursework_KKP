from django.db import models
from defects.models import Defect
from django.conf import settings


class AITestCase(models.Model):
    defect = models.OneToOneField(
        Defect,
        on_delete=models.CASCADE,
        related_name='ai_test_case'
    )

    generated_content = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"AI Test Case for Defect #{self.defect.id}"