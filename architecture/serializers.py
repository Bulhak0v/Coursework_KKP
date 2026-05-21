from rest_framework import serializers
from .models import Project, SoftwareModule, ModuleDependency, Task

class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('owner', 'created_at')

class SoftwareModuleSerializer(serializers.ModelSerializer):
    project_name = serializers.ReadOnlyField(source='project.name')

    class Meta:
        model = SoftwareModule
        fields = '__all__'
        read_only_fields = ('stability_index',)

class ModuleDependencySerializer(serializers.ModelSerializer):
    source_module_name = serializers.ReadOnlyField(source='source_module.name')
    target_module_name = serializers.ReadOnlyField(source='target_module.name')

    class Meta:
        model = ModuleDependency
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    assignee_username = serializers.ReadOnlyField(source='assignee.username')
    assignee_role = serializers.ReadOnlyField(source='assignee.role')

    class Meta:
        model = Task
        fields = '__all__'