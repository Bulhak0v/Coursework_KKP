from django.db import models
from django.contrib.auth.models import User
from architecture.models import SoftwareModule


class Defect(models.Model):

    STATUS_CHOICES = [
        ('New', 'New'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
        ('Reopened', 'Reopened'),
    ]

    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    module = models.ForeignKey(
        SoftwareModule,
        on_delete=models.CASCADE,
        related_name='defects'
    )

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reported_defects'
    )

    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_defects'
    )

    title = models.CharField(max_length=255)

    steps_to_reproduce = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='New'
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='Medium'
    )

    calculated_risk = models.FloatField(default=0.0)

    reopen_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title


class DefectHistory(models.Model):
    defect = models.ForeignKey(
        Defect,
        on_delete=models.CASCADE,
        related_name='history'
    )

    changed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    old_status = models.CharField(max_length=20)

    new_status = models.CharField(max_length=20)

    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.defect.title}: {self.old_status} -> {self.new_status}"