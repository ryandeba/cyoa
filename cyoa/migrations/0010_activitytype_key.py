# -*- coding: utf-8 -*-
# Generated by Django 1.9.5 on 2016-04-25 01:42
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cyoa', '0009_auto_20160424_2008'),
    ]

    operations = [
        migrations.AddField(
            model_name='activitytype',
            name='key',
            field=models.CharField(default='asdf', max_length=100),
            preserve_default=False,
        ),
    ]