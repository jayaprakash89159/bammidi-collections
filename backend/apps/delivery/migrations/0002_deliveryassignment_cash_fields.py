from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('delivery', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='deliveryassignment',
            name='cash_collected',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='deliveryassignment',
            name='cash_collected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='deliveryassignment',
            name='cash_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]