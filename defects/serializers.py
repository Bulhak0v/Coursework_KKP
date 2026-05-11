from rest_framework import serializers
from .models import Defect, DefectHistory

class DefectHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.ReadOnlyField(source='changed_by.username')

    class Meta:
        model = DefectHistory
        fields = '__all__'


class DefectSerializer(serializers.ModelSerializer):
    reporter_username = serializers.ReadOnlyField(source='reporter.username')
    assignee_username = serializers.ReadOnlyField(source='assignee.username')
    module_name = serializers.ReadOnlyField(source='module.name')

    class Meta:
        model = Defect
        fields = '__all__'
        read_only_fields = ('reporter', 'calculated_risk', 'reopen_count', 'resolved_at')