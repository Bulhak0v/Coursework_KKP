from rest_framework import serializers
from .models import AITestCase

class AITestCaseSerializer(serializers.ModelSerializer):
    defect_title = serializers.ReadOnlyField(source='defect.title')
    generated_by_username = serializers.ReadOnlyField(source='generated_by.username')

    class Meta:
        model = AITestCase
        fields = ['id', 'defect', 'defect_title', 'generated_by_username', 'generated_content', 'created_at']