# -*- coding: utf-8 -*-
# Generated by Django 1.9.5 on 2016-04-22 23:38
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cyoa', '0007_appuser'),
    ]

    operations = [
        migrations.AddField(
            model_name='adventureuser',
            name='has_accepted',
            field=models.BooleanField(default=False),
        ),
    ]
