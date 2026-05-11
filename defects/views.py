from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Defect, DefectHistory
from .serializers import DefectSerializer, DefectHistorySerializer

class DefectViewSet(viewsets.ModelViewSet):
    queryset = Defect.objects.all().order_by('-created_at')
    serializer_class = DefectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status

        updated_defect = serializer.save()
        new_status = updated_defect.status

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
                updated_defect.save(update_fields=['reopen_count', 'resolved_at'])

            elif new_status in ['Resolved', 'Closed'] and old_status not in ['Resolved', 'Closed']:
                updated_defect.resolved_at = timezone.now()
                updated_defect.save(update_fields=['resolved_at'])


    # Додатковий ендпоінт: GET /api/defects/defects/{id}/history/
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        defect = self.get_object()
        history = DefectHistory.objects.filter(defect=defect).order_by('-changed_at')
        serializer = DefectHistorySerializer(history, many=True)
        return Response(serializer.data)