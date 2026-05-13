from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Q, Avg, F
from defects.models import Defect
from .models import Project, SoftwareModule, ModuleDependency
from .serializers import ProjectSerializer, SoftwareModuleSerializer, ModuleDependencySerializer
from .services import get_regression_scope, get_graph_data_for_visualization

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def graph_data(self, request, pk=None):
        project = self.get_object()
        data = get_graph_data_for_visualization(project.id)
        return Response(data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        project = self.get_object()
        modules = SoftwareModule.objects.filter(project=project).annotate(
            open_defects=Count('defects', filter=~Q(defects__status__in=['Resolved', 'Closed'])),
            critical_defects=Count('defects',
                                   filter=Q(defects__severity='Critical', defects__status__in=['New', 'In Progress'])),
            high_defects=Count('defects',
                               filter=Q(defects__severity='High', defects__status__in=['New', 'In Progress']))
        )

        modules_stats = []
        for mod in modules:
            stability = max(0.0, 100.0 - (mod.critical_defects * 20.0) - (mod.high_defects * 10.0))

            if mod.stability_index != stability:
                mod.stability_index = stability
                mod.save(update_fields=['stability_index'])

            modules_stats.append({
                "module_id": mod.id,
                "module_name": mod.name,
                "open_defects": mod.open_defects,
                "stability_index": stability
            })

        resolved_defects = Defect.objects.filter(module__project=project, resolved_at__isnull=False)
        mttr_result = resolved_defects.annotate(
            time_to_repair=F('resolved_at') - F('created_at')
        ).aggregate(avg_mttr=Avg('time_to_repair'))['avg_mttr']

        mttr_hours = (mttr_result.total_seconds() / 3600) if mttr_result else 0.0

        total_defects = Defect.objects.filter(module__project=project).count()
        reopened_defects = Defect.objects.filter(module__project=project, reopen_count__gt=0).count()
        reopen_rate = (reopened_defects / total_defects * 100) if total_defects > 0 else 0.0

        return Response({
            "project_name": project.name,
            "metrics": {
                "total_defects": total_defects,
                "mttr_hours": round(mttr_hours, 2),
                "reopen_rate_percent": round(reopen_rate, 2)
            },
            "modules_statistics": modules_stats
        })


class SoftwareModuleViewSet(viewsets.ModelViewSet):
    queryset = SoftwareModule.objects.all()
    serializer_class = SoftwareModuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        module = self.get_object()

        if ModuleDependency.objects.filter(target_module=module).exists():
            return Response(
                {"detail": "Неможливо видалити: цей модуль є базовою залежністю для інших компонентів."},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_defects = module.defects.exclude(status__in=['Resolved', 'Closed']).exists()
        if active_defects:
            return Response(
                {"detail": "Неможливо видалити: модуль містить незакриті дефекти."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(module)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def regression_scope(self, request, pk=None):
        module = self.get_object()
        impacted_modules = get_regression_scope(module.id)

        return Response({
            "target_module": {"id": module.id, "name": module.name},
            "impacted_count": len(impacted_modules),
            "regression_scope": impacted_modules
        })


class ModuleDependencyViewSet(viewsets.ModelViewSet):
    queryset = ModuleDependency.objects.all()
    serializer_class = ModuleDependencySerializer
    permission_classes = [permissions.IsAuthenticated]