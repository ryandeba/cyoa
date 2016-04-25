# -*- coding: utf-8 -*-
# Generated by Django 1.9.5 on 2016-04-25 01:08
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cyoa', '0008_adventureuser_has_accepted'),
    ]

    operations = [
        migrations.AddField(
            model_name='adventureactivity',
            name='group',
            field=models.IntegerField(default=1),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='adventureactivity',
            name='is_chosen',
            field=models.BooleanField(default=False),
        ),
    ]