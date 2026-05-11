from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

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