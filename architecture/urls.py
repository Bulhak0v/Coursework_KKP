from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, SoftwareModuleViewSet, ModuleDependencyViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'modules', SoftwareModuleViewSet, basename='module')
router.register(r'dependencies', ModuleDependencyViewSet, basename='dependency')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]