from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Q, Avg, F
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from defects.models import Defect
from .models import Project, SoftwareModule, ModuleDependency, Task
from .serializers import ProjectSerializer, SoftwareModuleSerializer, ModuleDependencySerializer, TaskSerializer
from .services import get_regression_scope, get_graph_data_for_visualization
import csv

User = get_user_model()

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'PM':
            return Project.objects.filter(owner=user)
        return Project.objects.filter(assigned_members=user)

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
            avg_risk=Avg('defects__calculated_risk', filter=~Q(defects__status__in=['Resolved', 'Closed']))
        )

        modules_stats = []
        for mod in modules:
            if mod.open_defects > 0 and mod.avg_risk is not None:
                stability = max(0.0, 100.0 - float(mod.avg_risk))
            else:
                stability = 100.0

            if mod.stability_index != stability:
                mod.stability_index = stability
                mod.save(update_fields=['stability_index'])

            modules_stats.append({
                "module_id": mod.id,
                "module_name": mod.name,
                "open_defects": mod.open_defects,
                "stability_index": round(stability, 2)
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

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        user = request.user
        if user.role != 'PM':
            return Response({"detail": "Only Project Managers can export reports."}, status=status.HTTP_403_FORBIDDEN)

        project = self.get_object()

        modules = SoftwareModule.objects.filter(project=project).annotate(
            open_defects=Count('defects', filter=~Q(defects__status__in=['Resolved', 'Closed'])),
            total_defects=Count('defects')
        )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{project.name.replace(" ", "_")}_Report.csv"'

        writer = csv.writer(response)
        writer.writerow(['Module ID', 'Module Name', 'Stability Index (%)', 'Open Defects', 'Total Defects History'])

        for mod in modules:
            writer.writerow([
                mod.id,
                mod.name,
                round(mod.stability_index, 2),
                mod.open_defects,
                mod.total_defects
            ])

        return response

    @action(detail=True, methods=['get', 'post', 'delete'])
    def members(self, request, pk=None):
        project = self.get_object()

        print(f"--- API CALL --- Project: {project.id}, User: {request.user.username}, Method: {request.method}")

        if request.user != project.owner and request.method in ['POST', 'DELETE']:
            print("Access denied: Not the owner.")
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            members = project.assigned_members.all()
            result = [
                {"id": m.id, "username": m.username, "role": m.role, "first_name": m.first_name,
                 "last_name": m.last_name}
                for m in members
            ]
            return Response(result)

        elif request.method == 'POST':
            user_id = request.data.get('user_id')
            print(f"Trying to add User ID: {user_id}")

            if not user_id:
                return Response({"detail": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(id=user_id)
                project.assigned_members.add(user)
                print("SUCCESS: User added to DB!")
                return Response({"status": "User added to team"}, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"CRITICAL ERROR: {str(e)}")
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        elif request.method == 'DELETE':
            user_id = request.data.get('user_id')
            try:
                user = User.objects.get(id=user_id)
                project.assigned_members.remove(user)
                print("SUCCESS: User removed from DB!")
                return Response({"status": "User removed from team"}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return Task.objects.filter(project_id=project_id).order_by('-created_at')

        user = self.request.user
        if user.role == 'PM':
            return Task.objects.filter(project__owner=user)

        return Task.objects.filter(project__assigned_members=user)

    def perform_create(self, serializer):
        if self.request.user.role != 'PM':
            raise PermissionError("Only PM can create tasks.")
        serializer.save()