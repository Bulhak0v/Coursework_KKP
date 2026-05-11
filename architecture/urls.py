from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, SoftwareModuleViewSet, ModuleDependencyViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'modules', SoftwareModuleViewSet, basename='module')
router.register(r'dependencies', ModuleDependencyViewSet, basename='dependency')

urlpatterns = [
    path('', include(router.urls)),
]