"""
Migration: Add fashion-specific fields to Product for Bammidi Collections.
Note: 'unit' field already exists from 0001_initial, do NOT alter it here.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='additional_images',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='product',
            name='fabric',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='product',
            name='color',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='product',
            name='available_sizes',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='product',
            name='care_instructions',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='product',
            name='occasion',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='product',
            name='is_new_arrival',
            field=models.BooleanField(default=False),
        ),
    ]
