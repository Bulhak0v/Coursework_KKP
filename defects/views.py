from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Defect, DefectHistory
from .serializers import DefectSerializer, DefectHistorySerializer
from .services import calculate_defect_risk

class DefectViewSet(viewsets.ModelViewSet):
    queryset = Defect.objects.all().order_by('-created_at')
    serializer_class = DefectSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'severity', 'module', 'assignee']
    search_fields = ['title', 'steps_to_reproduce']
    ordering_fields = ['calculated_risk', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Defect.objects.all().order_by('-created_at')
        project_id = self.request.query_params.get('project')

        if project_id:
            qs = qs.filter(module__project_id=project_id)

        return qs

    def perform_create(self, serializer):
        defect = serializer.save(reporter=self.request.user)
        defect.calculated_risk = calculate_defect_risk(defect)
        defect.save(update_fields=['calculated_risk'])

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status

        updated_defect = serializer.save()
        new_status = updated_defect.status

        fields_to_update = []

        if old_status != new_status:
            DefectHistory.objects.create(
                defect=updated_defect,
                changed_by=self.request.user,
                old_status=old_status,
                new_status=new_status
            )

            if old_status in ['Resolved', 'Closed'] and new_status not in ['Resolved', 'Closed']:
                updated_defect.reopen_count += 1
                updated_defect.resolved_at = None
                fields_to_update.extend(['reopen_count', 'resolved_at'])

            elif new_status in ['Resolved', 'Closed'] and old_status not in ['Resolved', 'Closed']:
                updated_defect.resolved_at = timezone.now()
                fields_to_update.append('resolved_at')

            updated_defect.calculated_risk = calculate_defect_risk(updated_defect)
            fields_to_update.append('calculated_risk')

            if fields_to_update:
                updated_defect.save(update_fields=list(set(fields_to_update)))

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        defect = self.get_object()
        history = DefectHistory.objects.filter(defect=defect).order_by('-changed_at')
        serializer = DefectHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def recalculate_risk(self, request, pk=None):
        defect = self.get_object()
        defect.calculated_risk = calculate_defect_risk(defect)
        defect.save(update_fields=['calculated_risk'])
        return Response({"calculated_risk": defect.calculated_risk})