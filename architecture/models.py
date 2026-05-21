from django.db import models
from django.conf import settings

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='managed_projects'
    )

    assigned_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='assigned_projects',
        blank=True
    )

    def __str__(self):
        return self.name


class SoftwareModule(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='modules'
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    stability_index = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class ModuleDependency(models.Model):
    source_module = models.ForeignKey(
        SoftwareModule,
        on_delete=models.CASCADE,
        related_name='dependencies'
    )
    target_module = models.ForeignKey(
        SoftwareModule,
        on_delete=models.CASCADE,
        related_name='dependent_modules'
    )

    class Meta:
        unique_together = ('source_module', 'target_module')

    def __str__(self):
        return f"{self.source_module.name} -> {self.target_module.name}"


class Task(models.Model):
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done')
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO')
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"