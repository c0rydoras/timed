# Generated by Django 3.2.13 on 2022-06-24 08:49

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tracking", "0014_rename_type_absence_absence_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="rejected",
            field=models.BooleanField(default=False),
        ),
    ]
