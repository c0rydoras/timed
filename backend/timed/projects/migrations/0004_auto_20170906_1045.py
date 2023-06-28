# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-09-06 08:45
from __future__ import unicode_literals

from datetime import timedelta

from django.db import migrations, models


def migrate_estimated_hours(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    projects = Project.objects.filter(estimated_hours__isnull=False)
    for project in projects:
        project.estimated_time = timedelta(hours=project.estimated_hours)
        project.save()

    Task = apps.get_model("projects", "Task")
    tasks = Task.objects.filter(estimated_hours__isnull=False)
    for task in tasks:
        task.estimated_time = timedelta(hours=task.estimated_hours)
        task.save()


class Migration(migrations.Migration):
    dependencies = [("projects", "0003_auto_20170831_1624")]

    operations = [
        migrations.AddField(
            model_name="project",
            name="estimated_time",
            field=models.DurationField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="task",
            name="estimated_time",
            field=models.DurationField(blank=True, null=True),
        ),
        migrations.RunPython(migrate_estimated_hours),
        migrations.RemoveField(model_name="project", name="estimated_hours"),
        migrations.RemoveField(model_name="task", name="estimated_hours"),
    ]
