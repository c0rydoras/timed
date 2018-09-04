# -*- coding: utf-8 -*-
# Generated by Django 1.11.15 on 2018-09-04 06:18
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0009_remove_report_activity'),
    ]

    operations = [
        migrations.AddField(
            model_name='activity',
            name='not_billable',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='activity',
            name='review',
            field=models.BooleanField(default=False),
        ),
    ]
