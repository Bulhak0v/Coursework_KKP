from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Project, SoftwareModule, ModuleDependency
from .serializers import ProjectSerializer, SoftwareModuleSerializer, ModuleDependencySerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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


class ModuleDependencyViewSet(viewsets.ModelViewSet):
    queryset = ModuleDependency.objects.all()
    serializer_class = ModuleDependencySerializer
    permission_classes = [permissions.IsAuthenticated]